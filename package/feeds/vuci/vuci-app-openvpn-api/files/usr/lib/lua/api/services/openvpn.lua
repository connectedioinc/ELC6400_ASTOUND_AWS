local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local fs = require("nixio.fs")
local util_tlt = require("vuci.util_tlt")
local json = require("luci.jsonc")
local lip = require ("luci.ip")
local board = require("vuci.board")
local has_tpm = require("vuci.board"):has_tpm()
local api_utils = require("api/api_utils")
local net, ip
local tmp_path = "/var/run/openvpn/"
local ovpn_path = "/etc/openvpn/"

local nord = { uk = "194.35.233.122",
			   usa = "89.187.178.7",
			   aus = "103.137.12.171",
			   sa = "165.73.240.59" }

local express = { uk = "uk-london-ca-version-2.expressnetw.com",
				  usa = "usa-newyork-ca-version-2.expressnetw.com",
				  aus = "australia-melbourne-ca-version-2.expressnetw.com",
				  sa = "southafrica-ca-version-2.expressnetw.com" }

local openvpn = ConfigService:new()

openvpn.ERROR_CODES = {
	KEY_ENCRYPTED = 1,
	KEY_PASSWORD_INVALID = 5,
	INCORRECT_FILE = 2,
	NOT_EXISTS_FILE = 4,
	INCORRECT_PATH = 3,
	PKCS12_ENCRYPTED = 6,
	PKCS12_PASSWORD_INVALID = 7
}

local s = openvpn:section("openvpn", "openvpn")
s:make_primary()
s.default_options.id.maxlength = 15

function openvpn:next_num()
	local nums = {}
	self:table_foreach("openvpn", "openvpn", function(s)
		local num_name
		if s.name then num_name = tonumber(string.match(s.name, "^instance(%d+)$")) end
		local num_id = tonumber(string.match(s[".name"], "^inst(%d+)"))
		if num_name then
			table.insert(nums, num_name)
		end
		if num_id then
			table.insert(nums, num_id)
		end
	end)
	local next_num = util.find_first_missing(nums)
	return next_num, util.exec("tr -dc a-z0-9 </dev/urandom | head -c6")
end

function openvpn:POST_init_hook()
	if not self.arguments.data or api_utils:is_array(self.arguments.data) then
		return
	end
	local inst_type = self.arguments.data.type or "client"
	local name = self.arguments.data.name
	local id = self.arguments.data.id
	local num, uid = self:next_num()
	self.arguments.data.id = id or "inst"..num.."_"..uid
	self.arguments.data.name = name or "instance"..num
	self.arguments.data.type = inst_type
end

