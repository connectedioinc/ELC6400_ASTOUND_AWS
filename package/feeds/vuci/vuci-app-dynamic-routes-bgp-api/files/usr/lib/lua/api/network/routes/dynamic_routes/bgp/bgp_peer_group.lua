local ConfigService = require("api/ConfigService")
local bgp_utils = require ("api/network/routes/dynamic_routes/bgp/bgp_utils")

local dynamic_bgp_peer_group = ConfigService:new()

	local peer_group = dynamic_bgp_peer_group:section("bgp", "bgp_peer_group")
	peer_group:make_primary()
	peer_group.default_options.id.maxlength = 32

	function dynamic_bgp_peer_group:parent_exists()
		bgp_utils.parent_exists(self, self.binding)
	end

	function peer_group:filter(s)
		if self.binding then
			return s.instance == self.binding
		else
			return s.instance == "general"
		end
	end

	function peer_group:create_defaults()
		if self.binding then
			return { instance = self.binding }
		else
			return { instance = "general" }
		end
	end

		local enabled = peer_group:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local as = peer_group:option("as")
			function as:validate(value)
				local valid, err = self.dt:uinteger(value)
				if not valid then return false, err end
				return self.dt:irange(value, 1, 4294967295)
			end

		local instance = peer_group:option("instance")
			function instance:validate(value)
				return self.dt:string(value)
			end

		local neighbor = peer_group:option("neighbor", { list = true })
			function neighbor:validate(value)
				return self.dt:ipaddr(value)
			end

		local adv_int = peer_group:option("adv_int")
			function adv_int:validate(value)
				return self.dt:irange(value, 0, 600)
			end

		local cl_config_type = peer_group:option("cl_config_type")
			function cl_config_type:validate(value)
				return self.dt:check_array(value, { "route-reflector-client", "route-server-client", "none" })
			end
			function cl_config_type:set(value)
				if value == "none" then
					self:table_set(self.config, self.sid, "cl_config_type", "")
				else
					self:table_set(self.config, self.sid, "cl_config_type", value)
				end
			end

		local next_hop_self = peer_group:option("next_hop_self")
			function next_hop_self:validate(value)
				return self.dt:is_bool(value)
			end

		local next_hop_self_all = peer_group:option("next_hop_self_all")
			function next_hop_self_all:validate(value)
				return self.dt:is_bool(value)
			end

		local soft_rec_inbound = peer_group:option("soft_rec_inbound")
			function soft_rec_inbound:validate(value)
				return self.dt:is_bool(value)
			end

		local con_check = peer_group:option("con_check")
			function con_check:validate(value)
				return self.dt:is_bool(value)
			end
		local listen_range = peer_group:option("listen_range")
			function listen_range:validate(value)
				return self.dt:ipmask(value)
			end

function dynamic_bgp_peer_group:DELETE_after_data_hook(response_data)
	self:table_foreach(self.main_config, "access_list", function(s)
		if s.target == self.sid then
			self:table_delete(self.main_config, s[".name"])
		end
	end)
end

function dynamic_bgp_peer_group:POST_validate_section_hook()
	bgp_utils:section_limit(self, "bgp_peer_group", self.binding, 50)
end

return dynamic_bgp_peer_group
