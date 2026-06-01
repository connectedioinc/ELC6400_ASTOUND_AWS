local ConfigService = require("api/ConfigService")

local VenueGeneral = ConfigService:new({
	increment_name = true
})

local Venue = VenueGeneral:section("wireless", "venue")
function Venue:create_defaults()
	return {
		wifi_id = self:table_get(self.config, self.binding, "wifi_id")
	}
end
function Venue:filter(options)
	return options.wifi_id == self:table_get(self.config, self.binding, "wifi_id")
end

	local opt_name = Venue:option("name")
		opt_name.minlength = 1
		opt_name.maxlength = 64
		-- Workarounds below because of "lang:name" structure in the config
		function opt_name:set(value)
			local current = self:table_get(self.config, self.sid, self.api_key)
			local lang = string.match(current or "", "(.*):.*") or ""
			self:table_set(self.config, self.sid, self.api_key, lang..":"..value)
		end
		function opt_name:get()
			local current = self:table_get(self.config, self.sid, self.api_key)
			return string.match(current or "", ".*:(.*)") or ""
		end
		function opt_name:validate(value)
			if self.dt:fieldvalidation(value, "^[^`'\"]+$") then return true end
			return false, "A string of any characters is accepted except ', \", `."
		end

	local opt_country_code = Venue:option("country_code")
		opt_country_code.minlength = 2
		opt_country_code.maxlength = 3
		function opt_country_code:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z]+$")
		end
		-- Workarounds below because of "lang:name" structure in the config
		function opt_country_code:set(value)
			local current = self:table_get(self.config, self.sid, opt_name.api_key)
			local name = string.match(current or "", ".*:(.*)") or ""
			self:table_set(self.config, self.sid, opt_name.api_key, value..":"..name)
		end
		function opt_country_code:get()
			local current = self:table_get(self.config, self.sid, opt_name.api_key)
			return string.match(current or "", "(.*):.*") or ""
		end

	local opt_url = Venue:option("url")
		function opt_url:validate(value)
			return self.dt:protourl(value)
		end

return VenueGeneral