function s:create_defaults(sid)
	local inst_type = self.current_data_block["type"] or "client"
	local num = tonumber(string.match(sid, "^inst(%d+)")) or self:next_num()
	if self.current_data_block["config"] and self.current_data_block["config"] ~= "" then
		return {
			configuration = "custom"
		}
	else
		return {
			configuration = "manual",
			keepalive = "10 120",
			cipher = "AES-256-CBC",
			data_ciphers = { "AES-256-CBC" },
			auth = "sha256",
			port = "1194",
			proto = "udp",
			dev = string.format("tun_%s_%s", inst_type == "client" and "c" or "s", num),
			use_tpm = has_tpm and "1" or ""
		}
	end
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	function openvpn:remove_tls_clients()
		self:table_foreach(self.config, "client", function(s)
			if s.instance == self.sid then
				self:table_delete(self.main_config, s[".name"])
			end
		end)
	end

	function openvpn:get_num()
		return self.sid:match("^inst(%d+)") or string.sub(self.sid, 1, 8)
	end

	local instance_type = s:option("type")
	instance_type.cfg_require = true
		function instance_type:validate(value)
			return self.dt:check_array(value, { "server", "client" })
		end
		function instance_type:set(value)
			local dev = self:get_abs_value(self.config, self.sid, "dev")
			if dev then
				self:table_set(self.config, self.sid, "dev", string.sub(dev, 1, 3) .. "_" .. string.sub(value, 1, 1) .. "_" .. self:get_num())
			end
			if value == "client" then
				self:remove_tls_clients()
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local name = s:option("name")
		name.cfg_require = true
		name.maxlength = 64
		function name:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "openvpn", function(s)
				if self.sid ~= s[".name"] and s.name == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return value:match("^[a-zA-Z0-9_ ]+$") ~= nil, "A string of a-Z, 0-9, _ and space characters is accepted."
		end

	local configuration = s:option("configuration")
		function configuration:validate(value)
			if value == "external" and self:get_abs_value(self.config, self.sid, "type") == "server" then
				return false, "External services not available for server type."
			end
			return self.dt:check_array(value, { "manual", "custom", "external" })
		end

	local enabled
	function openvpn:require_validation()
		local enable = self:get_abs_value(self.config, self.sid, "enable")
		local required_options = {}
		if enable and enable == "1" then
			local ovpn_type = self:get_abs_value(self.config, self.sid, "type")
			local auth = self:get_abs_value(self.config, self.sid, "auth_mode")
			local use_pkcs = self:get_abs_value(self.config, self.sid, "use_pkcs")
			local tls_auth = self:get_abs_value(self.config, self.sid, "tls_security")
			local configuration = self:get_abs_value(self.config, self.sid, "configuration") or "manual"
			local server_list = self:get_abs_value(self.config, self.sid, "server_list")

			if configuration == "external" then
				table.insert(required_options, "external_service")
				table.insert(required_options, "server_list")
				table.insert(required_options, "user")
				table.insert(required_options, "pass")
				if server_list == "custom" then
					table.insert(required_options, "remote")
				end
			end

			if configuration == "custom" then
				table.insert(required_options, "config")
			end

			if configuration == "manual" then
				table.insert(required_options, "auth_mode")
				if ovpn_type and ovpn_type == "client" then
					table.insert(required_options, "remote")
				end
				if auth and ovpn_type then
					if auth == "skey" then
						table.insert(required_options, "secret")
					elseif use_pkcs and use_pkcs == "1" then
						table.insert(required_options, "pkcs12")
					elseif auth == "pass" then
						table.insert(required_options, "ca")
						if ovpn_type == "server" then
							table.insert(required_options, "cert")
							table.insert(required_options, "key")
						end
					elseif auth == "tls" or auth == "tls/pass" then
						table.insert(required_options, "ca")
						table.insert(required_options, "cert")
						table.insert(required_options, "key")
					end
					if auth == "pass" or auth == "tls/pass" then
						if ovpn_type == "server" then
							table.insert(required_options, "userpass")
						elseif ovpn_type == "client" then
							table.insert(required_options, "user")
							table.insert(required_options, "pass")
						end
					end
					if tls_auth and auth ~= "skey" then
						if tls_auth == "tls-auth" then
							table.insert(required_options, "tls_auth")
						elseif tls_auth == "tls-crypt" then
							table.insert(required_options, "tls_crypt")
						end
					end
				end
			end
			enabled.require = {["1"] = required_options}
		end
	end

	openvpn.PUT_validate_section_hook = openvpn.require_validation

	enabled = s:option("enable")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local enabled_external = s:option("enable_external") --DEPRECATED
		function enabled_external:validate(value)
			if value == "1" and self:get_abs_value(self.config, self.sid, "type") == "server" then
				return false, "External services not available for server type."
			end
			return self.dt:is_bool(value)
		end
		function enabled_external:set(value)
			local custom = self:get_abs_value(self.config, self.sid, "enable_custom")
			if value == "1" then
				self:table_set(self.config, self.sid, "configuration", "external")
			elseif custom == "1" then
				self:table_set(self.config, self.sid, "configuration", "custom")
			else
				self:table_set(self.config, self.sid, "configuration", "manual")
			end
		end

	local external_service = s:option("external_service")
		function external_service:validate(value)
			return self.dt:check_array(value, { "nord", "express" })
		end

	function openvpn:setup_external_service()
		local server_list = self:table_get(self.config, self.sid, "server_list")
		if not server_list or server_list == "" then return end
		local external_service = self:table_get(self.config, self.sid, "external_service")
		if not external_service or external_service == "" then return end

		local auth_file = self:table_get(self.config, self.sid, "auth_user_pass")
		local addresses = {nord = nord, express = express}
		local port = external_service == "nord" and "1194" or "1195"
		local template = ovpn_path .. external_service.. "_template.ovpn"
		local config = ovpn_path .. external_service.. "_" .. self.sid .. ".ovpn"

		local remote = ""
		if server_list == "custom" then
			local remote_ips = self:table_get(self.config, self.sid, "remote")
			if not remote_ips or #remote_ips == 0 then return end
			for _, remote_ip in pairs(remote_ips) do
				remote = remote .. "remote " .. remote_ip .. " " .. port .. "\n"
			end
		else
			self:table_delete(self.config, self.sid, "remote")
			remote = "remote " .. addresses[external_service][server_list] .." ".. port
		end
		local fp = io.open(template, "r")
		local str = fp:read("*all")

		str = string.gsub( str, "remote server_ip_port", remote)
		if auth_file and auth_file ~= "" then
			local auth_file_content = fs.readfile(auth_file)
			str = string.gsub(str, "auth%-user%-pass", "<auth-user-pass>\n" .. auth_file_content .. "</auth-user-pass>")
		end
		local dev = string.sub(util.split(string.match(str, "dev t.-\n"), " ")[2], 1, -2)
		if dev == "tun" then
			self:table_set(self.config, self.sid, "dev", "tun_c_" .. self:get_num())
		else
			self:table_set(self.config, self.sid, "dev", dev)
		end
		fp:close()
		fp = io.open(config, "w+")
		fp:write(str)
		fp:close()
		util.set_file_permissions(config, "openvpn")
		self:table_set(self.config, self.sid, "config", config)
		self:table_set(self.config, self.sid, "proto", "udp")
		self:table_set(self.config, self.sid, "port", port)
	end

	local server_list = s:option("server_list")
		function server_list:validate(value)
			local server_list_options = {"uk", "usa", "aus", "sa", "custom"}
			return self.dt:check_array(value, server_list_options)
		end

	local enable_custom = s:option("enable_custom") --DEPRECATED
		function enable_custom:validate(value)
			return self.dt:is_bool(value)
		end
		function enable_custom:set(value)
			local external = self:get_abs_value(self.config, self.sid, "enable_external")
			if value == "1" then
				self:table_set(self.config, self.sid, "configuration", "custom")
			elseif external == "1" then
				self:table_set(self.config, self.sid, "configuration", "external")
			else
				self:table_set(self.config, self.sid, "configuration", "manual")
			end
		end

	local dev = s:option("dev")
		dev.cfg_require = true
		function dev:validate(value)
			return self.dt:check_array(value, { "tun", "tap" })
		end
		function dev:set(value)
			self:table_set(self.config, self.sid, self.api_key, "%s_%s_%s" % {value, self:get_abs_value(self.config, self.sid, "type") == "server" and "s" or "c", self:get_num()})
		end
		function dev:get(value)
			if value then
				return string.sub(value, 1, 3)
			end
		end

	function openvpn:clean_section(skip_more)
		local skip = {
			enable = true,
			type = true,
			[".type"] = true,
			name = true,
			[".name"] = true,
			configuration = true,
			id = true,
			[".index"] = true
		}
		if skip_more then
			for _, key in ipairs(skip_more) do
				skip[key] = true
			end
		end
		local values = self:table_get(self.config, self.sid)
		for key, value in pairs(values) do
			if not skip[key] then
				self:table_delete(self.config, self.sid, key)
			end
		end
	end

	-- OVPN CONFIG PARSING --
	function openvpn:check_option(content, option)
		local section, pattern, section_option, line
		local sections = {
			OPENVPN_PARAMS = "OPENVPN_PARAMS='(.-)'",
			OPENVPN_BOOLS = "OPENVPN_BOOLS='(.-)'",
			OPENVPN_LIST = "OPENVPN_LIST='(.-)'",
			OPENVPN_SKIP = "OPENVPN_SKIP='(.-)'"
		}
		for section, pattern in pairs(sections) do
			local section_option = content:match(pattern)
			if section_option then
				for line in section_option:gmatch("[^\r\n]+") do
					if line == option then
						return section
					end
				end
			end
		end
		return nil
	end

	function openvpn:split_params(parameter, count)
		local params = {}
		for param in string.gmatch(parameter, "[^%s]+") do
			table.insert(params, param)
		end
		local num_params = #params
		if count then return num_params end
		return params
	end

	function openvpn:get_instance_type(config_path)
		local f = io.open(config_path, "r")
		for line in f:lines() do
			if line:match("^remote%s") then
				f:close()
				return "client"
			end
		end
		f:close()
		return "server"
	end

	function openvpn:parse_configuration(config_path)
		local ln, crt, option, parameter, section, crt_file, need_pass
		local collect, auth_verify, auth_userpass, no_client_verify, ifconfig_ipv6, warning, auth_exist, data_ciphers_exist, cipher_exist = false, false, false, false, false, false, false, false, false
		local text, extra_list, network_list, remote_list, push_list, route_list = {}, {}, {}, {}, {}, {}
		local certificate = { ca = true, cert = true, key = true, dh = true, secret = true, ["crl-verify"] = true, ["tls-auth"] = true, ["tls-crypt"] = true, pkcs12 = true, ["auth-user-pass"] = true }
		local inst_type = self:get_instance_type(config_path)
		local f = io.open(config_path, "r")
		if not f then return end
		local opt_file = io.open(ovpn_path .. "options", "r")
		local opt_file_content = opt_file:read("*all")
		opt_file:close()
		self:clean_section({ "config", "parse" })
		while true do
			ln = f:read("*l")
			if not ln then break end
			ln = ln:gsub("\r", "")
			-- parsing certs
			if crt and ln:match("</" .. crt:gsub("-", "%%-") .. ">") then
				collect = false
				if certificate[crt] then
					local ext = { ca = "crt", cert = "crt", key = "key" , secret = "key", dh = "pem", ["crl-verify"] = "pem", ["crl-verify"] = "pem" , ["tls-auth"] = "key" , ["tls-crypt"] = "key", pkcs12 = "p12" }
					if crt == "ca" or crt == "cert" or crt == "key" or crt == "dh" then
						crt_file = "/etc/certificates/cbid.openvpn." .. self.sid .. "." .. crt:gsub("-", "_") .. self.sid .. "." .. ext[crt]
					elseif crt == "auth-user-pass" then
						crt_file = ovpn_path .. "auth_" .. self.sid
						auth_userpass = true
					else
						crt_file = "/etc/vuci-uploads/cbid.openvpn." .. self.sid .. "." .. crt:gsub("-", "_") .. self.sid .. "." .. ext[crt]
					end
				else
					crt_file = "/etc/vuci-uploads/cbid.openvpn." .. self.sid .. "." .. crt
				end
				if next(text) ~= nil then
					fp = io.open(crt_file, "w+")
					for _, l in pairs(text) do
						fp:write(l .. "\n")
					end
					fp:close()
					util.set_file_permissions(crt_file, "certificates")
				end
				if crt == "pkcs12" then
					local crt_file_encoded = string.gsub(crt_file, crt:gsub("-", "_") .. self.sid, crt:gsub("-", "_") .. self.sid .. "_encoded")
					util.file_exec("/usr/bin/openssl", {"base64", "-d", "-in", crt_file, "-out", crt_file_encoded})
					util.set_file_permissions(crt_file_encoded, "openvpn")
					need_pass = util.file_exec("/usr/bin/openssl", {"pkcs12", "-info", "-noout", "-in", crt_file_encoded, "-password", "pass:"}).code
					if need_pass == 1 then
						self:add_message(1, "PKCS #12 passphrase is required!", self.sid)
						warning = true
					end
					crt_file = crt_file_encoded
				end
				if crt == "key" then
					-- check if key is in TPM
					local in_tpm = { code = 1 }
					if has_tpm then
						in_tpm = util.file_exec("/bin/tpm2_importer", {crt_file, "get_handle"})
					end
					need_pass = in_tpm.code ~= 0 and util.file_exec("/usr/bin/openssl", {"pkey", "-check", "-in", crt_file, "-passin", "pass:"}).code
					if need_pass == 1 then
						self:add_message(1, "Private key decryption password is required!", self.sid)
						warning = true
					end
				end
				self:table_set(self.config, self.sid, crt:gsub("-", "_"), crt_file)
				crt = nil
				text = {}
			end
			if collect then
				table.insert(text, ln)
			end
			if ln:match("<([%a%d%-]+)>") then
				crt = ln:match("<([%a%d%-]+)>")
				collect = true
			end
			-- parsing options
			if ln ~= "" and ln:sub(1, 1):match("%l") and not collect then
				option = ln:match("^%S+"):gsub("-", "_")
				parameter = ln:gsub("^%S+%s*", "")
				section = self:check_option(opt_file_content, option)
				if section then
					-- our used openvpn options
					if section == "OPENVPN_PARAMS" then
						if certificate[option:gsub("_", "-")] then
							-- checking certificates links from config file
							if option == "tls_auth" and self:split_params(parameter, true) == 2 then
								local key_direction
								local splits = self:split_params(parameter)
								parameter, key_direction = splits[1], splits[2]
								self:table_set(self.config, self.sid, "key_direction", key_direction)
							elseif option == "auth_user_pass" then
								auth_userpass = true
							end

							if fs.access(parameter) or ( option == "dh" and parameter == "none" ) then
								self:table_set(self.config, self.sid, option, parameter)
							end
						else
							if option == "auth" then
								parameter = string.lower(parameter)
								auth_exist = true
							end
							if option == "cipher" then cipher_exist = true end
							self:table_set(self.config, self.sid, option, parameter)
						end
					elseif section == "OPENVPN_BOOLS" then
						self:table_set(self.config, self.sid, option, "1")
					elseif section == "OPENVPN_LIST" then
						local split_list = util.split(parameter, ":")
						local list_table = {}
						for i = 1, #split_list do
							local parameter_list = split_list[i]
							table.insert(list_table, parameter_list)
						end
						self:table_set(self.config, self.sid, option, list_table)
						if option == "data_ciphers" then data_ciphers_exist = true end
					elseif section == "OPENVPN_SKIP" then
						if option == "auth_user_pass_verify" then auth_verify = true end
						if option == "askpass" and fs.access(parameter) then
							self:table_set(self.config, self.sid, "askpass", parameter)
						end
						if option == "status" and self:split_params(parameter, true) == 2 then
							local splits = self:split_params(parameter)
							local status_file, seconds = splits[1], splits[2]
							local dir = status_file:match("(.+)/[^/]+$")
							if dir == "/var/run/openvpn" then
								self:table_set(self.config, self.sid, "status", parameter)
							else
								self:table_set(self.config, self.sid, "status", tmp_path .. "openvpn." .. self.sid .. ".status " .. seconds)
							end
						end
					end
				else
					--options that need to be adapted to our uci
					if option == "route" then
						if self:split_params(parameter, true) == 2 then
							local splits = self:split_params(parameter)
							local ip, mask = splits[1], splits[2]
							local subnet = lip.IPv4(ip .. "/" .. mask)
							table.insert(network_list, tostring(subnet))
						end
						table.insert(route_list, ln)
					elseif option == "route_ipv6" then
						if self:split_params(parameter, true) == 1 then
							table.insert(network_list, parameter)
						end
						table.insert(route_list, ln)
					elseif option == "remote" then
						if self:split_params(parameter, true) == 1 then
							table.insert(remote_list, parameter)
						else
							table.insert(extra_list, ln)
						end
					elseif option == "ifconfig" then
						if self:split_params(parameter, true) == 2 then
							local splits = self:split_params(parameter)
							local ip, ipr = splits[1], splits[2]
							self:table_set(self.config, self.sid, "local_ip", ip)
							self:table_set(self.config, self.sid, "remote_ip", ipr)
						else
							table.insert(extra_list, ln)
						end
					elseif option == "ifconfig_ipv6" then
						if self:split_params(parameter, true) == 1 then
							self:table_set(self.config, self.sid, "server_ipv6", parameter)
						elseif self:split_params(parameter, true) == 2 then
							local splits = self:split_params(parameter)
							local ip, ipr = splits[1], splits[2]
							self:table_set(self.config, self.sid, "local_ipv6", ip)
							self:table_set(self.config, self.sid, "remote_ipv6", ipr)
							ifconfig_ipv6 = true
						else
							table.insert(extra_list, ln)
						end
					elseif option == "ifconfig_pool" then
						if self:split_params(parameter, true) == 2 then
							local splits = self:split_params(parameter)
							local ips, ipe = splits[1], splits[2]
							self:table_set(self.config, self.sid, "ifconfig_pool_start", ips)
							self:table_set(self.config, self.sid, "ifconfig_pool_end", ipe)
						else
							table.insert(extra_list, ln)
						end
					elseif option == "push" then
						if parameter:sub(1, 1) == '"' and parameter:sub(-1) == '"' then
							parameter = parameter:sub(2, -2)
						end
						table.insert(push_list, parameter)
					elseif option == "server" then
						if self:split_params(parameter, true) == 2 then
							local splits = self:split_params(parameter)
							local ip, ipm = splits[1], splits[2]
							self:table_set(self.config, self.sid, "server_ip", ip)
							self:table_set(self.config, self.sid, "server_netmask", ipm)
						else
							table.insert(extra_list, ln)
						end
					elseif option == "verify_client_cert" and parameter == "none" then
						no_client_verify = true --option added by init script
					elseif option == "proto" then
						if util.contains({ "tcp", "tcp4", "tcp6" }, parameter) then
							self:table_set(self.config, self.sid, "proto", parameter .. "-" .. inst_type)
						elseif util.contains({ "udp", "udp4", "udp6", "tcp-client", "tcp4-client", "tcp6-client", "tcp-server", "tcp4-server", "tcp6-server" }, parameter) then
							self:table_set(self.config, self.sid, "proto", parameter)
						else
							table.insert(extra_list, ln)
						end
					else
						--all others to extra
						table.insert(extra_list, ln)
					end
				end
			end
		end
		f:close()

		-- check sections
		if inst_type == "server" then
			self:check_sections("server")
		else
			self:check_sections("client")
		end

		-- detecting authentication mode
		local skey = false
		if self:table_get(self.config, self.sid, "secret") then
			self:table_set(self.config, self.sid, "auth_mode", "skey")
			skey = true
		elseif inst_type == "client" then
			if auth_userpass then
				if self:table_get(self.config, self.sid, "cert") == nil and not self:table_get(self.config, self.sid, "pkcs12") then
					if not fs.access(ovpn_path .. "auth_" .. self.sid) then
						self:add_message(1, "Username & Password is required!", self.sid)
						warning = true
					end
					self:table_set(self.config, self.sid, "auth_mode", "pass")
				else
					if not fs.access(ovpn_path .. "auth_" .. self.sid) then
						self:add_message(1, "Username & Password is required!", self.sid)
						warning = true
					end
					self:table_set(self.config, self.sid, "auth_mode", "tls/pass")
				end
			else
				self:table_set(self.config, self.sid, "auth_mode", "tls")
			end
		elseif inst_type == "server" then
			if no_client_verify then
				self:table_set(self.config, self.sid, "auth_mode", "pass")
			end
			if auth_verify then
				self:add_message(1, "Usernames & Passwords file is required!", self.sid)
				warning = true
				if not no_client_verify then
					self:table_set(self.config, self.sid, "auth_mode", "tls/pass")
				end
			end
			if not auth_verify and not no_client_verify then
				self:table_set(self.config, self.sid, "auth_mode", "tls")
			end
		end

		if not skey  and ifconfig_ipv6 then
			local local_ipv6 = self:table_get(self.config, self.sid, "local_ipv6")
			local remote_ipv6 = self:table_get(self.config, self.sid, "remote_ipv6")
			if local_ipv6 ~= "" and remote_ipv6 ~= "" then
				table.insert(extra_list, "ifconfig-ipv6 " .. local_ipv6 .. " " .. remote_ipv6)
				self:table_delete(self.config, self.sid, "local_ipv6")
				self:table_delete(self.config, self.sid, "remote_ipv6")
			end
		end

		--add lists
		if next(route_list) ~= nil then
			for _, op in ipairs(route_list) do
				if inst_type == "client" then
					if ( string.match(op, "^(%S+)") == "route" and self:split_params(op, true) ~= 3 ) or ( string.match(op, "^(%S+)") == "route-ipv6" and self:split_params(op, true) ~= 2 ) then
						table.insert(extra_list, op)
					end
				else
					table.insert(extra_list, op)
				end
			end
		end

		if inst_type == "client" and next(network_list) ~= nil then
			self:table_set(self.config, self.sid, "network", network_list)
		end
		if next(remote_list) ~= nil then self:table_set(self.config, self.sid, "remote", remote_list) end
		if next(push_list) ~= nil then self:table_set(self.config, self.sid, "push", push_list) end
		if next(extra_list) ~= nil then self:table_set(self.config, self.sid, "extra", extra_list) end

		--other settings
		self:table_set(self.config, self.sid, "type", inst_type)
		local dev = self:table_get(self.config, self.sid, "dev")
		if dev then
			self:table_set(self.config, self.sid, "dev", string.sub(dev, 1, 3) .. "_" .. string.sub(inst_type, 1, 1) .. "_" .. self:get_num())
		end
		if self:table_get(self.config, self.sid, "tls_crypt") then self:table_set(self.config, self.sid, "tls_security", "tls-crypt") end
		if self:table_get(self.config, self.sid, "tls_auth") then self:table_set(self.config, self.sid, "tls_security", "tls-auth") end
		if self:table_get(self.config, self.sid, "pkcs12") then self:table_set(self.config, self.sid, "use_pkcs", "1") end
		if warning then
			self:table_set(self.config, self.sid, "enable", "0")
		end
		if has_tpm then self:table_set(self.config, self.sid, "use_tpm", "0") end

		-- setting defaults if not exist
		if not auth_exist then self:table_set(self.config, self.sid, "auth", "sha1") end
		if not data_ciphers_exist then
			if skey then
				self:table_set(self.config, self.sid, "data_ciphers", { "BF-CBC" })
			else
				self:table_set(self.config, self.sid, "data_ciphers", { "AES-256-GCM", "AES-128-GCM", "CHACHA20-POLY1305" })
			end
		end
		if not cipher_exist then
			if skey then
				self:table_set(self.config, self.sid, "cipher", "BF-CBC")
			else
				self:table_set(self.config, self.sid, "cipher", "AES-256-GCM")
			end
		end
		self:table_set(self.config, self.sid, "config_parsed", "1")
	end
