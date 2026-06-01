local fs = require("nixio.fs")
local nixio = require("nixio")
local FormDataParser = require("api.formdata_parser")
local check_reserved_space = require("vuci.util_tlt").check_reserved_space
local get_mount_point = require("vuci.util_tlt").get_mount_point

local ROOT_UID = 0
local ENOENT = 2 -- No such file or directory

local function validate_filename(filename)
	if filename:find("[/\\]", 0, false) then
		return false, "can't contain / or \\"
	end

	if #filename > 255 then
		return false, "too long"
	end

	return true
end

local function insert_all(destination, source)
	for _, item in ipairs(source) do
		table.insert(destination, item)
	end
end

local function update_space_diffs(space_diffs, filename, change_amount)
	if filename:match("^/tmp") then
		space_diffs.ram = space_diffs.ram + change_amount
	else
		local mount_point = get_mount_point(filename) or "/overlay"
		if not space_diffs.flash[mount_point] then
			space_diffs.flash[mount_point] = 0
		end
		space_diffs.flash[mount_point] = space_diffs.flash[mount_point] + change_amount
	end
end

--- @param path string
local function is_sticky_directory(path)
	local stat = fs.stat(path)
	if not stat then
		return false
	end

	if stat.type ~= "dir" then
		return false
	end

	return math.floor(stat.modedec / 1000) % 2 == 1
end

--- @param filename string
--- @return boolean
local function can_delete_or_move_file(filename)
	local dir = fs.dirname(filename)
	if is_sticky_directory(dir) then
		local user_id = nixio.getuid()
		if user_id == ROOT_UID then
			return true
		end

		local file_owner = fs.stat(filename, "uid")
		if file_owner == user_id then
			return true
		end

		local dir_owner = fs.stat(dir, "uid")
		if dir_owner == user_id then
			return true
		end

		return false
	else
		if not fs.access(dir, "w", "x") then
			return false
		end

		return true
	end
end

--- @param filename string
--- @return boolean
local function check_permissions_for_delete(filename)
	local ok, err = fs.access(filename, "f")
	if not ok then
		-- Trying to delete a file which doesn't exist is fine. Ignore it.
		if err == ENOENT then
			return true
		else
			return false
		end
	end

	return can_delete_or_move_file(filename)
end

--- @param source string
--- @param destination string
--- @return boolean
local function check_permissions_for_copy(source, destination)
	local destination_dir = fs.dirname(destination)
	if not fs.access(destination_dir, "w", "x") then
		return false
	end

	if not fs.access(source, "r") then
		return false
	end

	if not check_permissions_for_delete(destination) then
		return false
	end

	return true
end

--- @param source string
--- @param destination string
--- @return boolean
local function check_permissions_for_move(source, destination)
	if not can_delete_or_move_file(source) then
		return false
	end

	if not fs.access(source, "r") then
		return false
	end

	-- A file can be moved to a certain destination by:
	--   Deleting that file and copying the source to that location.
	--   OR
	--   Overwriting all of the contents inside that file to match the source.
	--   OR
	--   Creating the destination file and writing to it if it doesn't exist.
	if fs.access(destination, "f") then
		local can_delete_destination = check_permissions_for_delete(destination)
		local can_write_to_destination = fs.access(destination, "w")
		if not (can_delete_destination or can_write_to_destination) then
			return false
		end

	else
		local destination_dir = fs.dirname(destination)
		if not fs.access(destination_dir, "w", "x") then
			return false -- Can't create file in destination directory
		end
	end

	return true
end

