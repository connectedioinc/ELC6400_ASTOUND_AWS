-- Copyright 2011 Jo-Philipp Wich <jow@openwrt.org>
-- Licensed to the public under the Apache License 2.0.

-- Modifications Copyright (C) 2021 Teltonika Networks

module("vuci.status", package.seeall)

local uci = require "uci".cursor()
local ipc = require "luci.ip"
local util = require "vuci.util"
local nixio = require "nixio"

local function in_same_subnet(ip1, ip2, mask)
    local function ip_to_int(ip)
        local o1 ,o2 ,o3, o4 = ip:match("(%d+)%.(%d+)%.(%d+)%.(%d+)")
        return tonumber(o1) * 16777216 + tonumber(o2) * 65536 + tonumber(o3) * 256 + tonumber(o4)
    end

    local ip1_int = ip_to_int(ip1)
    local ip2_int = ip_to_int(ip2)
    local mask_int = ip_to_int(mask)
    return nixio.bit.band(ip1_int, mask_int) == nixio.bit.band(ip2_int, mask_int)
end

local function get_lease_interface_v4(ip)
	local interface, sec_name, dnsmasq_conf = nil, nil, "/tmp/etc/dnsmasq.conf"

	uci:foreach("dhcp", "dnsmasq", function(s)
		sec_name = s[".name"]
	end)
	dnsmasq_conf = dnsmasq_conf .. "." .. sec_name

	local fd = io.open(dnsmasq_conf, "r")
	if fd then
		while true do
			local ln = fd:read("*l")
			if not ln then
				break
			else
				local intf, start_ip, end_ip, mask = ln:match("^dhcp%-range=set:(%S+),(%S+),(%S+),(%S+),%S+")
				if intf and start_ip and end_ip and mask then
					local start_range = ipc.new(start_ip, mask)
					local end_range = ipc.new(end_ip, mask)
					local lease_ip = ipc.new(ip, mask)
					if end_ip == "static" then
						if in_same_subnet(ip, start_ip, mask) then
							interface = util.network_mapper_get(uci, intf)
						end
					elseif (lease_ip:higher(start_range) and lease_ip:lower(end_range)) or lease_ip:equal(start_range) or (lease_ip:equal(end_range)) then
						interface = util.network_mapper_get(uci, intf)
					end
				end
			end
		end
		fd:close()
	end

	return interface
end

local function get_lease_interface_v6(device, ip)
	local intf_info = util.ubus("network.interface", "dump") or {}
	local interface, found = nil, false

	if not intf_info or not intf_info.interface then
		return interface
	end

	for _, intf in pairs(intf_info.interface) do
		if intf["l3_device"] and intf["l3_device"] == device then
			if intf["ipv6-prefix"] then
				for _, ipv6prefix in pairs(intf["ipv6-prefix"]) do
					local addr = ipc.new(ipv6prefix.address, ipv6prefix.mask)
					if addr:contains(ip) then
						interface = util.network_mapper_get(uci, intf["interface"])
						found = true
						break
					end
				end
			end

			if not found and intf["ipv6-prefix-assignment"] then
				for _, ipv6prefix_assig in pairs(intf["ipv6-prefix-assignment"]) do
					local addr = ipc.new(ipv6prefix_assig.address, ipv6prefix_assig.mask)
					if addr:contains(ip) then
						interface = util.network_mapper_get(uci, intf["interface"])
						found = true
						break
					end
				end
			end

			if found then
				break
			end
		end
	end

	return interface
end

local function find_lease_object_index(leases, duid, interface)
	local index = -1
	for id, v in pairs(leases) do
		if index == -1 and v.interface and v.duid and
			v.interface == interface and v.duid == duid then
			index = id
		end
	end

	return index
end

