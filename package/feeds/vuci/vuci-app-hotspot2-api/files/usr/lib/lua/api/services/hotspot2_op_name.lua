local ConfigService = require("api/ConfigService")

local OpNameGeneral = ConfigService:new({
	increment_name = true
})

local OpName = OpNameGeneral:section("wireless", "hs20_oper_friendly_name")
function OpName:create_defaults()
    return {
        wifi_id = self:table_get(self.config, self.binding, "wifi_id")
    }
end
function OpName:filter(options)
    return options.wifi_id == self:table_get(self.config, self.binding, "wifi_id")
end

	local opt_country_code = OpName:option("country_code")
		opt_country_code.minlength = 2
		opt_country_code.maxlength = 3
		function opt_country_code:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z]+$")
		end

	local opt_name = OpName:option("name")
		-- Disabled till WebUI front-end stops creating empty configurations
		-- opt_name.cfg_require = true
		opt_name.maxlength = 512
		function opt_name:validate(value)
			if self.dt:fieldvalidation(value, "^[^`'\"]+$") then return true end
			return false, "A string of any characters is accepted except ', \", `."
		end

return OpNameGeneral