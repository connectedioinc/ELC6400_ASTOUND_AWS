local pac = require("vuci.package_checker")
local board = require("vuci.board")
local uci

local devices_lib = {}

local type_map = {
	vxlan = pac.is_installed("kmod-vxlan") and function () return { "vxlan" } end or nil
}

if not board:is_switch() then
	type_map.bridge = function () return { "bridge" } end
	type_map.ethernet = function () return { "Network device" } end
end

function devices_lib:new(uci_cursor)
	uci = uci_cursor or require("vuci.uci").cursor()
	return self
end

function devices_lib:get_type_map()
	return type_map
end

local function get_device_stats(device)
	local device_stats = {
		id = device.id,
		name = device.name,
		description = device.description,
		up = device.up,
		carrier = device.carrier,
		type = device.type,
		["bridge-members"] = device["bridge-members"],
		macaddr = device.macaddr and string.upper(device.macaddr),
		mtu = device.mtu,
		virtual = device.virtual,
		tx_bytes = device.statistics and device.statistics.tx_bytes or 0,
		rx_bytes = device.statistics and device.statistics.rx_bytes or 0
	}
	return device_stats
end

local function get_non_dsa_vlans(devices)
	local board_ports = board:get_switch_ports()
	local readonly_vlans = board:get_readonly_vlans()
	local vlan0 = board:get_vlan0()

	local vlan_devices = {}
	if board_ports then
		for _, v in ipairs(board_ports) do
			if v.device then
				vlan_devices[v.device] = true
			end
		end
	end

	uci:foreach("network", "switch_vlan", function(s)
		if type(s.ports) ~= "string" or
			type(s.device) ~= "string" or
			s.isolation == "1"
		then
			return
		end

		for pnum in s.ports:gmatch("(%d+)([tu]?)") do
			local pnum_number = tonumber(pnum)
			if pnum_number and pnum_number >= 0 and pnum_number < 7 then
				local vid = tonumber(s.vid or s.vlan)
				if (vid and vid > readonly_vlans and vid <= 4095) or (vlan0 and vid == 0) then
					local iface
					if vlan_devices.eth0 and vlan_devices.eth1 then
						if pnum_number < 5 then
							iface = "eth0." .. vid
						elseif pnum_number == 5 then
							iface = "eth1." .. vid
						end
					else
						iface = "eth0." .. vid
					end
					if not devices[iface] then
						devices[iface] = {
							name = iface,
							up = false,
							type = "VLAN"
						}
					end
				end
			end
		end
	end)
end

local function get_default_lan_wan_devices(devices)
	local def_lan_devs = board:get_default_lan_ifname()
	if def_lan_devs then
		for _, d in ipairs(type(def_lan_devs) == "table" and def_lan_devs or {def_lan_devs}) do
			if not devices[d] then
				devices[d] = {
					name = d,
					type = d:match("%.") and "VLAN" or "Network device"
				}
			end
		end
	end

	local def_wan_dev = board:get_default_wan_ifname()
	if def_wan_dev and not devices[def_wan_dev] then
		devices[def_wan_dev] = {
			name = def_wan_dev,
			type = def_wan_dev:match("%.") and "VLAN" or "Network device"
		}
	end
end

local function get_vpn_devices(devices)
	local vpn_utils = require("vuci.vpn")
	for _, vpn in ipairs(vpn_utils:get_vpn_devices()) do
		if not devices[vpn.ifname] then
			devices[vpn.ifname] = {
				name = vpn.ifname,
				up = false
			}
		end
		devices[vpn.ifname].description = vpn.parent
		devices[vpn.ifname].type = "VPN"
	end
end

function devices_lib:get_device_status(sid, d_type, include_virtual)
	local util = require("vuci.util")
	local devices = util.ubus("network.device", "status") or {}
	local network_lib = require("vuci.network_lib")
	local fs = require "nixio.fs"
	local has_dsa = board:has_dsa()
	local devices_map, wlan_map, updated_devices = {}, {}, {}

	for iface in fs.dir("/sys/class/net") do
		local dev
		local link = fs.readlink("/sys/class/net/" .. iface)
		local virtual = (link and (not not link:match("/virtual/")))
		if link and (not virtual or include_virtual) then
			if not devices[iface] then
				dev = {
					name = iface,
					virtual = virtual,
				}
				devices[iface] = dev
			else
				dev = devices[iface]
				if not dev.name then dev.name = iface end
			end
			if (dev.type == "Network device" or not dev.type) and not dev.name:match("^wwan") and not dev.name:match("^wlan") then
				local dsa_cpu = not not fs.access("/sys/class/net/" .. (dev.name or "") .. "/dsa")
				if not dsa_cpu then
					dev.type = "ethernet"
				else
					dev.type = "DSA CPU"
				end
			end
		end
	end

	uci:foreach("network", "device", function (s)
		if s.name then
			devices_map[s.name] = s
		end
	end)

	network_lib:get_non_active_bridges(uci, devices)
	if has_dsa then
		network_lib:get_dsa_vlans(uci, devices, devices_map)
	else
		get_non_dsa_vlans(devices)
	end
	get_default_lan_wan_devices(devices)
	network_lib:get_wlan_devices(uci, devices, wlan_map)

	get_vpn_devices(devices)

	for dev_name, dev in pairs(devices) do
		local device = devices_map[dev_name] or {}
		dev.id = device[".name"] or dev_name
		dev.name = dev_name
		dev.description = device.description or dev.description
		if dev.type == "bridge" then
			if not dev["bridge-members"] then
				dev["bridge-members"] = {}
			end
			for _, ifname in ipairs(wlan_map[dev_name] or {}) do
				if not util.contains(dev["bridge-members"], ifname) then
					table.insert(dev["bridge-members"], ifname)
				end
			end
			for _, port in ipairs(device.ports or {}) do
				if not util.contains(dev["bridge-members"], port) then
					table.insert(dev["bridge-members"], port)
				end
			end
		end
		updated_devices[dev.id] = dev
	end

	local dev_type = type_map[d_type] and type_map[d_type]() or {}
	local key = "type"
	if sid then
		local device = updated_devices[sid]
		if not device then
			return {}, "Device '" .. sid .. "' not found"
		end
		local device_stats = get_device_stats(device)
		if d_type then
			if not util.contains(dev_type, device_stats[key]) then
				return {}, "Device '" .. sid .. "' by type '" .. d_type .. "' not found"
			end
		end
		return device_stats
	end

	local stats = {}
	for _, dev in pairs(updated_devices) do
		if d_type then
			for _, v in ipairs(dev_type) do
				if dev[key] == v then
					table.insert(stats, get_device_stats(dev))
				end
			end
		else
			table.insert(stats, get_device_stats(dev))
		end
	end
	return stats
end

return devices_lib
