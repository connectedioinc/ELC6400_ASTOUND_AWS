local has_wifi = require("vuci.board"):has_wifi()
local CODES = require("api.network.wireless_codes")

if not has_wifi then
	return nil
end

local ConfigService = require("api/ConfigService")
local wdev_common = require("api/network/wireless_devices_common")

local wdev_global = ConfigService:new({
    create = false,
    delete = false,
    general_section = "radio0",
    global_settings = true
})

wdev_global.options_arr = {}

function wdev_global:PUT_section_init_hook()
	local wireless = require "vuci.wireless"
	self.wireless_options = wireless:device_options(self.sid, self.uci)
	if not self.wireless_options then
		return self:ResponseError("Non-existent device provided")
	end

	local countrylist = {}
	for _, c in ipairs(self.wireless_options.countrylist) do
		countrylist[#countrylist+1] = c.alpha2
	end
	self.options_arr.countrylist = countrylist
end

local s = wdev_global:section("wireless", "wifi-device")

    local country = s:option("country")
    function country:validate(value) return self.dt:check_array(value, self.options_arr.countrylist) end
	function country:set(value)
		wdev_common:set_radio_country(value, self)
	end

	local location = s:option("location")
		function location:validate(value)
			local location_options = {"any", "outdoor"}
			return self.dt:check_array(value, location_options)
		end
		function location:set(value)
			local location_map = {
				["any"] = CODES.LOCATION.ANY,
				["outdoor"] = CODES.LOCATION.OUTDOOR,
			}
			self:table_foreach(self.config, "wifi-device", function(s)
				self:table_set(self.config, s[".name"], "country3", location_map[value])
			end)
		end
		function location:get()
			local value = self:table_get(self.config, self.sid, "country3")
			local location_map = {
				[CODES.LOCATION.ANY] = "any",
				[CODES.LOCATION.OUTDOOR] = "outdoor",
			}
			return location_map[value] or "any"
		end

return wdev_global
