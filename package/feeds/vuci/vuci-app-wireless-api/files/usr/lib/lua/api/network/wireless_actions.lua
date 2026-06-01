local board = require("vuci.board")

if not board:has_wifi()  then
	return nil
end

local FunctionService = require("api/FunctionService")
local wifi_actions = FunctionService:new()

local util = require "vuci.util"
local uci = require("vuci.uci").cursor()
local CODES = require("api.network.wireless_codes")


function wifi_actions:get_dfs_channels()
	local res = util.file_exec("/usr/sbin/iw", { "reg", "get" })
	if res.code ~= 0 then
		return nil
	end

	local channels = res.stdout
	local lines = util.split(channels)
	local dfs_ranges = {}
	for _, line in ipairs(lines) do
		local from, to = line:match("^%s*%((%d+)%s*%-%s*(%d+).-%).*DFS.*$")
		if from and to then
			table.insert(dfs_ranges, { tonumber(from), tonumber(to) })
		end
	end
	return dfs_ranges
end

function wifi_actions:dfs_channel_selected(devname)
	-- Only for 5GHz device
	if uci:get("wireless", devname, "hwmode") == "11a" then
		local wireless = require "vuci.wireless"
		local dfs_channels = self:get_dfs_channels()
		local device = wireless:device_status(devname, uci)
		for _, ch in ipairs(dfs_channels) do
			if device.frequency and device.frequency >= ch[1] and device.frequency <= ch[2] then
				return true
			end
		end
	end
	return false
end

function wifi_actions:is_fcc_domain()
	local reg_data = util.exec("iw reg get")
	return reg_data:match("DFS%-FCC")
end