-- OVPN CONFIG PARSING END --

	function openvpn:export_main_values(config_path)
		local ln, dev, port, proto
		local remote = false
		local f = io.open(config_path)
		if not f then return end

		-- removing old certificates after previous config parse
		local certificates = require("vuci.certificates")
		local ca = self:table_get(self.config, self.sid, "ca")
		local cert = self:table_get(self.config, self.sid, "cert")
		local key = self:table_get(self.config, self.sid, "key")
		local dh = self:table_get(self.config, self.sid, "dh")
		if ca and fs.access(ca) then certificates.remove_service_from_config(ca, self.config, self.sid) end
		if cert and fs.access(cert) then certificates.remove_service_from_config(cert, self.config, self.sid) end
		if key and fs.access(key) then certificates.remove_service_from_config(key, self.config, self.sid, has_tpm) end
		if dh and fs.access(dh) then certificates.remove_service_from_config(dh, self.config, self.sid) end

		-- cleaning section
		self:clean_section({ "config", "parse" })

		-- exporting main values
		for ln in f:lines() do
			if ln:match("^dev%s+(%a%a%a)") then dev = ln:match("^dev%s+(%a%a%a)") end
			if ln:match("^port%s+(%d+)") then port = ln:match("^port%s+(%d+)") end
			if ln:match("^proto%s+(%a+)") then proto = ln:match("^proto%s+(%a+)") end
			if ln:match("^remote%s") then remote = true end
		end
		f:close()
		if port and port ~= "" then
			self:table_set(self.config, self.sid, "port", port)
		end
		if proto and proto ~= "" then
			self:table_set(self.config, self.sid, "proto", proto)
		end
		if remote then
			self:check_sections("client")
			self:table_set(self.config, self.sid, "type", "client")
			if dev and dev ~= "" then
				self:table_set(self.config, self.sid, "dev", string.format("%s_c_%s", dev, self:get_num()))
			end
		else
			self:check_sections("server")
			self:table_set(self.config, self.sid, "type", "server")
			if dev and dev ~= "" then
				self:table_set(self.config, self.sid, "dev", string.format("%s_s_%s", dev, self:get_num()))
			end
		end
		self:table_set(self.config, self.sid, "config_parsed", "2")
	end

	function openvpn:get_path(file_type)
		local paths = {}
		if file_type == "ca" or file_type == "cert" or file_type == "key" or file_type == "dh" then
			table.insert(paths, "/etc/certificates/")
		elseif file_type == "config" then
			table.insert(paths, "/etc/vuci-uploads/")
			table.insert(paths, ovpn_path)
		else
			table.insert(paths, "/etc/vuci-uploads/")
		end
		return paths
	end

	function openvpn:validate_config(config_path)
		if not config_path:match("^[a-zA-Z0-9._@/()%-]+$") then
			self:add_critical_error(self.ERROR_CODES.INCORRECT_PATH, "The symbols 'a-zA-Z0-9._-@/()' are allowed.", "config")
		end
		local file = io.open(config_path, "r")
		local found = false
		if file then
			for line in file:lines() do
				if line:match("^%s*dev") then
					found = true
					break
				end
			end
			file:close()
		end
		if not found then
			self:add_critical_error(self.ERROR_CODES.INCORRECT_FILE, "Incorrect file uploaded.", "config")
		end
		return true
	end

	local config = s:option("config", { file = true })
		function config:validate(value)
			local state, msg = self.dt:file_validation(value, self:get_path(self.api_key))
			if not state then
				return state, msg
			end
			return self:validate_config(value)
		end
		function config:set(value)
			if self:table_get(self.config, self.sid, "config") ~= value then
				self:table_delete(self.config, self.sid, "config_parsed")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local upload_files = s:option("upload_files") --DEPRECATED
		function upload_files:validate(value)
			return self.dt:is_bool(value)
		end

openvpn.protocol_options = nil
function openvpn:fetch_protocols()
	if self.protocol_options then return self.protocol_options end
	self.protocol_options = { "udp", "udp4", "udp6" }
	if self:get_abs_value(self.config, self.sid, "type") == "client" then
		table.insert(self.protocol_options, "tcp-client")
		table.insert(self.protocol_options, "tcp4-client")
		table.insert(self.protocol_options, "tcp6-client")
	else
		table.insert(self.protocol_options, "tcp-server")
		table.insert(self.protocol_options, "tcp4-server")
		table.insert(self.protocol_options, "tcp6-server")
	end
	return self.protocol_options
