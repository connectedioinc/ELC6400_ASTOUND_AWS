local ConfigService = require("api/ConfigService")
local fs = require("nixio.fs")
local util = require("vuci.util")

local PAM = ConfigService:new({
	increment_name = true
})
PAM.order_by = "priority"

-- Allowed modules for PAM service.
PAM.allowed_modules = {
	tacplus = true,
	radius_auth = true,
	unix = true
}
PAM.services = {
	"sshd",
	"rpcd"
}

PAM.old_users = {}

-- Gets device security module names.
---@return table data Security module data with names as keys.
function PAM:security_modules()
	local lib_dirs = {
		"/usr/lib/security",
		"/usr/local/lib/security",
		"/lib/security"
	}
	local data = {}
	for _, lib_dir in ipairs(lib_dirs) do
		if fs.access(lib_dir) then
			for filename in fs.dir(lib_dir) do
				local name = filename:match("^pam_(.+).so$")
				if name then data[name] = true end
			end
		end
	end
	return data
end

function PAM:GET_TYPE_options()
	local modules = {}
	for module in pairs(self:security_modules()) do
		if self.allowed_modules[module] then
			table.insert(modules, module)
		end
	end
	self:ResponseOK({
		modules = modules
	})
end

function PAM:abs_value(cfg_sid, cfg_name, opt_name)
	local data = self.arguments.data or {}
	return data[opt_name] or self:table_get(self.config, cfg_sid, cfg_name)
end

local PAMAuth = PAM:section("pam", "pam")
function PAMAuth:create_defaults()
	return {
		enabled = "0",
		module = "unix",
		type = "optional",
		timeout = "3",
		require_message_auth = "1"
	}
end

	local opt_enabled = PAMAuth:option("enabled")
		opt_enabled.cfg_require = true
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_service = PAMAuth:option("service")
		opt_service.cfg_require = true
		function opt_service:validate(value)
			return self.dt:check_array(value, self.services)
		end

	local opt_module = PAMAuth:option("module")
		opt_module.cfg_require = true
		function opt_module:validate(value)
			local available = {}
			-- Filter only allowed modules
			for module in pairs(self:security_modules()) do
				if self.allowed_modules[module] then
					table.insert(available, module)
				end
			end
			if #available == 0 then
				return false, "No supported security modules in the device."
			end
			return self.dt:check_array(value, available)
		end

	local opt_type = PAMAuth:option("type")
		opt_type.cfg_require = true
		function opt_type:validate(value)
			return self.dt:check_array(value, {
				"required",
				"requisite",
				"sufficient",
				"optional"
			})
		end

	local opt_server = PAMAuth:option("server")
		function opt_server:validate(value)
			return self.dt:ipaddr(value)
		end

	local opt_secret = PAMAuth:option("secret", { sensitive = true })

	local opt_port = PAMAuth:option("port")
		function opt_port:validate(value)
			return self.dt:port(value)
		end

	local opt_timeout = PAMAuth:option("timeout")
		function opt_timeout:validate(value)
			return self.dt:range(value, 3, 10)
		end

	local opt_require_message_auth = PAMAuth:option("require_message_auth")
		function opt_require_message_auth:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_all_users = PAMAuth:option("all_users")
		function opt_all_users:validate(value)
			local service = self:get_abs_value(self.config, self.sid, "service")
			if service == "rpcd" then
				local users = self:abs_value(service, "users", "users") or {}
				if value == "1" and #users > 0 then
					return false, "Cannot select all users and specific users at the same time"
				end
			end
			return self.dt:is_bool(value)
		end
		function opt_all_users:set(value)
			local service = self:get_abs_value(self.config, self.sid, "service")
			local module = self:get_abs_value(self.config, self.sid, "module")
			if service == "rpcd" then
				self:table_set(self.config, service, "all_users", value)
			elseif service == "sshd" then
				self:table_set(self.config, service, "privilege_lvl", value == "1" and "3" or "0")
			end
		end
		function opt_all_users:get()
			local service = self:get_abs_value(self.config, self.sid, "service")
			local module = self:get_abs_value(self.config, self.sid, "module")
			if service == "rpcd" then
				local all_users = self:table_get(self.config, service, "all_users")
				if all_users == "2" then return "1" end
				return all_users == "1" and "1" or "0"
			elseif service == "sshd" then
				return self:table_get(self.config, service, "privilege_lvl") == "3" and "1" or "0"
			end
			return nil
		end

	local opt_default_group = PAMAuth:option("default_group")
		function opt_default_group:validate(value)
			local service = self:get_abs_value(self.config, self.sid, "service")
			if service ~= "rpcd" then
				return false, "Default group can be set for service 'rpcd'"
			end
			local module = self:get_abs_value(self.config, self.sid, "module")
			if module ~= "radius_auth" and module ~= "tacplus" then
				return false, "Default group can be set for module 'radius_auth' and 'tacplus'"
			end
			if self:abs_value(service, "all_users", "all_users") ~= "1" then
				return false, "Default group can be set only for all enabled users"
			end
			local groups = { "none" }
			self:table_foreach("rpcd", "group", function(s)
				table.insert(groups, s[".name"])
			end)
			return self.dt:check_array(value, groups)
		end
		function opt_default_group:set(value)
			local service = self:get_abs_value(self.config, self.sid, "service")
			self:table_set(self.config, service, "default_group", value == "none" and "" or value)
		end
		function opt_default_group:get()
			local service = self:get_abs_value(self.config, self.sid, "service")
			return self:table_get(self.config, service, "default_group")
		end

	local opt_users = PAMAuth:option("users", { list = true })
		function opt_users:validate(value)
			local service = self:get_abs_value(self.config, self.sid, "service")
			if service ~= "rpcd" then
				return false, "Users can only be selected for service 'rpcd'"
			end
			local all_users = self:abs_value(service, "all_users", "all_users")
			if all_users ~= "" and all_users ~= "0" then
				return false, "Cannot select all users and specific users at the same time"
			end
			local valid, err = self.dt:uciname(value)
			if not valid then return valid, err end
			if self:table_get("rpcd", value, "username") then
				return true
			end
			return false, "User does not exist"
		end
		function opt_users:set(value)
			local service = self:get_abs_value(self.config, self.sid, "service")
			self:table_set(self.config, service, "users", value)
		end
		function opt_users:get()
			local service = self:get_abs_value(self.config, self.sid, "service")
			local users = self:table_get(self.config, service, "users")
			if not users then return nil end
			return util.clone(users)
		end
	local priority = PAMAuth:option("priority")
		function priority:validate(value)
			return self.dt:uinteger(value)
		end

