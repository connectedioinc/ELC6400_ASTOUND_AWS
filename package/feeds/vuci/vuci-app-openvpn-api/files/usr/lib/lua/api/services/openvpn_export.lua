local FunctionService = require("api/FunctionService")
local fs = require("nixio.fs")
local util = require("vuci.util")
local uci = require "vuci.uci".cursor()
local tmp_path = "/var/run/openvpn/"
local ovpn_path = "/etc/openvpn/"

local openvpn_export = FunctionService:new()

function openvpn_export:check_configuration(sid)
	local name, config, parse
	local exist, enabled, server = false, false, false
	uci:foreach("openvpn", "openvpn", function(c)
		if c[".name"] ==  sid then
			exist = true
			name = c.name
			config = c.config or ""
			parse = c.parse or ""
			enabled = c.enable == "1"
			server = c.type == "server"
			return false
		end
	end)
	if not exist then self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Openvpn config not exist", "Request") end
	if not enabled then self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Openvpn config should be enabled", "Request") end
	return name, config, parse, server
end

function openvpn_export:read_cert(cert, path)
	local content = ""
	local file = io.open(path, "r")
	if file then
		if cert == "pkcs12" then
			content = util.file_exec("/usr/bin/openssl", {"base64", "-in", path}).stdout
		else
			content = file:read("*all")
		end
		file:close()
		content = "<" .. cert .. ">\n" .. content .. "</" .. cert .. ">"
	end
	return content
end

function openvpn_export:check_skip_option(content, param)
	local skip_options = {}
	local content = content:match("OPENVPN_SKIP='(.-)'")
	if content then
		for option in content:gmatch("%S+") do
			skip_options[option] = true
		end
		if skip_options[param] then
			return true
		end
	end
	return false
end

function openvpn_export:get_export_options(param, value, opt_file_content)
	local certificates = {
		ca = true,
		cert = true,
		key = true,
		dh = true,
		secret = true,
		["crl-verify"] = true,
		["tls-auth"] = true,
		["tls-crypt"] = true,
		pkcs12 = true,
		["auth-user-pass"] = true
	}
	if certificates[param] then
		if param == "dh" and value == "none" then
			return nil, param .. " " .. value
		end
		return nil, self:read_cert(param, value)
	else
		local skip = self:check_skip_option(opt_file_content, param:gsub("-", "_"))
		if not skip then
			return param .. " " .. value, nil
		end
	end
	return nil, nil
end

function openvpn_export:get_user(username)
	local users = {}
	local auth_file = "/etc/openvpn/auth_" .. self.type
	local file = io.open(auth_file, "r")
	if not file or username == "none" then return users end
	for line in file:lines() do
		local user, pass = line:match("^(%S+)%s+(%S+)$")
		if user and pass then
			if username and user == username then
				file:close()
				return pass
			end
			table.insert(users, user)
		end
	end
	file:close()
	return users
end

function openvpn_export:get_generate_options(param, value, config_content)
	local certificates = {
		ca = true,
		cert = true,
		key = true,
		secret = true,
		["tls-auth"] = true,
		["tls-crypt"] = true,
		pkcs12 = true
	}
	if certificates[param] then
		if param == "pkcs12" then
			local certs = self:read_cert("ca", self.arguments.data.ca)
			certs = certs .. "\n" .. self:read_cert("cert", self.arguments.data.cert)
			certs = certs .. "\n" .. self:read_cert("key", self.arguments.data.key)
			return nil, certs
		elseif param == "cert" then
			if self:has_param(config_content, "verify-client-cert none") then return nil, nil end
			return nil, self:read_cert(param, self.arguments.data.cert)
		elseif param == "key" then
			if self:has_param(config_content, "verify-client-cert none") then return nil, nil end
			return nil, self:has_param(config_content, "verify-client-cert none") and nil or self:read_cert(param, self.arguments.data.key)
		else
			return nil, self:read_cert(param, value)
		end
	end
	local parameters = {
		dev = true,
		proto = true,
		port = true,
		cipher = true,
		auth = true,
		["data-ciphers"] = true,
		["auth-user-pass-verify"] = true,
		ifconfig = true,
		["ifconfig-ipv6"] = true,
		["comp-lzo"] = true,
		["key-direction"] = true,
		nobind = true
	}
	if not parameters[param] then return nil, nil end
	if param == "dev" then
		return param .. " " .. string.sub(value, 1, 3), nil
	elseif param == "proto" then
		return param .. " " .. value:gsub("%-server$", "-client", 1), nil
	elseif param == "auth-user-pass-verify" then
		local pass = self:get_user(self.arguments.data.user)
		if type(pass) == "string" then
			return nil, "<auth-user-pass>\n" .. self.arguments.data.user .. "\n" .. pass .. "\n</auth-user-pass>"
		else
			return "auth-user-pass", nil
		end
	elseif param == "ifconfig" or param == "ifconfig-ipv6" then
		if self:has_param(config_content, "secret") or self:has_param(config_content, "<secret>") then
			local value1, value2 = value:match("^(%S+)%s+(%S+)$")
			if value1 and value2 then
				local addr1, prefix = value1:match("^([^/]+)(/%d+)$")
				addr1 = addr1 or value1
				prefix = prefix or ""
				local addr2 = value2:gsub("/%d+$", "")
				return param .. " " .. addr2 .. prefix .. " " .. addr1, nil
			end
		end
		return nil, nil
	elseif param == "key-direction" then
		return "key-direction " .. (value == "1" and "0" or "1"), nil
	end
	return param .. " " .. value, nil
