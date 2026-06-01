local ConfigService = require("api/ConfigService")

local flags = {
	increment_name = true
}

local dynamic_nhrp_mapping = ConfigService:new(flags)

	local map = dynamic_nhrp_mapping:section("nhrp", function(self) return self.binding .. "_map" end)

		local enabled = map:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local ip_addr = map:option("ip_addr")
			function ip_addr:validate(value)
				return self.dt:host(value)
			end

		local nbma = map:option("nbma")
			function nbma:validate(value)
				return self.dt:host(value)
			end

return dynamic_nhrp_mapping
