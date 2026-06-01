local ConfigService = require("api/ConfigService")

local opcua_client = ConfigService:new({ create = false, delete = false, general_section = "main", global_settings = true })

local s = opcua_client:section("opcua_client", "main")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

local enabled = s:option("enabled")
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return opcua_client