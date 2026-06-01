local ConfigService = require("api/ConfigService")
local ac_util = require("api.system.access_control_utils")
local Telnet = ConfigService:new({
	create = false,
	delete = false,
	general_section = function(self)
		local sid
		self:table_foreach("telnetd", "telnetd", function(c)
			sid = c[".name"]
		end)
		return sid
	end
})

-- Sets telnet access if instance is enabled and has a port else disables
function Telnet:PUT_after_data_hook()
	ac_util.after_data_hook(self, "enabled", "enable_local_access", "enable", "wan_access", "wan_port", "port", "TELNET")
end

local TelnetGeneral = Telnet:section("telnetd", "telnetd")

	local opt_enable = TelnetGeneral:option("enabled")
		function opt_enable:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enable:set(value)
			self:table_set(self.config, self.sid, "enable_local_access", value)
		end
		function opt_enable:get()
			return self:table_get(self.config, self.sid, "enable_local_access") or self:table_get(self.config, self.sid, "enable")
		end

if ac_util.has_wan then
	local opt_telnet_wan_access = TelnetGeneral:option("wan_access")
		function opt_telnet_wan_access:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_telnet_wan_access:set(value)
			self:table_set(self.config, self.sid, "_telnetWanAccess", value)
		end
		function opt_telnet_wan_access:get()
			return self:table_get(self.config, self.sid, "_telnetWanAccess")
		end

	local opt_wan_port = TelnetGeneral:option("wan_port")
		function opt_wan_port:validate(value)
			return self.dt:port(value)
		end
		function opt_wan_port:get(value)
			return value or self:table_get(self.config, self.sid, "port")
		end
end

	local opt_port = TelnetGeneral:option("port")
		opt_port.cfg_require = true
		function opt_port:validate(value)
			return self.dt:port(value)
		end

return Telnet