local ConfigService = require("api/ConfigService")

local network_usage_global = ConfigService:new({
	create = false,
	delete = false,
	global_settings = true,
	general_section = function(self)
		return self.uci:get_all("nlbwmon", "@nlbwmon[0]")[".name"]
	end
})

local s = network_usage_global:section("nlbwmon", "nlbwmon")

	local opt_enabled = s:option("enabled")
	opt_enabled.cfg_require = true
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_save_history = s:option("save_history")
		function opt_save_history:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_save_history:get()
			return self:table_get(self.config, self.sid, "database_generations") == "0" and "0" or "1"
		end
		function opt_save_history:set(value)
			self:table_set(self.config, self.sid, "database_generations", value or "0")
		end

return network_usage_global
