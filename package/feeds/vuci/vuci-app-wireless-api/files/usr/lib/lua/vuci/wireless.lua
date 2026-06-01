local ntm
local util = require "vuci.util"
local json = require "luci.jsonc"
local fs = require "nixio.fs"
local iwinfo = require "iwinfo"
local CODES = require("api.network.wireless_codes")

local wireless = {}

local _ubus_data, _active_dfs
local _iwinfo_data = {}

local function get_wifi_data(sname, uci)
	local wifi_data = {}
	_ubus_data = _ubus_data or util.ubus("network.wireless", "status") or {}
	for device, data in pairs(_ubus_data) do
		for _, iface in ipairs(data.interfaces or {}) do
			if iface.section == sname then
				local wifi_type = uci:get("wireless", device, "type")
				local is_ralink = _ubus_data[device].ralink or wifi_type == CODES.WIFI_DRIVERS.RALINK or wifi_type == CODES.WIFI_DRIVERS.QCAWIFI
				wifi_data[device] = {
					up = iface.ifname and true or false,
					is_ralink = is_ralink,
					iface = iface or {},
					data = data
				}
			end
		end
	end
	-- provide dummy values if ubus data is not available
	for _, device in ipairs(util.to_table(uci:get("wireless", sname, "device"))) do
		if not wifi_data[device] then
			wifi_data[device] = {
				up = false,
				is_ralink = false,
				iface = { config = {} },
				data = { config = {} }
			}
		end
	end
	return wifi_data
end

local function get_iwinfo_param(device, param)
	if not device or not param then return nil end
	if _iwinfo_data[device] and _iwinfo_data[device][param] then
		return _iwinfo_data[device][param]
	end
	local iwtype = _iwinfo_data[device] and _iwinfo_data[device].iwtype or iwinfo.type(device)
	local res = iwinfo[iwtype] and iwinfo[iwtype][param] and iwinfo[iwtype][param](device) or nil
	if not _iwinfo_data[device] then
		_iwinfo_data[device] = {}
	end
	_iwinfo_data[device].iwtype = iwtype
	_iwinfo_data[device][param] = res
	return res
end

local function get_raw_mode(iface, sname, uci)
	return iface.config.mode or uci:get("wireless", sname, "mode")
end

local function get_mode(iface, sname, uci)
	local raw_mode = get_raw_mode(iface, sname, uci)
	if raw_mode == "sta" then
		local multiple = uci:get("wireless", sname, "multiple") == "1"
		return multiple and "multi_ap" or "sta"
	end
	return raw_mode
end

local function get_ssid(iface, sname, uci)
	return iface.config.ssid or uci:get("wireless", sname, "ssid")
end

local function get_mesh_id(iface, sname, uci)
	return iface.config.mesh_id or uci:get("wireless", sname, "mesh_id")
end

local function get_band(data, device, uci)
	local hw_mode = data.config.hwmode or uci:get("wireless", device, "hwmode")
	return (hw_mode == "11a" or hw_mode == "11bea")  and "5GHz" or "2.4GHz"
end

local client_standards = {
	{ key = "he",  name = "Wi-Fi 6" },
	{ key = "vht", name = "Wi-Fi 5" },
	{ key = "ht",  name = "Wi-Fi 4" },
}
local function get_client_standard(client, band, interface_clients)
	local info = interface_clients[string.lower(client.macaddr or "")] or {}
	for _, std in ipairs(client_standards) do
		if info[std.key] then return std.name end
	end
	return band == "5GHz" and "802.11a" or "802.11b/g"
end

local function get_wifi_id(iface, sname, uci)
	return iface.config.wifi_id or uci:get("wireless", sname, "wifi_id")
end

local function get_encryption(iface, sname, uci)
	local raw_encryption = uci:get("wireless", sname, "encryption")
	local ppsk = uci:get("wireless", sname, "ppsk")
	if raw_encryption == "psk2" and ppsk then
		return "WPA2-PPSK (CCMP)"
	end
	local encryption = get_iwinfo_param(iface.ifname, "encryption")
	return get_wifi_interface_encryption(encryption and encryption.description, sname, uci)
end

local function get_channel(hostapd, data, device, uci)
	local cfg_channel = uci:get("wireless", device, "channel")
	return hostapd.channel or data.channel or get_iwinfo_param(device, "channel") or (cfg_channel and tonumber(cfg_channel) or nil)
