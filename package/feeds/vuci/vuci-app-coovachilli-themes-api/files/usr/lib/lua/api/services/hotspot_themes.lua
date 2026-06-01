local FunctionService = require("api/FunctionService")
local api_utils = require("api/api_utils")
local fs = require("nixio.fs")
local uci = require("vuci.uci").cursor()
local util = require("vuci.util")
local hs_util = require("api.services.hotspot_utils")
local theme_tar = "/tmp/theme.tar.gz"
local theme_path = "/etc/chilli/hotspotlogin"

local hotspot_themes = FunctionService:new()

hotspot_themes.ERROR_CODES = {
	WRONG_FILE_EXTENSION = 1,
	FILE_NOT_EXISTS = 2,
	INVALID_THEME_FILE = 4,
	THEME_SELECTED = 5,
	FAILED_TO_DELETE = 6,
	UPLOAD_LIMIT = 7
}
hotspot_themes.delete_files = {}
hotspot_themes.type_map = nil

function hotspot_themes:populate_type_map(custom)
	local themes = hs_util:get_themes()
	if self.type_map then return self.type_map end
	self.type_map = {}
	for _, theme in ipairs(themes) do
		if (custom == true and theme.custom == "1") or (custom == false and theme.custom ~= "1") or custom == nil then
			table.insert(self.type_map, theme.id)
		end
	end
	return self.type_map
end

function hotspot_themes:initialize_hook()
	local custom
	if self.request_method == "UPLOAD" and self.service_group == "config" then return end
	if self.request_method == "DELETE" and self.service_group == "config" then custom = true end
	if self.service_group == "config" and self.sid then
		local valid, err = self.dt:check_array(
			self.sid,
			self:populate_type_map(custom)
		)
		if not valid then
			self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				"ID: " .. err,
				"Validation",
				HTTP_STATUS_CODES.NOT_FOUND
			)
		end
	end
end

function hotspot_themes:GET_TYPE_options()
	local data = {}
	for i = 1, #hs_util.files do
		local id = string.gsub(hs_util.files[i], ".htm", "")
		if id == "landing_page.css" then
			id = "css"
		end
		table.insert(data, { id = id, file = hs_util.files[i] })
	end
	return self:ResponseOK(data)
end

local function is_filename_tar_gz(filename)
	local split_path = util.split(filename, ".")
	for i = 1, #split_path do
		if i == #split_path then
			if split_path[i] == "gz" and split_path[i - 1] == "tar" then
				return true
			end
		end
	end

	return false
end

function hotspot_themes:UPLOAD_init()
	local themes = hs_util:get_themes()
	local count = 0
	for _, theme in pairs(themes) do
		if theme.custom == "1" then
			count = count + 1
		end
	end
	if count > 4 then
		self:add_critical_error(
			self.ERROR_CODES.UPLOAD_LIMIT,
			"Limit reached, 5 custom themes are allowed.",
			"Upload"
		)
	end

	local function handle_request(upload_request)
		for _, file in ipairs(upload_request.files) do
			if not is_filename_tar_gz(file.filename) then

				return false, {
					code = self.ERROR_CODES.WRONG_FILE_EXTENSION,
					error = "File extension is incorrect.",
					source = "filename"
				}
			end

			file.location = theme_tar
		end

		return true
	end

	return { handle_request = handle_request }
end

function hotspot_themes:is_valid_theme_file(extracted_path)
	if not fs.access(extracted_path .. "/cgi-bin/themes") or not fs.access(extracted_path .. "/themes") then
		return false
	end

	local function validate_and_chmod(path, allowed_extensions, dir_permissions, file_permissions, group)
		local valid_extensions = true

		for entry in fs.dir(path) do
			if not valid_extensions then break end
			local full_path = path .. "/" .. entry
			local attr = fs.lstat(full_path)

			if attr and attr.type == "dir" then
				fs.chmod(full_path, dir_permissions)
				fs.chown(full_path, nil, group)
				valid_extensions = validate_and_chmod(full_path, allowed_extensions, dir_permissions, file_permissions, group) and valid_extensions
			elseif attr and attr.type == "lnk" then
				valid_extensions = false
			else
				local ext
				local split_name = util.split(entry, ".")
				for i = 1, #split_name do
					if i == #split_name then
						ext = split_name[i]
					end
				end

				if not ext or (ext and not util.contains(allowed_extensions, ext)) then
					valid_extensions = false
				else
					fs.chmod(full_path, file_permissions)
					fs.chown(full_path, nil, group)
				end
			end
		end

		return valid_extensions
	end

	local extensions = { "htm", "css", "woff", "woff2", "svg", "png", "jpg", "gif" }
	local dir_permissions = 774
	local file_permissions = 664
	local group = "chilli"

	return validate_and_chmod(extracted_path, extensions, dir_permissions, file_permissions, group)
end

