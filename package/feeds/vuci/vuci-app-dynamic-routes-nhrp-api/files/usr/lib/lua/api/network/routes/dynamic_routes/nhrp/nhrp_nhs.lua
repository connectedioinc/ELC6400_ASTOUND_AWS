local ConfigService = require("api/ConfigService")

local flags = {
	increment_name = true
}

local dynamic_nhrp_nhs = ConfigService:new(flags)

	local nhs = dynamic_nhrp_nhs:section("nhrp", function(self) return self.binding .. "_nhs" end)

		local enabled = nhs:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local nhs_address = nhs:option("nhs_address")
			function nhs_address:validate(value)
				if not self.dt:ipaddr(value) and value ~= "dynamic" then
					return false, "NHS must be an IP address or 'dynamic'"
				end
				return true
			end

		local nbma_address = nhs:option("nbma_address")
			function nbma_address:validate(value)
				return self.dt:host(value)
			end

return dynamic_nhrp_nhs
