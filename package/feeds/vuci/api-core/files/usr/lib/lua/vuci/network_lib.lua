local board = require("vuci.board")
local util = require("vuci.util")

local Network_lib = {}

NETWORK_CONFIG = "network"

function Network_lib:get_network_type(interface, uci)
	if board:is_switch() then return "wired" end

	local fs = require "nixio.fs"

	local NET_MAP = {
		{ device = "wwan", type = "mobile", proto = "wwan"},
		{ device = "wlan", type = "wireless", proto = "dhcp"},
		{ device = "connm", type = "mobile", proto = "connm"},
		{ device = "radio", type = "wireless", proto = "dhcp"}
	}

	local wan = board:get_default_wan_ifname()
	local lan = board:get_default_lan_ifname()

	if wan then
		table.insert(NET_MAP, 1, { device = wan, type = "wired", proto = {"static", "dhcp", "pppoe"}})
	end

	if lan then
		table.insert(NET_MAP, 2, { device = lan, type = "wired", proto = {"static", "dhcp"}})
	end

	local function get_network_type_by(type_by, type_value)
		for _, net in pairs(NET_MAP) do
			if type(net[type_by]) == "table" then
				for _, v in ipairs(net[type_by]) do
					if v == type_value then
						return net.type
					end
				end
			elseif net[type_by] == type_value then
				return net.type
			end
		end
	end

	local value, type_bridge
	local protocol = uci:get(NETWORK_CONFIG, interface, "proto")
	local device = uci:get(NETWORK_CONFIG, interface, "device") or ""

	uci:foreach(NETWORK_CONFIG, "device", function(s)
		if s.name == device and s.type == "bridge" then
			type_bridge = true
		end
	end)

	if protocol == "l2tp" then
		value = protocol
	end

	if type_bridge then
		value = "bridge"
	end

	if not value and fs.access("/etc/config/wireless") then
		uci:foreach("wireless", "wifi-iface", function(s)
			if s.network == interface then
				value = "wireless"
			end
		end)
	end

	if not value and protocol then
		local device = uci:get(NETWORK_CONFIG, interface, "device")
		value = device and get_network_type_by("device", device)

		if not value then
			value = get_network_type_by("proto", protocol)
		end
	end
	if not value and not protocol then
		value = "-"
	end
	if not value or interface == "lan_to_wan" then
		value = "wired"
	end

	return value
end

function Network_lib:get_cpu_port_num()
	local switch_ports = board:get_switch_ports()
	for _, port in pairs(switch_ports) do
		if port.device and port.num then
			return tostring(port.num)
		end
	end
	return "0"
end

local foreach = function (cs, ...)
	if cs.table_foreach then
		return cs:table_foreach(...)
	end
	return cs:foreach(...)
end

local get = function (cs, config, section, option)
	if cs.table_get then
		return cs:table_get(config, section, option)
	end
	if not option then
		return cs:get_all(config, section)
	end
	return cs:get(config, section, option)
end

-- Generates a rolling device name
function Network_lib:generate_device_name(cs, type)
	local device_name_map = {
		["8021q"] = "vlan",
		["8021ad"] =  "vlan"
	}
	local prefix = device_name_map[type] or type
	local nums = {}
	local missing_num = 1
	foreach(cs, NETWORK_CONFIG, "device", function(s)
		if not s[".name"] then return end
		local num = tonumber(string.match(s[".name"], "^" .. prefix .. "(%d+)$"))
		if num then table.insert(nums, num) end
	end)
	table.sort(nums)
	while nums[missing_num] == missing_num do
		missing_num = missing_num + 1
	end
	return prefix .. missing_num
end

function Network_lib:get_non_active_bridges(cs, devices)
	foreach(cs, "network", "device", function(s)
		if s.name and not devices[s.name] and s.type == "bridge" then
			devices[s.name] = {
				id = s[".name"],
				name = s.name,
				up = false,
				type = "bridge",
				["bridge-members"] = type( s.ports) == "table" and s.ports or { s.ports },
			}
		end
	end)
end

function Network_lib:get_dsa_vlans(cs, devices, devices_map)
	foreach(cs, "network", "bridge-vlan", function (s)
		if type(s.vlan) ~= "string" or type(s.device) ~= "string" then return end
		local bridge = devices_map[s.device]
		local bridge_vlan_name = s.device.."."..s.vlan
		local description = bridge and bridge.description and (bridge.description.."."..s.vlan) or nil
		devices_map[bridge_vlan_name] = {
			[".name"] = s[".name"],
			description = description
		}
		if not devices[bridge_vlan_name] then
			devices[bridge_vlan_name] = {
				id = s[".name"],
				name = bridge_vlan_name,
				description = description,
				type = "VLAN",
				up = false,
				carrier = false
			}
		end
	end)
