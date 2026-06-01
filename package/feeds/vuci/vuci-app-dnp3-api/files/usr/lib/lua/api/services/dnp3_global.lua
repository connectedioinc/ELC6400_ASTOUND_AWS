local ConfigService = require("api/ConfigService")

local DNP3 = ConfigService:new({
	create = false,
	delete = false,
	general_section = "global",
	global_settings = true
})
-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

local enabled = DNP3:section("dnp3_client", "global"):option("client_enabled")
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end
	function enabled:get(value) 
		return self:table_get(self.config, self.sid, "enabled") 
	end
	function enabled:set(value)
		self:table_set(self.config, self.sid, "enabled", value)
	end

return DNP3

