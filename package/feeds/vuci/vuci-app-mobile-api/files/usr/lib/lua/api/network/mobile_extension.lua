local MobileExtension = {}

local bit = require("nixio").bit
local util = require("vuci.util")
local md = require("vuci.modem")
local board = require("vuci.board")
local board_modem = board:get_modem_info()
local modem_count = md:modem_count()
local pkg = require("vuci.package_checker")

local opt_apn

local has_quota_limit = pkg.is_installed("quota_limit")

local PDP_TYPE = {
    ip = 1,
    ipv6 = 2,
    ipv4v6 = 3
}

local function has_value(v)
	if not v then return false end
	if v == "" then return false end
	return true
end

-- Checks if proto is of mobile type
---@param proto nil|string Proto to check
---@return boolean mobile_proto True if proto is mobile
local function mobile_proto(proto)
	return proto == "wwan" or proto == "connm"
end

-- Helper to get current proto
---@param self table Current service
---@return boolean mobile_proto True if current proto is mobile
local function current_proto_mobile(self)
	return mobile_proto(self:get_abs_value(self.config, self.sid, "proto"))
end

-- Updates validation to always return true
---@param option table Option to set validation to
local function remove_validator(option)
	option.readonly = false
	option.validate = function () return true end
end

-- Extends function with another function
-- Return values from first function are packed and passed to f2 second parameter
---@param f1 function Function to extend
---@param f2 function Function to execute after f1
---@return function f3 Extended f1 function
local function extend(f1, f2)
	return function (self, ...)
		return f2(self, {f1(self, ...)}, ...)
	end
end

-- Gets modem by its usb_id
---@param modem_id string Modem usb_id
local function get_modem(modem_id)
	if not modem_id then return nil end
	for modem, online in md:info_iterator() do
		if modem.usb_id == modem_id then return modem, online end
	end
	return nil
end

-- Helper to check inversed logic on enabled/disabled option
---@param self any Current service
---@param sid string|nil Section id to check
---@return boolean enabled True if self.sid interface is enabled
local function is_enabled(self, sid)
	sid = sid or self.sid
	local enabled = self:get_abs_value(self.config, sid, "enabled")
	if enabled then return enabled == "1" end
	local disabled = self:table_get(self.config, sid, "disabled")
	return disabled ~= "1"
end

-- Marks modem and sim to disable auto apn later
---@param self table Current service
---@param modem string Modem usb id (3-1, 1-1.2...)
---@param sim string Modem SIM (1, 2)
---@param esim string|nil Modem eSIM (1, 2) or nil
local function mark_for_auto_apn_disable(self, modem, sim, esim)
	if not modem or not sim then return end
	self.disable_auto_apn = self.disable_auto_apn or {}
	self.disable_auto_apn[modem] = self.disable_auto_apn[modem] or {}
	self.disable_auto_apn[modem][sim] = self.disable_auto_apn[modem][sim] or {}
	if esim then
		self.disable_auto_apn[modem][sim][esim] = true
	end
end

-- Disables auto apn for marked interfaces
---@param self table Current service
local function disable_auto_apn(self)
	if not self.disable_auto_apn then return end

	self.uci:foreach(self.config, "interface", function (s)
		local name = s[".name"]
		local modem = self:get_abs_value(self.config, name, "modem")
		local sim = self:get_abs_value(self.config, name, "sim")
		if not modem or not sim or not is_enabled(self, name) then return end

		local esim = self:get_abs_value(self.config, name, "esim_profile")
		local auto_apn = self:get_abs_value(self.config, name, "auto_apn")
		if auto_apn == "1" and self.disable_auto_apn[modem] and self.disable_auto_apn[modem][sim] then
			if esim and not self.disable_auto_apn[modem][sim][esim] then return end
			self:table_set("network", name, "auto_apn", "0")
			self:table_set("network", name, "force_apn", "-1")
			self:add_message(1, ("Disabled auto APN for '%s' interface to enable multi APN."):format(name), name)
		end
	end)