end

local function get_bssid(hostapd, iface, uci, mode, assoclist)
	local bssid
	if mode == "ap" then
		bssid = hostapd.bssid or iface.config.bssid or get_iwinfo_param(iface.ifname, "bssid") or uci:get("wireless", iface.ifname, "bssid")
	else
		bssid = uci:get("wireless", iface.ifname, "bssid") or assoclist.results and assoclist.results[1] and assoclist.results[1].mac
	end

	return bssid and bssid:upper() or nil
end

local function get_dev_macaddr(iwtype, phyname, sname, uci)
	if iwtype == CODES.WIFI_DRIVERS.QCAWIFI then
		return uci:get("wireless", sname, "macaddr")
	elseif phyname then
		return fs.readfile("/sys/class/ieee80211/" .. phyname .. "/macaddress", 17)
	end
end

local function get_quality(ifname)
	local quality = get_iwinfo_param(ifname, "quality") or 0
	local quality_max = get_iwinfo_param(ifname, "quality_max") or 0
	return quality > 0 and quality_max > 0 and math.floor((100 / quality_max) * quality) or 0
end

local function get_name(mode, ssid, mesh_id)
	if not mode then return nil end
	if not ssid and not mesh_id then
		return mode .. " \"\""
	end
	return mode .. " \"" .. (ssid or mesh_id) .. "\""
end

local function get_ifname(iface, device, sname, uci)
	if iface.ifname then
		return iface.ifname
	end
	local separator = "-"
	if uci:get("wireless", device, "type") == CODES.WIFI_DRIVERS.QCAWIFI then
		separator = ""
	end

	local ifname_prefix = uci:get("wireless", device, "ifname_prefix")
	local ifname_id = uci:get("wireless", sname, "_device_id")
	return ifname_prefix and ifname_id and ifname_prefix .. separator .. ifname_id or nil
end

local function get_link(device, sname, uci)
	local i = 0
	uci:foreach("wireless", "wifi-iface", function (s)
		if util.contains(util.to_table(s.device), device) then
			i = i + 1
			if s[".name"] == sname then
				return false
			end
		end
	end)
	return device..".".. "network"..i
end

local function get_hardware_name_i18n(device)
	local hardware_name = _iwinfo_data[device].iwtype == "wl" and "Broadcom" or get_iwinfo_param(device, "hardware_name") or "Generic"
	local hwmodes = get_iwinfo_param(device, "hwmodelist") or {}
	local standard = {}
	for mode in pairs(hwmodes) do
		if hwmodes[mode] then
			table.insert(standard, mode)
		end
	end
	return "%s 802.11%s Wireless Controller (%s)" %{ hardware_name, table.concat(standard, "/"), device }
end

local function find_active_dfs(device, uci)
	if _active_dfs then return _active_dfs end

	local wifi_type = uci:get("wireless", device, "type")
	local active_dfs = {
		cac_active = false,
		cac_seconds = 0,
		cac_seconds_left = wifi_type ~= CODES.WIFI_DRIVERS.QCAWIFI and 0 or nil
	}
	local actions = {
		ap = function (ifname)
			if wifi_type ~= CODES.WIFI_DRIVERS.QCAWIFI then return util.ubus("hostapd." .. ifname, "get_status", {}, 5) end
			--QCAWIFI driver has CAC values exposed trough sysfs. See issue #28185
			local phy_name = get_iwinfo_param(device, "phyname")
			if not phy_name then return active_dfs end

			local cac_time = fs.readfile("/sys/class/ieee80211/" .. phy_name .. "/cac_timeout")
			return {
				dfs = {
					cac_active = fs.readfile("/sys/class/ieee80211/" .. phy_name .. "/cac_state", 1) == "1",
					cac_seconds = cac_time and tonumber((cac_time:gsub("\n", ""))) or 0
				}
			}
		end,
		mesh = function (ifname) return util.ubus("wpa_supplicant." .. ifname, "get_status") end
	}
	uci:foreach("wireless", "wifi-iface", function (s)
		if (s.mode == "ap" or s.mode == "mesh") and s.disabled ~= "1" and s._device_id and util.contains(util.to_table(s.device), "radio1") then
			local status = actions[s.mode](get_ifname(s, device, s[".name"], uci))
			if status and status.dfs and status.dfs.cac_active then
				active_dfs = status.dfs
				_active_dfs = active_dfs
				return false
			end
		end
	end)
	return active_dfs
