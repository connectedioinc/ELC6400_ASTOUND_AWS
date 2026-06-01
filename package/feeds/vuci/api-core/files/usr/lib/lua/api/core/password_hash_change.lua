local FunctionService = require("api/FunctionService")
local util = require("vuci.util")

local administration = FunctionService:new()

-- top secret action used in site_manager for controller to be able to change device's password using hash
function administration:change_password_hash()

	local username1 = self.arguments.data.username
	local username2 = self.arguments.data.username
	local new_pw_hash = self.arguments.data.password_hash

	if self.user.group ~= "root" and username1 ~= self.user.username then
		return self:add_critical_error(STD_CODES.UNAUTHORIZED, "User can not change other user's password.")
	end

	if username1 == "root" or username1 == "admin" then
		-- root and admin are used together, so need to change pw for both of them
		username1 = "root"
		username2 = "admin"
	end

	local targets = { username1 }
	if username2 ~= username1 then
		targets[#targets + 1] = username2
	end

	local changed = false
	for _, user in ipairs(targets) do
		local _, entry = util.getpasswd(user)
		if entry then
			changed = true
			local res = util.setpasswd(user, new_pw_hash, true)
			if res ~= 0 then
				return self:add_critical_error(1, "Password change error.")
			end
		end
	end

	if not changed then
		return self:add_critical_error(STD_CODES.INVALID_OPT, "User doesn't exist.", "username", nil, nil, self.arguments.data.username)
	end

	local uci = require("uci").cursor()
	uci:set("vuci", "main", "firstlogin", "")
	uci:commit("vuci")

	return self:ResponseOK("Password changed successfully.")
end

local change_password_hash = administration:action("change_password_hash", administration.change_password_hash)

	local username = change_password_hash:option("username")

	local password_hash = change_password_hash:option("password_hash")


return administration