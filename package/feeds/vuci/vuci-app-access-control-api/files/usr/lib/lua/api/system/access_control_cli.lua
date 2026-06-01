local ConfigService = require("api/ConfigService")
local ac_util = require("api.system.access_control_utils")

local CLI = ConfigService:new({
	create = false,
	delete = false,
	general_section = "status"
})

function CLI:PUT_after_data_hook()
	ac_util.after_data_hook(self, "enabled", "enable_local_access", "enable", "wan_access", "wan_port", "port", "CLI", "tcp")
end

local CLIGeneral = CLI:section("cli", "status")

	local opt_enable = CLIGeneral:option("enabled")
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
	local opt_cli_wan_access = CLIGeneral:option("wan_access")
		function opt_cli_wan_access:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_cli_wan_access:set(value)
			self:table_set(self.config, self.sid, "_cliWanAccess", value)
		end
		function opt_cli_wan_access:get()
			return self:table_get(self.config, self.sid, "_cliWanAccess")
		end

	local opt_wan_port = CLIGeneral:option("wan_port")
		function opt_wan_port:validate(value)
			return self.dt:portrange(value)
		end
		function opt_wan_port:get(value)
			return value or self:table_get(self.config, self.sid, "port")
		end
end

	local opt_port = CLIGeneral:option("port")
		opt_port.cfg_require = true
		function opt_port:validate(value)
			return self.dt:portrange(value)
		end

	local opt_shell_limit = CLIGeneral:option("shell_limit")
		opt_shell_limit.cfg_require = true
		function opt_shell_limit:validate(value)
			return self.dt:range(value, 1, 10)
		end

return CLI