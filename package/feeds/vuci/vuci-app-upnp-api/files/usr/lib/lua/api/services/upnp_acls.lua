local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local upnp_acls = ConfigService:new({ anonymous = true })

local s = upnp_acls:section("upnpd", "perm_rule")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

    local comment = s:option("comment")
        function comment:validate(value)
            return self.dt:fieldvalidation(value, "^[a-zA-Z0-9_ ]+$")
        end

    local ext_ports = s:option("ext_ports")
        function ext_ports:validate(value)
            if value:find("-") then
                local split_values = util.split(value, "-")
                for _, single_value in ipairs(split_values) do
                    local res, msg = self.dt:port(single_value)
                    if not res then return false, msg end
                end
                return true
            else
                return self.dt:port(value)
            end
        end

    local internal_address = s:option("int_addr")
        function internal_address:validate(value)
            return self.dt:ipmask4(value)
        end

    local internal_ports = s:option("int_ports")
        function internal_ports:validate(value)
            if value:find("-") then
                local split_values = util.split(value, "-")
                for _, single_value in ipairs(split_values) do
                    local res, msg = self.dt:port(single_value)
                    if not res then return false, msg end
                end
                return true
            else
                return self.dt:port(value)
            end
        end

    local action = s:option("action")
        function action:validate(value)
            local action_options = { "allow", "deny" }
            return self.dt:check_array(value, action_options)
        end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return upnp_acls