end

function Network_lib:get_wlan_devices(cs, devices, wlan_map)
	if not board:has_wifi() then return end
	local CODES = require("api.network.wireless_codes")
	local wlan0_idx, wlan1_idx, separator = 0, 0, "-"

	foreach(cs, "wireless", "wifi-device", function(s)
		if s.type and s.type == CODES.WIFI_DRIVERS.QCAWIFI then
			separator = ""
		end
	end)

	foreach(cs, "wireless", "wifi-iface", function (s)
		local bridge_name_raw = get(cs, "network", s.network, "device")
		local bridge_name = string.match(bridge_name_raw or "", "^(.*)%.(%d+)$") or bridge_name_raw
		for _, dev in ipairs(util.to_table(s.device)) do
			local ifname_prefix = get(cs, "wireless", dev, "ifname_prefix")
			local ifname
			if ifname_prefix and s._device_id then
				ifname = ifname_prefix..separator..s._device_id
			else
				local hwmode = get(cs, "wireless", dev, "hwmode")
				if hwmode == "11g" then
					ifname = "wlan0-D-"..(wlan0_idx > 0 and wlan0_idx or "")
					wlan0_idx = wlan0_idx + 1
				else
					ifname = "wlan1-D-"..(wlan1_idx > 0 and wlan1_idx or "")
					wlan1_idx = wlan1_idx + 1
				end
			end

			-- ifnames with dynamic vlans
			local ifnames = { ifname }
			if s.ppsk then
				foreach(cs, "wireless", "wifi-vlan", function (v)
					if (v.iface and v.iface ~= s[".name"]) or (v.psk_group and v.psk_group ~= s.psk_group) or not v.name then return end
					table.insert(ifnames, ifname .. "-" .. v.name)
				end)
			end

			for _, ifn in pairs(ifnames) do
				if bridge_name then
					if not wlan_map[bridge_name] then
						wlan_map[bridge_name] = {}
					end
					table.insert(wlan_map[bridge_name], ifn)
				end
				if not devices[ifn] then
					devices[ifn] = {
						id = ifn,
						name = ifn,
						type = "wifi",
						up = false,
						carrier = false
					}
				else
					devices[ifn].type = "wifi"
				end
			end
		end
	end)
end

---comment
---@param cs Config service or uci
---@param port string Name of port
---@return bond table Bond config section or false if not found
function Network_lib:belongs_to_bond(cs, port)
	local bond
	foreach(cs, "network", "device", function(s)
		if s.type == "bond" and util.contains(s.ports or {}, port) then
			bond = s
			return false
		end
	end)
	return bond
end

-- TODO: Should be possible to move out options that are set here to a shared library and import their get/set functions
-- to required endpoint and here so that if in the future custom get/set operations are needed they could be maintained from one place
Network_lib.link_aggregation_endpoint_options = {
	["port_settings"] = {
		{ name="enable", config="tswconfig" },
		{ name="speed", config="tswconfig", setter = function(cs, config, sid, opt, value)
			if cs:table_get(config, sid) and not sid:match("^sfp") then cs:table_set(config, sid, opt, value) end
		end},
		{ name="duplex", config="tswconfig" },
		{ name="eee_enable", config="tswconfig" },
		{ name="auth_enable", config="tswconfig" },
		{ name="ingr_bw", config="tswconfig" },
		{ name="ingr_rate", config="tswconfig" },
		{ name="egr_bw", config="tswconfig" },
		{ name="egr_rate", config="tswconfig" },
		{ name="storm_mult", config="tswconfig" },
		{ name="storm_mult_rate", config="tswconfig" },
		{ name="storm_broad", config="tswconfig" },
		{ name="storm_broad_rate", config="tswconfig" },
		{ name="storm_uni", config="tswconfig" },
		{ name="storm_uni_rate", config="tswconfig" },
		{ name="storm_uni_type", config="tswconfig" },
		{ name="storm_multi_type", config="tswconfig" },
		{ name="qos_pri_group", config="tswconfig" },
		{ name="qos_pri_inner", config="tswconfig" },
		{ name="qos_pri_outer", config="tswconfig" },
		{ name="_isolated", config="tswconfig" },
		{ name="poe_enable", config="poe", setter = function(cs, config, sid, opt, value)
			if cs:table_get(config, sid) then cs:table_set(config, sid, opt, value ~= "" and value or "0") end
		end},
		{ name="stp_edge", config="tswconfig", value="0"},
		{ name="autoneg", config="tswconfig", setter = function(cs, config, sid, opt, value)
			if cs:table_get(config, sid) and not sid:match("^sfp") then cs:table_set(config, sid, opt, value) end
		end},
		{ name="advert", config="tswconfig", setter = function(cs, config, sid, opt, value)
			if cs:table_get(config, sid) and not sid:match("^sfp") then cs:table_set(config, sid, opt, value) end
		end}
	},
	["port_mirroring"] = {
		{ name="mirror", config="tswconfig", value="0"},
		{ name="ingress_ports", config="tswconfig", value=""},
		{ name="egress_ports", config="tswconfig", value=""}
	}
}

