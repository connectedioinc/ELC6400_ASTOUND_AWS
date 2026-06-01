
local ConfigService = require("api/ConfigService")

local ntpserver = ConfigService:new({ create = false, delete = false })

function ntpserver:initialize_hook()
	-- ntpserver comes from busybox so it doesn't have a separate .control file
	-- that's why it's being checked here using config file
	local fs = require "nixio.fs"
	if not fs.access("/etc/config/ntpserver") then
		return ntpserver:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Service does not exist in device" , "Request", 404)
	end
end

local s = ntpserver:section("ntpserver", "ntpserver")
function s:filter(c)
	return c[".name"] == "general"
end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			if value == "1" and self.uci:get("ntpd", "ntp", "enabled") == "1" then
				return false, "Can't enable NTPD and NTP server both at the same time"
			end
			return self.dt:is_bool(value)
		end

return ntpserver
