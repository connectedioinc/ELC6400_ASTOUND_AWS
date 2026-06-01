local ConfigService = require("api/ConfigService")

local NAIRealmGeneral = ConfigService:new({
    increment_name = true
})

local NAIRealm = NAIRealmGeneral:section("wireless", "nai-realm")
function NAIRealm:create_defaults()
    return {
        wifi_id = self:table_get(self.config, self.binding, "wifi_id"),
        number = "0"
    }
end
function NAIRealm:filter(options)
    return options.wifi_id == self:table_get(self.config, self.binding, "wifi_id")
end

    local opt_hostname = NAIRealm:option("hostname")
        function opt_hostname:validate(value)
            return self.dt:hostname(value)
        end

    local opt_auth_num = NAIRealm:option("auth_num")
        function opt_auth_num:validate(value)
            return self.dt:check_array(value, {
                "13", -- EAP-TLS
                "21", -- EAP-TTLS
                "25", -- PEAP
                "43" -- EAP-FAST
            })
        end

    local opt_param = NAIRealm:option("param")
        function opt_param:validate(value)
            return self.dt:check_array(value, {
                "[2:1]", -- Non EAP PAP
                "[2:2]", -- Non EAP CHAP
                "[2:3]", -- Non EAP MSCHAP
                "[2:4]", -- Non EAP MSCHAPV2
                "[5:6]", -- Credential certificate
                "[5:7]", -- Credential username/password
            })
        end

return NAIRealmGeneral