end

local function get_hotspot_leases(mac, uci)
	local client = {}
	local rv = {}

	uci:foreach("chilli", "chilli", function(s)
		local section = s[".name"]
		local socket = "/var/run/chilli/chilli_%s.sock" % section

		if s.network and not s.network:match("wifi%d") then
			return false
		end

		if fs.access(socket) then
			local data = util.file_exec("/usr/sbin/chilli_query", { "-json", "-s", socket, "list" }) or {}
			rv = json.parse(data.stdout or "")

			if rv and rv.sessions then
				for n, ses in ipairs(rv.sessions) do
					if ses.macAddress and ses.macAddress == mac:gsub(":", "-") then
						client = {
							macaddr = mac,
							ipaddr = ses.ipAddress,
							hostname = ses.hostName
						}

						return false
					end
				end
			end
		end
	end)

	return client
end

local function get_arp_table(flush)
	local entries = {}
	local r, lines = pcall(io.lines, "/proc/net/arp")
	if r then
		for line in lines do
			local ipaddr, macaddr, device = line:match("(%S+) +%S+ +%S+ +(%S+) +%S+ +(%S+)")

			if ipaddr ~= "IP" then
				entries[#entries + 1] = {
					ipaddr = ipaddr,
					macaddr = macaddr,
					device = device
				}
			end
		end
	end
	return entries
end

local leases, arp
local function get_client(mac, uci, connected_clients)
	local client = {}
	leases = leases or require "vuci.status".dhcp_leases(4)

	for _, k in ipairs(leases) do
		if k.macaddr == mac then
			client = k
			break
		end
	end

	-- get ip address from arp table if not found in dhcp leases
	if not client.ipaddr then
		arp = arp or get_arp_table()
		for _, entry in ipairs(arp) do
				if string.upper(entry.macaddr or "") == mac then
						client.ipaddr = entry.ipaddr
						break
				end
		end
	end

	--If dhcp.leases file is empty, check hotspot leases
	local hs_client = get_hotspot_leases(mac, uci)
	-- merge tables
	for k,v in pairs(hs_client or {}) do client[k] = v end

	for _, k in pairs(connected_clients.results or {}) do
		if k.mac == mac then
			client.signal = k.signal .. " dBm"
			client.tx_rate = k.tx.rate * 1000
			client.rx_rate = k.rx.rate * 1000
			client.macaddr = client.macaddr or k.mac
			client.vlan = k.vlan
			client.vid = k.vid
			client.network = k.network
			client.username = k.username
		end
	end
	if client.signal then
		return client
	end

	return nil
end

