local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local route_util = require("api.network.routes.utils")

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

local static_ipv4_routes = ConfigService:new(flags)
static_ipv4_routes.interfaces = route_util.get_valid_interfaces(static_ipv4_routes)
static_ipv4_routes.rt_tables = get_routing_tables(static_ipv4_routes)

	local route = static_ipv4_routes:section("network", "route")
	function route:filter(options)
		if options["_hidden"] and options["_hidden"] == "1" then
			return false
		end
		return true
	end
	function route:create_defaults()
		return {
			table = "254",
			type = "unicast"
		}
	end

		local interface = route:option("interface")
			function interface:validate(value)
				return self.dt:check_array(value, self.interfaces)
			end

			function interface:get(value)
				if value then
					value = value:gsub("_4", "")
					return util.get_network_map(self, true)[value] or value
				end
				return nil
			end

			function interface:set(value)
				value = util.get_network_map(self)[value] or value
				if value ~= "" then
					local proto = self:table_get(self.config, value, "proto")
					if proto and proto == "wwan" then
						value = value .. "_4"
					end
					self:table_set(self.config, self.sid, self.api_key, value)
				else
					self:table_delete(self.config, self.sid, self.api_key)
				end
			end

		local target = route:option("target")
			function target:validate(value)
				return self.dt:ip4addr(value)
			end

		local netmask = route:option("netmask")
			function netmask:validate(value)
				return self.dt:netmask(value)
			end

		local gateway = route:option("gateway")
			function gateway:validate(value)
				return self.dt:ip4addr(value)
			end

		local metric = route:option("metric")
			function metric:validate(value)
				return self.dt:irange(value, 0, 4294967295)
			end

		local mtu = route:option("mtu")
			function mtu:validate(value)
				return self.dt:irange(value, 68, 9200)
			end

		local route_type = route:option("type")
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

		local table = route:option("table")
		table.cfg_require = true
			function table:validate(value)
				return self.dt:check_array(value, self.rt_tables)
			end

function static_ipv4_routes:GET_TYPE_status()
	local utils = require("api.network.routes.utils")
	self:ResponseOK(utils.get_routes(static_ipv4_routes, 4))
end

return static_ipv4_routes
