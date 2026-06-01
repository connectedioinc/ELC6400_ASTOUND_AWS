local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local IgmpProxy = ConfigService:new({
	increment_name = true
})

local phyint = IgmpProxy:section("igmpproxy", "phyint")

local opt_direction = phyint:option("direction")
	function opt_direction:validate(value)
		return self.dt:check_array(value, {"upstream", "downstream"})
	end

local opt_network = phyint:option("network")
	opt_network.require = {"zone"}
	function opt_network:validate(value)
		local interfaces = {}
		self:table_foreach("xl2tpd", "service", function(s)
			if s.type == "server" then
				table.insert(interfaces, s[".name"])
			end
		end)
		self:table_foreach("pptpd", "service", function(d)
			if d.type == "server" then
				table.insert(interfaces, d[".name"])
			end
		end)
		self:table_foreach("network", "interface", function (val)
			if val[".name"] ~= "loopback" then
				table.insert(interfaces, val.name or val[".name"])
			end
		end)
		return self.dt:check_array(value, interfaces)
	end
	function opt_network:get(value) return util.network_mapper_get(self, value) end
	function opt_network:set(value) util.network_mapper_set(self, value) end

local opt_zone = phyint:option("zone")
	opt_zone.require = {"network"}
	function opt_zone:validate(value)
		local zones = {}
		self:table_foreach("firewall", "zone", function (val)
			table.insert(zones, val.name)
		end)
		return self.dt:check_array(value, zones)
	end

local opt_altnet = phyint:option("altnet", {list = true})
	function opt_altnet:validate(value)
		return self.dt:cidr4(value)
	end

function IgmpProxy:POST_validate_hook()
	if self.arguments.data.direction == "upstream" then
		self:table_foreach("igmpproxy", "phyint", function (val)
			if val.direction == "upstream" then
				self:add_critical_error(STD_CODES.INVALID_SECTION, "Only a single instance with upstream direction can be saved.", "igmp_routes")
			end
		end)
	end
end

return IgmpProxy