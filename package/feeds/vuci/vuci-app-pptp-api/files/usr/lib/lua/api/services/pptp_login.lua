local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local vpn_utils = require("vuci.vpn")

local PPTP = ConfigService:new({increment_name = true})

function PPTP:credentials_validate_no_diacritics(val)
	local regex = "^[0-9a-zA-Z@._-]*$"
	local hint = "Alphanumeric and @, ., _, - characters are allowed."
    local result = string.match(val, regex)
    if result then return true end
	return false, hint
end

function PPTP:validate_section_hook()
    local username = self.current_data_block.username
    if username and username ~= "" then
        local exist = false
        self:table_foreach("pptpd", "login", function (s)
            if s.username == username and s[".name"] ~= self.sid then
                exist = true
            end
        end)
        if exist then
            self:add_critical_error(
                STD_CODES.NAME_USED,
                "User exist with provided username",
                "Validation"
            )
        end
    end
end
PPTP.POST_validate_section_hook = PPTP.validate_section_hook
PPTP.PUT_validate_section_hook = PPTP.validate_section_hook

local PPTPLogin = PPTP:section("pptpd", "login")

local opt_username = PPTPLogin:option("username")
    opt_username.maxlength = 255
    function opt_username:validate(value)
        return self:credentials_validate_no_diacritics(value)
    end
    function opt_username:set(value)
        local hash = vpn_utils.string_to_md5sum(value)
        self:table_set(self.config, self.sid, "device_name", "pptp-" .. hash:sub(1, 8))
        self:table_set(self.config, self.sid, "username", value)
    end

local opt_password = PPTPLogin:option("password", { sensitive = true })
    opt_password.maxlength = 255
    function opt_password:validate(value)
        return self.dt:credentials_validate(value)
    end

local opt_remoteip = PPTPLogin:option("remoteip")
    function opt_remoteip:validate(value)
        return self.dt:ip4addr(value)
    end

return PPTP
