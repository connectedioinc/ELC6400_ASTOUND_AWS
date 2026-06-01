local ConfigService = require("api.ConfigService")
local mdm = require("vuci.modem")

local sim_idle_protection = ConfigService:new({ create = false, delete = false })

local function adjust_esim_index(value)
	return tonumber(value) and tostring(tonumber(value) + 1) or nil
end

local s = sim_idle_protection:section("sim_idle_protection", "sim_idle_protection")

	local enable = s:option("enable")
		enable.require = {
			["1"] = { "time", "host", "packet_size", "count", "period", "ip_type" }
		}
		enable.cfg_require = true
		function enable:validate(value)
			return self.dt:is_bool(value)
		end

	local period = s:option("period")
		period.require = { month = { "day" }, week = { "weekday" } }
		function period:validate(value)
			return self.dt:check_array(value, { "month", "week" })
		end
		function period:set(value)
			if value == "week" then
				self:table_delete(self.config, self.sid, "day")
			else -- value == "month"
				self:table_delete(self.config, self.sid, "weekday")
			end
			self:table_set(self.config, self.sid, "period", value)
		end

	local day = s:option("day")
		function day:validate(value)
			return self.dt:irange(value, 1, 31)
		end

	local weekday = s:option("weekday")
		function weekday:validate(value)
			return self.dt:irange(value, 0, 6)
		end

	local time = s:option("time")
		function time:validate(value)
			return self.dt:time(value)
		end
		function time:set(value)
			local hours, minutes = tostring(value):match("^(%d-):(%d-)$")
			--tonumber used to strip zeros ex. 05 to 5
			self:table_set(self.config, self.sid, "hour", tonumber(hours) or "0")
			self:table_set(self.config, self.sid, "min", tonumber(minutes) or "0")
		end
		function time:get()
			local hours = tonumber(self:table_get(self.config, self.sid, "hour")) or 0
			local minutes = tonumber(self:table_get(self.config, self.sid, "min")) or 0
			return ("%.2d:%.2d"):format(hours, minutes)
		end

	local opt_ip_type = s:option("ip_type")
		function opt_ip_type:validate(value)
			return self.dt:check_array(value, {"ipv4", "ipv6"})
		end

	local host = s:option("host")
		function host:validate(value)
			local ip_type = self:get_abs_value(self.config, self.sid, opt_ip_type.api_key)
			if ip_type == "ipv4" then
				return self.dt:ipv4host(value)
			elseif ip_type == "ipv6" then
				return self.dt:ipv6host(value)
			end
			return false, "Missing required option: " .. opt_ip_type.api_key
		end

	local packet_size = s:option("packet_size")
		function packet_size:validate(value)
			return self.dt:irange(value, 1, 1000)
		end

	local count = s:option("count")
		function count:validate(value)
			return self.dt:irange(value, 1, 30)
		end

	s:option("modem").readonly = true
	s:option("position").readonly = true

	local esim_profile = s:option("esim_profile")
		esim_profile.readonly = true
		function esim_profile:get(value)
			local sim_card = self:table_get(self.config, self.sid)
			if not value and mdm:is_card_esim(sim_card.modem, sim_card.position) then
				return "1"
			end
			return adjust_esim_index(value)
		end

return sim_idle_protection
