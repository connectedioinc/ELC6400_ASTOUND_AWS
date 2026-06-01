local ConfigService = require("api/ConfigService")
local all_modems = require("vuci.modem"):get_all_modems()
local mdm = require("vuci.modem")

if mdm:modem_count() == 0 then
	return nil
end

local C = ConfigService:new({
	create = false,
	delete = false
})

local enabled

function C:validate_section_hook()
	local enb = self:get_abs_value(self.config, self.sid, "enabled")
	if enb == "1" then
		local r = {"host", "port", "username", "password", "time"}
		local time = self:get_abs_value(self.config, self.sid, "time")
		if time == "min" then
			table.insert(r, "min")
		end
		if time == "hour" then
			table.insert(r, "hour")
		end
		if time == "day" then
			table.insert(r, "day")
		end
		if #all_modems > 1 then
			table.insert(r, "modem_id")
		end
		enabled.require = {["1"] = r}
	end
end

C.PUT_validate_section_hook = C.validate_section_hook

local s = C:section("email_to_sms", "pop3")
function s:filter(s)
	return s[".name"] == "pop3"
end
	enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local host = s:option("host")
		function host:validate(value)
			return self.dt:host(value)
		end

	local port = s:option("port")
		function port:validate(value)
			return self.dt:port(value)
		end

	local username = s:option("username")
		username.maxlength = 64
		function username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 512
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local ssl = s:option("ssl")
		function ssl:validate(value)
			return self.dt:is_bool(value)
		end

	local ssl_verify = s:option("ssl_verify")
		function ssl_verify:validate(value)
			return self.dt:is_bool(value)
		end

	local limit = s:option("limit")
		function limit:validate(value)
			return self.dt:irange(value, 1, 10)
		end

	local time = s:option("time")
		function time:validate(value)
			return self.dt:check_array(value, {
				"min", "hour", "day"
			})
		end

	local min = s:option("min")
		function min:validate(value)
			return self.dt:check_array(value, {
				"1", "2", "5", "10", "15", "20", "30"
			})
		end

	local hour = s:option("hour")
		function hour:validate(value)
			return self.dt:check_array(value, {
				"1", "2", "4", "6", "8", "12"
			})
		end

	local day = s:option("day")
		function day:validate(value)
			return self.dt:check_array(value, {
				"1", "2", "3", "5", "10", "15"
			})
		end

	local modem_id = s:option("modem_id")
		function modem_id:validate(value)
			return self.dt:check_modem(value)
		end

return C