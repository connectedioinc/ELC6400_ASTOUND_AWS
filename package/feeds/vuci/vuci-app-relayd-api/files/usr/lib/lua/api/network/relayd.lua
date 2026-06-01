local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local relayd = ConfigService:new({
	increment_name = true
})

function relayd:initialize_hook()
	local network_map_pretty = util.get_network_map(self, true)
	self.wireless_networks = {}
	self:table_foreach("wireless", "wifi-iface", function(s)
		if s.mode == "sta" then
			self.wireless_networks[#self.wireless_networks+1] = network_map_pretty[s.network] or s.network
		end
	end)
end

function relayd:get_relayd_zone()
	local zone
	self:table_foreach("firewall", "zone", function (s)
		if s.name == "relayd" then
			zone = s
			return false
		end
	end)
	return zone
end

function relayd:before_commit_hook()
	local fw = require "vuci.firewall".init(self.uci)
	local network_internal = util.get_network_map(self)
	local zone = relayd:get_relayd_zone()
	local firewall_zone = false
	local fwds, zone_networks, old_zones, inserted_networks = {}, {}, {}, {}

	if zone then
		local _old_zone = self:table_get("firewall", zone[".name"], "_old_zone") or {}
		if type(_old_zone) == "string" then
			_old_zone = {_old_zone}
		end
		for _, oz in ipairs(_old_zone) do
			local old_network, old_zone_name  = oz:match("^(%S+)%s+(%S+)$")
			if not old_network and not old_zone_name then
				old_zone_name = oz
				old_network = self:table_get("firewall", zone[".name"], "network")
			end
			local old_zone = fw:get_zone(old_zone_name)
			if old_zone then old_zone:add_network(old_network) end
		end
	end

	self:table_foreach(self.config, "relayd", function(s)
		local enabled = self:get_abs_value("network", s[".name"], "enabled")
		local network = self:get_abs_value("network", s[".name"], "network") or ""
		network = network_internal[network] or network
		local lan_mark = self:get_abs_value("network", s[".name"], "lan_mark") or ""
		lan_mark = network_internal[lan_mark] or lan_mark

		if enabled == "1" then
			firewall_zone = true
			local mark_zone = fw:get_zone_by_network(lan_mark)
			fwds[mark_zone and mark_zone:name() or lan_mark] = true
			if not inserted_networks[network] then
				inserted_networks[network] = true
				table.insert(zone_networks, network)
			end

			local old_zone = fw:get_zone_by_network(network)
			if old_zone and old_zone:name() == "relayd" then
				old_zone = nil
			end

			if old_zone then
				old_zone:del_network(network)
				table.insert(old_zones, network .. " " .. old_zone:name())
			end
		end
	end)

	local id
	if zone then
		if not firewall_zone then
			self:table_delete("firewall", zone[".name"])
		else
			self:table_set("firewall", zone[".name"], "_old_zone", #old_zones > 0 and old_zones or "")
			self:table_set("firewall", zone[".name"], "network", table.concat(zone_networks, " "))
		end
	else
		if firewall_zone then
			id = tonumber(self:next_id("firewall"))
			self:table_section("firewall", "zone", tostring(id), {
				network = table.concat(zone_networks, " "),
				name = "relayd",
				input = "REJECT",
				forward = "REJECT",
				output = "ACCEPT",
				log = "0",
				conntrack = "0",
				masq = "0",
				mtu_fix = "0",
				_old_zone = #old_zones > 0 and old_zones or ""
			})
		end
	end

	self:table_foreach("firewall", "forwarding", function (s)
		if s.dest == "relayd" or s.src == "relayd" then
			self:table_delete("firewall", s[".name"])
		end
	end)

	if firewall_zone then
		id = id and id + 1 or tonumber(self:next_id("firewall"))
		for mark_zone in pairs(fwds) do
			self:table_section("firewall", "forwarding", tostring(id), {
				name = "relayd_fwd_to_" .. mark_zone,
				dest = "relayd",
				src = mark_zone
			})

			id = id + 1

			self:table_section("firewall", "forwarding", tostring(id), {
				name = "relayd_fwd_from_" .. mark_zone,
				dest = mark_zone,
				src = "relayd"
			})

			id = id + 1
		end
	end
end
relayd.PUT_before_commit_hook = relayd.before_commit_hook
relayd.POST_before_commit_hook = relayd.before_commit_hook
relayd.DELETE_before_commit_hook = relayd.before_commit_hook

function relayd:after_data_hook()
	local network_internal = util.get_network_map(self)
	local network = self:get_abs_value(self.config, self.sid, "network")
	if network and network ~= "" then
		local values = util.split(network, "%s+", nil, true)
		if #values > 1 then
			network = values[2]
		end
		network = network_internal[network] or network
	else
		return self:table_delete(self.config, self.sid, "network")
	end
	local iface = self:get_abs_value(self.config, self.sid, "lan_mark")
	iface = network_internal[iface] or iface
	if not iface or iface == "" or iface == "none" then
		return self:table_set(self.config, self.sid, "network", network)
	end
	self:table_set(self.config, self.sid, "network", iface .. " " .. network)
end

relayd.PUT_after_data_hook = relayd.after_data_hook
relayd.POST_after_data_hook = relayd.after_data_hook

local s = relayd:section("relayd", "relayd")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"lan_mark"} }
		function enabled:validate(value)
			local ok, error = self.dt:is_bool(value)
			if not ok then return ok, error end

			local lan_network = self:getter_wrapped_abs_value(self.config, self.sid, "lan_mark")
			local internal_name = util.get_network_map(self)[lan_network] or lan_network
			if value == "1" and internal_name and #internal_name > 0 and self:table_get("dhcp", internal_name) then
				local dhcpv4_server = self:table_get("dhcp", internal_name, "ignore")
				local dhcpv6_server = self:table_get("dhcp", internal_name, "ignore_ipv6")

				if dhcpv4_server ~= "1" or dhcpv6_server ~= "1" then
					return false, "DHCPv4 or DHCPv6 server is running on '" .. lan_network .. "' interface, disable it first."
				end
			end
			return true
		end

	local network = s:option("network")
		network.require = {"lan_mark"}
		function network:validate(value)
			if #self.wireless_networks == 0 then
				return false, "No wireless clients configured."
			end
			return self.dt:check_array(value, self.wireless_networks)
		end
		function network:get(value)
			local net = value and util.split(value, "%s+", nil, true)[2]
			return util.network_mapper_get(self, net or value)
		end

	local lan_mark = s:option("lan_mark")
		function lan_mark:validate(value)
			local nets = { "none" }
			local available_protos = {"dhcp", "dhcpv6", "pppoe", "static"}
			self:table_foreach("network", "interface", function(s)
				if util.contains(available_protos, s.proto) and s.ifname ~= "lo" then
					nets[#nets+1] = s.name or s[".name"]
				end
			end)
			local ok, err = self.dt:check_array(value, nets)
			if not ok then
				return ok, err
					.. " Relayd section can only be created for interfaces with these protocols: 'dhcp', 'dhcpv6', 'pppoe', 'static'."
			end

			return true
		end
		function lan_mark:get(value) return util.network_mapper_get(self, value) or "none" end
		function lan_mark:set(value)
			if value == "none" then
				return self:table_delete(self.config, self.sid, self.api_key)
			end
			util.network_mapper_set(self, value)
		end

return relayd