local function dhcp_leases_common(family)
	local rv = { }
	if family == 4 then
		local ipv4leases = util.ubus("dnsmasq", "ipv4leases") or {}

		for _, lease in pairs(ipv4leases.leases or {}) do
			table.insert(rv, {
				interface = get_lease_interface_v4(lease.address),
				expires  = lease.valid,
				macaddr  = ipc.checkmac(lease.mac) or "00:00:00:00:00:00",
				ipaddr   = lease.address,
				hostname = (lease.hostname ~= "") and lease.hostname or nil
			})
		end
	end

	if family == 6 then
		local ipv6leases = util.ubus("dhcp", "ipv6leases") or {}

		for device, v in pairs(ipv6leases.device or {}) do
			for _, lease in pairs(v.leases) do
				local duid, hostname, expires
				duid = lease.duid
				hostname = lease.hostname
				expires = lease.valid

				if lease["ipv6-addr"] then
					for _, ipv6addr_info in pairs(lease["ipv6-addr"]) do
						local interface = get_lease_interface_v6(device, ipv6addr_info.address)
						local index = find_lease_object_index(rv, duid, interface)

						if index > -1 then
							if not rv[index].ipv6addr then rv[index].ipv6addr = {} end
							table.insert(rv[index].ipv6addr, ipv6addr_info.address)
						else
							table.insert(rv, {
								expires = expires,
								interface = interface,
								hostname = hostname,
								duid = duid,
								ipv6addr = {ipv6addr_info.address}
							})
						end
					end
				end

				if lease["ipv6-prefix"] then
					for _, ipv6prefix_info in pairs(lease["ipv6-prefix"]) do
						local interface = get_lease_interface_v6(device, ipv6prefix_info.address)
						local index = find_lease_object_index(rv, duid, interface)

						if index > -1 then
							if not rv[index].ipv6prefix then rv[index].ipv6prefix = {} end
							table.insert(rv[index].ipv6prefix, {
								address = ipv6prefix_info.address,
								prefix_length = ipv6prefix_info["prefix-length"]
							})
						else
							table.insert(rv, {
								expires = expires,
								interface = interface,
								hostname = hostname,
								duid = duid,
								ipv6prefix = {address = ipv6prefix_info.address, prefix_length = ipv6prefix_info["prefix-length"]}
							})
						end
					end
				end
			end
		end
	end

	return rv
end

function dhcp_leases(family)
	return family and dhcp_leases_common(family) or {}
end

function wifi_network(id, uci, ntm)
	local net, is_up, an, assoclist = get_common_wifi_network_data(id, uci, ntm)
	if not net then return {} end

	local dev = net:get_device()
	local dev_info, dev_disabled, dev_band = {}, false, nil
	if dev then
		if #dev > 0 then
			dev_band = {}
			for _, d in ipairs(dev) do
				local disabled = d:get("disabled")
				dev_disabled = disabled == "1"
				if disabled ~= "1" then break end
			end
			for i, d in pairs(dev) do
				dev_info[i] = {}
				dev_info[i]["up"] = d:is_up()
				dev_info[i]["device"] = d:name()
				dev_info[i]["name"]   = d:get_i18n()
				dev_info[i]["pending"] = d:is_pending()
				dev_band[i] = d:band()
			end
		else
			dev_info["up"] = dev:is_up()
			dev_info["device"] = dev:name()
			dev_info["name"]   = dev:get_i18n()
			dev_info["pending"] = dev:is_pending()
			dev_disabled = dev:get("disabled") == "1"
			dev_band = dev:band()
		end
	end

	if dev then
		return {
			id         = id,
			name       = net:shortname(),
			link       = net:adminlink(),
			up         = is_up,
			mode       = net:active_mode(),
			ssid       = net:active_ssid(),
			bssid      = net:active_bssid(),
			encryption = net:active_encryption(),
			frequency  = net:frequency(),
			channel    = net:channel(),
			signal     = net:signal(),
			quality    = net:signal_percent(),
			noise      = net:noise(),
			bitrate    = net:bitrate(),
			ifname     = net:ifname(),
			country    = net:country(),
			txpower    = net:txpower(),
			txpoweroff = net:txpower_offset(),
			mesh_id    = net:mesh_id(),
			disabled   = dev_disabled,
			device     = dev_info,
			status = (dev_disabled == "1" or net:get("disabled") == "1") and "0" or "1",
			assoclist  = assoclist,
			num_assoc  = an,
			band = dev_band
		}
	else
		return nil
	end
end

function wifi_network_basic(id, uci, ntm)
	local net, is_up, an, assoclist = get_common_wifi_network_data(id, uci, ntm)
	if not net then return {} end

	local dev = net:get_device()
	local dev_info, dev_disabled, dev_band = {}, false, nil
	if dev then
		if #dev > 0 then
			dev_band = {}
			for _, d in ipairs(dev) do
				local disabled = d:get("disabled")
				dev_disabled = disabled == "1"
				if disabled ~= "1" then break end
			end
			for i, d in pairs(dev) do
				dev_info[i] = {}
				dev_info[i]["name"]   = d:name()
				dev_band[i] = d:band()
			end
		else
			dev_info["name"]   = dev:name()
			dev_band = dev:band()
			dev_disabled = dev:get("disabled") == "1"
		end
	end

	if dev then
		return {
			id         = id,
			name       = net:shortname(),
			link       = net:adminlink(),
			up         = is_up,
			mode       = net:active_mode(),
			ssid       = net:active_ssid(),
			bssid      = net:active_bssid(),
			encryption = net:active_encryption(),
			channel    = net:channel(),
			signal     = net:signal(),
			quality    = net:signal_percent(),
			noise      = net:noise(),
			ifname     = net:ifname(),
			mesh_id    = net:mesh_id(),
			disabled   = dev_disabled,
			assoclist  = assoclist,
			status = (dev_disabled == "1" or net:get("disabled") == "1") and "0" or "1",
			device = dev_info,
			num_assoc  = an,
			band = dev_band
		}
	else
		return nil
	end