end

function openvpn_export:has_param(content, param)
	local esc = param:gsub("([%^%$%(%)%%%.%[%]%*%+%-%?])", "%%%1")
	local pattern = "[\r\n]%s*" .. esc .. "%s+"
	return content:match(pattern) ~= nil
end

function openvpn_export:collect_inline_certs(ln, state, content)
	local crt = state.crt
	local collect = state.collect
	local cert_text = state.cert_text
	local certs = state.certs
	local certs_text = state.certs_text

	if crt and ln:match("</" .. crt:gsub("-", "%%-") .. ">") then
		collect = false
		if next(cert_text) then
			certs_text[#certs_text + 1] = "<" .. crt .. ">"
			certs_text[#certs_text + 1] = table.concat(cert_text, "\n")
			certs_text[#certs_text + 1] = "</" .. crt .. ">"
		end
		crt = nil
		cert_text = {}
	end
	if collect then
		cert_text[#cert_text + 1] = ln
	end
	if ln:match("<([%a%d%-]+)>") then
		crt = ln:match("<([%a%d%-]+)>")
		if crt == "secret" or crt == "tls-auth" or crt == "tls-crypt" or crt == "ca" then
			collect = true
		elseif crt == "cert" or crt == "key" or crt == "pkcs12" then
			local _, cert = self:get_generate_options(crt, "", content)
			if cert then
				certs[#certs + 1] = cert
			end
		end
	end

	state.crt = crt
	state.collect = collect
	state.cert_text = cert_text
end

function openvpn_export:create_config_file(conf_type, sid, download_file, lines, content)
	local file = tmp_path .. "openvpn-" .. sid .. ".conf"
	local line, cert
	local certs, certs_text = {}, {}
	local cert_state = {
		crt = nil,
		collect = false,
		cert_text = {},
		certs = certs,
		certs_text = certs_text
	}
	local f = io.open(file)
	if not f then
		self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Unable to open config file.", "Request")
	end
	while true do
		ln = f:read("*l")
		if not ln then break end
		ln = ln:gsub("\r", "")
		-- collect certs text, when used custom file
		if conf_type == "generate" then
			self:collect_inline_certs(ln, cert_state, content)
		end
		-- process parameters and certs in files
		if ln:match("^[%a]") then
			local param, value = ln:match("^%s*([%w%-]+)%s*(.*)")
			line, cert = self["get_" .. conf_type .. "_options"](self, param, value, content)
			-- append lines
			if line then
				lines[#lines + 1] = line
			end
			-- append certs
			if cert then
				certs[#certs + 1] = cert
			end
		end
	end
	f:close()
	local download_config = io.open(download_file, "w")
	if not download_config then self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Unable to create config file.", "Request") end
	download_config:write(table.concat(lines, "\n"), "\n")
	if #certs > 0 then
		download_config:write(table.concat(certs, "\n"), "\n")
	end
	if #certs_text > 0 then
		download_config:write(table.concat(certs_text, "\n"), "\n")
	end
	download_config:close()
	util.set_file_permissions(download_file, "openvpn")
end

openvpn_export:action("download", function (self)
	local sid = self.type
	local name, config, parse = self:check_configuration(sid)
	local download_file = tmp_path .. "openvpn-" .. sid .. "-export.ovpn"
	if config ~= "" and parse ~= "1" then
		fs.copy(config, download_file) --if not parsing, return the same config as imported
	else
		local opt_file = io.open(ovpn_path .. "options", "r")
		assert(opt_file ~= nil)
		local opt_file_content = opt_file:read("*all")
		opt_file:close()
		local lines = { "#Exported " .. name .. " configuration" }
		self:create_config_file("export", sid, download_file, lines, opt_file_content)
	end

	if not download_file or not fs.access(download_file) then
		self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Could not download config", "Request")
	end
	return self:File(download_file, name .. ".ovpn", nil, true)
end)

function openvpn_export:check_required_options(sid)
	local ca, cert, key, user
	local remote = self.arguments.data and self.arguments.data.remote and self.arguments.data.remote ~= "" or self:add_error(STD_CODES.INVALID_OPT, "Missing required option: remote", "remote")
	local f = io.open(tmp_path .. "openvpn-" .. sid .. ".conf")
	if not f then return self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Unable to open config file.", "Request") end
	local content = f:read("*all")
	if self:has_param(content, "tls-server") then
		if self:has_param(content, "pkcs12") or self:has_param(content, "<pkcs12>") then
			ca = self.arguments.data and self.arguments.data.ca and self.arguments.data.ca ~= "" or self:add_error(STD_CODES.INVALID_OPT, "Missing required option: ca", "ca")
		end
		if not self:has_param(content, "verify-client-cert none") then
			cert = self.arguments.data and self.arguments.data.cert and self.arguments.data.cert ~= "" or self:add_error(STD_CODES.INVALID_OPT, "Missing required option: cert", "cert")
			key = self.arguments.data and self.arguments.data.key and self.arguments.data.key ~= "" or self:add_error(STD_CODES.INVALID_OPT, "Missing required option: key", "key")
		end
		if self:has_param(content, "auth-user-pass-verify") then
			local users = self:get_user()
			table.insert(users, "none")
			user = self.arguments.data and self.arguments.data.user and self.arguments.data.user ~= "" or self:add_error(STD_CODES.INVALID_OPT, "Missing required option: user, available options: [" .. table.concat(users, ", ") .. "]", "user")
		end
	end
	f:close()
	self:return_if_error()
	return content
end

function openvpn_export:client()
	local sid = self.type
	local name, config, parse, server = self:check_configuration(sid)
	if not server then self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Client generation requires server configuration", "Request") end
	local conf_content = self:check_required_options(sid)

	local download_file = tmp_path .. "openvpn-" .. sid .. "-generate.ovpn"
	local client_opt = ""
	if self:has_param(conf_content, "tls-server") then
		client_opt = "client"
	end

	local lines = { "#Client generated for " .. name .. " configuration" }
	if client_opt ~= "" then
		lines[#lines + 1] = client_opt
	end
	lines[#lines + 1] = "remote " .. self.arguments.data.remote
	self:create_config_file("generate", sid, download_file, lines, conf_content)

	if not download_file or not fs.access(download_file) then
		self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Could not generate client config", "Request")
	end
	return self:File(download_file, name .. "-client.ovpn", nil, true)
end

local s = openvpn_export:action("generate", openvpn_export.client)
	local remote = s:option("remote")
		function remote:validate(value)
			return self.dt:host(value)
		end

	local ca_file = s:option("ca")
		function ca_file:validate(value)
			return self.dt:file_validation(value, {"/etc/certificates/"})
		end

	local cert_file = s:option("cert")
		function cert_file:validate(value)
			return self.dt:file_validation(value, {"/etc/certificates/"})
		end

	local key_file = s:option("key")
		function key_file:validate(value)
			return self.dt:file_validation(value, {"/etc/certificates/"})
		end

	local user = s:option("user")
		function user:validate(value)
			local users = self:get_user()
			table.insert(users, "none")
			return self.dt:check_array(value, users)
		end

return openvpn_export
