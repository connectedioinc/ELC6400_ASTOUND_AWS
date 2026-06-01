local ConfigService = require("api/ConfigService")

local function get_areas(self)
	local areas, areas_names = {}, {}
	self:table_foreach("ospf", "ospf_area", function(s)
		if s.area == nil then return false end
		areas[s.area] = s[".name"]
		table.insert(areas_names, s[".name"])
	end)
	return areas, areas_names
end

local dynamic_ospf_network = ConfigService:new()
dynamic_ospf_network.areas, dynamic_ospf_network.areas_names = get_areas(dynamic_ospf_network)

	local ospf_network = dynamic_ospf_network:section("ospf", "ospf_network")
	ospf_network:make_primary()
	ospf_network.default_options.id.maxlength = 32

		local enabled = ospf_network:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local net = ospf_network:option("net")
			function net:validate(value)
				return self.dt:cidr4(value)
			end

		local area = ospf_network:option("area")
			-- Disabled till WebUI front-end stops creating empty configurations
			-- area.cfg_require = true
			function area:validate(value)
				return self.dt:check_array(value, self.areas_names)
			end

			function area:get(value)
				return self:table_get(self.config, self.sid, "area")
			end

			function area:set(value)
				self:table_set(self.config, self.sid, self.api_key, value)
			end

return dynamic_ospf_network
