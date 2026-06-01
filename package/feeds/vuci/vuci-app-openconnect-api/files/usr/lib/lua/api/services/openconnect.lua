local ConfigService = require("api/ConfigService")
local has_tpm = require("vuci.board"):has_tpm()
local fs = require("nixio.fs")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")

local openconnect = ConfigService:new()

function openconnect:hash_validate(val)
	local sha1_pattern = "^sha1:[a-fA-F0-9]+$"
	local sha256_pattern = "^sha256:[a-fA-F0-9]+$"
	local pin_sha256_pattern = "^pin%-sha256:[a-zA-Z0-9/+]+=?=?$"

	if val:match(sha1_pattern) or val:match(sha256_pattern) or (val:match(pin_sha256_pattern) and math.fmod(#val:sub(12), 4) == 0) then
		return val
	end

	return false, "Accepted formats are sha1:<hex_value>, sha256:<hex_value>, or pin-sha256:<base64_value>."
end

function openconnect:check_fingerprint(server, port)
	local fingerprint
	server = self.dt:ip6addr(server) and '[' .. server .. ']' or server
	local sclient_res = util.trim(util.file_exec("/bin/sh", {"-c", "timeout 3 openssl s_client -connect " .. server .. ":" .. port .. " < /dev/null 2> /dev/null"}).stdout)
	local cert = sclient_res:match("(%-%-%-%-%-BEGIN CERTIFICATE%-%-%-%-%-.-\n%-%-%-%-%-END CERTIFICATE%-%-%-%-%-)")
	if not cert or cert == "" then
		return false
	end
	local pubkey = util.trim(util.file_exec("/bin/sh", { "-c", "echo '" .. cert .. "' | openssl x509 -pubkey -noout 2> /dev/null"}).stdout)

	if pubkey and pubkey ~= "" then
		local fingerprint = util.trim(util.file_exec("/bin/sh", { "-c", "echo \"" .. pubkey .. "\" | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64"}).stdout)
		fingerprint = "pin-sha256:" .. fingerprint
		return fingerprint
	end
	return false
end

function openconnect:before_commit_hook()
	local enabled  = false

	self:table_foreach("network", "interface", function(s)
		if s.proto == "openconnect" and s.disabled ~= "1" then
			enabled = true
		end
	end)

	local zone_opt = {
		name	= "openconnect",
		input	= "ACCEPT",
		forward	= "REJECT",
		output	= "ACCEPT",
		masq	= '1',
		device	= 'opc+'
	}
	local network = {}
	self:table_foreach("network", "interface", function(c)
		if c.proto == "openconnect" then
			table.insert(network, c[".name"])
		end
	end)
	zone_opt["network"] = table.concat(network, " ")

	if self.request_method == "POST" or self.request_method == "DELETE" then
		util_tlt.update_firewall_zone_network("openconnect", zone_opt["network"], self.uci, true)
	end

	if enabled then
		local zone_name = util_tlt.ensure_zone_exists(self, zone_opt, nil, zone_opt.device).name
		if zone_name == zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name) end
	end
end

openconnect.POST_before_commit_hook = openconnect.before_commit_hook
openconnect.PUT_before_commit_hook = openconnect.before_commit_hook

function openconnect:DELETE_before_commit_hook()
	openconnect:before_commit_hook()
	if not util_tlt.has_section(self, "network", "interface", { proto = "openconnect" }) then
		util_tlt.delete_zone_from_firewall(self, "openconnect", true, true)
	end
end

local Fingerprint = openconnect:action("check_fingerprint", function(self, data)
	local fingerprint = self:check_fingerprint(data.server, data.port)
	if fingerprint then
		return self:ResponseOK( { fingerprint = fingerprint } )
	end
	return self:ResponseError("Failed to check fingerprint")
end)

	local server = Fingerprint:option("server")
		server.require = true
		function server:validate(value)
			return self.dt:host(value)
		end

	local port = Fingerprint:option("port")
		port.require = true
		function port:validate(value)
			return self.dt:port(value)
		end

local s = openconnect:section("network", "interface")
s:make_primary()
s.default_options.id.maxlength = 8

function s:filter(s)
	return s.proto == "openconnect"
end
function s:create_defaults(sid)
	return {
		proto       = "openconnect",
		disabled    = "1",
		vpn_protocol = "anyconnect"
	}
end

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = { "server", "port", "vpn_protocol" } }
		function enabled:validate(val) return self.dt:is_bool(val) end
		function enabled:get()
			local disabled = self:table_get(self.config, self.sid, "disabled")
			local auto = self:table_get(self.config, self.sid, "auto")
			if disabled ~= "1" and auto ~= "0" then
				return "1"
			end
			return "0"
		end
		function enabled:set(val)
			if val == "1" then
				self:table_delete("network", self.sid, "auto")
				self:table_delete("network", self.sid, "disabled")
			else
				self:table_set("network", self.sid, "auto", "0")
				self:table_set("network", self.sid, "disabled", "1")
			end
		end

	local server = s:option("server")
		function server:validate(value) return self.dt:host(value) end

	local port = s:option("port")
		function port:validate(value)
			return self.dt:port(value)
		end

	local username = s:option("username")
		username.maxlength = 512
		username.require = { "password" }
		function username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 512
		password.require = { "username" }
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local ca_cert = s:option("ca_cert", { certificate = {
		service = "openconnect",
		type = "certificates",
		cert_types = { "ca" },
		failsafe = true,
	} })

	local user_cert = s:option("user_cert", { certificate = {
		service = "openconnect",
		type = "certificates",
		cert_types = { "certificates" },
		failsafe = true,
		
	} })

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

	local user_key = s:option("user_key", { certificate = {
		service = "openconnect",
		cert_types = { "keys" },
		tpm2 = function(self)
			if self:get_abs_value(self.config, self.sid, "no_tpm") then return false end
			return true
		end,
		failsafe = true,
	}})
	local vpn_protocol = s:option("vpn_protocol")
	vpn_protocol.cfg_require = true
		function vpn_protocol:validate(value)
			local vpn_protocol_options = { "anyconnect", "nc", "gp", "pulse", "f5", "fortinet", "array" }
			return self.dt:check_array(value, vpn_protocol_options)
		end

	local serverhash = s:option("serverhash")
	serverhash.maxlength = 255
		function serverhash:validate(value)
			return self:hash_validate(value)
		end

	function openconnect:STATUS_sid_exists()
		if self.sid then
			return self:table_get(self.main_config, self.sid) and true or false
		else
			return true
		end
	end

	function openconnect:instances_status(sid)
		local info = util.ubus("network.interface.".. sid, "status") or {}
		local st = {
			active = false,
		}
		if info["ipv4-address"] and #info["ipv4-address"] > 0 and info["ipv4-address"][1].address ~= "" then
			st.active = true
			st["ipv4-address"] = info["ipv4-address"][1].address
		end
		if info["ipv6-address"] and #info["ipv6-address"] > 0 and info["ipv6-address"][1].address ~= "" then
			st.active = true
			st["ipv6-address"] = info["ipv6-address"][1].address
			local mask = info["ipv6-address"][1].mask
			if mask then
				st["ipv6-address"] = st["ipv6-address"] .. "/" .. tostring(mask)
			end
		end
		return st
	end

	function openconnect:GET_TYPE_status()
		if self._single then
			return self:instances_status(self.sid) and self:ResponseOK(self:instances_status(self.sid))
				or self:ResponseNotFound("Instance not active")
		end

		local statuses = {}
		self:table_foreach("network", "interface", function(c)
			if c.proto == "openconnect" then
				statuses[c[".name"]] = self:instances_status(c[".name"])
			end
		end)

		return self:ResponseOK(statuses)
	end

function openconnect:PUT_section_init_hook()
	local key_option = "user_key"
	if self.current_data_block.use_tpm == "1" then
		-- add the existing key so if use_tpm is enabled it would use core logic to upload the key even if the api user does not provide it
		self.current_data_block[key_option] = self.current_data_block[key_option] or self:get_abs_value(self.config, self.sid, key_option)
	end
end

return openconnect
