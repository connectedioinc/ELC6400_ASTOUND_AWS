local ConfigService = require("api/ConfigService")

local flags = {
	anonymous = true,
	create = false,
	delete = false,
	general_section = function(self)
		local sid
		self:table_foreach("firewall", "defaults", function(c)
			sid = c[".name"]
		end)
		return sid
	end
}

local syn_flood_protection = ConfigService:new(flags)

	local defaults = syn_flood_protection:section("firewall", "defaults")

		local syn_flood = defaults:option("syn_flood")
			function syn_flood:validate(value)
				return self.dt:is_bool(value)
			end
			function syn_flood:get(value)
				return value or "0"
			end

		local synflood_rate = defaults:option("synflood_rate")
			function synflood_rate:validate(value)
				return self.dt:irange(value, 1, 10000)
			end

			function synflood_rate:get(value)
				if value then
					return value:split("/")[1]
				end
				return "25"
			end

			function synflood_rate:set(value)
				if #value == 0 then
					self:table_delete(self.config, self.sid, self.api_key)
				else
					self:table_set(self.config, self.sid, self.api_key, value .. "/s")
				end
			end

		local synflood_burst = defaults:option("synflood_burst")
			function synflood_burst:validate(value)
				return self.dt:irange(value, 1, 10000)
			end
			function synflood_burst:get(value)
				return value or "50"
			end

		local tcp_syncookies = defaults:option("tcp_syncookies")
			function tcp_syncookies:validate(value)
				return self.dt:is_bool(value)
			end
			function tcp_syncookies:get(value)
				return value or "1"
			end

return syn_flood_protection