end

-- Helper to check if there is an interface with the same modem, sim and esim_profile
---@param self table Current service
---@param sid string Section to ignore
---@param modem string Modem usb id (3-1, 1-1.2...)
---@param sim string Modem SIM (1, 2)
---@param esim string|nil Modem eSIM (1, 2) or nil
---@return table|nil section Section with the same modem and sim if exists
local function same_mobile_card(self, sid, modem, sim, esim)
	local exist
	self:table_foreach(self.config, "interface", function (s)
		if s[".name"] == sid then return end
		if s.modem ~= modem then return end
		if s.sim ~= sim then return end
		if s.esim_profile == esim then
			exist = s
			return false -- break
		end
	end)
	return exist
end

local function validate_framed_routing(self)
	if not self.current_data_block.framed_routing then return end
	if not current_proto_mobile(self) then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Option 'framed_routing' can only be set for mobile interfaces",
			"framed_routing"
		)
	end
	local modem = self:get_abs_value(self.config, self.sid, "modem")
	if not md:framed_routing_supported(modem) then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"This modem does not support framed routing",
			"framed_routing"
		)
	end
end

-- Validates multi apn selection and marks interfaces for auto apn disable
---@param self table Current service
local function validate_multi_apn(self)
	local modem = self:get_abs_value(self.config, self.sid, "modem")
	local sim = self:get_abs_value(self.config, self.sid, "sim")
	local esim = self:get_abs_value(self.config, self.sid, "esim_profile")
	if is_enabled(self) and modem and sim then
		local same = same_mobile_card(self, self.sid, modem, sim, esim)
		if same and is_enabled(self, same[".name"]) then
			if not md:multi_apn_supported(modem) then
				self:add_critical_error(STD_CODES.INVALID_OPT,
				"Multiple mobile interfaces are not supported on this device, only one mobile interface can be enabled at a time.",
				"enabled", 422, same[".name"])
			end
			mark_for_auto_apn_disable(self, modem, sim, esim)
		end
	end
end

-- Validates same pdp type for same apn
---@param self table Current service
local function validate_pdp_type(self)
	local function get_real_apn(id)
		local apn = self:get_abs_value(self.config, id, "apn")
		local force_apn = self:get_abs_value(self.config, id, "force_apn")
		if has_value(force_apn) then apn = md:get_apn_name(force_apn) or apn end
		return has_value(apn) and apn or nil
	end

	if not is_enabled(self) then return end
	local current_pdp = self:get_abs_value(self.config, self.sid, "pdptype")
	local modem = self:get_abs_value(self.config, self.sid, "modem")
	local sim = self:get_abs_value(self.config, self.sid, "sim")
	local esim = self:get_abs_value(self.config, self.sid, "esim_profile")
	local apn = get_real_apn(self.sid)

	local apn_pdp_ok = PDP_TYPE[current_pdp] or 0
	self:table_foreach(self.config, "interface", function (s)
		local name = s[".name"]
		if self.sid == name then return end -- Skip self.sid
		if not is_enabled(self, name) then return end -- Skip disabled ifaces
		if self:get_abs_value(self.config, name, "modem") ~= modem then return end -- Skip other modems
		if self:get_abs_value(self.config, name, "sim") ~= sim then return end -- Skip other sims
		if self:get_abs_value(self.config, name, "esim_profile") ~= esim then return end -- Skip other esim_profiles
		if get_real_apn(name) ~= apn then return end -- Skip different apns

		local pdp = self:get_abs_value(self.config, name, "pdptype")
		if bit.band(apn_pdp_ok, PDP_TYPE[pdp] or 0) ~= 0 then
			self:add_critical_error(STD_CODES.INVALID_OPT,
				("PDP type for same APN is in use by '%s'."):format(name),
				"apn", 422, self.sid)
			return false
		end
		apn_pdp_ok = bit.bor(apn_pdp_ok, PDP_TYPE[pdp] or 0)
	end)
end

