local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local board = require("vuci.board")

local LoginAttempts = ConfigService:new({
	create = false,
	delete = false,
	general_section = function(self)
		local sid
		self:table_foreach("ip_blockd", "globals", function(c)
			sid = c[".name"]
		end)
		return sid
	end
})

function LoginAttempts:PUT_after_commit_hook()
	util.ubus("ip_block", "reload")
end

local LoginAttemptsGeneral = LoginAttempts:section("ip_blockd", "globals")

	local opt_enabled = LoginAttemptsGeneral:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enabled:get()
			return self:table_get(self.config, self.sid, self.api_key) == "1" and "1" or "0"
		end

	local opt_enabled_time_based = LoginAttemptsGeneral:option("enabled_time_based")
		function opt_enabled_time_based:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_reboot_clear = LoginAttemptsGeneral:option("reboot_clear")
		function opt_reboot_clear:validate(value)
			return self.dt:is_bool(value)
		end

if not board:is_switch() then
	local opt_enable_mac_filter = LoginAttemptsGeneral:option("enable_mac_filter")
		function opt_enable_mac_filter:validate(value)
			return self.dt:is_bool(value)
		end
end

	local opt_max_attempt_count = LoginAttemptsGeneral:option("max_attempt_count")
		function opt_max_attempt_count:validate(value)
			return self.dt:irange(value, 1, 1000)
		end

return LoginAttempts