local util = require "vuci.util"
local fs = require("nixio.fs")
local CODES = require("api.network.wireless_codes")

local wdev_common = {}

wdev_common.txpower_step = 5
wdev_common.txpower_steps_count = 20

--https://git.teltonika.lt/teltonika/rutx_open/-/issues/14720
local wifi_device = fs.readfile("/sys/class/ieee80211/phy1/device/device")
wifi_device = wifi_device and wifi_device:gsub("%s+", "") or ""
local is_MT7615 = wifi_device == "0x7615"

function wdev_common:adjust_txpower(new_value, service, sid)
	sid = sid or service.sid
	if not new_value then
		return
	elseif #new_value == 0 then
		service:table_set("wireless", sid, "txpower", new_value)
		return
	end
	new_value = tonumber(new_value)

	local new_value_index

	local txpowerlist = util.ubus("iwinfo", "txpowerlist", { device = sid }).results
	local size = #txpowerlist
	if new_value == self.txpower_step then
		-- 5%, so index is 1
		new_value_index = 1
	elseif new_value == self.txpower_step * self.txpower_steps_count then
		-- 100%, so index is lest table element
		new_value_index = size
	else
		-- Otherwise need to calculate index
		new_value_index = util.round(new_value / 100 * size)
		new_value_index = new_value_index == 0 and 1 or new_value_index
	end
	new_value = txpowerlist[new_value_index].dbm
	service:table_set("wireless", sid, "txpower", new_value)
end

function wdev_common:get_txpower_percentages(value, service, sid)
	sid = sid or service.sid

	local cfg_value = value

	local function adjust_percentage(percentage)
		return util.round(percentage / 5) * 5
	end

	local txpowerlist = util.ubus("iwinfo", "txpowerlist", { device = sid }).results or {}
	local size = #txpowerlist

	-- TAP200 and RUTM devices have a restricted 13 dBm limit
	-- when an FCC country is selected. This limit becomes
	-- unknown when the 5 GHz interface is disabled thus adding
	-- FCC country check to address the issue.
	if is_MT7615 and sid == "radio1" then
		local reg_data = util.exec("iw reg get")
		local fcc_domain = reg_data:match("DFS%-FCC")
		if fcc_domain then
			for _, v in ipairs(txpowerlist) do
				if v.dbm == 13 then
					v.active = true
					break
				end
			end
		end
	end

	for index, v in pairs(txpowerlist) do
		value = not value and v.active and v.dbm or value
		if value and v.dbm and tostring(v.dbm) == tostring(value) and cfg_value then
			if index == 1 then
				-- 5%
				return tostring(self.txpower_step)
			elseif index == size then
				-- 100%
				return tostring(self.txpower_step * self.txpower_steps_count)
			else
				-- Otherwise need to calculate percentage
				local percentage = index / size * 100
				return percentage > 100 and "100" or tostring(adjust_percentage(percentage))
			end
		elseif value and v.dbm and tostring(v.dbm) == tostring(value) and not cfg_value then
			-- Driver selects maximum available txpower if it's not present in the config
			return "100"
		end
	end

	return "100"
end

function wdev_common:get_max_5g_channel(service)
	local max_width_channel = {
		["20"] = 165,
		["40"] = 161,
		["80"] = 161,
		["160"] = 128
	}
	if service.sid ~= "radio1" then return nil end
	local htmode = service:get_abs_value(service.config, service.sid, "htmode")
	local parsed_width = string.match(htmode or "", "%d+")
	return tonumber(max_width_channel[parsed_width]), parsed_width
end

function wdev_common:set_radio_country(value, service)
	local reg_set_called = false
	service:table_foreach(service.config, "wifi-device", function(sec)
		service:table_set(service.config, sec[".name"], "country", value)

		local device_type = service:table_get(service.config, sec[".name"], "type") or ""
		if device_type ~= "ralink" then
			local txpower_percent = wdev_common:get_txpower_percentages(service:table_get(service.config, sec[".name"], "txpower"), service, sec[".name"])

			if not reg_set_called then
				util.file_exec("/usr/sbin/iw",{"reg", "set", value})
				reg_set_called = true
			end
		end

		local ch = sec[".name"] == service.sid and service.current_data_block.channel or service:table_get("wireless", sec[".name"], "channel")
		if ch == "auto" then
			return
		end

		-- if country code is changed, allowed channels might also change, need to check available channels and
		-- select a channel which is closest to the selected channel
		if device_type == "ralink" and not reg_set_called then
			util.file_exec("/usr/sbin/iw", {"reg", "set", value })
		end
		local freqlist = util.ubus("iwinfo", "freqlist", { device = sec[".name"] }).results
		local selected_channel = tonumber(ch)
		for _, f in ipairs(freqlist) do
			if not f.restricted and f.channel == selected_channel then
				return
			end
		end

		local new_ch
		for _, f in ipairs(freqlist) do
			if not f.restricted and f.channel <= selected_channel then
				new_ch = f.channel
			end
		end

		if not new_ch then
			for _, f in ipairs(freqlist) do
				if not f.restricted and f.channel >= selected_channel then
					new_ch = f.channel
				end
			end
		end

		if new_ch then
			service:add_message(
				CODES.STATUS_CODES.CH_CHANGED,
				string.format("Channel %s is not available in the %s regulatory domain for %s and has been auto-adjusted to %s.",
				selected_channel, value, sec[".name"], new_ch),
				service.api_key)

			service:table_set("wireless", sec[".name"], "channel", tostring(new_ch))
		end
	end)
end

function wdev_common:device_features(devname, service, driver)
	local wifi_driver = driver or service:table_get(service.config, devname, "type")

	local features = {}
	features.supplicant = fs.access("/usr/sbin/wpa_supplicant")
	features.hostapd = fs.access("/usr/sbin/hostapd")
	features.hostapd_cli = fs.access("/usr/sbin/hostapd_cli")

	local encryptions = {
		ap_eap     = true,
		sta_eap    = true,
		ap_sae     = true,
		sta_sae    = true,
		ap_owe     = true,
		sta_owe    = true,
		ap_eap192  = true,
		sta_eap192 = true,
		["80211r"] = true,
		sta_80211r = true
	}
	if wifi_driver == CODES.WIFI_DRIVERS.RALINK then
		encryptions.sta_eap = false
		encryptions.ap_eap192 = false
		encryptions.sta_eap192 = false
	end
	features.encryption = encryptions
	return features
end

return wdev_common