local function validate_modem_iface_limit(self)
	local interfaces = 0
	local modem = self:get_abs_value(self.config, self.sid, "modem")
	local sim = self:get_abs_value(self.config, self.sid, "sim")
	local esim_profile = self:get_abs_value(self.config, self.sid, "esim_profile")
	if not modem or not sim then return end
	self:table_foreach(self.config, "interface", function (s)
		if self:get_abs_value(self.config, s[".name"], "modem") ~= modem then return end
		if self:get_abs_value(self.config, s[".name"], "sim") ~= sim then return end
		if self:get_abs_value(self.config, s[".name"], "esim_profile") ~= esim_profile then return end
		interfaces = interfaces + 1
	end)
	if (self.request_method == "PUT" and interfaces > 9)
	or (self.request_method == "POST" and interfaces >= 9) then
		self:add_critical_error(STD_CODES.INVALID_OPT,
			"Maximum number of interfaces reached for this SIM.",
			"sim", 422, self.sid)
	end
end

-- Resets SIM interface collected data
---@param interface string Interface name
---@param sim string|number SIM card id
local function reset_mdcollect_db(interface, sim)
	if interface and sim and tonumber(sim) then
		local log = require("vuci/log")
		util.ubus("mdcollect", "clean_db", { iface_name = interface, sim = tonumber(sim) })
		log:insert_eventslog({
			table = "events",
			sender = "Web UI",
			priority = "notice",
			text = ("%s interface database cleared"):format(interface)
		})
	end
end

-- Clears quota_limit for self.sid
---@param self table Current service
local function clear_quota_limit(self)
	if self:table_get("quota_limit", self.sid) then
		self:table_delete("quota_limit", self.sid)
	end
end

local function duplicate_firewall_rules(self)
	local rules_names, new_rules, default_rules = {}, {}, {}
	-- Rules to copy
	rules_names["Allow-DHCP-Renew"] = true
	rules_names["Allow-Ping"] = true
	rules_names["Allow-IGMP"] = true
	rules_names["Allow-DHCPv6"] = true
	rules_names["Allow-MLD"] = true
	rules_names["Allow-ICMPv6-Input"] = true
	rules_names["Allow-IPSec-ESP"] = true
	rules_names["Allow-ISAKMP"] = true

	default_rules["Allow-DHCP-Renew"] = {
		name = "Allow-DHCP-Renew-framed",
		src = "framed",
		proto = {"udp"},
		dest_port = "68",
		target = "ACCEPT",
		family = "ipv4"
	}
	default_rules["Allow-Ping"] = {
		name = "Allow-Ping-framed",
		src = "framed",
		proto = {"icmp"},
		icmp_type = "echo-request",
		target = "ACCEPT",
		family = "ipv4"
	}
	default_rules["Allow-IGMP"] = {
		name = "Allow-IGMP-framed",
		src = "framed",
		proto = {"igmp"},
		target = "ACCEPT",
		family = "ipv4"
	}
	default_rules["Allow-DHCPv6"] = {
		name = "Allow-DHCPv6-framed",
		src = "framed",
		proto = {"udp"},
		src_ip = "fc00::/6",
		dest_ip = "fc00::/6",
		dest_port = "546",
		family = "ipv6",
		target = "ACCEPT"
	}
	default_rules["Allow-MLD"] = {
		name = "Allow-MLD-framed",
		src = "framed",
		proto = {"icmp"},
		src_ip = "fe80::/10",
		icmp_type = {"130/0", "131/0", "132/0", "143/0"},
		family = "ipv6",
		target = "ACCEPT"
	}
	default_rules["Allow-ICMPv6-Input"] = {
		name = "Allow-ICMPv6-Input-framed",
		src = "framed",
		proto = {"icmp"},
		icmp_type = {"echo-request", "echo-reply", "destination-unreachable",
			"packet-too-big", "time-exceeded", "bad-header", "unknown-header-type",
			"router-solicitation", "neighbour-solicitation", "router-advertisement", "neighbour-advertisement"},
		limit = "1000/sec",
		family = "ipv6",
		target = "ACCEPT"
	}
	default_rules["Allow-IPSec-ESP"] = {
		name = "Allow-IPSec-ESP-framed",
		src = "framed",
		dest = "lan",
		proto = {"esp"},
		target = "ACCEPT"
	}
	default_rules["Allow-ISAKMP"] = {
		name = "Allow-ISAKMP-framed",
		src = "framed",
		dest = "lan",
		dest_port = "500",
		proto = {"udp"},
		target = "ACCEPT"
	}

	local priority = 0
	self:table_foreach("firewall", "rule", function (s)
		local current_priority = tonumber(s.priority)
		if current_priority and current_priority > priority then
			priority = current_priority
		end

		if s.name and rules_names[s.name] then
			local rule = self:table_get("firewall", s[".name"])
			rule[".name"] = nil
			rule[".anonymous"] = nil
			rule[".type"] = nil
			rule[".index"] = nil
			rule.src = "framed"
			rule.name = rule.name .. "-framed"
			table.insert(new_rules, rule)
			rules_names[s.name] = nil
		end
	end)

	for name in pairs(rules_names) do
		table.insert(new_rules, default_rules[name])
	end

	local id = self:next_id("firewall")
	for _, v in pairs(new_rules) do
		priority = priority + 1
		v.priority = priority
		self:table_section("firewall", "rule", id, v)
		id = tostring(tonumber(id) + 1)
	end
