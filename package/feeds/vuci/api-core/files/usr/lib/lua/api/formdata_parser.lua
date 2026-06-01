-- TODO: now it is impossible to upload files larger than the RAM size. Need to add
-- checks if file is being uploaded to an external drive and then write to it directly instead
-- of first writing to the RAM.
require("api/standard_codes")

local fs = require("nixio.fs")
local nixio = require("nixio")
local util = require("vuci.util")
local FormDataBlock = require("api.formdata_block")

-- Specification that were used as a reference during implementation:
-- * HTTP/1.1 - https://www.rfc-editor.org/rfc/rfc2616.html
-- * Content-Disposition Header field: https://www.rfc-editor.org/rfc/rfc2183
--
-- Just writing this down for future use, if something breaks and need to double check on
-- how it should have worked

local FormDataParser = {}
FormDataParser.__index = FormDataParser

function FormDataParser.new(available_ram_reserve, boundry, io_stream, storage_path)
	local self = setmetatable({}, FormDataParser)
	self.read_size = 16 * 1024 -- 16KiB
	self.available_ram_reserve = available_ram_reserve
	self.storage_path = storage_path

	self.io_stream = io_stream
	self.working_buffer = ""
	self.content_length = 0
	self.boundry = boundry

	-- It is important that `io_stream` does not buffer data to an internal buffer.
	-- Otherwise poll() would return bogus results. Like POLLIN is not sent, but more data can be read.
	self.io_stream:setvbuf("no")

	return self
end

function FormDataParser:take_lines()
	return function()
		return self:take_line()
	end
end

function FormDataParser:take_line()
	local newline_start, newline_stop = self.working_buffer:find("\r\n", 0, true)
	if not newline_start then
		return nil
	end

	local line = self.working_buffer:sub(1, newline_start-1)
	self.working_buffer = self.working_buffer:sub(newline_stop+1)

	return line
end

function FormDataParser:poll_io_stream()
	local fds = {
		{ fd = self.io_stream, events = nixio.poll_flags("in") }
	}
	local fd_count = nixio.poll(fds, 1000)
	if fd_count ~= 1 then
		return false
	end

	local has_error = nixio.bit.band(fds[1].revents, nixio.poll_flags("err", "pri", "nval")) ~= 0
	if has_error then
		-- "Somekind" of error occured, don't care what
		return false
	end

	local has_pollin = nixio.bit.check(fds[1].revents, nixio.poll_flags("in"))
	local has_pollhup = nixio.bit.check(fds[1].revents, nixio.poll_flags("hup"))
	if not has_pollin and has_pollhup then
		-- input stream was closed and there is no more data to read
		return false
	end

	if FormDataParser.get_available_ram_space() < self.available_ram_reserve then
		return false, "Out of memory"
	end

	local chunk = self.io_stream:read(self.read_size)
	if chunk == nil then
		return false
	end

	self.working_buffer = self.working_buffer .. chunk
	self.content_length = self.content_length + #chunk

	return true
end

local function get_char_at(text, index)
	if index >= 1 then
		return text:sub(index, index)
	else
		return ""
	end
end

local function iter_find(haystack, needle)
	local cursor = 0
	return function()
		local needle_start, needle_stop = haystack:find(needle, cursor, true)
		if not needle_start then
			return nil
		end

		cursor = needle_stop + 1
		return needle_start, needle_stop
	end
end

local function trim_whitespace(text)
	return text:match("^%s*(.-)%s*$")
end

local function list_string_quotes(text)
	local quotes = {}

	for pos in iter_find(text, "\"") do
		local is_quote_open = #quotes % 2 == 1
		local is_escaped = get_char_at(text, pos-1) == "\\" and get_char_at(text, pos-2) ~= "\\"

		if not (is_quote_open and is_escaped) then
			table.insert(quotes, pos)
		end
	end

	return quotes
end

