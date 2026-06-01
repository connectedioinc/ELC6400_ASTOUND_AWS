local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local mdm = require("vuci.modem")
local gps_utils = require("api.services.gps.utils")

if not board:has_gps()then
	return nil
end

local function is_modem_limited()
	for modem in mdm:info_iterator() do
		local model = modem.model
		if model and (model:match("^SLM770") or model:match("^BG95")) then
			return true
		end
	end

	return false
end

local function has_dpo_support()
	for modem in mdm:info_iterator() do
		if mdm:has_dpo_mode_support(modem.usb_id) then
			return true
		end
	end

	return false
end

local GPS = ConfigService:new({
	delete = false,
	create = false,
	general_section = "gpsd",
	global_settings = true
})

local GPSGeneral = GPS:section("gps", "section")

function GPSGeneral:filter(options)
	return options[".name"] == "gpsd"
end

	local opt_enabled = GPSGeneral:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enabled:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if value == "1" then
				if gps_utils.has_wwan_gnss_conflict() then
					local mode = self:getter_wrapped_abs_value(self.config, self.sid, "mode")
					if mode == "1" then
						self:add_message(3, "Device may lose WWAN connection due to GNSS", self.api_key)
					else
						self:add_message(2, "Device WWAN connection will be lost due to GNSS", self.api_key)
					end
				end
			else
				self:table_foreach("ntpclient", "ntpclient", function(ntpclient)
					if ntpclient.gps_sync == "1" then
						self:table_set("ntpclient", ntpclient[".name"], "gps_sync", "0")
						self:add_message(1, "NTP client GPS synchronization has been disabled", self.api_key)
						return false
					end
				end)
			end
		end

	if not is_modem_limited() then
		local opt_galileo_sup = GPSGeneral:option("galileo_sup")
		function opt_galileo_sup:validate(value)
			return self.dt:is_bool(value)
		end

		local opt_glonass_sup = GPSGeneral:option("glonass_sup")
		function opt_glonass_sup:validate(value)
			return self.dt:is_bool(value)
		end

		local opt_beidou_sup = GPSGeneral:option("beidou_sup")
		function opt_beidou_sup:validate(value)
			return self.dt:is_bool(value)
		end
	end

	if gps_utils.has_wwan_gnss_conflict() then
		function GPSGeneral:modman_get(option)
			return self:table_get("gps", "modman", option)
		end
		function GPSGeneral:modman_set(option, value)
			return self:table_set("gps", "modman", option, value)
		end

		local opt_mode = GPSGeneral:option("mode")
		opt_mode.require = { ["1"] = {"interval", "timeout"} }
		function opt_mode:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_mode:set(value)
			self:modman_set("enabled", value)
		end
		function opt_mode:get(_)
			return self:modman_get("enabled") or "0"
		end

		local opt_interval = GPSGeneral:option("interval")
		function opt_interval:validate(value)
			return self.dt:irange(value, 60, 86400)
		end
		function opt_interval:set(value)
			self:modman_set("interval", value)
		end
		function opt_interval:get(_)
			return self:modman_get("interval")
		end

		local opt_timeout = GPSGeneral:option("timeout")
		function opt_timeout:validate(value)
			return self.dt:irange(value, 30, 999)
		end
		function opt_timeout:set(value)
			self:modman_set("timeout", value)
		end
		function opt_timeout:get(_)
			return self:modman_get("timeout")
		end
	end

	if has_dpo_support() then
		local opt_dpo_enabled = GPSGeneral:option("dpo_enabled")
		function opt_dpo_enabled:validate(value)
			return self.dt:is_bool(value)
		end
	end

return GPS
