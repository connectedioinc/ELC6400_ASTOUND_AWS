local util = require("vuci.util")
local uci = require("vuci.uci").cursor()
local vpn = {}

local function _add_devname(devnames, ifname, parent, child, service, interfaces, ports)
	if ifname then
		table.insert(devnames, { ifname = ifname, parent = parent, child = child, service = service, interfaces = interfaces, ports = ports })
	end
end

function vpn.get_vpn_devices(self)
	local ifnames = {}
	local devnames = {}
	local proto_map = {
		gre = "gre4-", xfrm = "", wireguard = "", pptp = "ppp-", sstp = "sstp-",
		l2tpv3 = "l2v3-", l2tp = "l2tp-", openconnect = "opc-"
	}

	uci:foreach("network", "interface", function(s)
		local prefix = proto_map[s.proto]
		if prefix ~= nil then
			_add_devname(devnames, prefix .. s[".name"], s.description or s[".name"], nil, s.proto)
		end
	end)

	uci:foreach("openvpn", "openvpn", function(s)
		_add_devname(devnames, s.dev, s.name, nil, "openvpn")
	end)

	uci:foreach("tinc", "tinc-net", function(s)
		_add_devname(devnames, "tinc_" .. s[".name"], s[".name"], nil, "tinc")
	end)

	uci:foreach("tailscale", "settings", function(s)
		_add_devname(devnames, "tailscale0", nil, nil, "tailscale")
	end)

	local function l2tp_pptp(service)
		uci:foreach(service .. "d", "service", function(s)
			local server_name = s.name
			uci:foreach(service .. "d", "login", function(l)
				_add_devname(devnames, l.device_name, server_name, l.username, service .. "_server")
			end)
		end)
	end
	l2tp_pptp("xl2tp")
	l2tp_pptp("pptp")

	uci:foreach("zerotier", "instance", function(s)
		uci:foreach("zerotier", "network_" .. s[".name"] , function(n)
			_add_devname(devnames, n.device_name, s.name, n.name, "zerotier")
		end)
	end)

	uci:foreach("eoip", "eoip", function(s)
		_add_devname(devnames, "eoip_" .. string.gsub(s[".name"], "inst", ""), nil, s.name, "eoip")
	end)

	return devnames
end

function vpn.get_network_devices(self, exclude_types)
	local ifnames, devnames, devs, interfaces = {}, {}, {}, {}
	local ntm = require "vuci.network".init(uci)
	local devices = ntm:get_devices()
	local exclude = exclude_types or { lo = true, sit = true, wwan = true }

	for devname, info in pairs(devices) do
		if not info.virtual and not exclude[devname:match("^[^%d]+")] and info.type ~= "bridge" then
			table.insert(devs, devname)
		end
	end

	if not exclude["lo"] then
			uci:foreach("network", "interface", function(s)
			if s.device == "lo" and not util.contains(devs, "lo") then
				table.insert(devs, s.device)
			end
		end)
	end

	uci:foreach("network", "interface", function(s)
		if s.proto == "wwan" then
			_add_devname(devnames, s[".name"], nil, nil, s.proto)
		end
	end)

	if #devs > 0 then
		for _, dev in ipairs(devs) do
			uci:foreach("network", "interface", function(s)
				if s.device and s.device == dev then
					table.insert(interfaces, s[".name"])
				end
			end)
			_add_devname(devnames, dev, nil, nil, nil, #interfaces > 0 and interfaces or nil)
			interfaces = {}
		end
	end

	uci:foreach("network", "device", function(s)
		if s.type == "bridge" then
			_add_devname(devnames, s.name, nil, nil, nil, nil, s.ports)
		end
	end)
	return devnames
end

function vpn.get_all_devices(self, exclude_types)
	local devnames = self:get_vpn_devices()
	local network_devices = self:get_network_devices(exclude_types)
	for _, dev in ipairs(network_devices) do
		table.insert(devnames, dev)
	end
	return devnames
end

function vpn.string_to_md5sum(value)
	local hash = util.trim(util.exec("echo -n " .. util.shellquote(value) .. "| /usr/bin/md5sum"))
	return hash:sub(1,-4)
end

function vpn.instance_nums(self, config, section, prefix, proto)
	local nums = {}
	local function get_num_name(s)
		local id, name
		if s.name and not s.description then
			name = tonumber(string.match(s.name, "^" .. prefix .. "(%d+)$"))
		elseif s.description then
			name = tonumber(string.match(s.description, "^" .. prefix .. "(%d+)$"))
		end
		id = tonumber(string.match(s[".name"], "^" .. prefix .. "(%d+)$"))
		return id, name
	end

	uci:foreach(config, section, function(s)
		if not proto or s.proto == proto then
			local id, name = get_num_name(s)
			if id then table.insert(nums, id) end
			if name then table.insert(nums, name) end
		end
	end)
	return nums
end

return vpn