-- Example `header_value`:
--   form-data; name="option"
--   form-data; name="option"; filename="hel\";lo"
local function split_content_disposition(header_value)
	local quotes = list_string_quotes(header_value)

	local part_boundries = {}
	table.insert(part_boundries, 0)
	for pos in iter_find(header_value, ";") do
		local is_inside_str = false
		for i, quote_pos in ipairs(quotes) do
			if pos < quote_pos then
				is_inside_str = i % 2 == 0
				break
			end
		end

		if not is_inside_str then
			table.insert(part_boundries, pos)
		end
	end
	table.insert(part_boundries, #header_value+1)

	local parts = {}
	for i=1, #part_boundries-1 do
		local part_from = part_boundries[i]+1
		local part_to = part_boundries[i+1]-1
		local part = header_value:sub(part_from, part_to)
		table.insert(parts, trim_whitespace(part))
	end

	return parts
end

-- A token in the HTTP specification is defined as a sequence of character excluding separators and control characters
-- Source: https://www.rfc-editor.org/rfc/rfc2616.html#section-2.2
local function is_token_valid(text)
	local separators = {
		"(", ")", "<", ">", "@",
		",", ";", ":", "\\", "\"",
		"/", "[", "]", "?", "=",
		"{", "}", " ", "\t"
	}

	for _, separator in ipairs(separators) do
		if text:find(separator, 1, true) then
			return false
		end
	end

	return true
end

-- Example `parameter` values:
--   name="option"
--   filename="hel\";lo"
--
-- Defined as `disposition-parm` in spec: https://www.rfc-editor.org/rfc/rfc2616.html#section-19.5.1
local function split_content_disposition_parameter(parameter)
	local equals = parameter:find("=", 1, true)
	if not equals then
		return nil, nil, "No equals sign"
	end

	local key = parameter:sub(1, equals-1)
	local value = parameter:sub(equals+1)

	key = trim_whitespace(key)
	value = trim_whitespace(value)

	if not is_token_valid(key) then
		return nil, nil, "Key is invalid"
	end

	if not is_token_valid(value) then
		local quotes = list_string_quotes(value)
		if #quotes ~= 2 then
			return nil, nil, "Value must qouted string or a token"
		end
		if quotes[1] ~= 1 or quotes[2] ~= #value then
			return nil, nil, "Value must qouted string or a token"
		end

		value = value:sub(2, -2) -- Remove qoutes
	end

	return key, value
end

-- TODO: Maybe this function should be moved to `api.formdata_block`
function FormDataParser:append_content_to_form_block(form_block, content)
	if content == "" then
		return true
	end

	if form_block.content_disposition.name == "file" then
		if not form_block.content_filename then
			local err
			form_block.file_is_temporary = true
			form_block.content_filename = self:get_temporary_filename(nixio.getpid())
			form_block.content_size = 0
			form_block.content_file, err = io.open(form_block.content_filename, "w")

			if not form_block.content_file then
				return nil, ("Failed to open temporary file: %s"):format(err)
			end
		end

		if form_block.content_file then
			local res, err = form_block.content_file:write(content)
			if not res then
				return nil, ("Failed to write to temporary file: %s"):format(err)
			end
			form_block.content_size = form_block.content_size + #content
		end
	else
		form_block.content = (form_block.content or "") .. content
	end

	return true
end

local PARSE_FINISHED = 1
local PARSE_LAST_FINISHED = 2
local PARSE_NEED_MORE_BYTES = 3

function FormDataParser:parse_block_header_line(block, line)
	local colon = line:find(":", nil, true)
	if not colon then
		return nil, "Invalid header format"
	end

	local header_name = line:sub(1, colon-1)
	local header_value = line:sub(colon+1)

	header_name = header_name:lower()
	if header_name == "content-disposition" then
		if block.content_disposition then
			return nil, "Duplicate Content-Disposition header"
		end

		block.content_disposition = {}

		local params = split_content_disposition(header_value)
		if params[1] ~= "form-data" then
			return nil, "Expected Content-Disposition type to be form-data"
		end

		for i=2, #params do
			local key, value, err = split_content_disposition_parameter(params[i])
			if not key then
				return nil, ("Unable to parse parameter '%s' in Content-Disposition: %s"):format(params[i], err)
			end
			if key ~= "name" and key ~= "filename" then
				return nil, ("Unknown parameter '%s' in Content-Disposition"):format(key)
			end
			if block.content_disposition[key] then
				return nil, ("Duplicate parameter '%s' in Content-Disposition"):format(key)
			end
			block.content_disposition[key] = value
		end
	elseif header_name == "content-type" then
		if block.content_type then
			return nil, "Duplicate Content-Type header"
		end

		block.content_type = trim_whitespace(header_value)
	end

	return true
end

function FormDataParser:parse_block(block)
	if not block.started then
		for line in self:take_lines() do
			if line == self.boundry then
				block.started = true
				break
			end
		end
	end

	if block.started and not block.content_started then
		for line in self:take_lines() do
			if line == "" then
				block.content_started = true
				break
			end

			local ok, err = self:parse_block_header_line(block, line)
			if not ok then return nil, err end
		end
	end

	if block.content_started then
		if not block.content_disposition then
			return nil, "Missing Content-Disposition header"
		end
		if not block.content_disposition.name then
			return nil, "Missing name parameter in Content-Disposition header"
		end

		local pos_start, pos_stop = self.working_buffer:find("\r\n"..self.boundry, 0, true)
		if pos_start and pos_stop then
			local is_boundry      = self.working_buffer:sub(pos_stop+1, pos_stop+2) == "\r\n"
			local is_last_boundry = self.working_buffer:sub(pos_stop+1, pos_stop+2) == "--"

			if is_boundry or is_last_boundry then
				local ok, err = self:append_content_to_form_block(block, self.working_buffer:sub(1, pos_start-1))
				if not ok then return nil, err end

				self.working_buffer = self.working_buffer:sub(pos_stop + 2 + 1)
				block.ended = true

				if block.content_file then
					block.content_file:close()
					block.content_file = nil
				end

				if is_boundry then
					return PARSE_FINISHED
				else
					return PARSE_LAST_FINISHED
				end
			end
		else
			local max_boundry_size = #self.boundry + 2 + 2
			local partial_block_data = self.working_buffer:sub(1, -max_boundry_size - 1)
			self.working_buffer = self.working_buffer:sub(-max_boundry_size)

			local ok, err = self:append_content_to_form_block(block, partial_block_data)
			if not ok then return nil, err end
		end
	end

	return PARSE_NEED_MORE_BYTES
end

local function is_form_block_complete(form_block)
	return form_block.started and form_block.ended
end

function FormDataParser:parse_blocks(expected_content_length, form_blocks)
	if #form_blocks == 0 then
		local form_block = FormDataBlock.init_empty()
		form_block.started = false
		table.insert(form_blocks, form_block)
	end

	while true do
		local ok, err = self:poll_io_stream()
		if not ok and err then
			FormDataParser.cleanup_form_blocks(form_blocks)
			return false, err
		end
		if not ok then break end


		if self.content_length > expected_content_length then
			-- TODO: Not sure if this will ever occur, because uhttpd handles the Content-Length
			-- header and does not send more data
			FormDataParser.cleanup_form_blocks(form_blocks)
			return false, "Too much data, Content-Length is smaller that what was sent"
		end

		local try_parsing_next_block = true
		while try_parsing_next_block do
			try_parsing_next_block = false

			local block = form_blocks[#form_blocks]
			local status
			status, err = self:parse_block(block)
			if status == nil then
				FormDataParser.cleanup_form_blocks(form_blocks)
				return false, err
			end

			if status == PARSE_FINISHED or status == PARSE_LAST_FINISHED then
				if not is_form_block_complete(block) then
					FormDataParser.cleanup_form_blocks(form_blocks)
					return false, "Incorrect multipart/form-data block"
				end
			end

			if status == PARSE_FINISHED then
				local form_block = FormDataBlock.init_empty()
				form_block.started = true
				table.insert(form_blocks, form_block)
				try_parsing_next_block = true
			elseif status == PARSE_LAST_FINISHED then
				break
			end
		end
	end

	if self.content_length < expected_content_length then
		-- TODO: Not sure if this will ever occur, because uhttpd will just timeout after some amount
		-- of time, if there was less data sent than Content-Length
		FormDataParser.cleanup_form_blocks(form_blocks)
		return false, "Too little data, Content-Length is larger than what was sent"
	end

	for _, form_block in ipairs(form_blocks) do
		if not is_form_block_complete(form_block) then
			FormDataParser.cleanup_form_blocks(form_blocks)
			return false, "Incorrect multipart/form-data block"
		end

		-- Remove variable which were used to track in what of the parsing stage the block is.
		form_block.started = nil
		form_block.ended = nil
		form_block.content_started = nil
	end

	return true
end

function FormDataParser.get_available_ram_space()
	local info = util.ubus("system", "info")
	if not info then return 0 end

	return info.memory.available
end

function FormDataParser.cleanup_form_blocks(form_blocks)
	for _, form_block in ipairs(form_blocks) do
		form_block:cleanup()
	end
end

function FormDataParser:get_temporary_filename(pid)
	local lua_filename = os.tmpname()
	if self.storage_path and self.storage_path ~= "/tmp" then
		-- Ensure that the storage path exists
		fs.mkdirr(self.storage_path)
		lua_filename = lua_filename:gsub("/tmp/", self.storage_path .. "/")
	end
	local file_upload_filename = lua_filename:gsub("lua", ("file_upload_%s"):format(pid))
	fs.move(lua_filename, file_upload_filename)
	return file_upload_filename
end

function FormDataParser.list_temporary_files(storage_paths, pid)
	local files = {}

	for _, storage_path in ipairs(storage_paths) do
		local file_pattern = (storage_path .. "/file_upload_%d_*"):format(pid)
		for filename in fs.glob(file_pattern) do
			table.insert(files, filename)
		end
	end

	return files
end

return FormDataParser
