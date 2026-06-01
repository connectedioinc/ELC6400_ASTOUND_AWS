local ConfigService = require("api/ConfigService")

local internet = ConfigService:new({
	create = false,
	delete = false,
	general_section = "globals",
	global_settings = true
})

local s = internet:section("connchecker", "globals")

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local track_ipv4 = s:option("track_ipv4")
		function track_ipv4:validate(value)
			return self.dt:ip4addr(value)
		end

	local track_ipv6 = s:option("track_ipv6")
		function track_ipv6:validate(value)
			return self.dt:ip6addr(value)
		end

	local track_domain = s:option("track_domain")
		function track_domain:validate(value)
			return self.dt:hostname(value)
		end

	local interval = s:option("interval")
		interval.cfg_require = true
		function interval:validate(value)
			return self.dt:irange(value, 30, 86400)
		end

return internet
