local ConfigService = require("api/ConfigService")

local DLMS = ConfigService:new({
	create = false,
	delete = false,
	global_settings = true,
	general_section = "main"
})


local enabled = DLMS:section("dlms_client", "main"):option("enabled")
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end
	
return DLMS