end

	local protocol = s:option("proto")
		function protocol:validate(value)
			return self.dt:check_array(value, self:fetch_protocols())
		end

	local port = s:option("port")
		function port:validate(value)
			return self.dt:port(value)
		end

	local comp_lzo = s:option("comp_lzo")
		function comp_lzo:validate(value)
			return self.dt:check_array(value, { "none", "yes", "no", "adaptive" })
		end
		function comp_lzo:set(value)
			if value == "none" then
				self:table_delete(self.config, self.sid, "comp_lzo")
			else
				self:table_set(self.config, self.sid, self.api_key, value)
			end
		end

	local auth_method = s:option("auth_mode")
		function auth_method:validate(value)
			local auth_method_options = { "skey", "tls", "tls/pass", "pass" }
			return self.dt:check_array(value, auth_method_options)
		end

	local data_ciphers = s:option("data_ciphers", { list = true })
		function data_ciphers:validate(value)
			return self.dt:fieldvalidation(value, "^%??[a-zA-Z0-9-]*$")
		end

	local cipher = s:option("cipher")
		function cipher:validate(value)
			local cipher_options = { "DES-CBC", "DES-EDE-CBC", "DES-EDE3-CBC", "DESX-CBC", "BF-CBC", "CAST5-CBC", "AES-128-CBC",
									 "AES-192-CBC", "AES-256-CBC", "none" }
			if self:get_abs_value(self.config, self.sid, "auth_mode") ~= "skey" then
				local extra_cipher_options = { "RC2-CBC", "RC2-40-CBC", "RC2-64-CBC", "AES-128-CFB", "AES-128-CFB1", "AES-128-CFB8", "AES-128-OFB",
											   "AES-128-CBC", "AES-128-GCM", "AES-192-CFB", "AES-192-CFB1", "AES-192-CFB8", "AES-192-OFB",
											   "AES-192-GCM", "AES-256-GCM", "AES-256-CFB", "AES-256-CFB1", "AES-256-CFB8", "AES-256-OFB" }
				for _, option_value in ipairs(extra_cipher_options) do
					table.insert(cipher_options, option_value)
				end
			end
			return self.dt:check_array(value, cipher_options)
		end
		function cipher:set(value)
			if value == "none" then
				self:table_set(self.config, self.sid, "data_ciphers", { value })
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local tls_cipher = s:option("tls_cipher_list") --DEPRECATED
		function tls_cipher:validate(value)
			local tls_cipher_options = { "all", "dhe_rsa", "custom" }
			return self.dt:check_array(value, tls_cipher_options)
		end
		function tls_cipher:set(value)
			if value ~= "dhe_rsa" then
				self:table_delete(self.config, self.sid, "tls_cipher")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local allowed_ciphers = s:option("tls_cipher", { list = true }) --DEPRECATED
		function allowed_ciphers:validate(value)
			local tls_cipher_options = { "TLS-DHE-RSA-WITH-AES-256-GCM-SHA384", "TLS-DHE-RSA-WITH-AES-256-CBC-SHA", "TLS-DHE-RSA-WITH-AES-256-CBC-SHA256",
										 "TLS-DHE-RSA-WITH-CAMELLIA-256-CBC-SHA", "TLS-DHE-RSA-WITH-3DES-EDE-CBC-SHA", "TLS-DHE-RSA-WITH-AES-128-GCM-SHA256",
										 "TLS-DHE-RSA-WITH-AES-128-CBC-SHA", "TLS-DHE-RSA-WITH-AES-128-CBC-SHA256", "TLS-DHE-RSA-WITH-SEED-CBC-SHA",
										 "TLS-DHE-RSA-WITH-CAMELLIA-128-CBC-SHA", "TLS-DHE-RSA-WITH-DES-CBC-SHA" }
			return self.dt:check_array(value, tls_cipher_options)
		end

	local allowed_custom_ciphers = s:option("cipher_custom", { list = true }) --DEPRECATED
		function allowed_custom_ciphers:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9_-]*$")
		end
		function allowed_custom_ciphers:set(value)
			self:table_set(self.config, self.sid, "data_ciphers", value)
		end

	local remote = s:option("remote", { list = true })
		function remote:validate(value)
			return self.dt:host(value)
		end

	local resolve_retry = s:option("resolv_retry")
		function resolve_retry:validate(value)
			if value == "infinite" then return true end
			return self.dt:uinteger(value)
		end

	local keep_alive = s:option("keepalive")
		function keep_alive:validate(value)
			local values = util.split(value, " ")
			if #values ~= 2 then return false, "Two values must be passed with space separator, e.g. 10 120" end
			return self.dt:fieldvalidation(value, "^[0-9]+[ 0-9]*$")
		end

	local client_to_client = s:option("client_to_client")
		function client_to_client:validate(value)
			return self.dt:is_bool(value)
		end

	local local_ip = s:option("local_ip")
	local_ip.require = { "remote_ip" }
		function local_ip:validate(value)
			if util_tlt.in_lan_range(value, board:is_ap()) then
				return false, "Provided IP cannot be in LAN network range."
			end
			return self.dt:ip4addr(value)
		end

	local remote_ip = s:option("remote_ip")
	remote_ip.require = { "local_ip" }
		function remote_ip:validate(value)
			return self.dt:ip4addr(value)
		end

	local network_ip = s:option("network_ip") --DEPRECATED
	network_ip.require = { "network_mask" }
		function network_ip:validate(value)
			if self:get_abs_value(self.config, self.sid, "network_mask") then
				local netw = value .. "/" .. self:get_abs_value(self.config, self.sid, "network_mask")
				if util_tlt.in_lan_range(netw, board:is_ap()) then
					return false, "Provided IP cannot be in LAN network range."
				end
			end
			return self.dt:ip4addr(value)
		end

	local network_mask = s:option("network_mask") --DEPRECATED
	network_mask.require = { "network_ip" }
		function network_mask:validate(value)
			if self:get_abs_value(self.config, self.sid, "network_ip") then
				local netw = self:get_abs_value(self.config, self.sid, "network_ip") .. "/" .. value
				if util_tlt.in_lan_range(netw, board:is_ap()) then
					return false, "Provided IP cannot be in LAN network range."
				end
			end
			return self.dt:netmask(value)
		end
		function network_mask:set(value)
			local ip = self:get_abs_value(self.config, self.sid, "network_ip")
			if not ip or ip == "" then
				self:table_set(self.config, self.sid, "network_mask", value)
				return
			end
			local subnet = lip.IPv4(ip .. "/" .. value)
			local network = self:get_abs_value(self.config, self.sid, "network") or {}
			table.insert(network, tostring(subnet))
			self:table_set(self.config, self.sid, "network", network)
			self:table_delete(self.config, self.sid, "network_ip")
			self:table_delete(self.config, self.sid, "network_mask")
		end

	local remote_network = s:option("network", { list = true })
		function remote_network:validate(value)
			if util_tlt.in_lan_range(value, board:is_ap()) then
				return false, "Provided IP cannot be in LAN network range."
			end
			if self.dt:cidr4(value) or self.dt:cidr6(value) then return true end
			return false, "IPv4 or IPv6 address/subnet is accepted."
		end

	local route_ipv6 = s:option("route_ipv6") --DEPRECATED
		function route_ipv6:validate(value)
			return self.dt:ipmask6(value)
		end
		function route_ipv6:set(value)
			local network = self:get_abs_value(self.config, self.sid, "network") or {}
			table.insert(network, value)
			self:table_set(self.config, self.sid, "network", network)
		end

	local server_ipv6 = s:option("server_ipv6")
		function server_ipv6:validate(value)
			if util_tlt.in_lan_range(value, board:is_ap()) then
				return false, "Provided IP cannot be in LAN network range."
			end
			return self.dt:ipmask6(value)
		end

	local local_ipv6 = s:option("local_ipv6")
	local_ipv6.require = { "remote_ipv6" }
		function local_ipv6:validate(value)
			if util_tlt.in_lan_range(value, board:is_ap()) then
				return false, "Provided IP cannot be in LAN network range."
			end
			return self.dt:ipmask6(value)
		end

	local remote_ipv6 = s:option("remote_ipv6")
	remote_ipv6.require = { "local_ipv6" }
		function remote_ipv6:validate(value)
			return self.dt:ipmask6(value)
		end

	local server_ip = s:option("server_ip")
	server_ip.require = { "server_netmask" }
		function server_ip:validate(value)
			if self:get_abs_value(self.config, self.sid, "server_netmask") and self.dt:ip4addr(value) then
				local network = value .. "/" .. self:get_abs_value(self.config, self.sid, "server_netmask")
				local range = lip.new(network)
				local network_ip = range:network():string()
				if value ~= network_ip then
					return false, "To match specified server_netmask, server_ip should be " .. network_ip
				end
				if util_tlt.in_lan_range(network, board:is_ap()) then
					return false, "Provided IP cannot be in LAN network range."
				end
			end
			return self.dt:ip4addr(value)
		end

	local server_netmask = s:option("server_netmask")
	server_netmask.require = { "server_ip" }
		function server_netmask:validate(value)
			if self:get_abs_value(self.config, self.sid, "server_ip") then
				local netw = self:get_abs_value(self.config, self.sid, "server_ip") .. "/" .. value
				if util_tlt.in_lan_range(netw, board:is_ap()) then
					return false, "Provided IP cannot be in LAN network range."
				end
			end
			return self.dt:netmask(value)
		end

local function ip_to_decimal(ip)
	local a = util.split(ip, ".")
	local dec_addr = 0
	for i = 1, 4 do
		a[i] = tonumber(a[i])
		if not a[i] then return nil end
	end

	dec_addr = dec_addr + a[1] * 16777216
	dec_addr = dec_addr + a[2] * 65536
	dec_addr = dec_addr + a[3] * 256
	dec_addr = dec_addr + a[4]
	return dec_addr
