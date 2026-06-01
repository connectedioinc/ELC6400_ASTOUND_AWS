local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local UlogFTPGeneral = ConfigService:new({
	create = false,
	delete = false
})

local opt_enabled

function UlogFTPGeneral:require_validation()
	local enabled = self:get_abs_value("ulogd", "global", "enabled")
	if enabled and enabled == "1" then
		local required_options = {"host", "port", "extra_name_info", "fixed", "weekdays"}
		local fixed = self:get_abs_value(self.config, self.sid, "fixed")
		local extra_name_info = self:get_abs_value(self.config, self.sid, "extra_name_info")
		if fixed and fixed == "1" then
			table.insert(required_options, "hours")
			table.insert(required_options, "minutes")
		end
		if fixed and fixed == "0" then
			table.insert(required_options, "interval")
		end
		if extra_name_info and extra_name_info == "custom" then
			table.insert(required_options, "custom_string")
		end
		opt_enabled.require = {["1"] = required_options}
	end
end

UlogFTPGeneral.PUT_validate_section_hook = UlogFTPGeneral.require_validation

local UlogFTP = UlogFTPGeneral:section("ulogd", "server")
function UlogFTP:filter(s)
	return s[".name"] == "ftp"
end

	opt_enabled = UlogFTP:option("enabled")
	opt_enabled.readonly = true
	function opt_enabled:get(_)
		return self:table_get("ulogd", "global", "enabled") or "0"
	end

	local opt_host = UlogFTP:option("host")
		function opt_host:validate(value)
			return self.dt:host(value)
		end

	local opt_username = UlogFTP:option("username")
		opt_username.maxlength = 512
		function opt_username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local opt_password = UlogFTP:option("password", { sensitive = true })
		opt_password.maxlength = 512
		function opt_password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local opt_port = UlogFTP:option("port")
		function opt_port:validate(value)
			return self.dt:port(value)
		end

	local opt_remote_file_path = UlogFTP:option("remote_file_path")
		function opt_remote_file_path:validate(value)
			if not(string.match(value, "/$") or string.match(value, "\\$")) then
				return false, "Value should end with a slash ('/' or '\\')."
			end
			if string.match(value, "//") or string.match(value, "\\\\") then
				return false, "Value can not contain more than one consecutive slash."
			end
			if not(string.match(value, "^[^\\]+/$") or string.match(value, "^[^/]+\\$")) and #value > 1 then
				return false, "Only one type of slash ('/' or '\\') can be used in a value."
			end
			return true
		end

	local opt_extra_name_info = UlogFTP:option("extra_name_info")
		function opt_extra_name_info:validate(value)
			return self.dt:check_array(value, {
				"none",
				"mac",
				"serial",
				"custom"
			})
		end

	local opt_custom_string = UlogFTP:option("custom_string")
		function opt_custom_string:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9_+.-]+$")
		end

	local opt_fixed = UlogFTP:option("fixed")
		function opt_fixed:validate(value)
			return self.dt:check_array(value, {"0", "1"})
		end

	local opt_hours = UlogFTP:option("hours")
		function opt_hours:validate(value)
			return self.dt:irange(value, 0, 23)
		end

	local opt_minutes = UlogFTP:option("minutes")
		function opt_minutes:validate(value)
			return self.dt:irange(value, 0, 59)
		end

	local opt_interval = UlogFTP:option("interval")
		function opt_interval:validate(value)
			return self.dt:check_array(value, {
				"1", "2", "4", "8", "12", "24"
			})
		end

	local opt_weekdays = UlogFTP:option("weekdays", {list = true})
		function opt_weekdays:validate(value)
			return self.dt:check_array(value, {
				"mon", "tue", "wed", "thu",
				"fri", "sat", "sun"
			})
		end
		function opt_weekdays:get()
			local values = self:table_get(self.config, self.sid, self.api_key)
			if type(values) == "string" and string.find(values, ",") then
				return util.split(values, ",")
			end
			return values
		end

return UlogFTPGeneral