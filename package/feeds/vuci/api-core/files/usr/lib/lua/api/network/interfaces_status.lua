local uci = require("vuci.uci").cursor()
local util = require "vuci.util"
local fs = require "nixio.fs"
local board = require("vuci.board")
local network_lib = require("vuci.network_lib")

local FunctionService = require("api/FunctionService")
local interfaces_status = FunctionService:new()

local NETWORK_CONFIG = "network"
local MWAN_CONFIG = "mwan3"
local EXCLUDE_PROTOS = {
    ["relay"] = true,
    ["sstp"] = true,
    ["pptp"] = true,
    ["gre"] = true,
    ["l2tp"] = true,
    ["l2tpv3"] = true,
    ["wireguard"] = true,
    ["mirror"] = true,
    ["vrf"] = true,
    ["openconnect"] = true,
    ["xfrm"] = true,
}
local VRF_MAP = {}

local _interface_dump, _device_status, _network_map, _network_device_map


local function validate_sid(s)
	if s[".type"] ~= "interface" or s[".name"] == "loopback" or s[".name"]:match("_static$") then
		return false
	end

	if EXCLUDE_PROTOS[s.proto ~= "none" and s.proto or VRF_MAP[s.device] or ""] then return false end

	return s.invisible ~= "1"
end

local function get_interface_dump()
	_interface_dump = _interface_dump or util.ubus("network.interface", "dump")
	_interface_dump = _interface_dump and _interface_dump.interface or _interface_dump
	return _interface_dump or {}
end

local function get_device_status()
	_device_status = _device_status or util.ubus("network.device", "status")
	return _device_status or {}
end

local function get_network_map()
	_network_map = _network_map or util.get_network_map(uci, true, true)
	return _network_map
end

local function get_network_device_map()
	_network_device_map = _network_device_map or util.get_network_map(uci, true, true, "device", "name")
	return _network_device_map
end

local function get_interface_ubus_data(interface)
	for _, intf in pairs(get_interface_dump()) do
		if intf.interface == interface then
			return intf
		end
	end
	return {}
end

local function get_gwaddr(interface_data)
	for _, route in pairs(interface_data.route or {}) do
		if route.target == "0.0.0.0" and route.mask == 0 then
			return route.nexthop
		end
	end
end

local function get_gw6addr(interface_data)
	for _, route in pairs(interface_data.route or {}) do
		if route.target == "::" and route.mask == 0 then
			return route.nexthop
		end
	end
end