---comment Sets bond ports values specified in option_list to be the same as the main port of bond or a custom value.
---@param cs table Config service
---@param bond_ports table List of bond ports
---@param option_list table List of options to set, { name="option_name", config="config_name", value(optional)}
function Network_lib:unify_aggregation_config(cs, bond_ports, option_list)
	local values = {}
	local main_port = self:get_main_aggregation_port(bond_ports)
	for _, settings in ipairs(option_list) do
		values[settings.name] = settings.value or cs:table_get(settings.config, main_port, settings.name) or ""
	end

	for _, bond_port in ipairs(bond_ports) do
		for _, settings in ipairs(option_list) do
			if settings.setter then
				settings.setter(cs, settings.config, bond_port, settings.name, values[settings.name])
			elseif cs:table_get(settings.config, bond_port) then
				cs:table_set(settings.config, bond_port, settings.name, values[settings.name])
			end
		end
	end
end

---comment Unifies bond port configuration values to be the same as main bond port or a custom value
---@param cs any Config service
---@param bond_ports table List of bond ports
---@param endpoint string Endpoint which values needs to be unified or nil for all available
function Network_lib:unify_aggregation_ports(cs, bond_ports, endpoint)
	if endpoint then
		self:unify_aggregation_config(cs, bond_ports, self.link_aggregation_endpoint_options[endpoint])
	else
		for _, options in pairs(self.link_aggregation_endpoint_options) do
			self:unify_aggregation_config(cs, bond_ports, options)
		end
	end
end

---comment
---@param bond_ports table Table containing bond ports
---@return string Name Name of main bond port or an empty string
function Network_lib:get_main_aggregation_port(bond_ports)
	if not bond_ports then return "" end

	table.sort(bond_ports, function(a, b)
		name_a, num_a = a:match("(%a+)(%d+)")
		name_b, num_b = b:match("(%a+)(%d+)")

		-- "port" prefix should be prioritised over "sfp"
		if name_a ~= name_b then return name_a == "port" end

		if not num_a then return false end
		if not num_b then return true end

		return tonumber(num_a) < tonumber(num_b)
	end)

	return bond_ports[1]
end

-- If at least a single DHCP relay configuration exists
-- and modem supports "dhcp_filter" need set "dhcp" to 0
-- otherwise delete that option
function Network_lib:update_mobile_ipv4_conn_setup(cs)
	if not board:has_mobile() then return end

	local mdm = require("vuci.modem")
	local relay_count = 0

	local function foreach_dhcp_filter_modem_iface(cb)
		for modem_info in mdm:info_iterator() do
			if mdm:dhcp_filter_supported(modem_info.usb_id) then
				cs:table_foreach(NETWORK_CONFIG, "interface", function(s)
					if s.proto == "wwan" and s.modem == modem_info.usb_id then
						cb(s)
					end
				end)
			end
		end
	end

	cs:table_foreach("dhcp", "relay", function(s)
		relay_count = relay_count + 1
		return false
	end)

	foreach_dhcp_filter_modem_iface(function(s)
		if not board:has_static_mobile_ifaces() and relay_count == 0 then
			cs:table_delete(NETWORK_CONFIG, s[".name"], "dhcp")
		else
			cs:table_set(NETWORK_CONFIG, s[".name"], "dhcp", "0")
		end
	end)
end

function Network_lib:get_proto(value)
	return value == "wwan" and board:get_custom_proto() or value
end

function Network_lib:set_proto(value)
	return (value ~= nil and value == board:get_custom_proto()) and "wwan" or value
end

return Network_lib