function PAM:after_data_hook()
	local sshd_enabled, rpcd_enabled
	local sshd_count, rpcd_count = 0, 0
	self:table_foreach(self.config, "pam", function(s)
		if self.request_method == "DELETE" and s[".name"] == self.sid then
			return true -- continue
		end
		if s.service == "sshd" then
			sshd_enabled = sshd_enabled or s.enabled == "1"
			sshd_count = sshd_count + 1
		end
		if s.service == "rpcd" then
			rpcd_enabled = rpcd_enabled or s.enabled == "1"
			rpcd_count = rpcd_count + 1
		end
	end)

	local service = self:table_get(self.config, self.sid, "service")
	local all_users = self:table_get(self.config, "rpcd", "all_users")

	if self.request_method == "POST" then
		local enabled = self:table_get(self.config, self.sid, "enabled")
		if service == "sshd" then
			sshd_enabled = sshd_enabled or enabled == "1"
			sshd_count = sshd_count + 1
		elseif service == "rpcd" then
			rpcd_enabled = rpcd_enabled or enabled == "1"
			rpcd_count = rpcd_count + 1
		end
	end

	if not sshd_enabled then
		self:table_set("dropbear", "@dropbear[0]", "pam", "0")
		self:table_delete("dropbear", "@dropbear[0]", "pam_privilege_lvl")
	else
		self:table_set("dropbear", "@dropbear[0]", "pam", "1")
		self:table_set("dropbear", "@dropbear[0]", "pam_privilege_lvl", self:table_get(self.config, "sshd", "privilege_lvl") or "")
	end

	if not rpcd_enabled then
		self:table_foreach("rpcd", "login", function(s)
			if s.auth_type == "pam" then
				self:table_delete("rpcd", s[".name"], "auth_type")
			end
		end)
		self:table_delete("rpcd", "@rpcd[0]", "pam_all_users")
		self:table_delete("rpcd", "@rpcd[0]", "pam_default_group")
	else
		self:table_set("rpcd", "@rpcd[0]", "pam_all_users", self:table_get(self.config, "rpcd", "all_users") == "1" and "1" or "")
		self:table_set("rpcd", "@rpcd[0]", "pam_default_group", self:table_get(self.config, "rpcd", "default_group") or "")
	end

	if self.request_method == "DELETE" then
		if sshd_count == 0 and service == "sshd" then
			self:table_set(self.config, service, "privilege_lvl", "0")
		end
		if rpcd_count == 0 and service == "rpcd" then
			self:table_set(self.config, service, "all_users", "0")
			self:table_set(self.config, service, "default_group", "")
		end
		return
	end

	if service ~= "rpcd" then return end
	if not rpcd_enabled then return end

	if all_users == "2" then
		self:table_foreach("rpcd", "login", function(s)
			self:table_set("rpcd", s[".name"], "auth_type", "pam")
		end)
		return
	end

	local users = self:table_get(self.config, service, "users") or {}
	if all_users == "1" or (all_users ~= "2" and #users == 0 and #self.old_users == 0) then
		self:table_foreach("rpcd", "login", function(s)
			if s.auth_type == "pam" then
				self:table_delete("rpcd", s[".name"], "auth_type")
			end
		end)
		return
	end
	for _, user in ipairs(self.old_users) do
		if not util.contains(users, user) then
			self:table_delete("rpcd", user, "auth_type")
		end
	end
	for _, user in ipairs(users) do
		self:table_set("rpcd", user, "auth_type", "pam")
	end
end

function PAM:section_init_hook()
	local service = self:get_abs_value(self.config, self.sid, "service")
	local module = self:get_abs_value(self.config, self.sid, "module")
	local all_users = self:abs_value(service, "all_users", "all_users")
	local priorities = {}
	if module and module ~= "unix" then
		opt_secret.cfg_require = true
		opt_port.cfg_require = true
		opt_server.cfg_require = true
		if module == "radius_auth" then
			opt_timeout.cfg_require = true
		end
	end
	if service and not self:table_get(self.config, service) then
		self:table_section(self.config, "pam_service", service, {})
	end
	if service ~= "rpcd" or all_users == "1" then return end
	self.old_users = self:table_get(self.config, service, "users") or {}
	for _, data in pairs(self.arguments.data) do
		if type(data) == "table" and data.priority then
			if util.contains(priorities, data.priority) then
				self:add_critical_error(
					STD_CODES.INVALID_SECTION,
					"Position argument can not be the same for multiple sections",
					"Validation"
				)
			end
			table.insert(priorities, data.priority)
		end
	end
end
PAM.PUT_section_init_hook = PAM.section_init_hook
PAM.POST_section_init_hook = PAM.section_init_hook

PAM.PUT_after_data_hook = PAM.after_data_hook
PAM.POST_after_data_hook = PAM.after_data_hook
PAM.DELETE_before_section_delete_hook = PAM.after_data_hook

return PAM