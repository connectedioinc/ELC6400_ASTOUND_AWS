local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local util = require("vuci.util")
local fs = require("nixio.fs")

local board = require("vuci.board")

local L2TP = ConfigService:new()

function L2TP:validate_options()
	local tunnel_id = self:get_abs_value(self.config, self.sid, "tunnel_id")
	local session_id = self:get_abs_value(self.config, self.sid, "session_id")
	self:table_foreach("network", "interface", function(c)
		if c.proto == "l2tpv3" and self.sid ~= c[".name"] then
			if tunnel_id and tunnel_id ~= "" and c.tunnel_id == tunnel_id then 
				self:add_critical_error(STD_CODES.INVALID_OPT, "The Tunnel ID is already being used by another instance.")
			end
			if session_id and session_id ~= "" and c.session_id == session_id then
				self:add_critical_error(STD_CODES.INVALID_OPT, "The Session ID is already being used by another instance.")
			end
		end
	end)
end

L2TP.PUT_validate_section_hook = L2TP.validate_options
L2TP.POST_validate_section_hook = L2TP.validate_options

function L2TP:update_firewall_zone()
	local instances = {}
	local enabled = false
	self:table_foreach("network", "interface", function (iface)
		if iface.proto == "l2tpv3" then
			table.insert(instances, iface)
		end
		if iface.proto == "l2tpv3" and iface.disabled ~= "1" then
			enabled = true
		end
	end)

	if #instances > 0 then
		local network, rule_opt = {}
		for _, instance in ipairs(instances) do
			if instance.disabled ~= "1" then
				if instance.udp_sport and instance.udp_dport then
					rule_opt = {
						name		= "Allow-"..instance[".name"].."-L2TPv3-traffic",
						target		= "ACCEPT",
						src			= "wan",
						family		= "any",
						dest_port	= {instance.udp_sport},
						dest_ip		= "0.0.0.0",
						proto		= "udp"
					}
				else
					rule_opt = {
						name		= "Allow-"..instance[".name"].."-L2TPv3-traffic",
						target		= "ACCEPT",
						src			= "wan",
						proto		= "115"
					}
				end
				util_tlt.ensure_vpn_rule_exists(self, rule_opt, { target = rule_opt.target, dest_port = rule_opt.dest_port, proto = rule_opt.proto })
			end
			table.insert(network, instance[".name"])
		end
		local l2tpv3_zone_opt = {
			name	= "l2tpv3",
			input	= "ACCEPT",
			forward	= "REJECT",
			output	= "ACCEPT",
			network = table.concat(network, " "),
			masq	= '1',
			device	= 'l2v3+'
		}

		if self.request_method == "POST" or self.request_method == "DELETE" then
			util_tlt.update_firewall_zone_network("l2tpv3", l2tpv3_zone_opt["network"], self.uci, true)
		end

		if enabled then
			local zone_name = util_tlt.ensure_zone_exists(self, l2tpv3_zone_opt, l2tpv3_zone_opt.network).name
			if zone_name == l2tpv3_zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name) end
		end
	else
		util_tlt.delete_zone_from_firewall(self, "l2tpv3", true, true)
		self:table_foreach("firewall", "rule", function(section)
			if section.name and string.match(section.name, "Allow%-[^%-]+%-L2TPv3-traffic") then
				util_tlt.delete_rule_from_firewall(self, section.name, true, true)
			end
		end)
	end
end

function L2TP:remove_port(ports)
	for i, v in ipairs(ports) do
		if v == self.sid or string.match(v, "@"..self.sid) or string.match(v, "l2v3%-"..self.sid) then
			table.remove(ports, i)
		end
	end
	return ports
end

function L2TP:remove_bridges()
	self:table_foreach("network", "device", function(s)
		if string.match(s[".name"], "^br_(.+)") then
			if s.ports then
				local ports = self:remove_port(s.ports)
				self:table_set("network", s[".name"], "ports", ports)
			end
		end
	end)
end

function L2TP:DELETE_after_data_hook()
	self:table_foreach("firewall", "rule", function(s)
		if s.name == "Allow-"..self.sid.."-L2TPv3-traffic" then
			self:table_delete("firewall", s[".name"])
		end
	end)
	self:remove_bridges()
end

function L2TP:POST_before_commit_hook()
	self:update_firewall_zone()
end

function L2TP:PUT_before_commit_hook()
	self:update_firewall_zone()
end

function L2TP:DELETE_before_commit_hook()
	self:update_firewall_zone()
	local failcount = "/tmp/l2tp/" .. self.sid .. ".failcount"
	if fs.access(failcount) then
		fs.remove(failcount)
	end
