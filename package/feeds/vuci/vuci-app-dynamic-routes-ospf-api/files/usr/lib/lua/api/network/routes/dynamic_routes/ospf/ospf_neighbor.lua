local ConfigService = require("api/ConfigService")

local flags = {
	increment_name = true
}

local dynamic_ospf_neighbors = ConfigService:new(flags)

	local ospf_neighbor = dynamic_ospf_neighbors:section("ospf", "ospf_neighbor")

		local enabled = ospf_neighbor:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local neighbor = ospf_neighbor:option("neighbor")
			function neighbor:validate(value)
				return self.dt:ip4addr(value)
			end

		local priority = ospf_neighbor:option("priority")
			function priority:validate(value)
				return self.dt:irange(value, 0, 255)
			end

		local polling_interval = ospf_neighbor:option("polling_interval")
			function polling_interval:validate(value)
				return self.dt:irange(value, 1, 65535)
			end

return dynamic_ospf_neighbors