local function process_upload_request(user_callbacks, multipart_struct)
	assert(type(multipart_struct) == "table")
	assert(type(multipart_struct.formdata_blocks) == "table")

	-- Construct an `upload_request` object, which would represent this upload request.
	-- Will be given to the caller, so they could do validation on it.
	--
	-- This is for decoupling any file upload validation logic from `multipart/form-data` parser
	-- implementation details.
	local upload_request = { files = {}, parameters = {} }
	do
		for _, block in ipairs(multipart_struct.formdata_blocks) do
			if block.content_disposition.name == "file" and block.content_filename then
				if not block.content_disposition.filename then
					return nil, {
						error = "Missing 'filename' parameter in Content-Disposition",
						code = STD_CODES.INCORRECT_REQUEST,
						source = "Upload"
					}
				end
				local ok, err = validate_filename(block.content_disposition.filename)
				if not ok then
					return nil, {
						error = ("Invalid 'filename' parameter in Content-Disposition: "):format(err),
						code = STD_CODES.INCORRECT_REQUEST,
						source = "Upload"
					}
				end

				table.insert(upload_request.files, {
					temporary = block.file_is_temporary,
					tmp_location = block.content_filename,
					filename = block.content_disposition.filename,
					size = block.content_size
				})
			else
				upload_request.parameters[block.content_disposition.name] = block.content
			end
		end

		if #upload_request.files == 0 then
			return nil, {
				error = "No file contents found in upload request",
				code = STD_CODES.INCORRECT_REQUEST,
				source = "Upload"
			}
		end
	end

	-- All the caller to insert whatever validation that they need.
	if user_callbacks.handle_request then
		assert(type(user_callbacks.handle_request) == "function")
		local ok, err = user_callbacks.handle_request(upload_request)
		if not ok then
			return nil, err
		end
	end

	for _, file in ipairs(upload_request.files) do
		if not file.location then
			error("Where to save file was not given")
		end

		if #fs.basename(file.location) > 255 then
			return nil, {
				error = "Filename is too long",
				code = STD_CODES.INCORRECT_REQUEST,
				source = "Upload"
			}
		end
	end

	--- @alias string_tuple { [1]: string, [2]: string }

	--- @type string[]
	local files_to_delete = {}

	--- @type string_tuple[]
	local files_to_copy = {}

	--- @type string_tuple[]
	local files_to_move = {}

	-- Update `files_to_delete`, `files_to_copy`, `files_to_move` to queue up operations that need to be done.
	do
		if user_callbacks.list_files_to_delete then
			local result, err = user_callbacks.list_files_to_delete(upload_request.parameters.option)
			if result == false then
				return nil, err
			end

			if type(result) == "table" then
				insert_all(files_to_delete, result)
			end
		end

		for _, file in ipairs(upload_request.files) do
			if file.temporary then
				table.insert(files_to_move, { file.tmp_location, file.location })
			else
				table.insert(files_to_copy, { file.tmp_location, file.location })
			end
		end
	end

	-- Check if we have enough permissions to read and write all of the files
	--
	-- These checks do NOT GUARANTEE that the operation will later be successful.
	-- TOCTOU can still occur.
	--
	-- This should only be needed when uploading files through /sbin/api
	-- Because the user of that script is resposible for setting the correct permissions on the file.
	do
		for _, filename in ipairs(files_to_delete) do
			if not check_permissions_for_delete(filename) then
				return nil, {
					error = ("Insufficient permissions for deleting file '%s'"):format(filename),
					code = STD_CODES.INCORRECT_REQUEST,
					source = "Upload"
				}
			end
		end

		for _, source_destination_tuple in ipairs(files_to_copy) do
			local source = source_destination_tuple[1]
			local destination = source_destination_tuple[2]

			if not check_permissions_for_copy(source, destination) then
				return nil, {
					error = ("Insufficient permissions for copying file '%s' to '%s'"):format(source, destination),
					code = STD_CODES.INCORRECT_REQUEST,
					source = "Upload"
				}
			end
		end

		for _, source_destination_tuple in ipairs(files_to_move) do
			local source = source_destination_tuple[1]
			local destination = source_destination_tuple[2]

			if not check_permissions_for_move(source, destination) then
				return nil, {
					error = ("Insufficient permissions for moving file '%s' to '%s'"):format(source, destination),
					code = STD_CODES.INCORRECT_REQUEST,
					source = "Upload"
				}
			end
		end
	end

	-- Check if after when running operations from `files_to_delete`, `files_to_copy` and `files_to_move` that
	-- there will be enough space.
	-- Including case when uploaded file, will remove previous uploaded file for the same option
	do
		-- `space_diffs` tracks how the amount of storage will change after moving, copying and deleting all files.
		--
		-- A NEGATIVE change means that the amount of space used will decrease, there is more free space.
		-- A POSITIVE change means that more space is need then what is currently used.
		--
		-- Deletions will create a NEGATIVE change, while copying creates a POSITIVE change. 
		local space_diffs = {
			ram = 0,
			flash = {}
		}

		for _, deleted_file in ipairs(files_to_delete) do
			local file_size = fs.stat(deleted_file, "size")
			if file_size then
				update_space_diffs(space_diffs, deleted_file, -file_size)
			end
		end

		for _, source_destination_tuple in ipairs(files_to_move) do
			local source = source_destination_tuple[1]
			local destination = source_destination_tuple[2]

			local source_size = fs.stat(source, "size")
			assert(source_size ~= nil)

			update_space_diffs(space_diffs, source, -source_size)
			update_space_diffs(space_diffs, destination, source_size)

			-- If destination is being overwritten, then that space needs to be removed
			local destination_size = fs.stat(destination, "size")
			if destination_size then
				update_space_diffs(space_diffs, destination, -destination_size)
			end
		end

		for _, source_destination_tuple in ipairs(files_to_copy) do
			local source = source_destination_tuple[1]
			local destination = source_destination_tuple[2]

			local source_size = fs.stat(source, "size")
			assert(source_size ~= nil)

			update_space_diffs(space_diffs, destination, source_size)

			-- If destination is being overwritten, then that space needs to be removed
			local destination_size = fs.stat(destination, "size")
			if destination_size then
				update_space_diffs(space_diffs, destination, -destination_size)
			end
		end

		if space_diffs.ram > FormDataParser.get_available_ram_space() then
			return nil, {
				error = "Failed to save files, not enough RAM",
				code = STD_CODES.NO_SPACE,
				source = "Upload"
			}
		end

		for mount_point, required_space in pairs(space_diffs.flash) do
			if required_space > 0 and not check_reserved_space(required_space / 1024, mount_point) then
				return nil, {
					error = "Failed to save files, not enough free space in flash storage.",
					code = STD_CODES.NO_SPACE,
					source = "Upload"
				}
			end
		end
	end

	-- After all of the checks have passed move, copy and delete the files.
	-- It's best to do deletions first, to have as much space available as possible.
	--
	-- Let's hope that we did enough checks before performing these operations.
	-- Because if any one of them fails, we won't be able to revert what was deleted.
	-- It's possible that data could be lost.
	do
		for _, filename in ipairs(files_to_delete) do
			local ok, err, error_string = fs.remove(filename)
			if not ok and err ~= ENOENT then
				return nil, {
					error = ("Failed to remove '%s': %s"):format(filename, error_string),
					code = STD_CODES.INCORRECT_REQUEST,
					source = "Upload"
				}
			end
		end

		for _, source_destination_tuple in ipairs(files_to_copy) do
			local destination = source_destination_tuple[2]
			fs.remove(destination) -- Ignore error
		end

		for _, source_destination_tuple in ipairs(files_to_move) do
			local destination = source_destination_tuple[2]
			fs.remove(destination) -- Ignore error
		end

		-- Just so you know. This operation can be quite long when a file is moving between file systems.
		-- Even for pretty small files (~32KiB) this operation will dominate the run time. Flash storage is slow :(
		-- (Checked with RUT956)
		for _, source_destination_tuple in ipairs(files_to_move) do
			local source = source_destination_tuple[1]
			local destination = source_destination_tuple[2]

			-- using `fs.move` instead of `os.rename`,
			-- because `os.rename` doesn't support going between filesystems.
			local ok, _, error_string = fs.move(source, destination)
			if not ok then
				return nil, {
					error = ("Failed to move '%s' to '%s': %s"):format(source, destination, error_string),
					code = STD_CODES.INCORRECT_REQUEST,
					source = "Upload"
				}
			end
		end

		for _, source_destination_tuple in ipairs(files_to_copy) do
			local source = source_destination_tuple[1]
			local destination = source_destination_tuple[2]

			local ok, _, error_string = fs.copy(source, destination)
			if not ok then
				return nil, {
					error = ("Failed to copy '%s' to '%s': %s"):format(source, destination, error_string),
					code = STD_CODES.INCORRECT_REQUEST,
					source = "Upload"
				}
			end
		end
	end

	return upload_request
end

return function (user_callbacks, multipart_struct)
	-- Moved all of the parsing logic to `process_upload_request`, so that calling
	-- `user_callbacks.on_failed` would be easier and guarenteed.
	local result, err = process_upload_request(user_callbacks, multipart_struct)
	if not result then
		if user_callbacks.on_failed then
			assert(type(user_callbacks.on_failed) == "function")
			user_callbacks.on_failed(err)
		end
		return nil, err
	end

	return result
end
