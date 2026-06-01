local ConfigService = require("api/ConfigService")
local bgp_utils = require("api/network/routes/dynamic_routes/bgp/bgp_utils")
local vpn_utils = require("vuci.vpn")

local dynamic_bgp_peer = ConfigService:new()
-- exclude sit and wwan interfaces
dynamic_bgp_peer.ifnames = vpn_utils:get_all_devices({ sit = true, wwan = true })

	local peer = dynamic_bgp_peer:section("bgp", "bgp_peer")
	peer:make_primary()
	peer.default_options.id.maxlength = 32

	function dynamic_bgp_peer:parent_exists()
		bgp_utils.parent_exists(self, self.binding)
	end

	function peer:filter(s)
		if self.binding then
			return s.instance == self.binding
		else
			return s.instance == "general"
		end
	end

	function peer:create_defaults()
		if self.binding then
			return { instance = self.binding }
		else
			return { instance = "general" }
		end
	end

		local enabled = peer:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local as = peer:option("as")
			function as:validate(value)
				local valid, err = self.dt:uinteger(value)
				if not valid then return false, err end
				return self.dt:irange(value, 1, 4294967295)
			end

		local instance = peer:option("instance")
			function instance:validate(value)
				return self.dt:string(value)
			end

		local ipaddr = peer:option("ipaddr")
		-- Disabled till WebUI front-end stops creating empty configurations
		-- ipaddr.cfg_require = true
			function ipaddr:validate(value)
				return self.dt:ipaddr(value)
			end

		local port = peer:option("port")
			function port:validate(value)
				return self.dt:port(value)
			end

		local ebgp_multihop = peer:option("ebgp_multihop")
			function ebgp_multihop:validate(value)
				return self.dt:irange(value, 0, 255)
			end

		local default_originate = peer:option("default_originate")
			function default_originate:validate(value)
				return self.dt:is_bool(value)
			end

		local timer_keepalive = peer:option("timer_keepalive")
		timer_keepalive.require = { "timer_holdtime" }
			function timer_keepalive:validate(value)
				return self.dt:irange(value, 0, 65535)
			end

		local timer_holdtime = peer:option("timer_holdtime")
		timer_holdtime.require = { "timer_keepalive" }
			function timer_holdtime:validate(value)
				return self.dt:irange(value, 0, 65535)
			end

		local timer_connect = peer:option("timer_connect")
			function timer_connect:validate(value)
				return self.dt:irange(value, 1, 65535)
			end

		local description = peer:option("description")
			function description:validate(value)
				return self.dt:string(value)
			end

		local password = peer:option("password", { sensitive = true })
			password.maxlength = 80
			function password:validate(value)
				return self.dt:credentials_validate(value)
			end
		local weight = peer:option("weight")
			function weight:validate(value)
				return self.dt:irange(value, 0, 65535)
			end
		local allow_vpn = peer:option("allow_vpn")
			function allow_vpn:validate(value)
				return self.dt:is_bool(value)
			end
		local update_source = peer:option("update_source")
			function update_source:validate(value)
				local valid, err = self.dt:ip4addr(value)
				if valid then return true end
				local ifnames = {}
				for _, entry in ipairs(self.ifnames) do
					if entry.ifname then
						table.insert(ifnames, entry.ifname)
					end
				end
				local valid2, err2 = self.dt:check_array(value, ifnames)
				if not valid and not valid2 then return false, err .. " or " .. err2 end
				return true
			end

function dynamic_bgp_peer:check_vrf_usage()
	local bound_instance = self:table_get(self.config, self.sid, "instance")
	local allow_vpn = self:table_get(self.config, self.sid, "allow_vpn")
	local vrf_use = self:table_get(self.config, bound_instance, "vrf")
	if (vrf_use and vrf_use ~= "") and allow_vpn == 1 then
		self:add_critical_error(STD_CODES.INVALID_OPT, "VPN is not supported in non-core instances.")
	end
end

dynamic_bgp_peer.PUT_before_commit_hook = dynamic_bgp_peer.check_vrf_usage
dynamic_bgp_peer.POST_before_commit_hook = dynamic_bgp_peer.check_vrf_usage

function dynamic_bgp_peer:DELETE_after_data_hook(response_data)
	self:table_foreach(self.main_config, "access_list", function(s)
		if s.target == self.sid then
			self:table_delete(self.main_config, s[".name"])
		end
	end)
end

function dynamic_bgp_peer:DELETE_before_section_delete_hook()
	self:table_foreach(self.config, "bgp_route_map_filters", function(s)
		if s.target == self.sid then
			self:add_critical_error(STD_CODES.INVALID_OPT, "This instance is used by a route map filter")
		end
	end)
end

function dynamic_bgp_peer:POST_validate_section_hook()
	bgp_utils:section_limit(self, "bgp_peer", self.binding, 50)
end

function dynamic_bgp_peer:GET_TYPE_options()
	option_table = {}
	for _, int in ipairs(dynamic_bgp_peer.ifnames) do
		if int.service ~= "tailscale" then
			table.insert(option_table, int)
		end
	end
	return self:ResponseOK({ available_interfaces = option_table })
end

return dynamic_bgp_peer
