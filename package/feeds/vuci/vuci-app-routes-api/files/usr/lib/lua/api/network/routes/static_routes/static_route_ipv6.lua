local fs = require("nixio.fs")
local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local route_util = require("api.network.routes.utils")

if not fs.access("/proc/net/ipv6_route") then
	return nil
end

local flags = {
	increment_name = true
}

local function get_routing_tables(self)
	local rt_tables = {"255", "254", "253", "220", "128"}
	self:table_foreach("network", "table", function(s)
		if s.id then
			table.insert(rt_tables, s.id)
		end
	end)
	return rt_tables
end

local static_ipv6_routes = ConfigService:new(flags)
static_ipv6_routes.interfaces = route_util.get_valid_interfaces(static_ipv6_routes)
static_ipv6_routes.rt_tables = get_routing_tables(static_ipv6_routes)

	local route6 = static_ipv6_routes:section("network", "route6")
	function route6:filter(options)
		if options["_hidden"] and options["_hidden"] == "1" then
			return false
		end
		return true
	end
	function route6:create_defaults()
		return {
			table = "254",
			type = "unicast"
		}
	end

		local interface = route6:option("interface")
			function interface:validate(value)
				return self.dt:check_array(value, self.interfaces)
			end

			function interface:get(value)
				if value then
					value = value:gsub("_6", "")
					return util.get_network_map(self, true)[value] or value
				end
				return nil
			end

			function interface:set(value)
				value = util.get_network_map(self)[value] or value
				if value ~= "" then
					local proto = self:table_get(self.config, value, "proto")
					if proto and proto == "wwan" then
						value = value .. "_6"
					end
					self:table_set(self.config, self.sid, self.api_key, value)
				else
					self:table_delete(self.config, self.sid, self.api_key)
				end
			end

		local target = route6:option("target")
			function target:validate(value)
				return self.dt:ipmask6(value)
			end

		local gateway = route6:option("gateway")
			function gateway:validate(value)
				return self.dt:ip6addr(value)
			end

		local metric = route6:option("metric")
			function metric:validate(value)
				return self.dt:irange(value, 0, 4294967295)
			end

		local mtu = route6:option("mtu")
			function mtu:validate(value)
				return self.dt:irange(value, 68, 9200)
			end

		local route_type = route6:option("type")
			function route_type:validate(value)
				local route_types = {
					"unicast",
					"local",
					"broadcast",
					"multicast",
					"unreachable",
					"prohibit",
					"blackhole",
					"anycast"
				}
				return self.dt:check_array(value, route_types)
			end

			function route_type:set(value)
				if value == "" then value = "unicast" end
				self:table_set(self.config, self.sid, self.api_key, value)
			end

		local table = route6:option("table")
		table.cfg_require = true
			function table:validate(value)
				return self.dt:check_array(value, self.rt_tables)
			end

function static_ipv6_routes:GET_TYPE_status()
	local utils = require("api.network.routes.utils")
	self:ResponseOK(utils.get_routes(static_ipv6_routes, 6))
end

return static_ipv6_routes