end


function get_wifinet(id, uci, ntm)
	ntm = ntm or require "vuci.network".init(uci)
	local net = ntm:get_wifinet(id)
	if not net then
		net = ntm.wifinet(id)
	end

	return net
end

function get_wireless_status(ntm, net)
	local device = net:get_device() or {}
	local name = device.name and device:name() or nil
	local names = {}
	if not name then
		for _, dev in pairs(device or {}) do
			names[#names+1] = dev.name and dev:name()
		end
	end
	local status = ntm:get_wireless_status() or {}
	local wireless_status = status[name] or {}
	if #names > 0 then
		wireless_status = {}
		for i, n in pairs(names) do
			wireless_status[i] = status[n] or {}
		end
	end

	return wireless_status

end

function check_if_interface_up(net, wireless_status)
	local is_up = false
	if #wireless_status > 0 then
		for _, wifi_stat in pairs(wireless_status) do
			for _, intf in pairs(wifi_stat.interfaces or {}) do
				local ifnames = net:ifname()
				for _, ifn in pairs(type(ifnames) and ifnames or {ifnames}) do
					if intf.ifname == ifn then
						is_up = true
						break
					end
				end
				if is_up then
					break
				end
			end
			if is_up then
				break
			end
		end
	else
		for _, v in ipairs(wireless_status.interfaces or {}) do
			if v.ifname == net:ifname() then
				is_up = true
				break
			end
		end
	end

	return is_up
end

function get_associates(net)
	local an = 0
	local assoclist = net:assoclist()
	for _, a in pairs(assoclist or {}) do
		an = an + 1
	end

	return an, assoclist
end

function get_common_wifi_network_data(id, uci, ntm)
	local net = get_wifinet(id, uci, ntm)
	if not net then return nil end
	local wireless_status = get_wireless_status(ntm, net)
	local is_up = check_if_interface_up(net, wireless_status)
	local an, assoclist
	an, assoclist = get_associates(net)
	return net, is_up, an, assoclist
end


function wifi_networks(sids, uci)
	local ntm = require "vuci.network".init(uci)
	local rv = {}
	for _, sid in ipairs(sids) do
		rv[#rv+1] = wifi_network(sid, uci, ntm)
	end
	return rv
end

function switch_status(devs)
	local dev
	local switches = { }
	for dev in devs:gmatch("[^%s,]+") do
		local ports = { }
		local swc = io.popen("swconfig dev %s show"
			% vuci.util.shellquote(dev), "r")

		if swc then
			local l
			repeat
				l = swc:read("*l")
				if l then
					local port, up = l:match("port:(%d+) link:(%w+)")
					if port then
						local speed  = l:match(" speed:(%d+)")
						local duplex = l:match(" (%w+)-duplex")
						local txflow = l:match(" (txflow)")
						local rxflow = l:match(" (rxflow)")
						local auto   = l:match(" (auto)")

						ports[#ports+1] = {
							port   = tonumber(port) or 0,
							speed  = tonumber(speed) or 0,
							link   = (up == "up"),
							duplex = (duplex == "full"),
							rxflow = (not not rxflow),
							txflow = (not not txflow),
							auto   = (not not auto)
						}
					end
				end
			until not l
			swc:close()
		end
		switches[dev] = ports
	end
	return switches
end

local function round(num)
	return math.floor(num*100)/100
end

-- Returns memory usage in MB (default), KB or B
function memory_usage(unit, sysinfo)
	unit = unit or "MB"
	local divider = 1048576
	if unit == "KB" then
		divider = 1024
	elseif unit == "B" then
		divider = 1
	end
	sysinfo = sysinfo or util.ubus("system", "info") or {}
	local memory_usage = {}
	local meminfo = sysinfo.memory or {
		total = 0, free = 0, buffered = 0, shared = 0, available = 0
	}

	local ram_total = meminfo.total / divider
	local ram_free = meminfo.available / divider
	local ram_used = ram_total - ram_free
	local fs = require "nixio.fs"
	local statvfs = fs.statvfs("/usr/local")
	
	local flash_total = statvfs.blocks * statvfs.bsize
	local flash_free = statvfs.bfree * statvfs.bsize
	local flash_used = flash_total - flash_free

	memory_usage = {
		ram_total			= round(ram_total),
		ram_free			= round(ram_free),
		ram_used			= round(ram_used),
		ram_buffered		= round(meminfo.buffered / divider),
		ram_shared			= round(meminfo.shared / divider),
		ram_percentage		= math.min(100, round(100 * ram_used / ram_total)),
		flash_used			= round(flash_used/divider),
		flash_total			= round(flash_total/divider),
		flash_free			= round(flash_free/divider),
		flash_percentage	= math.min(100, round(100 * flash_used / flash_total))
	}

	return memory_usage
end
