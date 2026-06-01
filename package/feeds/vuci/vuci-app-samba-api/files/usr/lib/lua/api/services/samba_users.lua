local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local nixio = require("nixio")

local Samba = ConfigService:new({
	anonymous = true
})
Samba.ERR_CODES = {
	USER_CREATE_FAILED = 1,
	USER_PASS_SET_FAILED = 2,
	USERNAME_RESERVED = 3,
	USERNAME_IN_USE = 4,
	NO_USERNAME_CHANGE = 5
}

-- Adds new system user.
---@param name string New user name.
---@return boolean status Returns true if new user was added.
function Samba:add_new_user(name)
	local response = util.ubus("rpc-sys", "add_user", {
		user = name,
		group = "user",
		create_home = false,
		shell = "/bin/false"
	})
	return response and response.res == "0"
end

-- Updates system user password.
---@param username string Username of user to change password.
---@param password string New user password.
---@return boolean status Returns true if password was changed.
function Samba:update_password(username, password)
	local ok = os.execute(string.format(
		"(echo %s; echo %s) | smbpasswd -a -s %s",
		util.shellquote(password),
		util.shellquote(password),
		util.shellquote(username)
	))
	return ok == 0
end

function Samba:POST_after_data_hook()
	local username = self.current_data_block.username
	local password = self.current_data_block.password

	if self:add_new_user(username) then
		if not self:update_password(username, password) then
			self:add_critical_error(self.ERR_CODES.USER_PASS_SET_FAILED, "Failed to set new user password.")
		end
	else
		self:add_critical_error(self.ERR_CODES.USER_CREATE_FAILED, "Failed to create new system user.")
	end

	self:table_foreach(self.config, "sambashare", function (share)
		local invalid_users = share.invalid_users or {}
		table.insert(invalid_users, username)
		self:table_set(self.config, share[".name"], "invalid_users", invalid_users)
	end)
end

function Samba:PUT_after_data_hook()
	local password = self.current_data_block.password
	if password then
		local username = self:table_get(self.config, self.sid, "username")
		if username then
			if not self:update_password(username, password) then
				self:add_critical_error(self.ERR_CODES.USER_PASS_SET_FAILED, "Failed to set new user password.")
			end
		end
	end
end

function Samba:DELETE_before_section_delete_hook()
	local username = self:table_get(self.config, self.sid, "username")
	if username then
		self:table_foreach(self.config, "sambashare", function (share)
			local invalid_users = {}
			local users = {}
			for _, v in ipairs(type(share.invalid_users) == "table" and share.invalid_users or {}) do
				if v ~= username then table.insert(invalid_users, v) end
			end
			for _, v in ipairs(type(share.users) == "table" and share.users or {}) do
				if v ~= username then table.insert(users, v) end
			end
			self:table_set(self.config, share[".name"], "invalid_users", invalid_users)
			self:table_set(self.config, share[".name"], "users", users)
		end)
		util.ubus("rpc-sys", "del_user", { user = username })
		os.execute(string.format("smbpasswd -x %s", util.shellquote(username)))
	end
end

local SambaUsers = Samba:section("samba", "user")

	local opt_username = SambaUsers:option("username")
		opt_username.cfg_require = true
		opt_username.maxlength = 8
		function opt_username:validate(value)
			local current_username = value == self:table_get(self.config, self.sid, "username")
			if self.request_method == "PUT" and not current_username then
				self:add_critical_error(self.ERR_CODES.NO_USERNAME_CHANGE, "Username change is not allowed.")
			end
			local ok = true
			self:table_foreach(self.config, "user", function (user)
				if user.username == value and self.sid ~= user[".name"] then
					ok = false
				end
			end)
			if not ok then
				self:add_critical_error(self.ERR_CODES.USERNAME_IN_USE, "Username already in use.", string.format("%s: %s", self.api_key, value))
			end

			if not current_username and (nixio.getpw(value) or {}).uid then
				self:add_critical_error(self.ERR_CODES.USERNAME_RESERVED, "Username is reserved.", string.format("%s: %s", self.api_key, value))
			end

			if not string.match(value, "^[%l_]") then
				return false, "Username must start with a lower case character or '_'"
			end
			if #value > 1 and not string.match(value, "^[%l_][%l%d_-]*$") then
				return false, "Username can only contain lower case alphanumeric characters and '_' or '-'"
			end
			return true
		end

	local opt_password = SambaUsers:option("password")
		opt_password.cfg_require = true
		opt_password.maxlength = 130
		function opt_password:validate(value)
			local valid, _ = self.dt:root_password(value)
			return valid, "A password of minimum 8 characters and maximum 130 characters, at least one uppercase letter, one lowercase letter and one number is accepted."
		end
		function opt_password:get() end
		function opt_password:set()
			self:table_set(self.config, self.sid, self.api_key, "")
		end

return Samba