local ConfigService = require("api/ConfigService")
local vpn_utils = require("vuci.vpn")

local L2TP = ConfigService:new({
	anonymous = true
})

local L2TPUsers = L2TP:section("xl2tpd", "login")

	local opt_username = L2TPUsers:option("username")
        opt_username.maxlength = 512
		function opt_username:validate(value)
			return self.dt:credentials_validate(value)
		end
		function opt_username:set(value)
			local hash = vpn_utils.string_to_md5sum(value)
			self:table_set(self.config, self.sid, "device_name", "xl2tp-" .. hash:sub(1, 8))
			self:table_set(self.config, self.sid, "username", value)
		end

	local opt_password = L2TPUsers:option("password", { sensitive = true })
        opt_password.maxlength = 512
		function opt_password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local opt_remoteip = L2TPUsers:option("remoteip")
		function opt_remoteip:validate(value)
			return self.dt:ip4addr(value)
		end

function L2TP:validate_section_hook()
    local username = self.current_data_block.username
    if username and username ~= "" then
        local exist = false
        self:table_foreach("xl2tpd", "login", function (s)
            if s.username == username and s[".name"] ~= self.sid then
                exist = true
            end
        end)
        if exist then
            self:add_critical_error(
                STD_CODES.NAME_USED,
                "User with the provided username exists",
                "Validation"
            )
        end
    end
end
L2TP.POST_validate_section_hook = L2TP.validate_section_hook
L2TP.PUT_validate_section_hook = L2TP.validate_section_hook


return L2TP
