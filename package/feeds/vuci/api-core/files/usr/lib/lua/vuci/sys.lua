-- Copyright 2008 Steven Barth <steven@midlink.org>
-- Licensed to the public under the Apache License 2.0.

-- Modifications Copyright (C) 2021 Teltonika Networks

local io     = require "io"
local os     = require "os"
local table  = require "table"
local nixio  = require "nixio"
local fs     = require "nixio.fs"
local uci    = require "vuci.uci"
require("luci.ip")


local tonumber, ipairs, pairs, pcall, type, next, setmetatable, require, select, luci, vuci =
	tonumber, ipairs, pairs, pcall, type, next, setmetatable, require, select, luci, vuci


module "vuci.sys"

net = {}

local function _nethints(what, callback)
	local _, k, e, mac, ip, name, duid, iaid
	local cur = uci.cursor()
	local ifn = { }
	local hosts = { }
	local lookup = { }

	local function _add(i, ...)
		local k = select(i, ...)
		if k then
			if not hosts[k] then hosts[k] = { } end
			hosts[k][1] = select(1, ...) or hosts[k][1]
			hosts[k][2] = select(2, ...) or hosts[k][2]
			hosts[k][3] = select(3, ...) or hosts[k][3]
			hosts[k][4] = select(4, ...) or hosts[k][4]
		end
	end

	luci.ip.neighbors(nil, function(neigh)
		if neigh.mac and neigh.family == 4 then
			_add(what, neigh.mac:string(), neigh.dest:string(), nil, nil)
		elseif neigh.mac and neigh.family == 6 then
			_add(what, neigh.mac:string(), nil, neigh.dest:string(), nil)
		end
	end)

	if fs.access("/etc/ethers") then
		for e in io.lines("/etc/ethers") do
			mac, name = e:match("^([a-fA-F0-9:-]+)%s+(%S+)")
			mac = luci.ip.checkmac(mac)
			if mac and name then
				if luci.ip.checkip4(name) then
					_add(what, mac, name, nil, nil)
				else
					_add(what, mac, nil, nil, name)
				end
			end
		end
	end

	cur:foreach("dhcp", "dnsmasq",
		function(s)
			if s.leasefile and fs.access(s.leasefile) then
				for e in io.lines(s.leasefile) do
					mac, ip, name = e:match("^%d+ (%S+) (%S+) (%S+)")
					mac = luci.ip.checkmac(mac)
					if mac and ip then
						_add(what, mac, ip, nil, name ~= "*" and name)
					end
				end
			end
		end
	)

	cur:foreach("dhcp", "odhcpd",
		function(s)
			if type(s.leasefile) == "string" and fs.access(s.leasefile) then
				for e in io.lines(s.leasefile) do
					duid, iaid, name, _, ip = e:match("^# %S+ (%S+) (%S+) (%S+) (-?%d+) %S+ %S+ ([0-9a-f:.]+)/[0-9]+")
					mac = net.duid_to_mac(duid)
					if mac then
						if ip and iaid == "ipv4" then
							_add(what, mac, ip, nil, name ~= "*" and name)
						elseif ip then
							_add(what, mac, nil, ip, name ~= "*" and name)
						end
					end
				end
			end
		end
	)

	cur:foreach("dhcp", "host",
		function(s)
			for mac in vuci.util.imatch(s.mac) do
				mac = luci.ip.checkmac(mac)
				if mac then
					_add(what, mac, s.ip, nil, s.name)
				end
			end
		end)

	for _, e in ipairs(nixio.getifaddrs()) do
		if e.name ~= "lo" then
			ifn[e.name] = ifn[e.name] or { }
			if e.family == "packet" and e.addr and #e.addr == 17 then
				ifn[e.name][1] = e.addr:upper()
			elseif e.family == "inet" then
				ifn[e.name][2] = e.addr
			elseif e.family == "inet6" then
				ifn[e.name][3] = e.addr
			end
		end
	end

	for _, e in pairs(ifn) do
		if e[what] and (e[2] or e[3]) then
			_add(what, e[1], e[2], e[3], e[4])
		end
	end

	for _, e in pairs(hosts) do
		lookup[#lookup+1] = (what > 1) and e[what] or (e[2] or e[3])
	end

	if #lookup > 0 then
		lookup = vuci.util.ubus("network.rrdns", "lookup", {
			addrs   = lookup,
			timeout = 250,
			limit   = 1000
		}) or { }
	end

	local ipv6leases = vuci.util.ubus("dhcp", "ipv6leases")
	if ipv6leases then
		for device, v in pairs(ipv6leases.device) do
			for _, lease in pairs(v.leases) do
				if lease["hostname"] and lease["ipv6-addr"] then
					for _, lease_info in pairs(lease["ipv6-addr"]) do
						if lease_info["address"] then
							_add(what, lease["hostname"], nil, lease_info["address"], nil)
						end
					end
				end
			end
		end
	end

	for _, e in vuci.util.kspairs(hosts) do
		callback(e[1], e[2], e[3], lookup[e[2]] or lookup[e[3]] or e[4])
	end
end

--          Each entry contains the values in the following order:
--          [ "mac", "name" ]
function net.mac_hints(callback)
	if callback then
		_nethints(1, function(mac, v4, v6, name)
			name = name or v4
			if name and name ~= mac then
				callback(mac, name or v4)
			end
		end)
	else
		local rv = { }
		_nethints(1, function(mac, v4, v6, name)
			name = name or v4
			if name and name ~= mac then
				rv[#rv+1] = { mac, name or v4 }
			end
		end)
		return rv
	end
end

function getpasswd(username)
	local pwe = nixio.getsp and nixio.getsp(username) or nixio.getpw(username)
	local pwh = pwe and (pwe.pwdp or pwe.passwd)
	if not pwh or #pwh < 1 or pwh == "!" or pwh == "x" then
		return nil, pwe
	else
		return pwh, pwe
	end
end

function checkpasswd(username, pass)
	local pwh, pwe = getpasswd(username)
	if pwe then
		return (pwh == nil or nixio.crypt(pass, pwh) == pwh)
	end
	return false
end

--          Each entry contains the values in the following order:
--          [ "ip", "name" ]
function net.ipv4_hints(callback)
	if callback then
		_nethints(2, function(mac, v4, v6, name)
			name = name or mac
			if name and name ~= v4 then
				callback(v4, name)
			end
		end)
	else
		local rv = { }
		_nethints(2, function(mac, v4, v6, name)
			name = name or mac
			if name and name ~= v4 then
				rv[#rv+1] = { v4, name }
			end
		end)
		return rv
	end
end

function net.ipv6_hints(callback)
	if callback then
		_nethints(3, function(mac, v4, v6, name)
			name = name or mac
			if name and name ~= v6 then
				callback(v6, name)
			end
		end)
	else
		local rv = { }
		_nethints(3, function(mac, v4, v6, name)
			name = name or mac
			if name and name ~= v6 then
				rv[#rv+1] = { v6, name }
			end
		end)
		return rv
	end
end

function net.conntrack(callback)
	local ok, nfct = pcall(io.lines, "/proc/net/nf_conntrack")
	if not ok or not nfct then
		return nil
	end

	local line, connt = nil, (not callback) and { }
	for line in nfct do
		local fam, l3, l4, timeout, tuples =
			line:match("^(ipv[46]) +(%d+) +%S+ +(%d+) +(%d+) +(.+)$")

		if fam and l3 and l4 and timeout and not tuples:match("^TIME_WAIT ") then
			l4 = nixio.getprotobynumber(l4)

			local entry = {
				bytes = 0,
				packets = 0,
				layer3 = fam,
				layer4 = l4 and l4.name or "unknown",
				timeout = tonumber(timeout, 10)
			}

			local key, val
			for key, val in tuples:gmatch("(%w+)=(%S+)") do
				if key == "bytes" or key == "packets" then
					entry[key] = entry[key] + tonumber(val, 10)
				elseif key == "src" or key == "dst" then
					if entry[key] == nil then
						entry[key] = luci.ip.new(val):string()
					end
				elseif key == "sport" or key == "dport" then
					if entry[key] == nil then
						entry[key] = val
					end
				elseif val then
					entry[key] = val
				end
			end

			if callback then
				callback(entry)
			else
				connt[#connt+1] = entry
			end
		end
	end

	return callback and true or connt
end

function net.duid_to_mac(duid)
	local b1, b2, b3, b4, b5, b6

	if type(duid) == "string" then
		-- DUID-LLT / Ethernet
		if #duid == 28 then
			b1, b2, b3, b4, b5, b6 = duid:match("^00010001(%x%x)(%x%x)(%x%x)(%x%x)(%x%x)(%x%x)%x%x%x%x%x%x%x%x$")

		-- DUID-LL / Ethernet
		elseif #duid == 20 then
			b1, b2, b3, b4, b5, b6 = duid:match("^00030001(%x%x)(%x%x)(%x%x)(%x%x)(%x%x)(%x%x)$")

		-- DUID-LL / Ethernet (Without Header)
		elseif #duid == 12 then
			b1, b2, b3, b4, b5, b6 = duid:match("^(%x%x)(%x%x)(%x%x)(%x%x)(%x%x)(%x%x)$")
		end
	end

	return b1 and luci.ip.checkmac(table.concat({ b1, b2, b3, b4, b5, b6 }, ":"))
end

function httpget(url, stream, target)
	if not target then
		local source = stream and io.popen or vuci.util.exec
		return source("wget -qO- %s" % vuci.util.shellquote(url))
	else
		return os.execute("wget -qO %s %s" %
			{vuci.util.shellquote(target), vuci.util.shellquote(url)})
	end
end
