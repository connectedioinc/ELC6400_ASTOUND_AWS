local ConfigService = require("api/ConfigService")

local GPPGeneral = ConfigService:new({
    increment_name = true
})

local GPP = GPPGeneral:section("wireless", "anqp_3gpp_cell_net")
function GPP:create_defaults()
    return {
        wifi_id = self:table_get(self.config, self.binding, "wifi_id")
    }
end
function GPP:filter(options)
    return options.wifi_id == self:table_get(self.config, self.binding, "wifi_id")
end

    local opt_mobile_country_code = GPP:option("mobile_country_code")
        opt_mobile_country_code.minlength = 3
        opt_mobile_country_code.maxlength = 3
        function opt_mobile_country_code:validate(value)
            return self.dt:fieldvalidation(value, "^%d+$")
        end

    local opt_mobile_network_code = GPP:option("mobile_network_code")
        opt_mobile_network_code.minlength = 2
        opt_mobile_network_code.maxlength = 3
        -- Disabled till WebUI front-end stops creating empty configurations
        -- opt_mobile_network_code.cfg_require = true
        function opt_mobile_network_code:validate(value)
            return self.dt:fieldvalidation(value, "^%d+$")
        end

return GPPGeneral