local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local profiles = require "vuci.profiles"
local package = require "vuci.package_checker"
local change_pass_package = package.is_installed("vuci-app-change-password-ui")

local rpcd = ConfigService:new({ anonymous = true })

rpcd.access = {
	read = false,
	write = false
}
rpcd.changed_password = false

function rpcd:initialize_hook()
	if self.user.group == "root" then
		self.access.read = true
		self.access.write = true
	else
		local rights = util.load_rights(self.user.group)
		if rights["target_write"] == "allow" and
				(rights["write"]["*"] or
				rights["write"]["system/admin/multiusers/users_configuration*"] or
				rights["write"]["system/admin/multiusers*"] or
				rights["write"]["system/admin*"] or
				rights["write"]["system*"]) then
			self.access.write = true
		elseif rights["target_write"] == "deny" and
				not rights["write"]["core"] and
				not rights["write"]["!system/admin/multiusers/users_configuration*"] and
				not rights["write"]["!system/admin/multiusers*"] and
				not rights["write"]["!system/admin*"] and
				not rights["write"]["!system*"] then
			self.access.write = true
		end
		if rights["target_read"] == "allow" and
				(rights["read"]["*"] or
				rights["read"]["system/admin/multiusers/users_configuration*"] or
				rights["read"]["system/admin/multiusers*"] or
				rights["read"]["system/admin*"] or
				rights["read"]["system*"]) then
			self.access.read = true
		elseif rights["target_read"] == "deny" and
				not rights["read"]["core"] and
				not rights["read"]["!system/admin/multiusers/users_configuration*"] and
				not rights["read"]["!system/admin/multiusers*"] and
				not rights["read"]["!system/admin*"] and
				not rights["read"]["!system*"] then
			self.access.read = true
		end
	end
