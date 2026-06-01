local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local util = require("vuci.util")
local has_tpm = require("vuci.board"):has_tpm()

local STunnel = ConfigService:new()

local s = STunnel:section("stunnel", "service")
s:make_primary()
s.default_options.id.maxlength = 8

	local use_tpm = s:option("use_tpm")
		function use_tpm:validate(value)
			if not has_tpm and value == "1" then
				return false, "TPM2 module is not available on this device."
			end
			return self.dt:is_bool(value)
		end
		function use_tpm:get()
			if not has_tpm then return "0" end
			if self:table_get(self.config, self.sid, "no_tpm") then return "0" end
			return "1"
		end
		function use_tpm:set(value)
			if value == "1" then
				self:table_delete(self.config, self.sid, "no_tpm")
			else
				self:table_set(self.config, self.sid, "no_tpm", "1")
			end
		end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local client = s:option("client")
		function client:validate(value)
			-- 0 = Server
			-- 1 = Client
			return self.dt:is_bool(value)
		end

	local accept_host = s:option("accept_host")
		-- Fix after WebUI adds support for required values.
		-- accept_host.cfg_require = true
		function accept_host:validate(value)
			if value ~= "localhost" then
				return self.dt:ipaddr(value)
			else
				return true
			end
		end

	local accept_port = s:option("accept_port")
		-- Fix after WebUI adds support for required values.
		-- accept_port.cfg_require = true
		function accept_port:validate(value)
			return self.dt:port(value)
		end

	local connect = s:option("connect", { list = true })
		-- Fix after WebUI adds support for required values.
		-- connect.cfg_require = true
		function connect:validate(value)
			return self.dt:hostport(value)
		end

	local cipher_type = s:option("cipher_type")
		function cipher_type:validate(value)
			return self.dt:check_array(value, {"none", "dhe_rsa", "custom"})
		end

	local ciphers = s:option("ciphers", { list = true })
		function ciphers:validate(value)
			return self.dt:string(value)
		end

	local protocol = s:option("protocol")
		function protocol:validate(value)
			return self.dt:check_array(value, {"connect", "smtp"})
		end

	local protocol_authentication = s:option("protocolAuthentication")
		function protocol_authentication:validate(value)
			local proto = self:get_abs_value(self.main_config, self.sid, "protocol")
			if proto == "smtp" then
				local ok, err = self.dt:check_array(value, {"plain", "login"})
				if not ok then return ok, err end
			elseif proto == "connect" then
				local ok, err = self.dt:check_array(value, {"basic", "ntlm"})
				if not ok then return ok, err end
			end
			return true
		end

	local protocol_domain = s:option("protocolDomain")
		function protocol_domain:validate(value)
			return self.dt:string(value)
		end

	local protocol_host = s:option("protocolHost")
		function protocol_host:validate(value)
			return self.dt:string(value)
		end

	local protocol_username = s:option("protocolUsername")
		protocol_username.maxlength = 512
		function protocol_username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local protocol_password = s:option("protocolPassword", { sensitive = true })
		protocol_password.maxlength = 512
		function protocol_password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local cert = s:option("cert", {certificate = {
		upload_only = true,
		failsafe = true,
	}})

	local key = s:option("key", {certificate = {
		upload_only = true,
		tpm2 = function(self)
			if self:get_abs_value(self.config, self.sid, "no_tpm") then return false end
			return true
		end,
		failsafe = true,
	}})

	local CAfile = s:option("CAfile", {certificate = {
		upload_only = true,
		failsafe = true,
	}})

function STunnel:update_cypher()
	local data = self.current_data_block
	if data.cipher_type == "dhe_rsa" then
		self:table_set(self.main_config, self.sid, "ciphers", {
			"ECDHE-RSA-AES256-SHA384",
			"ECDHE-RSA-AES128-SHA256",
			"ECDHE-RSA-AES256-SHA",
			"AES128-GCM-SHA256",
			"AES256-SHA256",
			"AES128-SHA256",
			"AES256-SHA",
			"AES128-SHA",
			"DHE-RSA-AES256-SHA256"
		})
	elseif data.cipher_type == "none" then
		self:table_delete(self.main_config, self.sid, "ciphers")
	end

	if data.CAfile == "" then
		self:table_delete(self.main_config, self.sid, "verifyPeer")
	else
		self:table_set(self.main_config, self.sid, "verifyPeer", "yes")
	end
end

function STunnel:PUT_after_data_hook()
	self:update_cypher()
end

function STunnel:POST_after_data_hook()
	self:update_cypher()
end

function STunnel:get_firewall_rule()
	local rule_sid = false
	self:table_foreach("firewall", "rule", function(r)
		if r.name == "Allow-stunnel" then
			rule_sid = r[".name"]
		end
	end)
	return rule_sid
end

function STunnel:UPDATE_firewall()
	local ports = {}
	self:table_foreach(self.main_config, "service", function(sec)
		if sec.client ~= "1" and sec.enabled == "1" then
			ports[#ports+1] = sec.accept_port
		end
	end)

	local rule_sid = self:get_firewall_rule()

	if #ports < 1 then
		if rule_sid then
			self:table_delete("firewall", rule_sid)
		end
		return
	end

	local p = table.concat(ports, ",")
	rule_sid = util_tlt.ensure_vpn_rule_exists(self, {
		name      = "Allow-stunnel",
		target    = "ACCEPT",
		src       = "wan",
		dest_port = p,
		proto     = "tcp"}, { target = "ACCEPT", dest_port = p, proto = "tcp" })
end

function STunnel:UPDATE_before_commit_hook()
	self:UPDATE_firewall()
	if self.sid then
		local is_client = self:table_get(self.main_config, self.sid, "client")
		if is_client ~= "1" and self.request_method ~= "DELETE" then
			self:table_delete(self.main_config, self.sid, "verifyPeer")
		end
	end
	local section_found = self:table_find(self.main_config, "service", { enabled = "1" })
	self:table_set(self.main_config, "globals", "enabled", section_found and "1" or "0")
end

STunnel.POST_before_commit_hook = STunnel.UPDATE_before_commit_hook
STunnel.PUT_before_commit_hook = STunnel.UPDATE_before_commit_hook
STunnel.DELETE_before_commit_hook = STunnel.UPDATE_before_commit_hook

function STunnel:POST_init_hook()
	local count = 0
	self:table_foreach(self.main_config, "service", function (_)
		count = count + 1
	end)
	if count >= 5 then
		self:add_critical_error(
			STD_CODES.NO_CREATE,
			"Can not create more instances. Only 5 STunnel instances are allowed",
			"Validation"
		)
	end
end

function STunnel:UPDATE_validate_section_hook()
	if self:get_abs_value(self.config, self.sid, "client") ~= "1" then
		enabled.require = { ["1"] = {"cert", "key"} }
	end
end

STunnel.POST_validate_section_hook = STunnel.UPDATE_validate_section_hook
STunnel.PUT_validate_section_hook = STunnel.UPDATE_validate_section_hook

function STunnel:PUT_section_init_hook()
	local key_option = "key"
	if self.current_data_block.use_tpm == "1" then
		-- add the existing key so if use_tpm is enabled it would use core logic to upload the key even if the api user does not provide it
		self.current_data_block[key_option] = self.current_data_block[key_option] or self:get_abs_value(self.config, self.sid, key_option)
	end
end

return STunnel