local function get_ipaddrs(interface_data)
	local addrs = interface_data["ipv4-address"]
	local rv = {}

	if type(addrs) == "table" then
		for _, addr in ipairs(addrs) do
			rv[#rv+1] = "%s/%d" %{ addr.address, addr.mask }
		end
	end

	return rv
end

local function get_ip6addrs(interface_data)
	local addrs = interface_data["ipv6-address"]
	local rv = {}

	if type(addrs) == "table" then
		for _, addr in ipairs(addrs) do
			rv[#rv+1] = "%s/%d" %{ addr.address, addr.mask }
		end
	end

	addrs = interface_data["ipv6-prefix-assignment"]

	if type(addrs) == "table" then
		for _, addr in ipairs(addrs) do
			if type(addr["local-address"]) == "table" and
			   type(addr["local-address"].mask) == "number" and
			   type(addr["local-address"].address) == "string"
			then
				rv[#rv+1] = "%s/%d" %{
					addr["local-address"].address,
					addr["local-address"].mask
				}
			end
		end
	end

	return rv
end

local function get_ip6prefix(interface_data)
	local prefix = interface_data["ipv6-prefix"]
	if prefix and #prefix > 0 then
		return "%s/%d" %{ prefix[1].address, prefix[1].mask }
	end
end

local function get_active_mwan_interface()
	local members = {}

	uci:foreach("mwan3", "member", function(s)
		if s[".name"]:find("_member_mwan") and s.interface and s.metric then
			local metric = tonumber(s.metric)
			if metric then
				table.insert(members, { interface = s.interface, metric = metric })
			end
		end
	end)

	table.sort(members, function(a, b)
		return a.metric < b.metric
	end)

	for _, s in ipairs(members) do
		local status_file = "/tmp/run/mwan3track/" .. s.interface .. "/STATUS"
		if fs.access(status_file) and fs.readfile(status_file):match("online") then
			return s.interface
		end
	end

	return nil
end

function interfaces_status:initialize_hook()
	local includes = util.to_table(self.query_parameters.include)

	if util.contains(includes, "vpn") then
		EXCLUDE_PROTOS["sstp"] = false
		EXCLUDE_PROTOS["pptp"] = false
		EXCLUDE_PROTOS["gre"] = false
		EXCLUDE_PROTOS["l2tp"] = false
		EXCLUDE_PROTOS["l2tpv3"] = false
		EXCLUDE_PROTOS["wireguard"] = false
		EXCLUDE_PROTOS["openconnect"] = false
		EXCLUDE_PROTOS["xfrm"] = false
	end

	if util.contains(includes, "vrf") then
		EXCLUDE_PROTOS["vrf"] = false
	end

	uci:foreach("network", "device", function(s)
		if s.type == "vrf" then VRF_MAP[s.name] = "vrf" end
	end)
end

function interfaces_status:get_active_ifname()
	local addr4, addr6, mask, metric = "0.0.0.0", "::", 0, nil

	local active_wan = get_active_mwan_interface()

	if active_wan then
		return active_wan
	end

	for _, intf in pairs(get_interface_dump()) do
		if intf.route and intf.metric then
			for _, rt in pairs(intf.route) do
				if not rt.table and rt.mask == mask and (rt.target == addr4 or rt.target == addr6) then
					if not metric then
						metric = intf.metric
						active_wan = intf.interface
					elseif intf.metric < metric then
						metric = intf.metric
						active_wan = intf.interface
					end
				end
			end
		end
	end

	return active_wan or ""
end

local function mobile_proto(proto)
	return proto == "wwan"
end

local function get_ip6prefix_data(interface_data)
	local ipv6_prefixes = {}
	for _, v in pairs(interface_data or {}) do
		table.insert(ipv6_prefixes, { address = v.address, mask = v.mask })
	end
	return ipv6_prefixes
end

local function get_interface_status(intf_sec, main_wan)
	local function add_to_array(from, to)
		for _, v in pairs(from or {}) do
			table.insert(to, v)
		end
		return to
	end
	local status = {}
	local intf_ubus_data = get_interface_ubus_data(intf_sec[".name"])
	local intf_ubus_data4 = get_interface_ubus_data(intf_sec[".name"])
	local intf_ubus_data6 = get_interface_ubus_data(intf_sec[".name"])
	local intf_device_data = get_device_status()

	if mobile_proto(intf_sec.proto) then
		intf_ubus_data4 = get_interface_ubus_data(intf_sec[".name"].."_4")
		intf_ubus_data6 = get_interface_ubus_data(intf_sec[".name"].."_6")
		intf_device_data = intf_device_data[intf_ubus_data4.l3_device] or intf_device_data[intf_ubus_data6.l3_device]

		--Adding old logic as backup. Should be removed when device endpoint is fully implemented
		status.device = get_network_device_map()[intf_ubus_data4.l3_device or intf_ubus_data6.l3_device] or intf_ubus_data4.l3_device or intf_ubus_data6.l3_device
		status["macaddr"] = "00:00:00:00:00:00"
		local mdc = util.ubus("mdcollect", "get_raw_total", { iface = intf_sec[".name"] })
		if mdc then
			status.rx_bytes = mdc.rx or 0
			status.tx_bytes = mdc.tx or 0
		else
			status.tx_bytes = intf_device_data and intf_device_data.statistics and intf_device_data.statistics.tx_bytes
			status.rx_bytes = intf_device_data and intf_device_data.statistics and intf_device_data.statistics.rx_bytes
		end
		status.auto_apn = intf_sec.auto_apn
		status.apn = intf_sec.apn
		status.force_apn = intf_sec.force_apn
		status.area_type = intf_sec.area_type
		status.bringup = intf_sec.bringup
		status.sim = intf_sec.sim
		status.modem_id = intf_sec.modem
		status.main = (main_wan == intf_ubus_data4.interface or main_wan == intf_ubus_data6.interface) and "1" or nil
		status["dns-server"] = {}
		status["dns-server"] = add_to_array(intf_ubus_data4["dns-server"], status["dns-server"])
		status["dns-server"] = add_to_array(intf_ubus_data6["dns-server"], status["dns-server"])
		status.mtu = tonumber(intf_sec.mtu) or 1500
	else
		intf_device_data = intf_device_data[intf_ubus_data4.device or intf_sec.device]

		--Adding old logic as backup. Should be removed when device endpoint is fully implemented
		status.device = get_network_device_map()[intf_ubus_data4.device or intf_sec.device] or intf_ubus_data4.device or intf_sec.device
		status["macaddr"] = intf_device_data and intf_device_data.macaddr and string.upper(intf_device_data.macaddr)
		status.tx_bytes = intf_device_data and intf_device_data.statistics and intf_device_data.statistics.tx_bytes
		status.rx_bytes = intf_device_data and intf_device_data.statistics and intf_device_data.statistics.rx_bytes
		status["dns-server"] = intf_ubus_data["dns-server"]
		status.main = main_wan == intf_ubus_data.interface and "1" or nil
	end

	status.interface = intf_ubus_data.interface or intf_sec[".name"]
	status.id = intf_ubus_data.interface or intf_sec[".name"]
	status.area_type = intf_sec["area_type"]
	status["ipv6-prefix"] = get_ip6prefix_data(intf_ubus_data6["ipv6-prefix"])
	status["ipv6-prefix-assignment"] = get_ip6prefix_data(intf_ubus_data6["ipv6-prefix-assignment"])
	status["ipv4-address"] = intf_ubus_data4["ipv4-address"]
	status.is_up = intf_ubus_data.up and intf_device_data and intf_device_data.up or false
	status["proto"] = network_lib:get_proto(intf_ubus_data.proto or intf_sec.proto)
	status.up = intf_ubus_data.up
	status.errors = intf_ubus_data.errors
	status.uptime = intf_ubus_data.uptime
	status.gwaddr = get_gwaddr(intf_ubus_data4)
	status.gw6addr = get_gw6addr(intf_ubus_data6)
	status.ipaddrs = get_ipaddrs(intf_ubus_data4)
	status.ip6addrs = get_ip6addrs(intf_ubus_data6)
	status.ip6prefix = get_ip6prefix(intf_ubus_data6)
	status.data = intf_ubus_data.data
	status.subdevices = intf_device_data and intf_device_data["bridge-members"]
	status.name = get_network_map()[intf_sec[".name"]] or intf_sec[".name"]
	status.description = intf_sec.description
	status.network_type	= network_lib:get_network_type(intf_sec[".name"], uci)
	status.mwan_enabled = uci:get(MWAN_CONFIG, intf_sec[".name"], "enabled")
	status.pending = intf_ubus_data.pending
	status.enabled = intf_sec.disabled ~= "1"

	return status
end

function interfaces_status:GET()
	local stats, main_wan = {}, nil
	if self.sid then
		local section = uci:get_all(NETWORK_CONFIG, self.sid)
		if section and validate_sid(section) then
			main_wan = self:get_active_ifname()
			stats = get_interface_status(section, main_wan)
		else
			return self:ResponseNotFound("Interface '%s' does not exist." % self.sid)
		end
	else
		main_wan = self:get_active_ifname()
		uci:foreach(NETWORK_CONFIG, "interface", function(s)
			if validate_sid(s) then
				table.insert(stats, get_interface_status(s, main_wan))
			end
		end)
	end
	return self:ResponseOK(stats)
end

return interfaces_status