local function get_clients(macs, uci, assoclist)
	local clients = {}
	for _, mac in ipairs(macs) do
		local client = get_client(mac, uci, assoclist)
		if client then
			clients[#clients+1] = client
		end
	end
	return clients
end

local function get_station_data(vlan_id, uci)
	local vlan = uci:get_all("wireless", vlan_id)
	local data = {}
	uci:foreach("wireless", "wifi-station", function (s)
		if (s.iface == vlan.iface or s.psk_group == vlan.psk_group) and s.vid == vlan.vid then
			data = s
			return false
		end
	end)
	return data
end

local function parse_assoclist(ifname, sname, uci)
	local assoclist = util.ubus("iwinfo", "assoclist", { device = ifname }) or { results = {} }
	if not uci:get("wireless", sname, "ppsk") then return assoclist end
	local network_map_pretty = util.get_network_map(uci, true, true)
	local psk_group = uci:get("wireless", sname, "psk_group")
	uci:foreach("wireless", "wifi-vlan", function (s)
		if (s.iface and s.iface ~= sname) or (s.psk_group and s.psk_group ~= psk_group) or not s.name then return end
		local assoc = util.ubus("iwinfo", "assoclist", { device = ifname .. "-" .. s.name }) or {}
		for _, data in pairs(assoc and assoc.results or {}) do
			data.vlan = s[".name"]
			data.vid = s.vid
			data.network = network_map_pretty[s.network] or s.network
			assoclist.results[#assoclist.results + 1] = data
		end
	end)

	for _, data in pairs(assoclist.results) do
		local station_data = get_station_data(data.vlan, uci)
		data.username = station_data.username
	end
	return assoclist
end

local function get_associates(assoclist)
	local formatted_asocclist = {}
	for _, assoc in ipairs(assoclist and assoclist.results or {}) do
		formatted_asocclist[assoc.mac] = {
			inactive = assoc.inactive,
			signal = assoc.signal,
			noise = assoc.noise,
			rx_short_gi = assoc.rx.short_gi,
			rx_packets = assoc.rx.packets,
			rx_vht = assoc.rx.vht,
			rx_mhz = assoc.rx.mhz,
			rx_he = assoc.rx.he,
			rx_ht = assoc.rx.ht,
			rx_mcs = assoc.rx.mcs,
			rx_nss = assoc.rx.nss,
			rx_rate = assoc.rx.rate * 1000,
			tx_short_gi = assoc.tx.short_gi,
			tx_packets = assoc.tx.packets,
			tx_vht = assoc.tx.vht,
			tx_mhz = assoc.tx.mhz,
			tx_he = assoc.tx.he,
			tx_ht = assoc.tx.ht,
			tx_mcs = assoc.tx.mcs,
			tx_nss = assoc.tx.nss,
			tx_rate = assoc.tx.rate * 1000,
			vlan = assoc.vlan,
			vid = assoc.vid,
			network = assoc.network
		}
	end
	return formatted_asocclist
end

function wireless:device_options(devname, uci)
	local opts = {}
	local iwtype = iwinfo.type(devname)
	if not iwtype then return nil end

	local hwmode = uci:get("wireless", devname, "hwmode") or ""

	opts.htmodelist = iwinfo[iwtype].htmodelist(devname)
	opts.countrylist = iwinfo[iwtype].countrylist(devname)
	opts.hwmodelist = {}
	for hwm, available in pairs(iwinfo[iwtype].hwmodelist(devname) or {}) do
	  if available then
		if hwmode ~= "11g" or hwm ~= "ac" then
		  opts.hwmodelist[hwm] = true
		end
	  end
	end
	opts.freqlist = {}
	for _, fr in pairs(iwinfo[iwtype].freqlist(devname) or {}) do
		if hwmode == "11g" and fr.channel and fr.channel <= 14 then
			table.insert(opts.freqlist, fr)
		elseif hwmode == "11a" and fr.channel and fr.channel > 14 then
			table.insert(opts.freqlist, fr)
		else
			table.insert(opts.freqlist, fr)
		end
	end
	opts.txpwrlist = iwinfo[iwtype].txpwrlist(devname)
	return opts
end

-- TODO remove deprecated info when the time comes
function wireless:interface_status(sname, uci)
	local wifi_data = get_wifi_data(sname, uci)
	local dev_count = 0
	local formatted_data = {
		id = sname,
		devices = {},
		clients = {},
		assoclist = util.table_to_json_object({}),
		ifname = {}, -- deprecated
		device = {}, -- deprecated
		band = {} -- deprecated
	}
	for _ in pairs(wifi_data) do
		dev_count = dev_count + 1
	end
	for device, wifi in pairs(wifi_data) do
		local hostapd, wpa_supplicant, supplicant_feats, assoclist = {}, {}, {}, {}
		local mode = get_raw_mode(wifi.iface, sname, uci)
		local ssid = get_ssid(wifi.iface, sname, uci)
		local mesh_id = get_mesh_id(wifi.iface, sname, uci)
		local band = get_band(wifi.data, device, uci)
		local frequency = get_iwinfo_param(device, "frequency")
		local hwmode = uci:get("wireless", device, "hwmode")
		if dev_count == 1 then -- until deprecation
			formatted_data.ifname = get_ifname(wifi.iface, device, sname, uci)
			formatted_data.band = band
			formatted_data.device = {
				device = device,
				pending = wifi.data.pending,
				up = wifi.data.up,
				name = get_hardware_name_i18n(device)
			}
		else
			table.insert(formatted_data.ifname, get_ifname(wifi.iface, device, sname, uci))
			table.insert(formatted_data.band, band)
			table.insert(formatted_data.device, {
				device = device,
				pending = wifi.data.pending,
				up = wifi.data.up,
				name = get_hardware_name_i18n(device)
			})
		end
		formatted_data.wifi_id = formatted_data.wifi_id or get_wifi_id(wifi.iface, sname, uci)
		formatted_data.up = formatted_data.up or wifi.up -- at least one interface is up
		formatted_data.disabled = wifi.data.disabled -- deprecated
		formatted_data.country = wifi.data.config.country -- deprecated
		formatted_data.link = get_link(device, sname, uci) -- deprecated
		formatted_data.name = formatted_data.name or get_name(mode, ssid, mesh_id) -- deprecated
		formatted_data.bitrate = formatted_data.bitrate or (get_iwinfo_param(wifi.iface.ifname, "bitrate") or 0) * 1000 -- deprecated
		formatted_data.frequency = formatted_data.frequency or tonumber(frequency) and tonumber(frequency) > 0 and "%.03f" % (frequency / 1000) or 0 -- deprecated
		formatted_data.ssid = ssid
		formatted_data.mesh_id = mesh_id
		formatted_data.mode = mode
		formatted_data.multiple = mode == "sta" and uci:get("wireless", sname, "multiple") == "1" or nil -- multi_ap flag
		formatted_data.encryption = formatted_data.encryption or get_encryption(wifi.iface, sname, uci)
		if wifi.iface.ifname then
			assoclist = parse_assoclist(wifi.iface.ifname, sname, uci)
			hostapd = not wifi.is_ralink and util.ubus("hostapd." .. wifi.iface.ifname, "get_status", {}, 5) or {}
			util.table_to_json_object(hostapd.rrm)
			util.table_to_json_object(hostapd.wnm)
			wpa_supplicant = util.ubus("wpa_supplicant." .. wifi.iface.ifname, "get_status") or {}
			supplicant_feats = util.ubus("wpa_supplicant." .. wifi.iface.ifname, "get_features") or {}
		end
		formatted_data.channel = formatted_data.channel or get_channel(hostapd, wifi.data, device, uci) -- deprecated
		formatted_data.signal = formatted_data.signal or get_iwinfo_param(wifi.iface.ifname, "signal") or 0 -- deprecated
		formatted_data.quality = formatted_data.quality or get_quality(wifi.iface.ifname) -- deprecated
		formatted_data.noise = formatted_data.noise or get_iwinfo_param(wifi.iface.ifname, "noise") or 0 -- deprecated
		formatted_data.txpower = formatted_data.txpower or get_iwinfo_param(wifi.iface.ifname, "txpower") or 0 -- deprecated
		formatted_data.txpoweroff = formatted_data.txpoweroff or get_iwinfo_param(wifi.iface.ifname, "txpower_offset") or 0 -- deprecated
		formatted_data.bssid = formatted_data.bssid or get_bssid(hostapd, wifi.iface, uci, mode, assoclist) -- deprecated
		table.insert(formatted_data.devices, {
			ifname = get_ifname(wifi.iface, device, sname, uci),
			name = device,
			up = wifi.data.up or uci:get("wireless", device, "disabled") ~= "1",
			signal = get_iwinfo_param(wifi.iface.ifname, "signal") or 0,
			noise = get_iwinfo_param(wifi.iface.ifname, "noise") or 0,
			quality = get_quality(wifi.iface.ifname),
			bssid = get_bssid(hostapd, wifi.iface, uci, mode, assoclist),
			bitrate = (get_iwinfo_param(wifi.iface.ifname, "bitrate") or 0) * 1000,
			airtime = hostapd.airtime,
			op_class = hostapd.op_class,
			rrm = hostapd.rrm,
			wnm = hostapd.wnm,
			bss_color = hostapd.bss_color,
			beacon_interval = hostapd.beacon_interval,
			dfs = (hwmode == "11a" or hwmode == "11bea") and (mode == "ap" or mode == "mesh") and util.clone(find_active_dfs(device, uci)) or nil
		})
		for mac, assoc in pairs(get_associates(assoclist)) do
			assoc.device = device
			formatted_data.assoclist[mac] = assoc
		end
		for _, client in ipairs(get_wifi_interface_clients(assoclist, band, wifi.is_ralink, wifi.iface.ifname, uci)) do
			client.device = device
			table.insert(formatted_data.clients, client)
		end
		util.update(formatted_data, util.clone(hostapd, true))
		util.update(formatted_data, wpa_supplicant)
		util.update(formatted_data, supplicant_feats)
		formatted_data.status = (formatted_data.status == "ENABLED" or formatted_data.status == "1") and "1" or "0"
		formatted_data.dfs = util.clone(find_active_dfs(device, uci))
	end
	local num_assoc = 0
	for _ in pairs(formatted_data.assoclist) do
		num_assoc = num_assoc + 1
	end
	formatted_data.num_assoc = num_assoc
	return formatted_data
end

function wireless:interface_status_basic(sname, uci)
	local wifi_data = get_wifi_data(sname, uci)
	local formatted_data = {
		id = sname,
		devices = {},
		clients = {},
		assoclist = util.table_to_json_object({})
	}
	for device, wifi in pairs(wifi_data) do
		local hostapd, wpa_supplicant, assoclist = {}, {}, {}
		local mode = get_mode(wifi.iface, sname, uci)
		local ssid = get_ssid(wifi.iface, sname, uci)
		local band = get_band(wifi.data, device, uci)
		local hwmode = uci:get("wireless", device, "hwmode")
		formatted_data.wifi_id = formatted_data.wifi_id or get_wifi_id(wifi.iface, sname, uci)
		formatted_data.ssid = ssid
		formatted_data.mode = mode
		formatted_data.mesh_id = mode == "mesh" and get_mesh_id(wifi.iface, sname, uci) or nil
		formatted_data.encryption = formatted_data.encryption or get_encryption(wifi.iface, sname, uci)
		formatted_data.status = formatted_data.status or uci:get("wireless", sname, "disabled") == "1" and "0" or "1"
		formatted_data.up = formatted_data.up or wifi.up
		if wifi.iface.ifname then
			assoclist = parse_assoclist(wifi.iface.ifname, sname, uci)
			hostapd = not wifi.is_ralink and util.ubus("hostapd." .. wifi.iface.ifname, "get_status", {}, 5) or {}
			wpa_supplicant = util.ubus("wpa_supplicant." .. wifi.iface.ifname, "get_status") or {}
		end
		table.insert(formatted_data.devices, {
			ifname = get_ifname(wifi.iface, device, sname, uci),
			name = device,
			up = wifi.data.up or uci:get("wireless", device, "disabled") ~= "1",
			signal = get_iwinfo_param(wifi.iface.ifname, "signal") or 0,
			noise = get_iwinfo_param(wifi.iface.ifname, "noise") or 0,
			channel = get_channel(hostapd, wifi.data, device, uci),
			quality = get_quality(wifi.iface.ifname),
			bssid = get_bssid(hostapd, wifi.iface, uci, mode, assoclist),
			band = band,
			dfs = (hwmode == "11a" or hwmode == "11bea") and (mode == "ap" or mode == "mesh") and util.clone(find_active_dfs(device, uci)) or nil
		})
		for mac, assoc in pairs(get_associates(assoclist)) do
			assoc.device = device
			formatted_data.assoclist[mac] = assoc
		end
		for _, client in ipairs(get_wifi_interface_clients(assoclist, band, wifi.is_ralink, wifi.iface.ifname, uci)) do
			client.device = device
			table.insert(formatted_data.clients, client)
		end
		util.update(formatted_data, wpa_supplicant)
		formatted_data.dfs = nil
	end
	local num_assoc = 0
	for _ in pairs(formatted_data.assoclist) do
		num_assoc = num_assoc + 1
	end
	formatted_data.num_assoc = num_assoc
	return formatted_data
end

function get_wifi_interface_clients(assoclist, band, is_ralink, ifname, uci)
	local formatted_clients, macs = {}, {}
	if is_ralink then
		for _, assoc in ipairs(assoclist and assoclist.results or {}) do
			table.insert(macs, assoc.mac)
		end
		local clients = get_clients(macs, uci, assoclist)
		for _, client in ipairs(clients) do
			client.band = band or '-'
			table.insert(formatted_clients, client)
		end
	else
		local interface_clients = ifname and util.ubus("hostapd." .. ifname, "get_clients")
		if interface_clients then
			for i in pairs(interface_clients.clients) do
				macs[#macs+1] = string.upper(i)
			end
			local clients = get_clients(macs, uci, assoclist)
			for _, client in ipairs(clients) do
				client.band = band
				client.standard = get_client_standard(client, band, interface_clients.clients)
				table.insert(formatted_clients, client)
			end
		end
	end
	return formatted_clients
end

function get_wifi_interface_encryption(encryption, sname, uci)
	if not encryption or (encryption and encryption:lower() == "none" or encryption == "-") then
		local encr_names = {
			none = "None",
			psk = "WPA-PSK",
			psk2 = "WPA2-PSK",
			["psk-mixed"] = "WPA-PSK/WPA2-PSK Mixed Mode",
			sae = "WPA3-SAE",
			["sae-mixed"] = "WPA2-PSK/WPA3-SAE Mixed Mode",
			wpa = "WPA-EAP",
			wpa2 = "WPA2-EAP",
			wpa3 = "WPA3-EAP",
			["wpa3-mixed"] = "WPA2-EAP/WPA3-EAP Mixed Mode",
			owe = "OWE"
		}
		local encr = uci:get("wireless", sname, "encryption")
		local ppsk = uci:get("wireless", sname, "ppsk")
		if encr == "psk2" and ppsk then return "WPA2-PPSK" end
		return encr and encr_names[encr] or encr
	end
	return encryption
end

function wireless:device_status(sname, uci)
	ntm = ntm or require "vuci.network".init()
	local iwtype = iwinfo.type(sname)
	local dev_status = {}
	local dev = ntm:get_wifidev(sname)
	local wireless_status = ntm:get_wireless_status()
	dev_status.mode = iwinfo[iwtype].mode(sname)
	dev_status.quality_max = iwinfo[iwtype].quality_max(sname)
	dev_status.bitrate = iwinfo[iwtype].bitrate(sname)
	dev_status.type = iwinfo[iwtype].type(sname)
	dev_status.quality = iwinfo[iwtype].quality(sname)
	dev_status.frequency = iwinfo[iwtype].frequency(sname)
	dev_status.signal = iwinfo[iwtype].signal(sname)
	dev_status.noise = iwinfo[iwtype].noise(sname)
	dev_status.country = iwinfo[iwtype].country(sname)
	dev_status.txpower = iwinfo[iwtype].txpower(sname)
	dev_status.txpower_offset = iwinfo[iwtype].txpower_offset(sname)
	dev_status.channel = iwinfo[iwtype].channel(sname)
	dev_status.phyname = iwinfo[iwtype].phyname(sname)
	dev_status.hardware_id = iwinfo[iwtype].hardware_id(sname)
	dev_status.hardware_name = iwinfo[iwtype].hardware_name(sname)
	dev_status.encryption = iwinfo[iwtype].encryption(sname)
	dev_status.up = wireless_status[sname].up
	dev_status.pending = wireless_status[sname].pending
	dev_status.disabled = wireless_status[sname].disabled
	dev_status.autostart = wireless_status[sname].autostart
	dev_status.name = dev:get_i18n()
	dev_status.standard = dev:standard()
	dev_status.band = dev:band()
	dev_status.id = sname
	dev_status.macaddr = get_dev_macaddr(iwtype, dev_status.phyname, sname, uci)
	return dev_status
end

function wireless:device_status_basic(sname, uci)
	ntm = ntm or require "vuci.network".init()
	local iwtype = iwinfo.type(sname)
	local dev_status = {}
	local dev = ntm:get_wifidev(sname)
	local wireless_status = ntm:get_wireless_status()
	dev_status.channel = iwinfo[iwtype].channel(sname)
	dev_status.frequency = iwinfo[iwtype].frequency(sname)
	if dev_status.channel then
		dev_status.txpower = iwinfo[iwtype].txpower(sname)
	end
	dev_status.up = wireless_status[sname].up
	dev_status.pending = (wireless_status[sname].pending or not dev_status.channel) and uci:get("wireless", sname, "disabled") ~= "1"
	dev_status.disabled = wireless_status[sname].disabled
	dev_status.standard = dev:standard()
	dev_status.band = dev:band()
	dev_status.id = sname
	dev_status.type = iwinfo[iwtype].type(sname)
	dev_status.phyname = iwinfo[iwtype].phyname(sname)
	dev_status.macaddr = get_dev_macaddr(iwtype, dev_status.phyname, sname, uci)
	return dev_status
end

return wireless