end

local function update_firewall(self, value)

	local function update_zone_network(remove_from, add_to)
		local network, add_networks = self.sid, {}

		local function remove_network(zone)
			local del_networks = {}
			for n in util.imatch(self:table_get("firewall", zone, "network") or "") do
				if n ~= network then
					del_networks[#del_networks+1] = n
				end
			end
			self:table_set("firewall", zone, "network", #del_networks > 0 and table.concat(del_networks, " ") or "")
		end

		-- Remove
		if not remove_from then
			self:table_foreach("firewall", "zone", function(s)
				remove_network(s[".name"])
			end)
		else
			remove_network(remove_from)
		end

		-- Add
		if self:table_get("firewall", add_to) then
			for n in util.imatch(self:table_get("firewall", add_to, "network") or "") do
				if n ~= network then
					add_networks[#add_networks+1] = n
				end
			end
			add_networks[#add_networks+1] = network
			self:table_set("firewall", add_to, "network", table.concat(add_networks, " "))
		end
	end

	local framed_zone, wan_zone
	self:table_foreach("firewall", "zone", function(s)
		if s.name and s.name == "framed" then
			framed_zone = s[".name"]
		end
		if s.name and s.name == "wan" then
			wan_zone = s[".name"]
		end
	end)

	if not framed_zone then
		framed_zone = self:next_id("firewall")
		self:table_section("firewall", "zone", framed_zone, {
			name = "framed",
			input = "REJECT",
			output = "ACCEPT",
			forward = "REJECT",
			masq = "0",
			mtu_fix = "1"
		})
		self:table_section("firewall", "forwarding", self:next_id("firewall"), {
			src = "lan",
			dest = "framed",
		})

		duplicate_firewall_rules(self)
	end

	if value == "1" then
		update_zone_network(wan_zone, framed_zone)
	else
		if wan_zone then
			update_zone_network(framed_zone, wan_zone)
		end
	end
end

function MobileExtension:POST_validate_section_hook(...)
	self.super:POST_validate_section_hook(...)
	validate_framed_routing(self)
	if not current_proto_mobile(self) then return end
	validate_multi_apn(self)
	validate_pdp_type(self)
	validate_modem_iface_limit(self)
end

function MobileExtension:PUT_validate_section_hook(...)
	self.super:PUT_validate_section_hook(...)
	validate_framed_routing(self)
	if not current_proto_mobile(self) then return end
	validate_multi_apn(self)
	validate_pdp_type(self)
	validate_modem_iface_limit(self)
end

function MobileExtension:DELETE_before_section_delete_hook(...)
	self.super:DELETE_before_section_delete_hook(...)
	if not current_proto_mobile(self) then return end

	if pkg.is_installed("mdcollectd") then
		local sim = self:table_get(self.config, self.sid, "sim")
		reset_mdcollect_db(self.sid, sim)
	end
	if has_quota_limit then
		clear_quota_limit(self)
	end
end

function MobileExtension:PUT_before_commit_hook(...)
	self.super:PUT_before_commit_hook(...)

	disable_auto_apn(self)
end

function MobileExtension:POST_before_commit_hook(...)
	self.super:POST_before_commit_hook(...)
	if not current_proto_mobile(self) then return end

	disable_auto_apn(self)
end

-- Hooks into *_after_data_hook
for _, method in ipairs({"POST", "PUT"}) do
	MobileExtension[method.."_after_data_hook"] = function (self, ...)
		self.super[method.."_after_data_hook"](self, ...)

		if not current_proto_mobile(self) then
			-- Clean up mobile options on ifaces switching to non mobile
			if method == "PUT" and mobile_proto(self.uci:get(self.config, self.sid, "proto")) then
				-- Removes mobile options when switching to non mobile proto
				for _, option in ipairs({
					"modem", "sim", "device", "framed_routing",
					"auth", "username", "password", "pref_apn",
					"pdptype", "auto_apn", "force_apn", "apn", "dhcpv6",
					board:has_static_mobile_ifaces() and "dhcp" or nil,
				}) do
					if not (self.config_set_table[self.config] and
						self.config_set_table[self.config][self.sid] and
						self.config_set_table[self.config][self.sid][option])
					then -- Delete if the new iface does not have such option
						self:table_delete(self.config, self.sid, option)
					end
				end
				clear_quota_limit(self)
			end
			return -- Skip the rest if not a mobile iface
		end

		-- Everything below only for mobile proto

		self:table_set(self.config, self.sid, "dhcpv6", "0")

		if board:has_static_mobile_ifaces() then
			self:table_set(self.config, self.sid, "dhcp", "0")
		end

		-- Only for custom ifname we need to set device
		local custom_ifname = board:get_custom_ifname()
		if custom_ifname then
			self:table_set(self.config, self.sid, "device", custom_ifname)
		else
			self:table_delete(self.config, self.sid, "device")
		end

		-- Delete br_* for mobile iface
		if self:table_get(self.config, "br_"..self.sid) then
			self:table_delete(self.config, "br_"..self.sid)
		end

		-- Add default data limit values
		if has_quota_limit and not self:table_get("quota_limit", self.sid) then
			self:table_section("quota_limit", "interface", self.sid, {})
		end

		-- Need call it here because it gets overwritten by the force_apn
		if self.current_data_block.apn then
			opt_apn:set(self.current_data_block.apn)
		end
	end
end

-- Enables dhcp v6 server on lan interface if its not enabled
---@param self table Current service
local function enable_lan_dhcpv6(self)
	local dhcp_lan = self:table_get("dhcp", "lan")
	if dhcp_lan then
		local options = {
			dhcpv6 = "server",
			ra_slaac = "1",
			ra_flags = { "managed-config", "other-config" },
			ra = "server",
			ignore_ipv6 = "0"
		}

		-- Sets options to enable ipv6 dhcp server
		for k, v in pairs(options) do
			self:table_set("dhcp", dhcp_lan[".name"], k, v)
		end
	end
end

-- Adds default values for SIM and modem when device has one of each
-- And removes validators for overrided values
---@param self table Current service
local function add_modem_and_sim_defaults(self)
	local current_modem = self:get_abs_value(self.config, self.sid, "modem")
	local current_sim = self:get_abs_value(self.config, self.sid, "sim")
	if current_modem and current_sim then return end
	local modem
	if not current_modem then
		if modem_count == 1 then
			-- Setting default modem for devices with one
			for m in md:info_iterator() do
				self.current_data_block.modem = m.usb_id
				remove_validator(self.super_options.modem)
				modem = m
				break
			end
		end
	end
	modem = modem or get_modem(current_modem or self.current_data_block.modem)
	if not modem then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Failed to get modem info.", "modem")
	end
	-- Setting default SIM for devices with one
	if not current_sim and modem and modem.simcount == 1 then
		self.current_data_block.sim = "1"
		remove_validator(self.super_options.sim)
	end
end

function MobileExtension:POST_section_init_hook()
	self.super:POST_section_init_hook()
	if not current_proto_mobile(self) then return end

	add_modem_and_sim_defaults(self)
end

-- Extends get_status function to have mobile status data.
---@param sname string Section name
---@return table|any status Updated status table or same data if it failed
function MobileExtension:get_status(sname)
	local data = self.super:get_status(sname)
	if type(data) ~= "table" then return data end
	if not mobile_proto(data.proto) then return data end

	local mobile_iface = self:table_get(self.config, sname)
	if not mobile_iface then return data end

	data.apn = mobile_iface.apn or md:get_apn_name(mobile_iface.force_apn)
	data.area_type = mobile_iface.area_type
	data.bringup = mobile_iface.bringup
	data.sim = mobile_iface.sim
	data.modem_name	= md:get_name(mobile_iface.modem)
	data.modem_id = mobile_iface.modem
	data.macaddr = "00:00:00:00:00:00"

	local mdc = util.ubus("mdcollect", "get_raw_total", { iface = sname })
	if mdc then
		data.rx_bytes = mdc.rx or 0
		data.tx_bytes = mdc.tx or 0
	end

	local ntm = require("vuci.network").init()
	local net = ntm:get_network(sname)
	local device = net and net:get_interface()

	local up = (net and net:is_up()) and device:is_up()
	if up then
		local net_mob_4 = ntm:get_network(sname.."_4")
		local net_mob_6 = ntm:get_network(sname.."_6")

		if net_mob_4 then
			data.ipaddrs = net_mob_4:ipaddrs() and net_mob_4:ipaddrs() or "-"
		end
		if net_mob_6 then
			data.ip6addrs = net_mob_6:ip6addrs() and net_mob_6:ip6addrs() or "-"
			data.ip6prefix = net_mob_6:ip6prefix() and net_mob_6:ip6prefix()
		end

		if not mdc and (net_mob_4 or net_mob_6) then
			local network = net_mob_4 or net_mob_6
			local mob_dev = network and network:get_interface()
			data.rx_bytes = mob_dev and mob_dev:rx_bytes() or 0
			data.tx_bytes = mob_dev and mob_dev:tx_bytes() or 0
		end
	end
	return data
end

function MobileExtension:PUT_section_init_hook()
	self.super:PUT_section_init_hook()
	if not current_proto_mobile(self) then return end

	local modem, online = get_modem(self:get_abs_value(self.config, self.sid, "modem"))
	if modem and not online then
		-- Allowed options if modem is down
		local allowed = {
			id = true,
			[".type"] = true,
			metric = true,
			enabled = true
		}
		local wrong_opt = false
		for opt in pairs(self.current_data_block) do
			if not allowed[opt] then wrong_opt = true break end
		end
		if wrong_opt then
			self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				"Can not modify interface, because modem is blocked or disabled",
				"Validation"
			)
		end
	end
	add_modem_and_sim_defaults(self)
end

-- Extends existing options with modem related logic
function MobileExtension:extend_options()
	local opt_proto = self.super_options.proto
		opt_proto.require = {
			wwan = {"modem", "sim"},
			connm = {"modem", "sim"}
		}
		opt_proto.extension_values = {board:get_custom_proto() or "wwan"}

	local opt_enabled = self.super_options.enabled
		opt_enabled.set = extend(opt_enabled.set, function (_, _, value)
			--- Removes bringup option that might be added via sms_utils sending mobileoff message
			if value == "1" and current_proto_mobile(self) then
				self:table_delete("network", self.sid, "bringup")
			end
		end)

	local opt_mtu = self.super_options.mtu
		opt_mtu.validate = extend(opt_mtu.validate, function (_, first, value)
			if current_proto_mobile(self) then
				return self.dt:irange(value, 68, 65535)
			end
			return unpack(first)
		end)

	local opt_bridge = self.super_options.bridge
		opt_bridge.validate = extend(opt_bridge.validate, function (_, first, value)
			if value ~= "0" and current_proto_mobile(self) then
				return false, "'bridge' option cannot be configured on mobile interface."
			end
			return unpack(first)
		end)

	local opt_igmp_snooping = self.super_options.igmp_snooping
		opt_igmp_snooping.validate = extend(opt_igmp_snooping.validate, function (_, first, value)
			if value ~= "0" and current_proto_mobile(self) then
				return false, "'igmp_snooping' option cannot be configured on mobile interface."
			end
			return unpack(first)
		end)
end

-- Adds additional mobile related options
function MobileExtension:additional_options()
	local s = self.super.sections[1]

	local function mobile_validation(self)
		if not current_proto_mobile(self) then
			return false, ("Option '%s' can only be set for mobile interfaces."):format(self.api_key)
		end
		return true
	end

	local opt_esim_profile = s:option("esim_profile")
		function opt_esim_profile:validate(value)
			local modem = self:get_abs_value(self.config, self.sid, "modem")
			local sim = self:get_abs_value(self.config, self.sid, "sim")
			local count = self:table_count("simcard", "sim", {
				modem = modem,
				position = sim or "1"
			})
			if count == 0 then return false, "No eSIM profiles found" end
			return self.dt:irange(value, 1, count)
		end
		function opt_esim_profile:get(value)
			if not value then
				local modem = self:get_abs_value(self.config, self.sid, "modem")
				local sim = self:get_abs_value(self.config, self.sid, "sim")
				if md:is_card_esim(modem, sim) then return "1" end
			end
			return tonumber(value) and tostring(tonumber(value) + 1) or value
		end
		function opt_esim_profile:set(value)
			value = tonumber(value) and tostring(tonumber(value) - 1) or value
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local opt_modem = s:option("modem")
		opt_modem.readonly = modem_count == 1
		function opt_modem:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			return self.dt:check_modem(value)
		end
		function opt_modem:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if value ~= "" and self:table_get("quota_limit", self.sid) then
				self:table_set("quota_limit", self.sid, self.api_key, value)
			end
		end

	local opt_sim = s:option("sim")
		function opt_sim:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			local modem = get_modem(self:get_abs_value(self.config, self.sid, opt_modem.api_key))
			if modem then
				return self.dt:irange(value, 1, modem.simcount)
			end
			return false, "'modem' option is missing."
		end
		function opt_sim:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if value ~= "" and self:table_get("quota_limit", self.sid) then
				self:table_set("quota_limit", self.sid, self.api_key, value)
			end
		end

	local opt_p2p = s:option("p2p")
		opt_p2p.require = { ["1"] = {"method", "proto"} }
		function opt_p2p:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			ok, err = self.dt:is_bool(value)
			if ok and value == "1" then
				local method = self:get_abs_value(self.config, self.sid, "method")
				local modem = self:get_abs_value(self.config, self.sid, "modem")
				local PPP = false
				for _, m in ipairs(board_modem) do
					if m.id == modem and m.type == "PPP" then
						PPP = true
						break
					end
				end
				if (method == "bridge" and not PPP) or method == "passthrough" then
					return true
				end
				return false, "p2p can only be enabled when mode is bridge or passthrough"
			end
			return ok, err
		end

	local opt_auth = s:option("auth")
		function opt_auth:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			return self.dt:check_array(value, {"none", "pap", "chap"})
		end

	local opt_pdptype = s:option("pdptype")
		function opt_pdptype:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			return self.dt:check_array(value, {"ip", "ipv6", "ipv4v6"})
		end
		function opt_pdptype:set(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			self:table_set(self.config, self.sid, self.api_key, value)
			if value == "ipv6" or value == "ipv4v6" then
				enable_lan_dhcpv6(self)
			end
		end

	local opt_method = s:option("method")
		function opt_method:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			ok, err = self.dt:check_array(value, {"nat", "bridge", "passthrough"})

			if not ok then return ok, err end

			if value == "bridge" or value == "passthrough" then
				self:table_foreach(self.config, "interface", function (sec)
					if mobile_proto(sec.proto) and (sec.method == "bridge" or sec.method == "passthrough") and sec[".name"] ~= self.sid then
						ok = false
						err = "Only one mobile interface can be in bridge or passtrough mode"
						return false -- break
					end
				end)
			end
			return ok, err
		end

	local opt_auto_apn = s:option("auto_apn")
		function opt_auto_apn:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			return self.dt:is_bool(value)
		end
		function opt_auto_apn:set(value)
			self:table_set("network", self.sid, self.api_key, value)
			if value == "1" then
				self:table_delete("network", self.sid, "force_apn")
			end
		end

	local opt_force_apn = s:option("force_apn")
		function opt_force_apn:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			return self.dt:uinteger(value)
		end
		function opt_force_apn:get(value)
			return value ~= "-1" and value or nil
		end
		function opt_force_apn:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if has_value(value) and value ~= "-1" then
				self:table_set(self.config, self.sid, "apn", md:get_apn_name(value) or "")
				self:table_set(self.config, self.sid, "auto_apn", "0")
			end
		end

	opt_apn = s:option("apn")
		opt_apn.maxlength = 62
		function opt_apn:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			local main_validation = "^[a-zA-Z0-9.-]+$"
			local err = ("Value must match the format: %s and should not start or end with '.' or '-'"):format(main_validation)
			return self.dt:fieldvalidation(value, main_validation) and
				not self.dt:fieldvalidation(value, "^[.-]") and -- No . or - in front
				not self.dt:fieldvalidation(value, "[.-]$"), err -- No . or - in back
		end
		function opt_apn:set(value)
			self:table_set("network", self.sid, self.api_key, value)
			if value then
				self:table_delete("network", self.sid, "force_apn")
				if not self.current_data_block.auto_apn then
					self:table_set("network", self.sid, "auto_apn", "0")
				end
			end
		end

	local passthrough_mode = s:option("passthrough_mode")
		function passthrough_mode:validate(value)
			local ok, err = mobile_validation(self)
			if not ok then return ok, err end

			return self.dt:is_bool(value)
		end
		function passthrough_mode:get(value)
			return value == "no_dhcp" and "1" or nil
		end
		function passthrough_mode:set(value)
			return self:table_set(self.config, self.sid, self.api_key, value == "1" and "no_dhcp" or "")
		end

	local opt_framed_routing = s:option("framed_routing")
		function opt_framed_routing:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_framed_routing:set(value)
			local cfg_value = self:table_get(self.config, self.sid, self.api_key) or "0"
			if value == cfg_value then return end

			self:table_set(self.config, self.sid, self.api_key, value)
			update_firewall(self, value)
		end
end

-- Extends get_data_from_arguments to handle esim_profile as 0 based
function MobileExtension:get_data_from_arguments(section, opt)
	local data = self.super:get_data_from_arguments(section, opt)
	if opt ~= "esim_profile" then return data end
	return (tonumber(data) and tostring(tonumber(data) - 1) or data)
end

return function(super)
	MobileExtension.super = super
	MobileExtension.super_options = setmetatable({}, {
		__index = function (_, k) -- Meta to easily access superclass options
			for _, v in ipairs(super.sections[1].options) do
				local key, option = next(v)
				if k == key then return option end
			end
		end
	})
	MobileExtension:extend_options()
	MobileExtension:additional_options()
	return setmetatable(MobileExtension, {
		__index = super,
		__newindex = super
	})
end
