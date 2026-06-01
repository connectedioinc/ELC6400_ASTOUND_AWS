local ConfigService = require("api/ConfigService")

local ntpd = ConfigService:new({ create = false, delete = false })
local util = require("vuci.util")

local enabled

function ntpd:validate_section_hook()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if opt_enabled and opt_enabled == "1" then
		local required_options = {}
        local opt_file_flag = self:get_abs_value(self.config, self.sid, "file_flag")
        if opt_file_flag and opt_file_flag == "1" then
            table.insert(required_options, "config_file")
		else
			table.insert(required_options, "server")
        end
		enabled.require = {["1"] = required_options}
	end
end

function ntpd:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "ntp")
	return { path = path }
end

ntpd.PUT_validate_section_hook = ntpd.validate_section_hook

local s = ntpd:section("ntpd", "timeserver")

	enabled = s:option("enabled")
		function enabled:validate(value)
			if value == "1" and self:table_get("ntpserver", "general", "enabled") == "1" then
				return false, "Can't enable NTPD and NTP server both at the same time"
			end
			return self.dt:is_bool(value)
		end

	local file_flag = s:option("file_flag")
		function file_flag:validate(value) return self.dt:is_bool(value) end

	local config_file = s:option("config_file", { file = true })
	config_file.file_size = 16777216

	local server = s:option("server", { list = true })
		function server:validate(value) return self.dt:host(value) end

	local enable_server = s:option("enable_server")
		function enable_server:validate(value)
			return self.dt:is_bool(value)
		end


return ntpd
