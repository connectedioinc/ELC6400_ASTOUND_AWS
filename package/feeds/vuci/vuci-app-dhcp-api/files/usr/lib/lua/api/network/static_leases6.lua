local board = require("vuci.board")

if board:is_switch() then return nil end

local ConfigService = require("api/ConfigService")
    
local function isHexString(value)
    if not type(value) == "string" then return false end
    i, j = string.find(value, "%x+")
    return i == 1 and j == string.len(value)
end

local static_leases6 = ConfigService:new({ anonymous = true })

local s = static_leases6:section("dhcp", "host")

    function s:create_defaults()
        return {
            _ipv6 = "1"
        }
    end
    s.filter = function (self, options)
        if (options["_ipv6"] == "1" or options.duid or options.hostid) and (not options.mac and not options.ip) then
            return true
        end
        
        return false
    end

    local name = s:option("name")
        function name:validate(value)
            return self.dt:hostname(value)
		end

    local duid = s:option("duid")
    duid.minlength = 6
    duid.maxlength = 130
        function duid:validate(value)
            if not isHexString(value) then return false, "Duid is not a hexadecimal string" end
            local ok, err = true, ""
            self:table_foreach("dhcp", "host", function(s)
                local current_duid = self:get_abs_value(self.config, s[".name"], "duid")
                current_duid = current_duid and string.lower(current_duid) or nil
                if s[".name"] ~= self.sid and current_duid == string.lower(value) then
                    ok, err = false, "Duid is already in use"
                    return false
                end
            end)
            return ok, err
        end
    
    local hostid = s:option("hostid")
    hostid.minlength = 1
    hostid.maxlength = 16
        function hostid:validate(value)
            
            if not isHexString(value) then return false, "Hostid is not a hexadecimal string" end
            local ok, err = true, ""
            self:table_foreach("dhcp", "host", function(s)
                local current_hostid = self:get_abs_value(self.config, s[".name"], "hostid")
                current_hostid = current_hostid and string.lower(current_hostid) or nil
                if s[".name"] ~= self.sid and current_hostid == string.lower(value) then
                    ok, err = false, "Hostid is already in use"
                    return false
                end
            end)
            return ok, err
        end

return static_leases6

