local ConfigService = require("api/ConfigService")
local bgp_utils = require ("api/network/routes/dynamic_routes/bgp/bgp_utils")

local dynamic_bgp_route_map_filters = ConfigService:new({ anonymous = true })

	local filters = dynamic_bgp_route_map_filters:section("bgp", "bgp_route_map_filters")

	function dynamic_bgp_route_map_filters:parent_exists()
		bgp_utils.parent_exists(self, self.binding)
	end

	function filters:filter(s)
		if self.binding then
			return s.instance == self.binding
		else
			return s.instance == "general"
		end
	end

	function filters:create_defaults()
		local bgp_peer_exists = false
		self:table_foreach(self.config, "bgp_peer", function(s)
			bgp_peer_exists = true
		end)
		if not bgp_peer_exists then
			self:add_critical_error(STD_CODES.INVALID_OPT, "No bgp peers instance created")
		end

		local bgp_route_maps_exists = false
		self:table_foreach(self.config, "bgp_route_maps", function(s)
			bgp_route_maps_exists = true
		end)
		if not bgp_route_maps_exists then
			self:add_critical_error(STD_CODES.INVALID_OPT, "No bgp route maps instance created")
		end
		local response = {
			direction = "in",
			target = self.uci:get_all(self.config, "@bgp_peer[0]")[".name"],
			route_map = self.uci:get_all(self.config, "@bgp_route_maps[0]")[".name"]
		}
		if self.binding then response.instance = self.binding else response.instance="general" end
		return response
	end

		local instance = filters:option("instance")
		function instance:validate(value)
			return self.dt:string(value)
		end

		local enabled = filters:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

		local target = filters:option("target")
		function target:validate(value)
			local bgp_peers = {}
			self:table_foreach("bgp", "bgp_peer", function(c)
				table.insert(bgp_peers, c[".name"])
			end)
			return self.dt:check_array(value, bgp_peers)
		end

		local route_map = filters:option("route_map")
		function route_map:validate(value)
			local route_maps = {}
			self:table_foreach("bgp", "bgp_route_maps", function(c)
				table.insert(route_maps, c[".name"])
			end)
			return self.dt:check_array(value, route_maps)
		end

		local direction = filters:option("direction")
		function direction:validate(value)
			return self.dt:check_array(value, {"in", "out"})
		end

	function dynamic_bgp_route_map_filters:PUT_validate_section_hook()
		local target = self:get_abs_value(self.config, self.sid, "target")
		local route_map = self:get_abs_value(self.config, self.sid, "route_map")
		local direction = self:get_abs_value(self.config, self.sid, "direction")
		if not target or target == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: target")
		end
		if not route_map or route_map == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: route_map")
		end
		if not direction or direction == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: direction")
		end
	end

	function dynamic_bgp_route_map_filters:POST_validate_section_hook()
		local target = self:get_abs_value(self.config, self.sid, "target")
		local route_map = self:get_abs_value(self.config, self.sid, "route_map")
		local direction = self:get_abs_value(self.config, self.sid, "direction")
		if target == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: target")
		end
		if route_map == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: route_map")
		end
		if direction == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: direction")
		end
		bgp_utils:section_limit(self, "bgp_route_map_filters", self.binding, 50)
	end

return dynamic_bgp_route_map_filters
