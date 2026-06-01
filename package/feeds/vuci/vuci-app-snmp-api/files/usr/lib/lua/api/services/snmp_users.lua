local ConfigService = require("api/ConfigService")

local flags = {
	increment_name = true
}

local snmp_users = ConfigService:new(flags)
local enabled

function snmp_users:validate_section_hook()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled") or self.current_data_block["enabled"]
	if opt_enabled and opt_enabled == "1" then
		local required_options = {"rights", "seclevel"}
		local opt_seclevel = self:get_abs_value(self.config, self.sid, "seclevel") or self.current_data_block["seclevel"]
		if opt_seclevel and opt_seclevel == "auth" then
			table.insert(required_options, "authtype")
			table.insert(required_options, "authpass")
		end
		if opt_seclevel and opt_seclevel == "priv" then
			table.insert(required_options, "authtype")
			table.insert(required_options, "authpass")
			table.insert(required_options, "privtype")
			table.insert(required_options, "privpass")
		end
		enabled.require = {["1"] = required_options}
	end
end

snmp_users.PUT_validate_section_hook = snmp_users.validate_section_hook
snmp_users.POST_validate_section_hook = snmp_users.validate_section_hook

	local user = snmp_users:section("snmpd", "user")

	function user:create_defaults()
		return {
			username = require("vuci.util_tlt").get_next_name(self, self.config, self.section_type, "username", "user")
		}
	end

		enabled = user:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local username = user:option("username")
		username.cfg_require = true
		username.maxlength = 32
			function username:validate(value)
				local name_exists = false
				local res, msg = self.dt:uciname(value)
				if not res then
					return res, msg
				end
				self:table_foreach(self.config, self.section_type, function(s)
					if self.sid ~= s[".name"] and value == s.username then
						name_exists = true
						return false
					end
				end)
				if name_exists then
					return false, "User '".. value .."' already exists"
				end
				return true
			end

		local seclevel = user:option("seclevel")
			function seclevel:validate(value)
				return self.dt:check_array(value, {"noauth", "auth", "priv"})
			end

		local authtype = user:option("authtype")
			function authtype:validate(value)
				return self.dt:check_array(value, {"SHA", "MD5"})
			end

		local authpass = user:option("authpass")
		authpass.minlength = 8
		authpass.maxlength = 64
			function authpass:validate(value)
				return self.dt:uciname(value)
			end

		local privtype = user:option("privtype")
			function privtype:validate(value)
				return self.dt:check_array(value, {"DES", "AES"})
			end

		local privpass = user:option("privpass")
		privpass.minlength = 8
		privpass.maxlength = 64
			function privpass:validate(value)
				return self.dt:uciname(value)
			end

		local rights = user:option("rights")
			function rights:validate(value)
				return self.dt:check_array(value, {"ro", "rw"})
			end

		local mibaccess = user:option("mibaccess")
		mibaccess.maxlength = 16
			function mibaccess:validate(value)
				return self.dt:string(value)
			end

return snmp_users