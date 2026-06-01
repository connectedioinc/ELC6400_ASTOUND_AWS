local ConfigService = require "api/ConfigService"
local board = require("vuci.board")
local wdev_common = require("api/network/wireless_devices_common")
local CODES = require("api.network.wireless_codes")

if not board:has_wifi()then
	return nil
end

local wifi_driver

local wdevs = ConfigService:new({ create = false, delete = false })
wdevs.enabled_devices = {}
wdevs.options_arr = {}
wdevs.options_arr.txpowers_ralink = {
	["12.5"] = "0",
	["25"]   = "11",
	["37.5"] = "14",
	["50"]   = "16",
	["62.5"] = "17",
	["75"]   = "18",
	["87.5"] = "19",
	["100"]  = "20"
}
wdevs.txpower_step = 5
wdevs.txpower_steps_count = 20

wdevs.uci:foreach("wireless", "wifi-device", function(s)
	if s.type then
		wifi_driver = s.type
		return false
	end
end)

function wdevs:before_response_hook()
	if self.response_table[1] then
		table.sort(self.response_table, function (a, b)
			return self:table_get("wireless", a.id, "hwmode") > self:table_get("wireless", b.id, "hwmode")
		end)
	end
end

function wdevs:PUT_section_init_hook()
	local wireless = require "vuci.wireless"
	self.wireless_options = wireless:device_options(self.sid, self.uci)
	if self.wireless_options == nil then
		return self:ResponseError("Non-existent device provided")
	end

	local hwmodes = {}
	for hwmode, available in pairs(self.wireless_options.hwmodelist) do
		if available then
			if hwmode ~= "b" and hwmode ~= "g" then
				hwmodes[#hwmodes+1] = hwmode
			end
		end
	end
	self.options_arr.hwmodelist = hwmodes

	local txpwrlist = {}
	for _, pwr in ipairs(self.wireless_options.txpwrlist) do
		txpwrlist[#txpwrlist+1] = tostring(pwr.dbm)
	end
	self.options_arr.txpwrlist = txpwrlist

	local freqlist = {"auto"}
	local location = self:table_get(self.config, self.sid, "country3") or CODES.LOCATION.ANY
	for _, ch in ipairs(self.wireless_options.freqlist) do
		if (location == CODES.LOCATION.OUTDOOR and not ch.indoor_only) or
			location == CODES.LOCATION.ANY then
			freqlist[#freqlist+1] = tostring(ch.channel)
		end
	end
	self.options_arr.freqlist = freqlist

	local htmodelist = {}
	for mode, available in pairs(self.wireless_options.htmodelist) do
		if available then
			htmodelist[#htmodelist+1] = mode
		end
	end
	self.options_arr.htmodelist = htmodelist

	local countrylist = {}
	for _, c in ipairs(self.wireless_options.countrylist) do
		countrylist[#countrylist+1] = c.alpha2
	end
	self.options_arr.countrylist = countrylist
end

local s = wdevs:section("wireless", "wifi-device")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"channel"} }
		function enabled:validate(value) return self.dt:is_bool(value) end
		function enabled:get(_)
			local d = self:table_get("wireless", self.sid, "disabled")
			return d == "1" and "0" or "1"
		end
		function enabled:set(value)
			if value == "1" then
				self:table_delete("wireless", self.sid, "disabled")
				self.enabled_devices[self.sid] = true
			else
				self:table_set("wireless", self.sid, "disabled", "1")
				if require("vuci.package_checker").is_installed("wifi_scanner") then
					self:table_set("wifi_scanner", "wifi_scan", self.sid == "radio0" and "two_g_enabled" or "five_g_enabled", "0")
				end
			end
		end

	local channel = s:option("channel")
		function channel:validate(value)
			local max_channel, parsed_width = wdev_common:get_max_5g_channel(self)
			if tonumber(value) and max_channel and tonumber(value) > max_channel then
				return false, string.format("%s channel is not supported on %s MHz width. Maximum allowed value is %s.", value, parsed_width, max_channel)
			end
			return self.dt:check_array(value, self.options_arr.freqlist)
		end

	local htmode = s:option("htmode")
		function htmode:validate(value) return self.dt:check_array(value, self.options_arr.htmodelist) end

	local hwmode = s:option("hwmode")
		hwmode.require = {
			["ac"] = {"htmode"},
			["n"] = {"htmode"},
			["ax"] = {"htmode"},
			["be"] = {"htmode"}
		}
		function hwmode:validate(value)
			local htmode = self.current_data_block.htmode or self:table_get("wireless", self.sid, "hwmode")
			local valid, msg = self.dt:check_array(htmode, self.options_arr.htmodelist)
			if not valid then return valid, "Invalid 'htmode' value. "..(msg or "") end
			if value == "be" then
				if not htmode:match("^EHT") then
					return false, "Only EHT htmodes are accepted when be hwmode is selected."
				end
			end
			if value == "ax" then
				if not htmode:match("^HE") then
					return false, "Only HE htmodes are accepted when ax hwmode is selected."
				end
			end
			if value == "ac" then
				if not htmode:match("^VHT") then
					return false, "Only VHT htmodes are accepted when ac hwmode is selected."
				end
			end
			if value == "n" then
				if not htmode:match("^HT") then
					return false, "Only HT htmodes are accepted when n hwmode is selected."
				end
			end

			return self.dt:check_array(value, self.options_arr.hwmodelist)
		end
		function hwmode:get(value)
			local htmode = self:table_get("wireless", self.sid, "htmode")
			if not htmode then
				return nil
			elseif htmode:match("^EHT") then
				return "be"
			elseif htmode:match("^HE") then
				return "ax"
			elseif htmode:match("^VHT") then
				return "ac"
			elseif htmode:match("^HT") then
				return "n"
			end
		end
		function hwmode:set(value)
			if value == "" then
				local ok = false
				for hw, available in pairs(self.wireless_options.hwmodelist) do
					if available then
						if hw == "b" or hw == "g" then
							ok = true
							break
						end
					end
				end
				if not ok then
					self:add_critical_error(STD_CODES.INVALID_OPT, "Legacy hwmode is not supported on this wireless device.", "hwmode: ")
					return
				end

				self:table_delete("wireless", self.sid, "htmode")
			end
		end

	local country = s:option("country")
		country.cfg_require = true
		function country:validate(value) return self.dt:check_array(value, self.options_arr.countrylist) end
		function country:set(value)
			wdev_common:set_radio_country(value, self)

			self:table_foreach(self.config, "wifi-device", function(sec)
				if sec[".name"] ~= self.sid then
					self:add_message(
						CODES.STATUS_CODES.CH_CHANGED,
						string.format("Regulatory domain country for %s was automatically changed to %s to match %s",
						sec[".name"], value, self.sid),
						self.api_key)
				end
			end)
		end

if wifi_driver ~= CODES.WIFI_DRIVERS.QCAWIFI then
	local txpower = s:option("txpower")
		function txpower:validate(value)
			local percents = {"5", "10", "15", "20", "25", "30", "35", "40", "45", "50",
							"55", "60", "65", "70", "75", "80", "85", "90", "95", "100"}
			local ralink_percents = {"12.5", "25", "37.5", "50", "62.5", "75", "87.5", "100"}
			local device_type = self:table_get(self.config, self.sid, "type") or ""
			if device_type == "ralink" then
				return self.dt:check_array(value, ralink_percents)
			end
			return self.dt:check_array(value, percents)
		end
		function txpower:set(value)
			local device_type = self:table_get(self.config, self.sid, "type") or ""
			if device_type == "ralink" then
				self:table_set(self.config, self.sid, self.api_key, self.options_arr.txpowers_ralink[value])
			else
				wdev_common:adjust_txpower(value, self)
			end
		end
		function txpower:get(value)
			local device_type = self:table_get(self.config, self.sid, "type") or ""
			if device_type == "ralink" then
				for k, v in pairs(self.options_arr.txpowers_ralink) do
					if v == value then
						return k
					end
				end
				return "100"
			end
			return wdev_common:get_txpower_percentages(value, self)
		end

	local legacy_rates = s:option("legacy_rates")
		function legacy_rates:validate(value)
			if self:table_get("wireless", self.sid, "hwmode") ~= "11g" then
				return false, "This option is only available for 2.4GHz devices."
			end
			return self.dt:is_bool(value)
		end
		function legacy_rates:get(value)
			if self:table_get("wireless", self.sid, "hwmode") ~= "11g" then
				return nil
			end
			return not value and "0" or value
		end
		function legacy_rates:set(value)
			if self:table_get("wireless", self.sid, "hwmode") ~= "11g" then
				self:table_set(self.config, self.sid, self.api_key, "")
				return
			end
			if value == "0" then
				self:table_set(self.config, self.sid, self.api_key, "")
			else
				self:table_set(self.config, self.sid, self.api_key, "1")
			end
		end

	local distance = s:option("distance")
		function distance:validate(value) return self.dt:irange(value, 0, 65535) end

	local frag = s:option("frag")
		function frag:validate(value)
			local ok, err = self.dt:irange(value, 256, 2346)
			if not ok then return ok, err end
			return self.dt:uinteger(value)
		end

	local rts = s:option("rts")
		function rts:validate(value)
			local ok, err = self.dt:irange(value, 0, 2347)
			if not ok then return ok, err end
			return self.dt:uinteger(value)
		end

	local noscan = s:option("noscan")
		function noscan:validate(value) return self.dt:is_bool(value) end

	local beacon_int = s:option("beacon_int")
		function beacon_int:validate(value) return self.dt:irange(value, 15, 65535) end

	local acs_exclude_dfs = s:option("acs_exclude_dfs")
		function acs_exclude_dfs:validate(value)
			if self:table_get("wireless", self.sid, "hwmode") ~= "11a" then
				return false, "This option is only available for 5GHz devices."
			end
			return self.dt:is_bool(value)
		end
end

	local tx_power = s:option("tx_power")
		function tx_power:validate(value)
			return self.dt:irange(value, wifi_driver == CODES.WIFI_DRIVERS.QCAWIFI and 1 or 0, 40)
		end
		function tx_power:get()
			return self:table_get(self.config, self.sid, "txpower")
		end
		function tx_power:set(value)
			self:table_set(self.config, self.sid, "txpower", value)
		end

--------------------------- STATUS -----------------------------------
function wdevs:get_device_status(devname)
	local wireless = require "vuci.wireless"
	local device = wireless:device_status(devname, self.uci)
	device.id = devname
	return device
end

function wdevs:get_device_options(devname)
	local wireless = require "vuci.wireless"
	if self.query_parameters.exclude then
		local valid, err = self.dt:check_array(self.query_parameters.exclude, { "options", "features" })
		if not valid then return {}, err end
	end
	local device = { id = devname }
	if self.query_parameters.exclude ~= "options" then
		device.options = wireless:device_options(devname, self.uci)
	end
	if self.query_parameters.exclude ~= "features" then
		device.features = wdev_common:device_features(devname, self)
	end
	return device
end

function wdevs:get_status()
	if self.sid then
		if self.uci:get("wireless", self.sid) ~= "wifi-device" then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "Device doesn't exist.", "device", "404")
		end
		return self:ResponseOK(self:get_device_status(self.sid))
	else
		local res = {}
		self.uci:foreach("wireless", "wifi-device", function(s)
			res[#res+1] = self:get_device_status(s[".name"])
		end)
		return self:ResponseOK(res)
	end
end

function wdevs:get_options()
	if self.sid then
		if self.uci:get("wireless", self.sid) ~= "wifi-device" then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "Device doesn't exist.", "device", "404")
		end
		local data, err = self:get_device_options(self.sid)
		if err then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "Validation") end
		return self:ResponseOK(data)
	else
		local res = {}
		local data, err
		self.uci:foreach("wireless", "wifi-device", function(s)
			data, err = self:get_device_options(s[".name"])
			if err then return false end
			res[#res+1] = data
		end)
		if err then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "Validation") end
		return self:ResponseOK(res)
	end
end

function wdevs:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function wdevs:GET_TYPE_status()
	return self:get_status()
end

function wdevs:OPTIONS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_options()
end

function wdevs:GET_TYPE_options()
	return self:get_options()
end


return wdevs
