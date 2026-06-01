local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local password_policy = ConfigService:new({
	delete = false,
	create = false,
	general_section = function(self)
		local sid
		self:table_foreach("password_policy", "policy", function(c)
			sid = c[".name"]
			return false
		end)
		return sid
	end
})

local s = password_policy:section("password_policy", "policy")
	local password_length = s:option("password_length")
		function password_length:validate(value)
			return self.dt:irange(value, 8, 64)
		end

	local require_digits = s:option("require_digits")
		function require_digits:validate(value)
			return self.dt:is_bool(value)
		end

	local require_lower_upper = s:option("require_lower_upper")
		function require_lower_upper:validate(value)
			return self.dt:is_bool(value)
		end

	local require_special = s:option("require_special")
		function require_special:validate(value)
			return self.dt:is_bool(value)
		end

	local password_lifetime = s:option("password_lifetime")
		function password_lifetime:validate(value)
			local valid, err = self.dt:irange(value, 0, 365)
			if not valid then return valid, err end
			if value == "0" then return true end

			local expired = util.password_expired(self.user.username, value)
			if expired then
				return false, "Current users password will expire, please change password in order to set this value"
			end
			return true
		end

	local current_days_left = s:option("current_days_left")
		current_days_left.readonly = true
		function current_days_left:get()
			local password_lifetime = self:get_abs_value(self.config, self.sid, "password_lifetime")
			if not password_lifetime or password_lifetime == "" or password_lifetime == "0" then return nil end

			local expired, remain = util.password_expired(self.user.username, password_lifetime)
			if expired then return "0" end
			return tostring(remain)
		end

return password_policy