function hotspot_themes:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location

	local themes = hs_util:get_themes()
	if not fs.access(path) then
		os.remove(path)
		return self:add_critical_error(
			self.ERROR_CODES.FILE_NOT_EXISTS,
			"File does not exist.",
			"Upload"
		)
	end

	local package_size = util.exec("zcat " .. theme_tar .. " | wc -c | awk '{print ($1 / 1024) + 40 }'")
	local free_space, _, err = require("vuci.util_tlt").check_reserved_space(tonumber(package_size))
	if not free_space then
		return self:add_critical_error(
			STD_CODES.NO_SPACE,
			err,
			"Upload"
		)
	end

	local tmp_landingpage_main = "/tmp/hotspot_themes"
	local tmp_landingpage = tmp_landingpage_main .. theme_path
	if not fs.access(tmp_landingpage) then
		fs.mkdirr(tmp_landingpage)
	end
	util.exec(string.format("tar -xzf %s -C %s", theme_tar, tmp_landingpage))
	os.remove(path)
	if not self:is_valid_theme_file(tmp_landingpage) then
		util.exec(string.format("rm -rf %s", tmp_landingpage_main))
		return self:add_critical_error(
			self.ERROR_CODES.INVALID_THEME_FILE,
			"Invalid custom theme file.",
			"Upload"
		)
	end

	local count = 1
	for _, theme in pairs(themes) do
		if theme.custom == "1" then
			local parsed_count = tonumber(string.sub(theme.id, #"custom_theme_" + 1, #theme.name))
			if parsed_count >= count then
				count = parsed_count + 1
			end
		end
	end

	local upload_name
	for name in fs.dir(tmp_landingpage .. "/themes") do
		upload_name = name
		break
	end

	if not upload_name then
		return self:add_critical_error(
			self.ERROR_CODES.INVALID_THEME_FILE,
			"Invalid custom theme file.",
			"Upload"
		)
	end

	local default_theme_cgi_path = theme_path .. "/cgi-bin/themes/default"
	if fs.access("/rom" .. default_theme_cgi_path) then
		default_theme_cgi_path = "/rom" .. default_theme_cgi_path
	elseif fs.access(theme_path .. "/backup/cgi-bin/themes/default") then
		default_theme_cgi_path = theme_path .. "/backup/cgi-bin/themes/default"
	end

	local upload_theme_cgi_path = theme_path .. "/cgi-bin/themes/custom_theme_" .. count
	local upload_theme_path = theme_path .. "/themes/custom_theme_" .. count

	fs.mover(tmp_landingpage .. "/themes/" .. upload_name, upload_theme_path)
	fs.mover(tmp_landingpage .. "/cgi-bin/themes/" .. upload_name, upload_theme_cgi_path)
	util.exec(string.format("rm -rf %s", tmp_landingpage_main))

	if fs.access(default_theme_cgi_path) then
		for name in fs.dir(default_theme_cgi_path) do
			if not fs.access(upload_theme_cgi_path .. "/" .. name) then
				fs.copyr(default_theme_cgi_path .. "/" .. name, upload_theme_cgi_path .. "/" .. name)
			end
		end
	end

	return nil
end

function hotspot_themes:GET_TYPE_config()
	local themes = hs_util:get_themes()
	if not self.sid then
		local data = {}
		for _, theme in ipairs(themes) do
			table.insert(data, { id = theme.id, name = theme.name, custom = theme.custom, [".type"] = "theme" })
		end
		return self:ResponseOK(data)
	end

	if not themes then
		return self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			("Section: %s for service does not exist"):format(self.sid),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end

	local selected_theme = {}
	for _, theme in ipairs(themes) do
		if theme.id == self.sid then
			selected_theme = theme
			break
		end
	end

	local data = {
		id = selected_theme.id,
		name = selected_theme.name,
		custom = selected_theme.custom
	}

	return self:ResponseOK(data)
end

function hotspot_themes:DELETE()
	self.response_table = {}
	if not self._single and type(self.arguments.data) ~= "nil" and not api_utils:is_array(self.arguments.data) then
		self:add_critical_error(
			STD_CODES.INVALID_STRUCT,
			"Invalid data structure, only an array is acceptable",
			"Validation",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end
	if not self.sid and ( api_utils:is_table_empty(self.arguments) or type(self.arguments.data) ~= "table" or api_utils:is_table_empty(self.arguments.data) ) then
		self:add_critical_error(
			STD_CODES.CONF_DEL_DISALLOWED,
			"Deletion of whole configuration is not allowed",
			"Validation"
		)
	end

	self:DELETE_delegator()
	self:DELETE_before_commit_hook()

	self:ResponseOK(self.response_table)
end

function hotspot_themes:DELETE_delegator()
	if self._single then
		if api_utils:is_array(self.arguments.data) then
			self:add_critical_error(STD_CODES.INVALID_STRUCT,
				"Specified object does not support data as array",
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
		self.response_table = self:DELETE_section_logic()
	else
		if self.arguments and self.arguments.data and api_utils:is_array(self.arguments.data) then
			for _, sid in pairs(self.arguments.data) do
				self.sid = sid
				table.insert(self.response_table, self:DELETE_section_logic())
			end
		end
	end
end

function hotspot_themes:DELETE_section_logic()
	if not self._single then
		if type(self.sid) ~= "string" then
			self:add_critical_error(STD_CODES.INVALID_STRUCT, "Malformed DELETE request.", "Validation")
		end
		self:initialize_hook()
	end
	if uci:get("landingpage", "general", "theme") == self.sid then
		self:add_critical_error(
			self.ERROR_CODES.THEME_SELECTED,
			"Theme is currently being used.",
			self.sid,
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	if not fs.access(theme_path .. "/themes/" .. self.sid) or not fs.access(theme_path .. "/cgi-bin/themes/" .. self.sid) then
		self:add_critical_error(
			self.ERROR_CODES.FAILED_TO_DELETE,
			"Unable to find theme files.",
			self.sid,
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	table.insert(self.delete_files, theme_path .. "/themes/" .. self.sid)
	table.insert(self.delete_files, theme_path .. "/cgi-bin/themes/" .. self.sid)
	return { id = self.sid }
end

function hotspot_themes:DELETE_before_commit_hook()
	for _, file in ipairs(self.delete_files) do
		local ret = os.execute("rm -rf " .. util.shellquote(file))
		if ret ~= 0 then
			self:add_critical_error(
				self.ERROR_CODES.FAILED_TO_DELETE,
				"Could not delete theme.",
				"Delete",
				HTTP_STATUS_CODES.NOT_FOUND
			)
		end
	end
end

return hotspot_themes
