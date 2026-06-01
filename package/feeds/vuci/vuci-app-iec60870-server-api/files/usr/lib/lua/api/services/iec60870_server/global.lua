local ConfigService = require("api/ConfigService")

local iec60870_server = ConfigService:new({
	create = false,
	delete = false,
	global_settings = true,
	general_section = "main"
})

local main_section = iec60870_server:section("iec60870_server", "main")

local enabled = main_section:option("enabled")
enabled.cfg_require = true
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

return iec60870_server

