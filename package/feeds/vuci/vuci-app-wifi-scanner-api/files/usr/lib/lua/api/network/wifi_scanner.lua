if not require("vuci.board"):has_wifi() then return end

local MODULE_PATH = "/sys/module/"
local minimum_beacon_values = { mt7628 = 300, ath9k = 300 }

local ConfigService = require("api/ConfigService")
local wifi_scanner = ConfigService:new({ delete = false, create = false, general_section = "wifi_scan" })

local s = wifi_scanner:section("wifi_scanner", "section")

	local two_g_enabled = s:option("two_g_enabled")
		two_g_enabled.require = {["1"] = {"interval"}}
		function two_g_enabled:validate(value) return self.dt:is_bool(value) end

	wifi_scanner:table_foreach("wireless", "wifi-device", function(c)
		if c.hwmode and string.match(c.hwmode, "11a") then
			local five_g_enabled = s:option("five_g_enabled")
				five_g_enabled.require = {["1"] = {"interval"}}
				function five_g_enabled:validate(value) return self.dt:is_bool(value) end
			return false
		end
	end)

	local interval = s:option("interval")
		function interval:validate(value)
			local status, msg = self.dt:uinteger(value)
			if status then status, msg = self.dt:range(value, 1, 2147483) end
			return status, msg
		end

function wifi_scanner:minimum_beacon_interval()
	local fs = require("nixio.fs")
	for module, value in pairs(minimum_beacon_values) do
		if fs.access(MODULE_PATH..module) then
			return value
		end
	end
	return nil
end

function wifi_scanner:add_warning_message()
	local beacon_interval = self:minimum_beacon_interval()
	if not beacon_interval then return end
	local affected_5g, affected_2g = false, false
	self:table_foreach("wireless", "wifi-device", function(c)
		local affected_beacon = tonumber(c.beacon_int or "100") < beacon_interval
		if affected_beacon then
			if c.hwmode == "11a" then
				affected_5g = c[".name"]
			else
				affected_2g = c[".name"]
			end
		end
	end)

	if affected_5g and affected_2g then
		table.insert(self.messages, {code = 1, message = "Enabling wifi scanning on the 2.4GHz or 5GHz radios will set their beacon interval to "..tostring(beacon_interval), radios = {affected_2g, affected_5g}})
	elseif affected_2g then
		table.insert(self.messages, {code = 2, message = "Enabling wifi scanning on the 2.4GHz radio will set its beacon interval to "..tostring(beacon_interval), radios = {affected_2g}})
	elseif affected_5g then
		table.insert(self.messages, {code = 3, message = "Enabling wifi scanning on the 5GHz radio will set its beacon interval to "..tostring(beacon_interval), radios = {affected_5g}})
	end
end

function wifi_scanner:GET_init_hook()
	self:add_warning_message()
end

function wifi_scanner:PUT_before_commit_hook()
	local beacon_interval = self:minimum_beacon_interval()
	if not beacon_interval then return end

	local enabled_2ghz = self:table_get(self.config, "wifi_scan", "two_g_enabled") == "1"
	local enabled_5ghz = self:table_get(self.config, "wifi_scan", "five_g_enabled") == "1"
	if not enabled_2ghz and not enabled_5ghz then return end
	self:table_foreach("wireless", "wifi-device", function(c)
		if (c.hwmode == "11a" and enabled_5ghz) or (c.hwmode ~= "11a" and enabled_2ghz) then
			local current_interval = c.beacon_int or "100"
			if not current_interval or tonumber(current_interval) < beacon_interval then
				self:table_set("wireless", c[".name"], "beacon_int", tostring(beacon_interval))
			end
		end
	end)
end

function wifi_scanner:PUT_after_commit_hook()
	self:add_warning_message()
end

return wifi_scanner
