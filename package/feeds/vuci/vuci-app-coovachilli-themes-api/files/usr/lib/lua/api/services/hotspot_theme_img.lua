local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local fs = require("nixio.fs")
local hs_util = require("api.services.hotspot_utils")
local api_utils = require("api/api_utils")

local valid_files = { "Background", "Logo", "Favicon", "Loading" }

local theme_files = FunctionService:new()

theme_files.type_map = nil
function theme_files:fetch_theme_options()
	if self.type_map then return self.type_map end
	self.type_map = {}
	local themes = hs_util:get_themes()
	for _, theme in ipairs(themes) do
		table.insert(self.type_map, theme.id)
	end

	return self.type_map
end

function theme_files:GET_TYPE_config()
	if not self.sid then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Theme identifier missing.", "Validation")
	end

	local valid, err = self.dt:check_array(self.sid, self:fetch_theme_options())
	if not valid then
		return self:ResponseError("Section: " .. err)
	end
	local file_data = {}
	for uploaded_file in fs.glob(string.format("/etc/chilli/hotspotlogin/themes/%s/img/*", self.sid)) do
		local stat = fs.stat(uploaded_file)
		if stat then
			local name = fs.basename(uploaded_file):match("%a*")
			local upper_name = name:gsub("^%l", string.upper)
			if util.contains(valid_files, upper_name) then
				local single_file = {
					name = name,
					file_name = upper_name,
					file_path = "<%=" .. name .. "%>",
					['path:file_size'] = stat.size,
					path = uploaded_file,
				}
				table.insert(file_data, single_file)
			end
		end
	end
	return self:ResponseOK(file_data)
end

function theme_files:PUT()
	if not self.sid then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Theme identifier missing.", "Validation")
	end
	local valid, err = self.dt:check_array(self.sid, self:fetch_theme_options())
	if not valid then return self:ResponseError("Configuration: " .. err) end

	if not self.arguments.data or not api_utils:is_array(self.arguments.data) then
		self:add_critical_error(STD_CODES.INVALID_STRUCT, "Invalid PUT structure, data array is missing", "Validation")
	end

	local path = string.format("/etc/chilli/hotspotlogin/themes/%s/img/*", self.sid)
	for _, section in ipairs(self.arguments.data) do
		for opt in pairs(section) do
			if opt ~= "file_name" and opt ~= "path" then
				self:add_error(STD_CODES.INVALID_OPT, "Invalid option", opt)
			end
		end
		self:return_if_error()

		local file_name = section.file_name
		local new_path = section.path

		if file_name or new_path then
			local ok, err = self.dt:check_array(file_name, valid_files)
			if not ok then self:add_critical_error(STD_CODES.INVALID_OPT, err, "file_name") end

			if type(new_path) ~= "string" then
				self:add_critical_error(STD_CODES.INVALID_OPT, "Value must be a string", "path")
			end

			for image in fs.glob(path) do
				if image:find(section.file_name:lower()) then
					if new_path == "" then
						fs.remove(image)
					end
				end
			end
		end
	end
	return self:GET_TYPE_config()
end

function theme_files:UPLOAD_init()
	if not self.sid then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Theme identifier missing.", "Validation")
	end
	local valid, err = self.dt:check_array(self.sid, self:fetch_theme_options())
	if not valid then return self:ResponseError(err) end

	local function handle_request(upload_request)
		local option = upload_request.parameters.option
		if option == "" then
			return false, {
				code = STD_CODES.INVALID_OPT,
				error = "'option' must be provided for this upload endpoint.",
				source = "option"
			}
		end

		local ok, err = self.dt:check_array(option, valid_files)
		if not ok then
			return false, {
				code = STD_CODES.INVALID_OPT,
				error = err,
				source = option
			}
		end

		local file = upload_request.files[1]
		if option == "Background" then
			file.location = string.format("/etc/chilli/hotspotlogin/themes/%s/img/background.jpg", self.sid)
		elseif option == "Logo" then
			file.location = string.format("/etc/chilli/hotspotlogin/themes/%s/img/logo.svg", self.sid)
		elseif option == "Favicon" then
			file.location = string.format("/etc/chilli/hotspotlogin/themes/%s/img/favicon.png", self.sid)
		elseif option == "Loading" then
			file.location = string.format("/etc/chilli/hotspotlogin/themes/%s/img/loading.gif", self.sid)
		end

		return true
	end

	return { handle_request = handle_request }
end

function theme_files:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "chilli", 0664)
	return { path = path }
end

return theme_files
