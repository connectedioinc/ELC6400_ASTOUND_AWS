local FunctionService = require("api/FunctionService")
local fs = require("nixio.fs")
local hs_util = require("api.services.hotspot_utils")
local util = require("vuci.util")
local theme_tar = "/tmp/theme.tar.gz"

local hotspot_themes = FunctionService:new()

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
	if self.service_group == "actions" and self.sid == "reset" then custom = false end
	local valid, err = self.dt:check_array(
		self.type,
		self:populate_type_map(custom)
	)
	if not valid then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			"ID: " .. err,
			"Request",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

function hotspot_themes:GET_TYPE_config()
	local file_data = ""
	local file = self.sid .. ".htm"
	if not util.contains(hs_util.files, file) and file ~= "css.htm" then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			"Filename invalid.",
			"Validation",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end

	if file == "css.htm" then
		local open_file = io.open(string.format("/etc/chilli/hotspotlogin/themes/%s/style/landing_page.css", self.type))
		if not open_file then self:add_critical_error(STD_CODES.INVALID_OPT, "File not found.", "Validation") end
		for line in open_file:lines() do
			file_data = file_data .. line .. "\n"
		end
	else
		local open_file = io.open(string.format("/etc/chilli/hotspotlogin/cgi-bin/themes/%s/%s",  self.type, file))
		if not open_file then self:add_critical_error(STD_CODES.INVALID_OPT, "File not found.", "Validation") end
		for line in open_file:lines() do
			file_data = file_data .. line .. "\n"
		end
	end

	local data = {}
	data.file = file_data

	return self:ResponseOK(data)
end

function hotspot_themes:PUT()
	if not self.sid then
		self:add_critical_error(STD_CODES.INVALID_STRUCT, "Filename missing.", "Validation")
	end
	local file = self.sid .. ".htm"
	if file == "css.htm" then
		file = string.format("/etc/chilli/hotspotlogin/themes/%s/style/landing_page.css", self.type)
	else
		file = string.format("/etc/chilli/hotspotlogin/cgi-bin/themes/%s/%s", self.type, file)
	end

	if not fs.access(file) then self:add_critical_error(STD_CODES.INVALID_OPT, "File not found.", "Validation") end

	if not self.arguments.data then
		self:add_critical_error(STD_CODES.INVALID_STRUCT, "Invalid PUT structure, data object is missing", "Validation")
	end

	for opt in pairs(self.arguments.data) do
		if opt ~= "file" then
			self:add_error(STD_CODES.INVALID_OPT, "Invalid option", opt)
		end
	end
	self:return_if_error()

	if self.arguments.data.file then
		if type(self.arguments.data.file) ~= "string" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Value must be a string", "file")
		end

		local current_file = io.open(file, "w")
		if not current_file then self:add_critical_error(STD_CODES.INVALID_OPT, "File not found.", "Validation") end

		current_file:write(self.arguments.data.file)
		current_file:close()
	end

	local file_data = ""
	local read_file = io.open(file, "r")
	for line in read_file:lines() do
		file_data = file_data .. line .. "\n"
	end

	local data = {}
	data.file = file_data

	return self:ResponseOK(data)
end

local reset = hotspot_themes:action("reset", function (self)
	local theme = self.type
	local file = self.arguments.data.file

	if file == "css.htm" then
		file = "landing_page.css"
	end

	local file_type = file:match("^.+%.(.+)$")
	if file_type == "htm" then
		file = "/cgi-bin/themes/%s/" .. file
	elseif file_type == "css" then
		file = "/themes/%s/style/" .. file
	else
		self:add_critical_error(STD_CODES.INVALID_OPT, "File not found.", "Validation")
	end

	local file_rom = "/rom/etc/chilli/hotspotlogin" .. string.format(file, "default")
	local file_backup = "/etc/chilli/hotspotlogin/backup" .. string.format(file, "default")

	file = "/etc/chilli/hotspotlogin" .. string.format(file, theme)

	if fs.access(file_rom) then
		fs.copy(file_rom, file)
		util.set_file_permissions(file, "chilli", 0664)
	elseif fs.access(file_backup) then
		fs.copy(file_backup, file)
		util.set_file_permissions(file, "chilli", 0664)
	else
		self:add_critical_error(STD_CODES.INVALID_OPT, "File not found.", "Validation")
	end

	local file_data = ""
	local read_file = io.open(file, "r")
	for line in read_file:lines() do
		file_data = file_data .. line .. "\n"
	end
	return self:ResponseOK({ file = file_data })
end)
local file = reset:option("file")
file.require = true
function file:validate(value)
	local array = util.clone(hs_util.files, true)
	table.insert(array, "css.htm")

	return self.dt:check_array(value, array)
end

hotspot_themes:action("download", function (self)
	util.exec(string.format("tar -czf %s -C /etc/chilli/hotspotlogin 'cgi-bin/themes/%s' 'themes/%s'", theme_tar, self.type, self.type))
	if fs.access(theme_tar) then
		return self:File(theme_tar, "landingpage-%s-%s.tar.gz" % { self.type, os.date("%Y-%m-%d") }, nil, true)
	else
		self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Could not download theme.", "Request")
	end
end)

return hotspot_themes