end
rpcd.users_to_delete = {}

	local s = rpcd:section("rpcd", "login")
	if not change_pass_package then
		function s:filter(options)
			local group = self.user.group
			local username = self.user.username
			if group ~= "root" and not self.access.read then
				return options["username"] == username
			end
			return true
		end

			local username = s:option("username")
				function username:validate(value)
					if self.request_method ~= "POST" then
						return false, "username can not be changed."
					end

					local exists = false
					self:table_foreach("rpcd", "login", function(s)
						if s.username and s.username == value then
							exists = true
							return false
						end
					end)
					if exists then
						return false, "User with this username already exists."
					end
					local result = util.file_exec("/usr/bin/id", { value })
					if result.code == 0 then
						return false, "This username is reserved for system"
					end
					return self.dt:username(value)
				end

			local group = s:option("group")
			group.cfg_require = true
				function group:validate(value)
					local user_group = self:table_get(self.main_config, self.sid, "group")
					if user_group == "root" and value == user_group then return true end

					local groups = {}
					self:table_foreach("rpcd", "group", function(s)
						if s[".name"] ~= "root" then
							groups[#groups+1] = s[".name"]
						end
					end)
					return self.dt:check_array(value, groups)
				end
				group.default_set = group.set
				function group:set(value)
					self:default_set(value)
				end
	end
		local current_password = s:option("current_password")
			function current_password:validate(value)
				if self.request_method ~= "PUT" then
					return false, "current_password is only required for changing password."
				end
				return self.dt:string(value)
			end
			function current_password:get(value) return nil end
			function current_password:set(value) end

		local password = s:option("password")
		password.maxlength = 256
			function password:validate(value)
				if self.request_method == "PUT" and value ~= self.current_data_block.password_confirm then
					return false, "'password' and 'password_confirm' options do not match."
				end
				return self.dt:system_password(value)
			end
			function password:get(value) return nil end
			function password:set(value)
				local new_user = self.request_method == "POST"
				if new_user or value == "" then
					return -- password is set separately for new user in POST_after_data_hook. Also skip empty password updating.
				end
				local current_user = self.user.username
				local current_group = self.user.group

				local username = self:get_abs_value(self.config, self.sid, "username")
				local group = self:get_abs_value(self.config, self.sid, "group")
				local cur_pass = self.current_data_block.current_password or ""

				if not self.access.write and current_user ~= username then
					self:add_critical_error(5, "Can not change other user's password.", "password")
				end
				if group == "root" and current_group ~= "root" then
					self:add_critical_error(5, "Can not change root password.", "password")
				end
				if current_user == username or group == "root" or change_pass_package then
					if not util.checkpasswd(username, cur_pass) then
						self:add_critical_error(1, "Wrong current password.", "current_password")
					end
					if cur_pass == value then
						self:add_critical_error(6, "Password is the same. Use a different new password.", "password")
					end
				end

				local user_password = util.getpasswd(username)
				local res = util.setpasswd(username, value)
				if res ~= 0 then
					self:add_critical_error(4, "Unknown error.", "password")
				end
				if group == "root" then
					res = util.setpasswd("root", value)
					if res ~= 0 then
						if user_password then
							util.setpasswd(username, user_password, true)
						end
						self:add_critical_error(4, "Unknown error.", "password")
					end
					if self:table_get("vuci", "main", "firstlogin") == "1" then
						self:table_set("vuci", "main", "firstlogin", "")
					end
				end
				self:table_set("rpcd", self.sid, "_dummy_time", os.time())

				-- destroy other active sessions after password change
				-- TODO: won't be neccessary after full migration from ubus rpc to API
				local sessions = {util.ubus("session", "list")}
				for _, session in ipairs(sessions) do
					if session.data.username == username and session.ubus_rpc_session ~= self.user.sid then
						util.ubus("session", "destroy", { ubus_rpc_session = session.ubus_rpc_session })
					end
				end
				rpcd.changed_password = true
			end

		local password_confirm = s:option("password_confirm")
		password_confirm.maxlength = 256
			function password_confirm:validate(value)
				if self.request_method ~= "PUT" then
					return false, "password_confirm is only required for changing password."
				end
				if value ~= self.current_data_block.password then
					return false, "'password' and 'password_confirm' options do not match."
				end
				return self.dt:system_password(value)
			end
			function password_confirm:get(value) return nil end
			function password_confirm:set(value) end

		local ssh_enable
		if not change_pass_package then
			ssh_enable = s:option("ssh_enable")
				function ssh_enable:validate(value)
					return self.dt:is_bool(value)
				end
				function ssh_enable:get()
					if not self.access.read then return nil end
					local username = self:get_abs_value(self.config, self.sid, "username")
					local passwd = io.open("/etc/passwd", "r")
					if not passwd then return "0" end
					while true do
						local line = passwd:read("*l")
						if not line then break end
						local data = util.split(line, ":")
						if data[1] == username then
							passwd:close()
							return data[#data] == "/bin/ash" and "1" or "0"
						end
					end
					passwd:close()
					return "0"
				end
				function ssh_enable:set(value)
					if self.request_method == "POST" or (not self.access.write and value == "") then
						return self:add_critical_error(STD_CODES.INVALID_OPT, "Can not create user with SSH access.", "ssh_enable")
					end
					if not self.access.write or (self:get_abs_value(self.config, self.sid, "group") ~= "root" and value == "1") then
						return self:add_error(6, "Can not change SSH access.", "ssh_enable")
					end

					local username = self:get_abs_value(self.config, self.sid, "username")
					local shell = "/bin/false"
					if value == "1" then
						shell = "/bin/ash"
					else
						util.ubus("rc", "init", { name = "dropbear", action = "restart" })
					end

					util.ubus("rpc-sys", "set_user_shell", {
						user = username,
						path = shell
					})
				end
		end

function rpcd:POST_validate_section_hook()
	if change_pass_package then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "User creation is not allowed")
	end
	if not self.access.write then
		self:add_critical_error(STD_CODES.UNAUTHORIZED, "Unauthorized", "Authorization", "403")
	end

	local s = self.current_data_block
	if not s.username or s.username == "" then
		self:add_error(STD_CODES.INVALID_OPT, "'username' option is required", "username")
	end
	if not s.password or s.password == "" then
		self:add_error(STD_CODES.INVALID_OPT, "'password' option is required", "password")
	end
	if not s.group or s.group == "" then
		self:add_error(STD_CODES.INVALID_OPT, "'group' option is required", "group")
	end

	self:return_if_error()
end
function rpcd:POST_after_data_hook()
	local response = util.ubus("rpc-sys", "add_user", {
		user = self.current_data_block.username,
		group = "user",
		home = "/usr/local/home/user",
		shell = "/bin/false"
	})
	if not response or response.res ~= "0" then
		self:add_critical_error(STD_CODES.UCI_SET_ERROR, "Failed to create user.", "UCI")
	end
	util.setpasswd(self.current_data_block.username, self.current_data_block.password)
	if require("vuci.package_checker").is_installed("pam") then
		self:table_foreach("pam", "pam", function(s)
			if s.service == "rpcd" and s.enabled == "1" and self:table_get("pam", "rpcd", "all_users") == "2" then
				self:table_set("rpcd", self.sid, "auth_type", "pam")
				return false
			end
		end)
	end
end

function rpcd:PUT_validate_section_hook()
	local current_pass = self.current_data_block.current_password and self.current_data_block.current_password ~= ""
	local pass = self.current_data_block.password and self.current_data_block.password ~= ""
	local pass_confirm = self.current_data_block.password_confirm and self.current_data_block.password_confirm ~= ""
	local current_user = self.user.username
	local user_name = self:table_get(self.main_config, self.sid, "username")
	local user_group = self:table_get(self.main_config, self.sid, "group")

	if current_pass or pass or pass_confirm then
		if current_user == user_name or user_group == "root" or change_pass_package then -- Changing password for yourself
			if not current_pass then
				self:add_error(STD_CODES.INVALID_OPT, "'current_password' option is required", "current_password")
			end
			if not pass then
				self:add_error(STD_CODES.INVALID_OPT, "'password' option is required", "password")
			end
			if not pass_confirm then
				self:add_error(STD_CODES.INVALID_OPT, "'password_confirm' option is required", "password_confirm")
			end
		else
			if current_pass then
				self:add_error(STD_CODES.INVALID_OPT, "'current_password' option is required only for changing your own password", "current_password")
			end
			if pass and not pass_confirm then
				self:add_error(STD_CODES.INVALID_OPT, "'password_confirm' option is required", "password_confirm")
			elseif pass_confirm and not pass then
				self:add_error(STD_CODES.INVALID_OPT, "'password' option is required", "password")
			end
		end
	end
	if self.current_data_block.group and self.current_data_block.group ~= "" and not self.access.write then
		self:add_critical_error(STD_CODES.UNAUTHORIZED, "Unauthorized", "Authorization", "403")
	end

	if user_group == "root" and self.current_data_block.group and self.current_data_block.group ~= user_group then
		self:add_critical_error(STD_CODES.INVALID_OPT, "'root' user's group can not be changed.")
	end
end

function rpcd:DELETE_before_section_delete_hook()
	local username = self:table_get(self.main_config, self.sid, "username")
	local group = self:table_get(self.main_config, self.sid, "group")

	if username then self.users_to_delete[username] = true end
	if group == "root" then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "'root' user can not be deleted.")
	end
	if ssh_enable and ssh_enable:get() ~= "0" then
		util.ubus("rc", "init", { name = "dropbear", action = "restart" })
	end