end

	local ifconfig_pool_start = s:option("ifconfig_pool_start")
	ifconfig_pool_start.require = { "ifconfig_pool_end" }
		function ifconfig_pool_start:validate(value)
			return self.dt:ip4addr(value)
		end

	local ifconfig_pool_end = s:option("ifconfig_pool_end")
	ifconfig_pool_end.require = { "ifconfig_pool_start" }
		function ifconfig_pool_end:validate(value)
			local start_ip = self:get_abs_value(self.config, self.sid, "ifconfig_pool_start")
			if not start_ip or start_ip == "" or self.dt:ip4addr(start_ip) == false then return true end
			local end_ip = value

			local ok, err = self.dt:ip4addr(value)
			if not ok then return ok, err end

			local dec_start = ip_to_decimal(start_ip)
			local dec_end = ip_to_decimal(end_ip)

			if dec_end - dec_start - 2 <= 0 then
				return false, "The start IP must be smaller than the end IP by more than 2 addresses"
			end
			if dec_end - dec_start > 65536 then
				return false, "The address range is too large (" .. start_ip .. " - " ..  end_ip .. "). The current maximum is 65536 addresses."
			end
			return true
		end

	local ifconfig_ipv6_pool = s:option("ifconfig_ipv6_pool")
		function ifconfig_ipv6_pool:validate(value)
			return self.dt:ipmask6(value)
		end

	local push = s:option("push", { list = true })
		function push:validate(_)
			return self.dt:string()
		end

	local duplicate_certs = s:option("duplicate_cn")
		function duplicate_certs:validate(value)
			return self.dt:is_bool(value)
		end

	local auth = s:option("auth")
		function auth:validate(value)
			local auth_options = { "none", "md5", "sha1", "sha256", "sha384", "sha512" }
			return self.dt:check_array(value, auth_options)
		end

	local tls_auth = s:option("tls_security")
		function tls_auth:validate(value)
			local tls_auth_options = { "none", "tls-auth", "tls-crypt" }
			return self.dt:check_array(value, tls_auth_options)
		end
		function tls_auth:set(value)
			if self:get_abs_value(self.config, self.sid, "auth_mode") == "skey" then
				self:table_set(self.config, self.sid, self.api_key, "none")
			else
				self:table_set(self.config, self.sid, self.api_key, value)
			end
		end

	local tls_auth_file = s:option("tls_auth", { file = true })
		tls_auth_file.require = {  "tls_security"  }
		function tls_auth_file:validate(value)
			if self:get_abs_value(self.config, self.sid, "tls_security") == "tls-auth" then
				if not value:match("^[a-zA-Z0-9._@/()%-]+$") then
					self:add_critical_error(self.ERROR_CODES.INCORRECT_PATH, "The symbols 'a-zA-Z0-9._-@/()' are allowed.", self.api_key)
				end
				return self.dt:file_validation(value, self:get_path(self.api_key))
			else
				return false, "Option tls_security must be value [tls-auth]"
			end
		end

	local tls_crypt = s:option("tls_crypt", { file = true })
		tls_crypt.require = { "tls_security" }
		function tls_crypt:validate(value)
			if self:get_abs_value(self.config, self.sid, "tls_security") == "tls-crypt" then
				if not value:match("^[a-zA-Z0-9._@/()%-]+$") then
					self:add_critical_error(self.ERROR_CODES.INCORRECT_PATH, "The symbols 'a-zA-Z0-9._-@/()' are allowed.", self.api_key)
				end
				return self.dt:file_validation(value, self:get_path(self.api_key))
			else
				return false, "Option tls_security must be value [tls-crypt]"
			end
		end

	local auth_key_direction = s:option("key_direction")
		function auth_key_direction:validate(value)
			return self.dt:is_bool(value)
		end

	local username = s:option("user")
		username.maxlength = 512
		username.require = { "pass" }
		function username:validate(value)
			return self.dt:credentials_validate(value)
		end
		function username:get(_)
			local vpn_auth_file = self:table_get(self.main_config, self.sid, "auth_user_pass")
			if not vpn_auth_file then return nil end
			local f = io.open(vpn_auth_file)
			local output = {}
			if f then
				for each in f:lines() do
					output[#output+1] = each
				end
				f:close()
			end
			return output[1] or nil
		end

	local password = s:option("pass", { sensitive = true })
		password.maxlength = 512
		password.require = { "user" }
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end
		function password:set(value)
			local vpn_auth_file = self:table_get(self.main_config, self.sid, "auth_user_pass")
			if not vpn_auth_file then return end
			if self:get_abs_value(self.config, self.sid, "type") == "server" then
				fs.copy(value, vpn_auth_file)
			else
				fs.remove(vpn_auth_file)
			end
		end
		function password:get(_)
			local vpn_auth_file = self:table_get(self.main_config, self.sid, "auth_user_pass")
			if not vpn_auth_file then return nil end
			local f = io.open(vpn_auth_file)
			local output = {}
			if f then
				for each in f:lines() do
					output[#output+1] = each
				end
				f:close()
			end
			return output[2] or nil
		end

	local extra = s:option("extra", { list = true })
		function extra:validate(value)
			return self.dt:fieldvalidation(value, "^[^`']+$")
		end

	local device_files = s:option("device_files")
		function device_files:validate(value)
			return self.dt:is_bool(value)
		end

	local to_bridge = s:option("to_bridge")
		function to_bridge:validate(value)
			local dev = self:get_abs_value(self.config, self.sid, "dev")
			if string.sub(dev, 1, 3) ~= "tap" then
				return false, "Option to_bridge is available only when using TAP mode."
			end
			local bridge_list = { "none" }
			self:table_foreach("network", "device", function(s)
				if s[".name"] and  string.match(s[".name"], "^br_(.+)") then
					table.insert(bridge_list, s[".name"])
				end
			end)
			return self.dt:check_array(value, bridge_list)
		end

	local ca_file = s:option("ca", { certificate = {
		type = "certificates",
		cert_types = {"ca"},
		length_warnings = true
	}})

	local cert_file = s:option("cert", { certificate = {
		cert_types = {"certificates"},
		length_warnings = true
	}})

	local key_file = s:option("key", { certificate = {
		cert_types = {"keys"},
		tpm2 = function(self)
			if self:get_abs_value(self.config, self.sid, "use_tpm") ~= "1" then return false end
			if util.file_exec("/usr/bin/openssl", {"pkey", "-in", self.certificate.info_table.path, "-noout", "-text"}).code == 0 then
				return true
			end
			local askpass_value = self:get_abs_value(self.config, self.sid, "askpass")
			local code, msg = self:check_encryption("key", self.certificate.info_table.path, askpass_value)
			if code then
				return false
			end
			if util.file_exec("/usr/bin/openssl", {"pkey", "-in", self.certificate.info_table.path, "-out", tmp_path .. self.sid .. "_tmp.key", "-passin", "pass:" .. askpass_value}).code == 0 then
				fs.move(tmp_path .. self.sid .. "_tmp.key", self.certificate.info_table.path)
				util.set_file_permissions(self.certificate.info_table.path, "certificates", 0660)
				return true
			end
			return false
		end
	}})

	local dh = s:option("dh", { certificate = {
		cert_types = {"dh"},
		allow_values = {"none"} -- none will pass file validation
	}})
		function dh:set(value)
			if not value or value == "" then
				if self:get_abs_value(self.config, self.sid, "auth_mode") ~= "skey" then
					value = "none"
				end
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local decrypt = s:option("decrypt", { sensitive = true }) --DEPRECATED
		decrypt.maxlength = 512
		function decrypt:validate(value)
			return self.dt:credentials_validate(value)
		end
		function decrypt:set(value)
			local askpass_file = self:table_get(self.config, self.sid, self.api_key, "askpass")
			if value == "" then
				if askpass_file and askpass_file ~= "" and fs.access(askpass_file) then
					fs.remove(askpass_file)
					self:table_delete(self.config, self.sid, "askpass")
				end
				return
			end
			if not askpass_file then
				askpass_file = string.format(ovpn_path .. "askpass_%s_%s", self.sid, os.time())
			end
			if fs.access(askpass_file) then
				local data = fs.readfile(askpass_file)
				if data ~= value then
					fs.remove(askpass_file)
					askpass_file = string.format(ovpn_path .. "askpass_%s_%s", self.sid, os.time())
				end
			end
			fs.writefile(askpass_file, value)
			self:table_set(self.config, self.sid, "askpass", askpass_file)
			util.set_file_permissions(askpass_file, "openvpn")
		end

	local secret_file = s:option("secret", { file = true }) -- SECRET file
		function secret_file:validate(value)
			if not value:match("^[a-zA-Z0-9._@/()%-]+$") then
				self:add_critical_error(self.ERROR_CODES.INCORRECT_PATH, "The symbols 'a-zA-Z0-9._-@/()' are allowed.", self.api_key)
			end
			return self.dt:file_validation(value, self:get_path(self.api_key))
		end

	local userpass_file = s:option("userpass", { file = true }) -- Username/Password file
		function userpass_file:validate(value)
			if not value:match("^[a-zA-Z0-9._@/()%-]+$") then
				self:add_critical_error(self.ERROR_CODES.INCORRECT_PATH, "The symbols 'a-zA-Z0-9._-@/()' are allowed.", self.api_key)
			end
			return self.dt:file_validation(value, self:get_path(self.api_key))
		end

	local crl_verify_file = s:option("crl_verify", { file = true }) -- CRL file
		function crl_verify_file:validate(value)
			if not value:match("^[a-zA-Z0-9._@/()%-]+$") then
				self:add_critical_error(self.ERROR_CODES.INCORRECT_PATH, "The symbols 'a-zA-Z0-9._-@/()' are allowed.", self.api_key)
			end
			return self.dt:file_validation(value, self:get_path(self.api_key))
		end

	local use_pkcs = s:option("use_pkcs")
		function use_pkcs:validate(value)
			return self.dt:is_bool(value)
		end

	local askpass = s:option("askpass", { sensitive = true })
		askpass.maxlength = 512
		function askpass:validate(value)
			return self.dt:credentials_validate(value)
		end
		function askpass:set(value)
			local askpass_file = self:table_get(self.config, self.sid, self.api_key, "askpass")
			if value == "" then
				if askpass_file and askpass_file ~= "" and fs.access(askpass_file) then
					fs.remove(askpass_file)
					self:table_delete(self.config, self.sid, "askpass")
				end
				return
			end
			if not askpass_file then
				askpass_file = string.format(ovpn_path .. "askpass_%s_%s", self.sid, os.time())
			end
			if fs.access(askpass_file) then
				local data = fs.readfile(askpass_file)
				if data ~= value then
					fs.remove(askpass_file)
					askpass_file = string.format(ovpn_path .. "askpass_%s_%s", self.sid, os.time())
				end
			end
			fs.writefile(askpass_file, value)
			util.set_file_permissions(askpass_file, "openvpn")
			self:table_set(self.config, self.sid, self.api_key, askpass_file)
		end
		function askpass:get(_)
			local askpass_file = self:table_get(self.config, self.sid, self.api_key, "askpass")
			if not askpass_file then return nil end
			local data = fs.readfile(askpass_file)
			return data
		end

	local pkcs12_file = s:option("pkcs12", { file = true }) -- PKCS file
		function pkcs12_file:validate(value)
			if not value:match("^[a-zA-Z0-9._@/()%-]+$") then
				self:add_critical_error(self.ERROR_CODES.INCORRECT_PATH, "The symbols 'a-zA-Z0-9._-@/()' are allowed.", self.api_key)
			end
			return self.dt:file_validation(value, self:get_path(self.api_key))
		end

	local topology = s:option("topology")
	function topology:validate(value)
		return self.dt:check_array(value, { "net30", "p2p", "subnet" })
	end

	parse = s:option("parse")
	function parse:validate(value)
		return self.dt:is_bool(value)
	end
	function parse:set(value)
		if self:table_get(self.config, self.sid, "parse") ~= value then
			self:table_delete(self.config, self.sid, "config_parsed")
		end
		self:table_set(self.config, self.sid, self.api_key, value)
	end


	local config_parsed = s:option("config_parsed")
	config_parsed.readonly = true

	local use_tpm = s:option("use_tpm")
		function use_tpm:validate(value)
			if not has_tpm and value == "1" then
				return false, "TPM2 module is not available on this device."
			end
			return self.dt:is_bool(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function openvpn:UPLOAD_after_upload_hook(upload_request)
	local v_table = upload_request.parameters
	local path = upload_request.files[1].location
	local invalid = false
	if v_table.option == "pkcs12" then
		local valid = util.file_exec("/usr/bin/openssl", {"pkcs12", "-in", path, "-info", "-noout"})
		if valid.code == 1 and not (valid.stderr and string.find(valid.stderr, "Enter Import Password")) then
			invalid = true
		end
	elseif v_table.option == "crl_verify" then
		local valid1 = util.file_exec("/usr/bin/openssl", {"crl", "-in", path, "-inform", "PEM", "-noout"})
		local valid2 = util.file_exec("/usr/bin/openssl", {"crl", "-in", path, "-inform", "DER", "-noout"})
		if valid1.code == 1 and valid2.code == 1 then
			invalid = true
		end
	elseif v_table.option == "tls_auth" or v_table.option == "tls_crypt" or v_table.option == "secret" then
		local file = io.open(path, "r")
		if file then
			if not file:read("*all"):find("BEGIN OpenVPN Static key") then
				invalid = true
			end
			file:close()
		end
	else
		if not fs.access(path) then
			invalid = true
		end
	end
	if invalid then
		self:add_critical_error(self.ERROR_CODES.INCORRECT_FILE, "Incorrect file uploaded.", v_table.option)
	end

	if v_table.option and self.uci:get(self.config, self.sid, v_table.option) == path then
		util.ubus("service", "event", { type = "config.change", data = { package = "openvpn" } })
	end
	util.set_file_permissions(path, "openvpn")
	self:ResponseOK({path = path}, self.messages)
end

function openvpn:check_sections(inst_type)
	local vpn_servers_count, vpn_clients_count = 0, 0
	self:table_foreach("openvpn", "openvpn", function(sec)
		if sec.type == "server" and sec[".name"] ~= self.sid then
			vpn_servers_count = vpn_servers_count + 1
		elseif sec.type == "client" and sec[".name"] ~= self.sid then
			vpn_clients_count = vpn_clients_count + 1
		end
	end)
	if self:get_abs_value(self.config, self.sid, "type") == "server" or inst_type == "server" then
		if vpn_servers_count > 0 then
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Only one OpenVPN server instance is allowed", "Validation")
		end
	elseif self:get_abs_value(self.config, self.sid, "type") == "client" or inst_type == "client" then
		if vpn_clients_count > 19 then
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Maximum number of OpenVPN clients has been reached", "Validation")
		end
	end
end

function openvpn:POST_validate_section_hook()
	self:require_validation()
	self:check_sections()
end

function openvpn:add_firewall_rule()
	local zone = {
		name    = "openvpn",
		input   = "ACCEPT",
		forward = "REJECT",
		output  = "ACCEPT",
		masq    = "1",
		device  = "tun_+ tap_+"
	}
	local zone_name = util_tlt.ensure_zone_exists(self, zone, nil, zone.device).name
	if zone_name == zone.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name, true) end
end

function openvpn:configure_traffic_rule(port, proto)
	if not port or port == "" then port = "1194" end
	if not proto or proto == "" then proto = "udp" end
	local rule = {
		name      = "Allow-openvpn-traffic",
		target    = "ACCEPT",
		src       = "wan",
		family    = "any",
		dest_port = { port },
		proto     = { proto },
		enabled   = "1"
	}
	util_tlt.ensure_vpn_rule_exists(self, rule, { target = rule.target, dest_port = rule.dest_port })
end

function openvpn:user_pass_to_file()
	local user = self:get_abs_value(self.config, self.sid, "user")
	local pass = self:get_abs_value(self.config, self.sid, "pass")
	local auth_file = self:table_get(self.config, self.sid, "auth_user_pass")
	if not auth_file then
		auth_file = string.format(ovpn_path .. "auth_%s_%s", self.sid, os.time())
	end
	if (user and user ~= "") or (pass and pass ~= "") then
		if username:get() ~= user or password:get() ~= pass then
			fs.remove(auth_file)
			auth_file = string.format(ovpn_path .. "auth_%s_%s", self.sid, os.time())
		end
		self:table_set(self.config, self.sid, "auth_user_pass", auth_file)
		fs.writefile(auth_file, "%s\n%s\n" % { user, pass })
		util.set_file_permissions(auth_file, "openvpn")
		self:table_delete(self.config, self.sid, "user")
		self:table_delete(self.config, self.sid, "pass")
	end
end

function openvpn:check_encryption(option, key_path, askpass_value)
	local code, msg
	if option == "key" then
		if util.file_exec("/usr/bin/openssl", {"pkey", "-check", "-in", key_path, "-passin", "pass:".. (askpass_value or "")}).code == 1 then
			if askpass_value and askpass_value ~= "" then
				code, msg = self.ERROR_CODES.KEY_PASSWORD_INVALID, "Provided private key password is invalid!"
			else
				code, msg = self.ERROR_CODES.KEY_ENCRYPTED, "Private key decryption password is required!"
			end
		end
	elseif option == "pkcs12" then
		if util.file_exec("/usr/bin/openssl", {"pkcs12", "-info", "-noout", "-in", pkcs12_path, "-password", "pass:" .. (askpass_value or "")}).code == 1 then
			if askpass_value and askpass_value ~= "" then
				code, msg = self.ERROR_CODES.PKCS12_PASSWORD_INVALID, "Provided PKCS #12 passphrase is invalid!"
			else
				code, msg = self.ERROR_CODES.PKCS12_ENCRYPTED, "PKCS #12 passphrase is required!"
			end
		end
	end
	return code, msg
end

function openvpn:remove_key_from_config_file(config_file)
	if not config_file or config_file == "" then return end
	local orig_file = io.open(config_file, "r")
	if not orig_file then return end
	local tmp_file = io.open(tmp_path .. self.sid .. ".config.tmp", "w")
	local skip = false

	for line in orig_file:lines() do
		if line:match("^%s*<key>") then
			skip = true
		elseif line:match("^%s*</key>") then
			skip = false
		elseif not skip then
			tmp_file:write(line, "\n")
		end
	end
	orig_file:close()
	tmp_file:close()
	fs.move(tmp_path .. self.sid .. ".config.tmp", config_file)
end

function openvpn:options_setter()
	local function delete_opt(opt)
		self:table_delete(self.main_config, self.sid, opt)
	end
	local function set_opt(opt, value)
		self:table_set(self.main_config, self.sid, opt, value)
	end
	local function get_abs_opt(opt)
		return self:get_abs_value(self.main_config, self.sid, opt)
	end

	local config_parsed = get_abs_opt("config_parsed")
	if config_parsed ~= "1" then delete_opt("config") end
	delete_opt("server_list")
	delete_opt("external_service")

	local auth_mode = get_abs_opt("auth_mode")
	local inst_type = get_abs_opt("type")
	local use_pkcs = get_abs_opt("use_pkcs")
	if use_pkcs == "1" then
		delete_opt("ca")
		delete_opt("cert")
		delete_opt("key")
	else
		delete_opt("pkcs12")
	end

	--Check encrypted keys
	local enable = get_abs_opt("enable")
	local key_path = get_abs_opt("key")
	local pkcs12_path = get_abs_opt("pkcs12")
	local askpass_file = get_abs_opt("askpass")
	local askpass_value
	local code, msg
	if askpass_file then
		if fs.access(askpass_file) then
			askpass_value = fs.readfile(askpass_file)
		else
			askpass_value = askpass_file
		end
	end
	if key_path and key_path ~= "" and util.file_exec("/bin/grep", {"-q", "BEGIN PRIVATE KEY", key_path}).code == 1 then
		local in_tpm = { code = 1 }
		if has_tpm then
			in_tpm = util.file_exec("/bin/tpm2_importer", {key_path, "get_handle"})
		end
		-- if key is in tpm we do not check any passwords
		if in_tpm.code ~= 0 then
			code, msg = self:check_encryption("key", key_path, askpass_value)
		else
			if askpass_file and fs.access(askpass_file) then fs.remove(askpass_file) end
			delete_opt("askpass")
			local parse = get_abs_opt("parse")
			local config_file = get_abs_opt("config")
			local use_tpm = get_abs_opt("use_tpm")
			if parse == "1" and config_parsed == "1" and use_tpm == "1" then
				self:remove_key_from_config_file(config_file)
			end
		end
	elseif pkcs12_path and pkcs12_path ~= "" then
		code, msg = self:check_encryption("pkcs12", pkcs12_path, askpass_value)
	end
	if code and msg then
		if enable and enable == "1"  then
			self:add_error(code, msg, self.sid)
			set_opt("enable", "0")
		else
			self:add_message(1, msg, self.sid)
		end
	end

	if use_pkcs ~= "1" and inst_type == "client" and auth_mode == "pass" then
		if askpass_file and fs.access(askpass_file) then fs.remove(askpass_file) end
		delete_opt("askpass")
	end

	local dev_type = string.sub(get_abs_opt("dev") or "", 1, 3)
	local topology = get_abs_opt("topology")
	local dh = get_abs_opt("dh")
	local tls_security = get_abs_opt("tls_security")
	local to_bridge = get_abs_opt("to_bridge")

	--Dependencies
	if dev_type == "tun" then
		delete_opt("to_bridge")
	elseif dev_type == "tap" then
		delete_opt("topology")
		delete_opt("local_ip")
		delete_opt("remote_ip")
		delete_opt("local_ipv6")
		delete_opt("remote_ipv6")
		delete_opt("server_ip")
		delete_opt("server_netmask")
		delete_opt("server_ipv6")
		delete_opt("ifconfig_pool_start")
		delete_opt("ifconfig_pool_end")
		delete_opt("ifconfig_ipv6_pool")
	end

	if auth_mode == "skey" then
		delete_opt("mode")
		delete_opt("tls_server")
		delete_opt("askpass")
		delete_opt("tls_client")
		delete_opt("client")
		delete_opt("tls_security")
		delete_opt("tls-auth")
		delete_opt("key-direction")
		delete_opt("tls-crypt")
		delete_opt("ca")
		delete_opt("cert")
		delete_opt("key")
		delete_opt("dh")
		delete_opt("crl_verify")
		delete_opt("use_pkcs")
		delete_opt("auth_user_pass")
		delete_opt("pkcs12")
		delete_opt("server_ip")
		delete_opt("push")
		delete_opt("server_netmask")
		delete_opt("ifconfig_pool_start")
		delete_opt("ifconfig_pool_end")
		delete_opt("server_ipv6")
		delete_opt("ifconfig_ipv6_pool")
		delete_opt("userpass")
		delete_opt("duplicate_cn")
		delete_opt("client_to_client")
		if topology == "subnet" then
			delete_opt("topology")
		end
	else
		if tls_security ~= "tls-crypt" then
			delete_opt("tls_crypt")
		end
		if tls_security ~= "tls-auth" then
			delete_opt("tls_auth")
		end
	end

	if inst_type == "server" then
		delete_opt("tls_client")
		delete_opt("client")
		delete_opt("remote")
		delete_opt("auth_user_pass")
		if auth_mode ~= "skey" then
			delete_opt("secret")
			set_opt("mode", "server")
			set_opt("tls_server", "1")
			if not dh or dh == "" then set_opt("dh", "none") end
		else
			self:remove_tls_clients()
		end

		local has_tls = auth_mode == "tls" or auth_mode == "tls/pass"
		if dev_type == "tap" and has_tls and to_bridge ~= "none" then
			set_opt("server_bridge", "nogw")
		else
			delete_opt("server_bridge")
		end
		if dev_type == "tun" and has_tls then
			set_opt("client_config_dir", ovpn_path .. "ccd")
		else
			delete_opt("client_config_dir")
		end
	end

	if inst_type == "client" then
		delete_opt("mode")
		delete_opt("tls_server")
		delete_opt("duplicate_cn")
		delete_opt("dh")
		delete_opt("crl_verify")
		delete_opt("client_config_dir")
		delete_opt("server_bridge")
		delete_opt("client_to_client")
		if auth_mode ~= "skey" then
			set_opt("tls_client", "1")
			set_opt("client", "1")
			delete_opt("secret")
		end

		if auth_mode == "tls/pass" or auth_mode == "pass" then
			self:user_pass_to_file()
		else
			delete_opt("auth_user_pass")
		end
	end
end

function openvpn:update_config()
	local configuration = self:get_abs_value(self.config, self.sid, "configuration")
	if configuration == "external" then
		self:clean_section({ "external_service", "server_list", "user", "pass", "config", "auth_user_pass", "remote" })
		self:user_pass_to_file()
		self:setup_external_service()
		return
	end

	if configuration == "custom" then
		local config = self:get_abs_value(self.config, self.sid, "config") or ""
		if config == "" then
			self:clean_section({ "config", "parse" })
			return
		end
		local parse = self:get_abs_value(self.config, self.sid, "parse") or ""
		local config_parsed = self:table_get(self.config, self.sid, "config_parsed") or "0"
		if parse == "1" then
			if config_parsed == "1" then
				self:options_setter()
			else
				self:parse_configuration(config)
			end
		else
			if config_parsed == "2" then return end
			self:export_main_values(config)
		end
		return
	end

	if configuration == "manual" then
		self:options_setter()
	end
end

function openvpn:update_network_bridge(action)
	local dev = self:table_get(self.main_config, self.sid, "dev")
	local to_bridge = self:table_get(self.main_config, self.sid, "to_bridge") or ""
	self:table_foreach("network", "device", function(s)
		if string.match(s[".name"], "^br_(.+)") then
			local tap = false
			local ports = self:table_get("network", s[".name"], "ports") or {}
			local _ports = {}
			for _, p in pairs(ports) do
				if p == dev then
					tap = true
				else
					table.insert(_ports, p)
				end
			end
			if tap and (not to_bridge or to_bridge == "none" or to_bridge ~= s[".name"] or action == "remove") then
				if #_ports ~= 0 then
					self:table_set("network", s[".name"], "ports", _ports)
				else
					self:table_delete("network", s[".name"], "ports")
				end
			elseif to_bridge and to_bridge == s[".name"] and not tap then
				table.insert(ports, dev)
				self:table_set("network", s[".name"], "ports", ports)
			end
		end
	end)
end

function openvpn:count_instances()
	local s_enabled = false
	local s_count = 0
	local server_exist, server_enabled = false, false
	local port, proto

	self:table_foreach(self.main_config, "openvpn", function(c)
		s_count = s_count + 1
		if c.enable == "1" then
			s_enabled = true
		end
		if c.type == "server" then
			server_enabled = c.enable == "1"
			server_exist = true
			port = c.port or "1194"
			if c.proto and c.proto ~= "" then
				proto = string.sub(c.proto, 1, 3)
			else
				proto = "udp"
			end
		end
	end)

	if s_enabled then
		self:add_firewall_rule()
	elseif s_count < 1 then
		util_tlt.delete_zone_from_firewall(self, "openvpn", true, true)
		util_tlt.delete_rule_from_firewall(self, "Allow-openvpn-traffic", true, true)
		return
	end

	if server_exist then
		if server_enabled then
			self:configure_traffic_rule(port, proto)
		else
			self:table_foreach("firewall", "rule", function(s)
				if s.name == "Allow-openvpn-traffic" then
					self:table_set("firewall", s[".name"], "enabled", "0")
				end
			end)
		end
	else
		util_tlt.delete_rule_from_firewall(self, "Allow-openvpn-traffic", true, true)
	end
end

function openvpn:UPDATE_before_commit()
	self:count_instances()
	self:update_network_bridge()
end

openvpn.POST_before_commit_hook = openvpn.UPDATE_before_commit
openvpn.PUT_before_commit_hook = openvpn.UPDATE_before_commit
openvpn.DELETE_before_commit_hook = openvpn.UPDATE_before_commit

function openvpn:UPDATE_validate_section_hook()
	self:update_config()
end

openvpn.PUT_after_validate_section_hook = openvpn.UPDATE_validate_section_hook
openvpn.POST_after_validate_section_hook = openvpn.UPDATE_validate_section_hook

function openvpn:PUT_after_commit_hook()
	local enable = self:table_get(self.main_config, self.sid, "enable")
	if enable ~= "1" then
		fs.remove(tmp_path .. "openvpn." .. self.sid .. ".status")
	end
end

function openvpn:DELETE_before_section_delete_hook()
	if self:table_get(self.main_config, self.sid, "type") == "server" then
		self:remove_tls_clients()
	end

	local auth_files = fs.glob(ovpn_path .. "auth_" .. self.sid .. "*")
	for auth_file in auth_files do
		fs.remove(auth_file) -- remove all auth files
	end

	fs.remove(tmp_path .. "openvpn." .. self.sid .. ".status") -- remove status file

	local askpass_files = fs.glob(ovpn_path .. "askpass_" .. self.sid .. "_*")
	for askpass_file in askpass_files do
		fs.remove(askpass_file) -- remove all askpass files
	end

	local uploaded_files = fs.glob("/etc/vuci-uploads/cbid.openvpn." .. self.sid .. ".*")
	for uploaded_file in uploaded_files do
		fs.remove(uploaded_file) -- remove section uploaded files
	end

	local tmp_cert_files = fs.glob(tmp_path .. "openvpn_" .. self.sid .. ".*")
	for tmp_cert_file in tmp_cert_files do
		fs.remove(tmp_cert_file) -- remove tmp cert files
	end

	local tmp_files = fs.glob(tmp_path .. "openvpn-" .. self.sid .. ".*")
	for tmp_file in tmp_files do
		fs.remove(tmp_file) -- remove tmp config and state files
	end

	util_tlt.delete_overview_section("open_vpn", self.sid)
	self:update_network_bridge("remove")
end

function openvpn:get_uptime(time)
	local sysinfo = util.ubus("system", "info")
	if not sysinfo or not time then return end
	return util_tlt.seconds_to_days_hours_minutes_seconds(tonumber(sysinfo.uptime - time))
end

function openvpn:get_instance_ip_uptime(sid, status, device)
	local file_name = tmp_path .. "openvpn-" .. sid .. ".info"
	local ipaddress, uptime, ipaddress_remote, ip6address, ip6address_remote
	if fs.access(file_name) and fs.stat(file_name).size ~= 0 then
		local info = json.parse(fs.readfile(file_name))
		if not info then
			return nil, nil, nil, nil, nil
		end
		ipaddress = info.ip
		ip6address = info.ipv6
		if info.ip_remote then ipaddress_remote = info.ip_remote or nil end
		if info.ipv6_remote then ip6address_remote = info.ipv6_remote or nil end
		if status == "1" or status == "2" or status == "6" then
			uptime = self:get_uptime(info.time)
		end
		return ipaddress, uptime, ipaddress_remote, ip6address, ip6address_remote
	else
		if device and fs.access("/sys/class/net/" .. device) then
			local ip_addr4 = json.parse(util.exec("ip -4 -j addr show dev " .. device .. " 2>/dev/null"))
			if ip_addr4 and ip_addr4[1] and ip_addr4[1].addr_info then
				ipaddress = ip_addr4[1].addr_info[1]["local"]
				ipaddress_remote = ip_addr4[1].addr_info[1].address
			end
			local ip_addr6 = json.parse(util.exec("ip -6 -j addr show dev " .. device .. " 2>/dev/null"))
			if ip_addr6 and ip_addr6[1] and ip_addr6[1].addr_info then
				ip6address = ip_addr6[1].addr_info[1]["local"]
			end
		end
		if fs.access(tmp_path .. "openvpn-" .. sid .. ".time") and status == "6" then
			local time = fs.readfile(tmp_path .. "openvpn-" .. sid .. ".time")
			uptime = self:get_uptime(time)
		end
		return ipaddress, uptime, ipaddress_remote, ip6address, nil
	end
	return nil, nil, nil, nil, nil
end

function openvpn:check_udetectable(sid)
	local undetectable = false
	local file_path = tmp_path .. "openvpn-" .. sid .. ".conf"
	local f = io.open(file_path)
	if not f then return undetectable end
	for line in f:lines() do
		if ( line:match("^script%-security%s+(%d+)") and tonumber(line:match("%d+")) < 2 ) or line:match("^persist%-tun") then
			undetectable = true
		end
	end
	f:close()
	return undetectable
end

function openvpn:get_instance_status_code(sid, openvpn_type, status_file)
	local STATUS = {
		DISCONNECTED = "0",
		CONNECTED = "1",
		RUNNING = "2",
		STOPPED = "3",
		DISABLED = "4",
		CHECKING = "5",
		UNDETECTABLE = "6"
	}
	local enable = self:table_get("openvpn", sid, "enable")
	if enable ~= "1" then return STATUS.DISABLED end
	if openvpn_type and openvpn_type == "client" then
		if fs.access(tmp_path .. "openvpn-" .. sid .. ".up") then return STATUS.CHECKING end
		if not status_file then return STATUS.DISCONNECTED end
		if fs.readfile(status_file) and fs.stat(status_file).size == 0 then return STATUS.DISCONNECTED end

		local log = fs.readfile(status_file)
		if not log then return STATUS.DISCONNECTED end

		local tap = (string.sub(self:table_get("openvpn", sid, "dev") or "", 1, 3) == "tap") and true or false
		if self:table_get("openvpn", sid, "auth_mode") == "skey" and not tap and not fs.access(tmp_path .. "openvpn-" .. sid .. ".ping") then
			return STATUS.DISCONNECTED
		end

		local bytes_read = tonumber(log:match("TUN/TAP read bytes,%s*(%d+)")) or 0
		local bytes_write = tonumber(log:match("TUN/TAP write bytes,%s*(%d+)")) or 0
		if bytes_read == 0 or bytes_write == 0 then
			local undetectable = self:check_udetectable(sid)
			if undetectable then return STATUS.UNDETECTABLE end
			return STATUS.DISCONNECTED
		end

		return STATUS.CONNECTED
	elseif openvpn_type and openvpn_type == "server" then
		local ovpn = util.ubus("service", "list").openvpn
		if ovpn and ovpn.instances and ovpn.instances[sid] and ovpn.instances[sid].running then
			return STATUS.RUNNING
		else
			return STATUS.STOPPED
		end
	end
end

function openvpn:parse_server_status(status_info)
	local clients_status = false
	local routing_status = false
	local clients_table = {}
	local routing_table = {}
	local connected_clients = 0
	local line_counter = 0
	local rx = 0
	local tx = 0

	if not status_info then return clients_table, routing_table, rx, tx, connected_clients, nil end
	for line in status_info:gmatch("[^\r\n]+") do
		line_counter = line_counter + 1
		if line_counter == 2 then
			local updated = line:match("Updated,%s*([^\n]*)")
		end

		--Parse clients info
		if line == "ROUTING TABLE" then clients_status = false end
		if clients_status == true then
			local cli = {}
			cli["name"], cli["ip"], cli["rx"], cli["tx"], cli["uptime"] = line:match("([^,]+),([^,]+),([^,]+),([^,]+),([^,]+)")
			table.insert(clients_table, cli)
			connected_clients = connected_clients + 1
			rx = rx + cli["rx"]
			tx = tx + cli["tx"]
		end
		if line == "Common Name,Real Address,Bytes Received,Bytes Sent,Connected Since" then clients_status = true end

		--Parse routing info
		if line == "GLOBAL STATS" then routing_status = false end
		if routing_status == true then
			local rou = {}
			rou["vpn_ip"], rou["name"], rou["ip"], rou["last_ref"] = line:match("([^,]+),([^,]+),([^,]+),([^,]+)")
			table.insert(routing_table, rou)
		end
		if line == "Virtual Address,Common Name,Real Address,Last Ref" then routing_status = true end
	end

	return clients_table, routing_table, rx, tx, connected_clients, updated

end

function openvpn:get_client_uptime(time)
	local time_now = os.time()
	local year, month, day, hour, min, sec = time:match("(%d+)-(%d+)-(%d+) (%d+):(%d+):(%d+)")
	local converted_time = os.time({year=year, month=month, day=day, hour=hour, min=min, sec=sec})
	local uptime = util_tlt.seconds_to_days_hours_minutes_seconds(time_now - converted_time)
	return uptime
end

function openvpn:instances_status(sid)
	local openvpn_type = self:table_get("openvpn", sid, "type")
	local status_file = self:table_get("openvpn", sid, "status")
	if status_file then
		status_file = util.split(status_file,' ')[1]
	else
		status_file = tmp_path .. "openvpn." .. sid .. ".status"
	end
	local status = self:get_instance_status_code(sid, openvpn_type, status_file)
	local device = self:table_get("openvpn", sid, "dev")
	local ipaddress, uptime, ipaddress_remote, ip6address, ip6address_remote = self:get_instance_ip_uptime(sid, status, device)
	local name = self:table_get("openvpn", sid, "name")
	local protocol
	if device then
		protocol = string.sub(device, 1, 3)
	end
	local auth = self:table_get("openvpn", sid, "auth_mode")
	local logs = util.exec(string.format("logread -e %s", util.shellquote("openvpn@" .. sid)))

	if openvpn_type == "server" then
		local return_table = {
			status = status,
			type = "1",
			protocol = protocol,
			uptime = uptime,
			ipaddress = ipaddress,
			logs = logs,
			ip6address = ip6address,
			name = name,
			device = device
		}
		if fs.access(status_file) then
			local status_info = fs.readfile(status_file)
			if auth ~= "skey" then
				local clients_all = 0
				self:table_foreach("openvpn", "client", function(c)
					clients_all = clients_all + 1
				end)

				local clients_table, routing_table, rx, tx, connected_clients, updated = self:parse_server_status(status_info)

				clients = {}
				for i = 1, #clients_table do
					clients[i] = {}
					if clients_table[i].uptime then
						clients_table[i].uptime = self:get_client_uptime(clients_table[i].uptime)
					end
					for j = 1, #routing_table do
						if routing_table[j].ip == clients_table[i].ip and not routing_table[j].vpn_ip:match("[/]+") then
							if routing_table[j].vpn_ip:match("[:]+") then
								if routing_table[j].vpn_ip:match("[@]+") then
									clients_table[i].vpn_mac = routing_table[j].vpn_ip:match("([^@]+)@")
								else
									clients_table[i].vpn_ip6 = routing_table[j].vpn_ip
								end
							else
								clients_table[i].vpn_ip = routing_table[j].vpn_ip
							end
							clients_table[i].last_ref = routing_table[j].last_ref
						end
					end
					clients[i] = clients_table[i]
				end

				if connected_clients > clients_all then
					clients_all = connected_clients
				end

				local return_table_upd = {
					updated = updated,
					clients_all = tostring(clients_all),
					clients_connected = tostring(connected_clients),
					clients = clients,
					rx = tostring(rx),
					tx = tostring(tx)
				}
				for k, v in pairs(return_table_upd) do return_table[k] = v end
				return return_table

			else
				local ipaddress_remote = self:table_get("openvpn", sid, "remote_ip")
				local ip6address_remote = self:table_get("openvpn", sid, "remote_ipv6")
				local updated = status_info:match("Updated,%s*([^\n]*)")
				local rx = status_info:match("TCP/UDP read bytes,%s*(%d+)")
				local tx = status_info:match("TCP/UDP write bytes,%s*(%d+)")

				local return_table_upd = {
					updated = updated,
					ipaddress_remote = ipaddress_remote,
					ip6address_remote = ip6address_remote,
					rx = rx,
					tx = tx
				}
				for k, v in pairs(return_table_upd) do return_table[k] = v end
				return return_table
			end
		else
			local return_table_upd = {
				ipaddress_remote = ipaddress_remote,
				ip6address_remote = ip6address_remote
			}
			for k, v in pairs(return_table_upd) do return_table[k] = v end
			return return_table
		end
	end

	if openvpn_type == "client" then
		local server = self:table_get("openvpn", sid, "remote")
		local return_table = {
			status = status,
			type = "0",
			protocol = protocol,
			uptime = uptime,
			ipaddress = ipaddress,
			ip6address = ip6address,
			ipaddress_remote = ipaddress_remote,
			server = server,
			logs = logs,
			ip6address_remote = ip6address_remote,
			name = name,
			device = device
		}

		local status_info = fs.readfile(status_file)
		if not status_info then return return_table end

		local updated = status_info:match("Updated,%s*([^\n]*)")
		local rx = status_info:match("TCP/UDP read bytes,%s*(%d+)")
		local tx = status_info:match("TCP/UDP write bytes,%s*(%d+)")
		local return_table_upd = {
			updated = updated,
			rx = rx,
			tx = tx
		}
		for k, v in pairs(return_table_upd) do return_table[k] = v end
		return return_table
	end
end

function openvpn:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function openvpn:GET_TYPE_status()
	local query_parsing = require("api/query")
	query_parsing:validate_query_format({array = "number"}, self)
	local array = self.query_parameters.array or "0"

	if self._single then
		local status = self:instances_status(self.sid)
		if status then
			return self:ResponseOK(status)
		else
			return self:ResponseNotFound("Section not found")
		end
	else
		local statuses = {}
		local arr = {}
		self:table_foreach("openvpn", "openvpn", function(c)
			if array == "1" then
				local sid = c[".name"]
				arr = self:instances_status(sid)
				arr.id = sid
				table.insert(statuses, arr)
			else
				local sid = c[".name"]
				statuses[sid] = self:instances_status(sid)
			end
		end)

		return self:ResponseOK(statuses)
	end
end

function openvpn:PUT_section_init_hook()
	local key_option = "key"
	if self.current_data_block.use_tpm == "1" then
		-- add the existing key so if use_tpm is enabled it would use core logic to upload the key even if the api user does not provide it
		self.current_data_block[key_option] = self.current_data_block[key_option] or self:get_abs_value(self.config, self.sid, key_option)
	end
end

return openvpn
