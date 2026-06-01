local ConfigService = require("api/ConfigService")

local flags = {
	create = false,
	delete = false,
	general_section = "general",
	global_settings = true
}

local scheduler_general = ConfigService:new(flags)

	local general = scheduler_general:section("profiles", "general")

		local enabled = general:option('enabled')
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end
			function enabled:get(value)
				return value and value or "0"
			end

return scheduler_general
