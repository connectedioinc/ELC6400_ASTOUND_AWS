
local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local fs = require "nixio.fs"
local board = require("vuci.board")
local mdm = require("vuci.modem")
local modems = mdm:get_all_modems()

local ntpclient = ConfigService:new({ create = false, delete = false })

local s = ntpclient:section("ntpclient", "ntpclient")
	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local zone_name = s:option("zoneName")
		function zone_name:validate(val)
			if val == self:table_get(self.config, self.sid, self.api_key) then
				-- allow setting the same timezone to avoid the need of keep settings
				self.timezone = self:table_get("system", "system", "timezone")
				return true
			end
			local tz = require "vuci.tz"
			for _, timezone in ipairs(tz) do
				if timezone[1] == val then
					self.timezone = timezone[2]
					return true
				end
			end
			return false, "Invalid zoneName: Timezone with this zoneName not found"
		end
		function zone_name:set(val)
			self.timezone = self.timezone or "UTC"
			self:table_set("system", "system", "timezone", self.timezone)
			fs.writefile("/etc/TZ", self.timezone .. "\n")
			self:table_set("system", "system", "zoneName", val)
			self:table_set("ntpclient", self.sid, "zoneName", val)
		end
		function zone_name:get()
			return self:table_get(self.config, self.sid, self.api_key)
				or self:table_get("system", "system", "zoneName")
				or self:table_get("system", "system", "timezone")
				or "UTC"
		end

	local timezone = s:option("timezone")
		timezone.readonly = true
		function timezone:get()
			return self:table_get("system", "system", "timezone")
		end

	local freq = s:option("freq")
		function freq:validate(value)
			return self.dt:uinteger(value)
		end

		function freq:set(val)
			self:table_set("ntpclient", "ntpdrift", "freq", val)
		end

		function freq:get()
			return self.uci:get("ntpclient", "ntpdrift", "freq")
		end

	local current_system_time = s:option("current_system_time")
		function current_system_time:validate(value)
			return self.dt:uinteger(value)
		end
		function current_system_time:get()
			return tostring(os.time())
		end
		function current_system_time:set(val)
			local date = os.date("*t", tonumber(val))
			if not date then return end

			local res = util.ubus("date_time", "set_time", { timestamp = val })
			if not res or not res.exit_code or res.exit_code ~= "0" then
				self:add_critical_error(
					STD_CODES.INCORRECT_REQUEST,
					"Failed to set system time",
					"Request"
				)
			end
			util.ubus("rc", "init", { name = "sysfixtime", action = "restart" })
		end

	local force = s:option("force")
		function force:validate(value)
			return self.dt:is_bool(value)
		end

	local save = s:option("save")
		function save:validate(value)
			return self.dt:is_bool(value)
		end

	local count = s:option("count")
		function count:validate(value)
			return self.dt:irange(value, 0, 2147483647)
		end

	local interval = s:option("interval")
		function interval:validate(value)
			return self.dt:irange(value, 60, 2147483647)
		end

if board:has_gps() then
	local gps_sync = s:option("gps_sync")
		gps_sync.require = {["1"] = {"gps_interval"}}
		function gps_sync:validate(value)
			return self.dt:is_bool(value)
		end
		function gps_sync:set(val)
			local gps_enabled = self:table_get("gps", "gpsd", "enabled")
			if val == "1" and gps_enabled ~= "1" then
				self:table_set("gps", "gpsd", "enabled", "1")
				self:add_message(2, "GPS has been enabled", self.api_key)

				local ok, gps_utils = pcall(require, "api.services.gps.utils")
				if ok and gps_utils.has_wwan_gnss_conflict() then
					self:add_message(3, "GPS service has been enabled. Device may lose WWAN connection due to GNSS.", self.api_key)
				end
			end
			self:table_set(self.config, self.sid, self.api_key, val)
		end

	local gps_interval = s:option("gps_interval")
		function gps_interval:validate(value)
			return self.dt:check_array(value, {"300", "1800", "3600", "21600", "43200", "86400", "604800", "2592000"})
		end
end

if #modems > 0 then
	local sync_enabled = s:option("sync_enabled")
		function sync_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local tmz_sync_enabled = s:option("tmz_sync_enabled")
		function tmz_sync_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local failover = s:option("failover")
		function failover:validate(value)
			return self.dt:uinteger(value)
		end
end

function ntpclient:PUT_validate_section_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local sync_enabled = self:get_abs_value(self.config, self.sid, "sync_enabled")
	if enabled ~= "1" then return end
	if #modems > 0 and sync_enabled == "1" then return end

	local count = 0
	local empty_hostname_count = 0
	self:table_foreach("ntpclient", "ntpserver", function (instance)
		count = count + 1
		if not instance.hostname then
			empty_hostname_count = empty_hostname_count + 1
		end
	end)

	if count ~= empty_hostname_count then return end

	return self:add_critical_error(
		STD_CODES.INVALID_OPT,
		#modems > 0 and
			"Service does not work without enabled 'sync_enabled' or at least one 'ntpserver'." or
			"Service does not work without at least one 'ntpserver' instance configured.",
		"Validation"
	)
end

return ntpclient
