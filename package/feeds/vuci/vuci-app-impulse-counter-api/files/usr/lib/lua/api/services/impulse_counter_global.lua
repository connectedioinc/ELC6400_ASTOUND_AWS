local ConfigService = require("api/ConfigService")

local impulse_counter = ConfigService:new({
	create = false,
	delete = false,
	general_section = "general",
	global_settings = true
})

local s = impulse_counter:section("impulse_counter", "general")

	local enabled = s:option("enabled")
	enabled.cfg_require = true
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local count_store_duration = s:option("count_store_duration")
	count_store_duration.cfg_require = true
		function count_store_duration:validate(value)
			return self.dt:irange(value, 3600, 3456000)
		end

return impulse_counter