end
function rpcd:DELETE_after_data_hook(response_data)
	profiles.update()
end
function rpcd:DELETE_after_commit_hook()
	local sessions = { util.ubus("session", "list") }
	for user in pairs(self.users_to_delete) do
		local response = util.ubus("rpc-sys", "del_user", { user = user })
		if response and response.res ~= "0" then
			for _, single_session in ipairs(sessions) do
				if single_session.data.username == user then
					util.ubus("session", "destroy", { ubus_rpc_session = single_session.ubus_rpc_session })
				end
			end
		end
	end
	profiles.update()
end

function rpcd:DELETE_validate_hook()
	if change_pass_package then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "User deletion is not allowed")
	end
	if not self.access.write then
		self:add_critical_error(STD_CODES.UNAUTHORIZED, "Unauthorized", "Authorization", "403")
	end
end

function rpcd:GET_TYPE_acls()
	if self.sid ~= "options" then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end
	local res = util.ubus("session", "access", { ubus_rpc_session = self.user.sid }) or {}
	res.hide_sensitive = self:table_get("rpcd", self.user.group, "hide_sensitive") or "0"
	self:ResponseOK(res)
end

function rpcd:after_commit_hook()
	profiles.update()
end
rpcd.POST_after_commit_hook = rpcd.after_commit_hook
rpcd.PUT_after_commit_hook = rpcd.after_commit_hook

return rpcd
