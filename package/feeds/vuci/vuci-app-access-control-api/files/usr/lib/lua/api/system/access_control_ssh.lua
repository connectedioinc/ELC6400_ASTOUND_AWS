local ConfigService = require("api/ConfigService")
local ac = require("vuci.access")
local fs = require("nixio.fs")
local util = require("vuci.util")
local ac_util = require("api.system.access_control_utils")
local SSH = ConfigService:new({
	create = false,
	delete = false,
	general_section = function(self)
		local sid
		self:table_foreach("dropbear", "dropbear", function(c)
			sid = c[".name"]
		end)
		return sid
	end
})

local AUTHORIZED_KEYS_FILE = "/etc/dropbear/authorized_keys"

if ac_util.has_wan then
	function SSH:PUT_section_init_hook()
		self:table_foreach("firewall", "redirect", function(s)
			if s.name == "dmz_fw" and (not s.enabled or s.enabled == "1") then
				self.DMZ_enabled = true
				return false
			end
		end)
	end
	
	function SSH:PUT_before_commit_hook()
		ac.setup_dmz_redirects(self)
	end
end

function SSH:PUT_after_data_hook()
	ac_util.after_data_hook(self, "enabled", "local_access", "enable", "wan_access", "wan_port", "port", "SSH")
end

local SSHGeneral = SSH:section("dropbear", "dropbear")

	local opt_enable = SSHGeneral:option("enabled")
		function opt_enable:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enable:set(value)
			self:table_set(self.config, self.sid, "local_access", value)
		end
		function opt_enable:get()
			return self:table_get(self.config, self.sid, "local_access") or self:table_get(self.config, self.sid, "enable") ~= "0" and "1" or "0"
		end

if ac_util.has_wan then
	local opt_ssh_wan_access = SSHGeneral:option("wan_access")
		function opt_ssh_wan_access:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_ssh_wan_access:set(value)
			self:table_set(self.config, self.sid, "_sshWanAccess", value)
			if not self.DMZ_enabled then return end

			self:table_foreach("firewall", "redirect", function(s)
				if s.name == "dmz_ssh" then
					self:table_set("firewall", s[".name"], "enabled", value == "1" and "" or "0")
					return false
				end
			end)
		end
		function opt_ssh_wan_access:get()
			return self:table_get(self.config, self.sid, "_sshWanAccess")
		end

	local opt_wan_port = SSHGeneral:option("wan_port")
		function opt_wan_port:validate(value)
			return self.dt:port(value)
		end
		function opt_wan_port:get(value)
			return value or self:table_get(self.config, self.sid, "Port")
		end
end

	local opt_port = SSHGeneral:option("port")
		opt_port.cfg_require = true
		function opt_port:validate(value)
			return self.dt:port(value)
		end
		function opt_port:set(value)
			self:table_set(self.config, self.sid, "Port", value)
		end
		function opt_port:get()
			return self:table_get(self.config, self.sid, "Port")
		end

	local opt_ssh_keys = SSHGeneral:option("ssh_keys")
		function opt_ssh_keys:validate(value)
			return self.dt:string(value)
		end
		function opt_ssh_keys:set(value)
			local authorized_keys = value:gsub("\r\n?", "\n")
			fs.writefile(AUTHORIZED_KEYS_FILE, authorized_keys)
			util.set_file_permissions(AUTHORIZED_KEYS_FILE, "dropbear", 660)
		end
		function opt_ssh_keys:get()
			local authorized_keys = fs.readfile(AUTHORIZED_KEYS_FILE)
			return authorized_keys
		end

	local opt_enable_key_ssh = SSHGeneral:option("enable_key_ssh")
		function opt_enable_key_ssh:validate(value)
			return self.dt:range(value,0,2)
		end
		function opt_enable_key_ssh:set(value)
			if value == "1" then
				self:table_set(self.config, self.sid, "enable_key_ssh", value)
				self:table_set(self.config, self.sid, "RootPasswordAuth", "1")
			elseif value == "2" then
				self:table_set(self.config, self.sid, "RootPasswordAuth", "0")
				self:table_set(self.config, self.sid, "enable_key_ssh", "1")
			else
				fs.remove(AUTHORIZED_KEYS_FILE)
				self:table_set(self.config, self.sid, "enable_key_ssh", value)
				self:table_set(self.config, self.sid, "RootPasswordAuth", "1")
			end
		end
		function opt_enable_key_ssh:get()
			local value = self:table_get(self.config, self.sid, "enable_key_ssh")
			if value == "1" and self:table_get(self.config, self.sid, "RootPasswordAuth") == "0" then
				return "2"
			else
				return value or "0"
			end
		end

	-- password_auth option is used by site_manager
	local opt_password_auth = SSHGeneral:option("password_auth")
		function opt_password_auth:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_password_auth:get()
			local value = self:table_get(self.config, self.sid, "PasswordAuth")
			if value == "on" then return "1" end -- default value is "on" in cfg
			return value
		end
		function opt_password_auth:set(value)
			self:table_set(self.config, self.sid, "PasswordAuth", value)
		end

return SSH