end

local L2TPv3 = L2TP:section("network", "interface")
L2TPv3:make_primary()
L2TPv3.default_options.id.maxlength = 8

function L2TPv3:filter(options)
	return options.proto == "l2tpv3"
end

function L2TPv3:create_defaults(name)
	return {
		_name = name,
		proto = "l2tpv3",
		disabled = "1",
		encap = "ip",
		l2spec_type = "default"
	}
end

	local opt_enabled = L2TPv3:option("enabled")
	opt_enabled.require = { ["1"] = { "tunnel_id", "session_id", "peeraddr", "peer_tunnel_id", "peer_session_id"} }
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enabled:set(value)
			self:table_set(self.config, self.sid, "disabled", value == "0" and "1" or "")
		end
		function opt_enabled:get()
			local service_disabled = self:table_get(self.config, self.sid, "disabled") == "1"
			return service_disabled and "0" or "1"
		end

	local opt_localaddr = L2TPv3:option("localaddr")
		function opt_localaddr:validate(value)
			return self.dt:ipaddr(value)
		end

	local opt_tunnel_id = L2TPv3:option("tunnel_id")
		function opt_tunnel_id:validate(value)
			return self.dt:irange(value, 1, 4294967295)
		end

	local opt_session_id = L2TPv3:option("session_id")
		function opt_session_id:validate(value)
			return self.dt:irange(value, 1, 4294967295)
		end

	local opt_cookie = L2TPv3:option("cookie")
		opt_cookie.maxlength = 16
		function opt_cookie:validate(value)
			return self.dt:hexstring(value)
		end

	local opt_peeraddr = L2TPv3:option("peeraddr")
		function opt_peeraddr:validate(value)
			return self.dt:host(value)
		end

	local opt_peer_tunnel_id = L2TPv3:option("peer_tunnel_id")
		function opt_peer_tunnel_id:validate(value)
			return self.dt:irange(value, 1, 4294967295)
		end

	local opt_peer_session_id = L2TPv3:option("peer_session_id")
		function opt_peer_session_id:validate(value)
			return self.dt:irange(value, 1, 4294967295)
		end

	local opt_peer_cookie = L2TPv3:option("peer_cookie")
		opt_peer_cookie.maxlength = 16
		function opt_peer_cookie:validate(value)
			return self.dt:hexstring(value)
		end

	local opt_bridge_to = L2TPv3:option("bridge_to")
		function opt_bridge_to:validate(value)
			local bridge_options = { "none" }
			self:table_foreach("network", "interface", function (iface)
				if iface.device and iface.device:match("^br") then
					local device = self:table_get("network", "br_" .. iface[".name"])
					if device and device.type and device.type == "bridge" then
						table.insert(bridge_options, iface[".name"])
					end
				end
			end)
			return self.dt:check_array(value, bridge_options)
		end
		function opt_bridge_to:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			self:remove_bridges()
			if value ~= "none" then
				local bridge_iface = self:table_get("network", value)
				if bridge_iface then
					local ports = self:table_get("network", string.gsub(bridge_iface.device, "-", "_"), "ports")  or {}
					table.insert(ports, "@"..self.sid)
					self:table_set("network", "br_"..value, "ports", ports)
				end
			end
		end

	local opt_ipaddr = L2TPv3:option("ipaddr")
		function opt_ipaddr:validate(value)
			return self.dt:ip4addr(value)
		end

	local opt_netmask = L2TPv3:option("netmask")
		function opt_netmask:validate(value)
			return self.dt:netmask(value)
		end

	local opt_ip6addr = L2TPv3:option("ip6addr")
		function opt_ip6addr:validate(value)
			return self.dt:cidr6(value)
		end

	local opt_mtu = L2TPv3:option("mtu")
		function opt_mtu:validate(value)
			return self.dt:irange(value, 68, 9200)
		end

	local opt_encap = L2TPv3:option("encap")
		opt_encap.require = { ["udp"] = { "udp_sport", "udp_dport" } }
		function opt_encap:validate(value)
			return self.dt:check_array(value, {"ip", "udp"})
		end

	local opt_udp_sport = L2TPv3:option("udp_sport")
		function opt_udp_sport:validate(value)
			return self.dt:port(value)
		end

	local opt_udp_dport = L2TPv3:option("udp_dport")
		function opt_udp_dport:validate(value)
			return self.dt:port(value)
		end

	local opt_l2spec_type = L2TPv3:option("l2spec_type")
		function opt_l2spec_type:validate(value)
			return self.dt:check_array(value, {
				"none", "default"
			})
		end

return L2TP