function wifi_actions:get_wifi_encryption_description(enc)
	if not enc.enabled then return "None" end

	local ciphers = {}
	if enc.ciphers then
		for _, c in ipairs(enc.ciphers) do
			ciphers[#ciphers+1] = c:upper()
		end
	else
		ciphers = {"NONE"}
	end

	if enc.wep then
		local has_open = false
		local has_shared = false

		for _, e in ipairs(enc.wep) do
			if e == "open" then
				has_open = true
			elseif e == "shared" then
				has_shared = true
			end
		end

		if has_open and has_shared then
			return "WEP Open/Shared (%s)" % table.concat(ciphers, ", ")
		elseif has_open then
			return "WEP Open System (%s)" % table.concat(ciphers, ", ")
		elseif has_shared then
			return "WEP Shared Auth (%s)" % table.concat(ciphers, ", ")
		end
	end

	if enc.wpa then
		local suites = {}
		if enc.authentication then
			for _, c in ipairs(enc.authentication) do
				suites[#suites+1] = c:upper()
			end
		else
			suites = {"NONE"}
		end

		local versions = {}
		for _, wpa in ipairs(enc.wpa) do
			if wpa == 1 then
				versions[#versions+1] = "WPA"
			else
				versions[#versions+1] = "WPA" .. wpa
			end
		end

		if #versions > 1 then
			return "mixed %s %s (%s)" % {table.concat(versions, "/"), table.concat(suites, ", "), table.concat(ciphers, ", ")}
		end
		return "%s %s (%s)" % {versions[1], table.concat(suites, ", "), table.concat(ciphers, ", ")}
	end
	return "Unknown"
end

function wifi_actions:wifi_scan()
	local device = self.arguments.data.device
	local modes = {
		Master = "Access Point",
		["Master (VLAN)"] = "Access Point (VLAN)"
	}

	if self:dfs_channel_selected(device) and self:is_fcc_domain() then
		return self:add_critical_error(
			CODES.STATUS_CODES.DFS_CHANNEL_SCAN,
			"Wireless scan can not be performed when DFS channel and FCC regulatory domain is selected.",
			"channel: " .. uci:get("wireless", device, "channel"))
	end
	local results = util.ubus("iwinfo", "scan", { device = device }).results
	for _, enc in ipairs(results) do
		if enc.status then
			self:add_critical_error(CODES.STATUS_CODES.SCAN_NOT_POSSIBLE, enc.status, "device: " .. device)
		end
		enc.encryption_description = self:get_wifi_encryption_description(enc.encryption)
		enc.mode = modes[enc.mode] or enc.mode
	end
	return self:ResponseOK(results)
end
local wscan = wifi_actions:action("scan", wifi_actions.wifi_scan)
	local device = wscan:option("device")
		device.require = true
		function device:validate(value)
			local devs = {}
			uci:foreach("wireless", "wifi-device", function(s)
				devs[#devs+1] = s[".name"]
			end)
			return self.dt:check_array(value, devs)
		end

if not board:is_ap() and not board:is_cap() then
	function wifi_actions:join_wifi_network()
		local data = self.arguments.data
		local device = data.device

		local used_ids = {}
		local max_client_error = false
		uci:foreach("wireless", "wifi-iface", function (s)
			if s.mode == "sta" and util.contains(util.to_table(s.device), device) then
				max_client_error = true
				return false
			end
			local device_id = tonumber(s._device_id)
			if not device_id then return end
			table.insert(used_ids, device_id)
		end)
		if max_client_error then
			return self:add_critical_error(CODES.STATUS_CODES.ONLY_ONE_STA, "Maximum number of one client for one device allowed. To specify few possible clients use Multi AP.", "POST")
		end

		if not data.bssid and not data.ssid then
			return self:add_critical_error(STD_CODES.INVALID_OPT, "'bssid' or 'ssid' not provided.", "bssid/ssid")
		end

		if self:dfs_channel_selected(device) and self:is_fcc_domain() then
			return self:add_critical_error(
				CODES.STATUS_CODES.DFS_CHANNEL_SCAN,
				"Wireless network joining can not be performed when DFS channel and FCC regulatory domain is selected.",
				"channel: " .. uci:get("wireless", device, "channel"))
		end

		local wifi_id = 0
		uci:foreach("network", "interface", function(s)
			local name = s.name or s[".name"]
			local match = tonumber(string.match(name, "^wifi(%d+)$"))
			if match then
				if match > wifi_id then wifi_id = match end
			end
		end)
		wifi_id = wifi_id + 1
		local network = "wifi"..wifi_id

		local fwzone = "wan"
		local wifi
		local results
		if self.query_parameters.use_cache == "true" then
			local iwinfo_resp = util.ubus("iwinfo", "scanlist", { device = device }) or {}
			results = iwinfo_resp.results or {}
			wifi = self:check_whether_ap_exists(data, results) --Check scanlist cache
		end

		if not wifi then -- Retry check with a fresh scan if not in cache or cache was not used
			local iwinfo_resp = util.ubus("iwinfo", "scan", { device = device }) or {}
			results = iwinfo_resp.results or {}
			wifi = self:check_whether_ap_exists(data, results)
		end

		if not wifi then
			return self:add_critical_error(CODES.STATUS_CODES.WIFI_NET_NOT_FOUND,
				"Wifi network with the provided bssid or ssid was not found.",
				"wifi_join", "404")
		end

		local enc = wifi.encryption
		local wifi_options = {}
		wifi_options.device = device
		wifi_options.mode = wifi.mode == "Ad-Hoc" and "adhoc" or "sta"
		wifi_options.network = network
		wifi_options.ssid = wifi.ssid
		wifi_options.bssid = wifi.bssid
		wifi_options._device_id = util.find_first_missing(used_ids)

		local is_sae = false
		local is_psk = false
		local is_owe = false
		local is_eap = false
		local is_wep = not not enc.wep
		if enc.wpa then
			for _, e in ipairs(enc.authentication or {}) do
				if e == "sae" then
					is_sae = true
				elseif e == "psk" then
					is_psk = true
				elseif e == "owe" then
					is_owe = true
				elseif e == "802.1x" then
					is_eap = true
				end
			end
		end

		local function check_pw()
			if not data.password then
				return self:add_critical_error(STD_CODES.INVALID_OPT, "'password' not provided.", "password")
			end

			local ok, err = self.dt:wpakey(data.password)
			if not ok then
				return self:add_critical_error(STD_CODES.INVALID_OPT, err, "password")
			end
		end
		if is_owe then
			wifi_options.encryption = "owe"
		elseif is_sae then
			check_pw()
			wifi_options.encryption = "sae"
			wifi_options.key = data.password
		elseif is_psk then
			check_pw()
			for i = #enc.wpa, 1, -1 do
				if enc.wpa[i] == 2 then
					wifi_options.encryption = "psk2"
				elseif enc.wpa[i] == 1 then
					wifi_options.encryption = "psk"
				end
			end
			wifi_options.key = data.password
		elseif is_wep then
			check_pw()
			wifi_options.encryption = "wep-open"
			wifi_options.key = "1"
			wifi_options.key1 = data.password
		elseif is_eap then
			local eap2, eap3 = false, false
			for i = #enc.wpa, 1, -1 do
				if enc.wpa[i] == 3 then
					wifi_options.encryption = "wpa3"
					eap3 = true
				elseif enc.wpa[i] == 2 then
					wifi_options.encryption = "wpa2"
					eap2 = true
				elseif enc.wpa[i] == 1 then
					wifi_options.encryption = "wpa"
				end
			end
			if eap2 and eap3 then
				wifi_options.encryption = "wpa3-mixed"
			end
			wifi_options.key = data.password
		else
			wifi_options.encryption = "none"
		end

		network = util.create_network_interface(uci, { area_type = "wan", proto = "dhcp", name = network, uci = true })
		wifi_options.network = network
		local next_id = 1
		uci:foreach("wireless", "wifi-iface", function(s)
			local current_id = tonumber(s[".name"])
			if current_id and current_id >= next_id then
				next_id = current_id + 1
			end
		end)
		local wifi_iface_sid = uci:section("wireless", "wifi-iface", tostring(next_id), wifi_options)

		local fw = require "vuci.firewall".init(uci)
		local zone = fw:get_zone(fwzone)
		if zone then
			zone:add_network(network)
		else
			fw:add_zone(fwzone)
		end

		local mwan = require "vuci.mwan".init(uci)
		mwan:add_mwan(network)

		local widget_position = -1
		uci:foreach("widget", "widget", function(s)
			if s.position then
				local position = tonumber(s.position)
				if position > widget_position then
					widget_position = position
				end
			end
		end)

		if widget_position > -1 then
			local sid = uci:add("widget", "widget")
			uci:set("widget", sid, "id", wifi_iface_sid)
			uci:set("widget", sid, "type", "wifi")
			uci:set("widget", sid, "position", widget_position + 1)
			uci:set("widget", sid, "enabled", "0")
		end
		uci:commit("widget") -- self:commit doesn't work when using bulk requests

		uci:delete("wireless", device, "disabled")
		uci:commit("network")
		uci:commit("wireless")
		uci:commit("mwan3")
		uci:commit("firewall")
		local section = uci:get_all("wireless", wifi_iface_sid)
		section.network = util.network_mapper_get(uci, section.network, true)
		section.fwzone = fwzone
		section[".anonymous"] = nil
		section[".type"] = nil
		section["id"] = section[".name"]
		section[".name"] = nil
		section["enabled"] = uci:get("wireless", device, "disabled") == "1" and "0" or "1"
		local hide_sensitive = uci:get("rpcd", self.user.group, "hide_sensitive")
		if hide_sensitive == "1" then
			section["key"] = nil
			section["key:set"] = "1"
		end
		local pac = require("vuci.package_checker")
		if pac.is_installed("travelmate") then
			section["trm_enabled"] = uci:get("travelmate", "global", "trm_enabled")
		end

		return self:ResponseCreated(section)
	end

	local wifi_join_action = wifi_actions:action("join", wifi_actions.join_wifi_network)

		local device = wifi_join_action:option("device")
			device.require = true
			function device:validate(value)
				local devs = {}
				uci:foreach("wireless", "wifi-device", function(s)
					devs[#devs+1] = s[".name"]
				end)
				return self.dt:check_array(value, devs)
			end

		local bssid = wifi_join_action:option("bssid")
			function bssid:validate(value) return self.dt:macaddr(value) end

		local ssid = wifi_join_action:option("ssid")
			function ssid:validate(value) return self.dt:string(value) end

		local password = wifi_join_action:option("password")
			function password:validate(value) return self.dt:wpakey(value) end

	local supplicant_control = "/usr/lib/lua/api/network/supplicant_control.lua"

	function wifi_actions:parse_sta_device(sta_id)
		local ifname = uci:get("wireless", sta_id, "network")
		if not ifname then
			return self:add_critical_error(CODES.STATUS_CODES.STA_ACTION_COULD_NOT_PARSE, "Failed to send action, could not parse interface network.")
		end
		local status = util.ubus("network.interface." .. ifname, "status")
		if not status then
			return self:add_critical_error(CODES.STATUS_CODES.STA_ACTION_COULD_NOT_PARSE, "Failed to send action, could not parse interface status.")
		end
		if not status.device then
			return self:add_critical_error(CODES.STATUS_CODES.STA_ACTION_COULD_NOT_PARSE, "Failed to send action, failed to parse interface device.")
		end

		return status.device
	end

	function  wifi_actions:sta_reconnect()
		local sta_id = self.arguments.data.sta_id
		util.file_exec(supplicant_control, { "RECONNECT", self:parse_sta_device(sta_id) })
		return self:ResponseOK()
	end

	local sta_reconnect_action = wifi_actions:action("reconnect", wifi_actions.sta_reconnect)
		local sta_id = sta_reconnect_action:option("sta_id")
		sta_id.require = true
		function sta_id:validate(value)
			return uci:get("wireless", value, "mode") == "sta", "Interface must be a station"
		end

	function wifi_actions:sta_disconnect()
		local sta_id = self.arguments.data.sta_id
		util.file_exec(supplicant_control, { "DISCONNECT", self:parse_sta_device(sta_id) })
		return self:ResponseOK()
	end

	local sta_disconnect_action = wifi_actions:action("disconnect", wifi_actions.sta_disconnect)
		local sta_id = sta_disconnect_action:option("sta_id")
		sta_id.require = true
		function sta_id:validate(value)
			return uci:get("wireless", value, "mode") == "sta", "Interface must be a station"
		end

	---Parses scan list on whether given AP exists
	---@param data table Table containing AP's bssid or ssid
	---@param scanlist table Table containing scanlist
	---@return table | nil wifi Table containing information about AP or nil
	function wifi_actions:check_whether_ap_exists(data, scanlist)
		if not data or not scanlist then return nil end
		local wifi
		if data.bssid then
			for _, w in ipairs(scanlist) do
				if w.bssid and w.bssid:upper() == data.bssid:upper() then
					wifi = w
					break
				end
			end
		elseif data.ssid then
			for _, w in ipairs(scanlist) do
				if w.ssid == data.ssid then
					wifi = w
					break
				end
			end
		end
		return wifi
	end

end

return wifi_actions