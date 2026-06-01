local fs = require("nixio.fs")
local util = require("vuci.util")
local uci = require("vuci.uci"):cursor()
local pac = require("vuci.package_checker")
local util_tlt = require("vuci.util_tlt")
local dt = require("api.Validations")

local CONFIG = "certificates"
local tpm2_importer = "/bin/tpm2_importer"
local certificates = {}

local RETURN_CODES = {
	SUCCESS = 0,
	INVALID_FILE = 1,
	FILE_NOT_FOUND = 2,
	TPM2_IMPORT_FAILED = 3,
	TPM2_IMPORTER_NOT_FOUND = 4,
	TPM2_FULL = 5
}

local file_patterns = {
	key = function(name) return { name .. ".key.pem", name .. ".req.pem" } end,
	key_only = function(name) return { name .. ".key.pem" } end,
	cert = function(name) return { name .. ".cert.pem" } end,
	dh = function(name) return { name .. ".pem" } end,
}

----- Validates certificates and it's length
---@param file string Certificate file path
---@return boolean status Certificate validation status
---@return string encryption_type certificate's encryption type
---@return table | string error Messages or error based on status
---@return  string | nil length  Certificate length
function certificates.validate_cert_length(file)
	local messages = {}
	local file_out
	local min_rsa_key_length = 2048
	local min_ecc_key_length = 256
	local encryption="-"
	local key_length

	local function process_certificate_output(output)
		local key_length = string.match(output, "(%d+) bit")
		local algorithm = string.match(output, "Public Key Algorithm: (%S+)")
		if algorithm == "rsaEncryption" then
			encryption="rsa"
			if key_length and tonumber(key_length) < min_rsa_key_length then
				table.insert(messages, { code = 1, message = "It's recommended to use a minimum RSA key length of 2048 bits for the certificate." })
			end
		elseif algorithm == "id-ecPublicKey" then
			encryption="ecc"
			if key_length and tonumber(key_length) < min_ecc_key_length then
				table.insert(messages, { code = 2, message = "It's recommended to use a minimum ECC key length of 256 bits for the certificate." })
			end
		elseif key_length and tonumber(key_length) < min_rsa_key_length then
			table.insert(messages, { code = 3, message = "It's recommended to use a minimum key length of 2048 bits for the certificate." })
		end
		return key_length
	end
	local filename = util.split(file, "/")[4]
	local info = filename and certificates.get_single(_, filename)

	if info and next(info) then
		key_length = info.key_size
		encryption = info.encryption

		if encryption == "rsa" and tonumber(key_length) < min_rsa_key_length then
			table.insert(messages, { code = 1, message = "It's recommended to use a minimum RSA key length of 2048 bits for the certificate." })
		elseif encryption == "ecc" and tonumber(key_length) < min_ecc_key_length then
			table.insert(messages, { code = 2, message = "It's recommended to use a minimum ECC key length of 256 bits for the certificate." })
		elseif encryption ~= "ecc" and tonumber(key_length) and tonumber(key_length) < min_rsa_key_length then
			table.insert(messages, { code = 3, message = "It's recommended to use a minimum key length of 2048 bits for the certificate." })
		end
		return true, encryption, messages, key_length
	else
		-- Fall back to OpenSSL validation
		file_out = util.file_exec("/usr/bin/openssl", {"x509", "-in", file, "-text", "-noout"})
		if file_out and file_out.code == 0 then
			key_length = process_certificate_output(file_out.stdout)
			return true, encryption, messages, key_length
		else
			file_out = util.file_exec("/usr/bin/openssl", {"req", "-in", file, "-text", "-noout"})
			if file_out and file_out.code == 0 then
				key_length = process_certificate_output(file_out.stdout)
				return true, encryption, messages, key_length
			end
		end
	end

	return false, "Certificate is not valid", key_length
end

local function parse_cert_type(subject)
	local lines = util.split(subject)
	local function is_certificate(type)
		for _, line in ipairs(lines) do
			local val = line:match("^.*" .. type .. "%s*:%s*(.*)$")
			if val then
				return val == "Yes"
			end
		end
		return false
	end
	local client = is_certificate("client")
	local server = is_certificate("server")
	local client_ca = is_certificate("client%s*CA")
	local server_ca = is_certificate("server%s*CA")

	if not client and not server and (client_ca or server_ca) then
		return "ca"
	elseif not client and server and not client_ca and not server_ca then
		return "server"
	elseif client and not server and not client_ca and not server_ca then
		return "client"
	else
		return "import"
	end
end

local function check_pass(path)
	local f = io.open(path, "r")
	if not f then return false end

	for line in f:lines() do
		if line:find("ENCRYPTED") or line:find("DEK%-Info:") then f:close(); return true end
		if line:find("^-----END") then f:close(); return false end
	end
	f:close()
	-- fallback on openssl command for der options
	local res = certificates.execute_openssl({ "pkey", "-in", path, "-noout" })
	return res and res.stderr and res.stderr:find("Enter pass phrase for") ~= nil or false
end

function certificates.add_service_to_config(path, service, inst, info_table)
	uci:load(CONFIG)
	local found = false
	uci:foreach(CONFIG, "certificate", function(cert)
		if cert.path == path then
			found = true
			local current_services = uci:get(CONFIG, cert[".name"], "services") or {}
			local service_inst = service .. ":" .. inst
			for _, existing_service in ipairs(current_services) do
				if existing_service == service_inst then
					return false
				end
			end

			table.insert(current_services, service_inst)
			uci:set(CONFIG, cert[".name"], "services", current_services)
			uci:save(CONFIG)
			return false
		end
	end)

	if not found then
		certificates.append_cert_to_config(info_table)
		certificates.add_service_to_config(path, service, inst)
	end

	uci:save(CONFIG)
end

function certificates.remove_service_from_config(path, service, inst, tpm2)
	uci:load(CONFIG)
	if not path then return end
	uci:foreach(CONFIG, "certificate", function(cert)
		if cert.path == path then
			if service and service ~= "" and inst and inst ~= "" then
				local services = cert.services or {}
				local updated_services = {}
				local service_inst = service .. ":" .. inst
				for _, s in ipairs(services) do
					if s ~= service_inst then
						table.insert(updated_services, s)
					end
				end
				local filename = path:match("^.+/(.+)$")
				if not filename then
					return false
				end
				if #updated_services == 0 and filename:match("^cbid") then
					uci:delete(CONFIG, cert[".name"])
					if tpm2 then certificates.remove_key_from_tpm2(path) end
					fs.remove(path)
				else
					uci:set(CONFIG, cert[".name"], "services", updated_services)
				end
				uci:save(CONFIG)
			end
			return
		end
	end)
end

function certificates.append_cert_to_config(info, system)
	uci:load(CONFIG)
	local existing_section = nil
	uci:foreach(CONFIG, "certificate", function(cert)
		if cert.path == info.path then
			existing_section = cert[".name"]
			return false
		end
	end)
	if existing_section then
		return nil
	end

	local section = uci:section(CONFIG, "certificate")

	for key, value in pairs(info) do
		if type(value) == "table" then
			uci:set(CONFIG, section, key, value)
		elseif type(value) == "boolean" then
			uci:set(CONFIG, section, key, value and "1" or "0")
		else
			uci:set(CONFIG, section, key, tostring(value))
		end
	end

	-- Set file permissions and save changes
	util.set_file_permissions(info.path, "certificates", 0660)
	if system then
		uci:commit(CONFIG)
	else
		uci:save(CONFIG)
	end

	return section
end

function certificates.remove_cert_from_config(name, file_type, req, system)
	uci:load(CONFIG)
	local patterns
	if file_type == "request" then
		patterns = {req}
	elseif file_type and file_patterns[file_type] then
		patterns = file_patterns[file_type](name)
	else
		patterns = {name}
	end
	uci:foreach(CONFIG, "certificate", function(s)
		for _, pattern in ipairs(patterns) do
			if s.fullname == pattern then
				uci:delete(CONFIG, s[".name"])
				return
			end
		end
	end)
	if system then
		uci:commit(CONFIG)
	end
end

function certificates.get_cert_files(include_tpm)
	local certs = {}
	uci:foreach(CONFIG, "certificate", function(cert)
		if type(cert) ~= "table" then
			return
		end

		if not include_tpm and cert.tpm2 == "1" then
			return
		end

		local filtered_cert = {}
		for key, value in pairs(cert) do
			if not key:match("^%.") then
				if value == "1" then
					filtered_cert[key] = true
				elseif value == "0" then
					filtered_cert[key] = false
				else
					filtered_cert[key] = value
				end
			end
		end

		table.insert(certs, filtered_cert)
	end)

	return certs
end

function certificates.execute_openssl(params)
	return util.file_exec("/usr/bin/openssl", params)
end

function certificates.get_cert_key(type, search_tpm)
	local cert_files = certificates.get_cert_files(search_tpm)
	local keys, certs = {}, {}
	for _, cert in pairs(cert_files) do
		if cert.cert_type == type or cert.cert_type == "import" or cert.cert_type == "letsencrypt" or cert.cert_type == "scep" then
			if cert.type == "cert" or cert.type == "req" then
				table.insert(certs, cert)
			elseif cert.type == "key" then
				table.insert(keys, cert)
			end
		end
	end
	return keys, certs
end

function certificates.get_single(type, name, tpm)
	local cert_files = certificates.get_cert_files(tpm)
	local result = {}
	for _, cert in pairs(cert_files) do
		if name and cert.fullname == name then return cert end
		if type and cert.type == type then table.insert(result, cert) end
	end
	return result
end

function certificates.parse_CN(subject)
	for _, line in ipairs(util.split(subject)) do
		local val = line:match("^%s*commonName%s*=%s*(.*)$")
		if val then
			return val
		end
	end
end

function certificates:get_certificates(type, search_tpm)
	if type == "client" then
		local keys, certs = certificates.get_cert_key("client", search_tpm)
		return {
			data = {
				keys = keys,
				certificates = certs
			}}
	elseif type == "keys" then
		return certificates.get_single("key", _, search_tpm)
	elseif type == "pub_keys" then
		return certificates.get_single("key", _, search_tpm)
	elseif type == "server" then
		local keys, certs = certificates.get_cert_key("server", search_tpm)
		return {
			data = {
				keys = keys,
				certificates = certs
			}}
	elseif type == "ca" then
		local keys, certs = certificates.get_cert_key("ca", search_tpm)
		return {
			data = {
				keys = keys,
				certificates = certs
			}}
	elseif type == "dh" then
		return certificates.get_single("dh")
	elseif type == "certificates" then
		local certs = {}
		local certification_files = certificates.get_cert_files()
		for _, cert in pairs(certification_files) do
			if cert.type == "cert" and cert.cert_type ~= "ca" then
				table.insert(certs, cert)
			end
		end
		return certs
	elseif type == "scep" then
		local keys, certs = certificates.get_cert_key("scep")
		return {
			data = {
				keys = keys,
				certificates = certs
			}}
	elseif type == "root_ca" then
		local keys, certs = certificates.get_cert_key("root_ca")
		return {
			data = {
				keys = keys,
				certificates = certs
			}}
	end
end

function certificates:openssl_response(command, path, der, additional_params)
	der = der or false
	additional_params = additional_params or {}
	local openssl_params = { command, "-in", path }

	if der then
		table.insert(openssl_params, "-inform")
		table.insert(openssl_params, "der")
	end

	if #additional_params >= 1 then
		for _, data in pairs(additional_params) do
			table.insert(openssl_params, data)
		end
	else
		table.insert(openssl_params, "-text")
		table.insert(openssl_params, "-noout")
	end

	return util.file_exec("/usr/bin/openssl", openssl_params)
end


function certificates:parse_date(dates_info)
	if not dates_info then return nil end
	local months = {
		Jan = 1,
		Feb = 2,
		Mar = 3,
		Apr = 4,
		May = 5,
		Jun = 6,
		Jul = 7,
		Aug = 8,
		Sep = 9,
		Oct = 10,
		Nov = 11,
		Dec = 12
	}

	local date_string = string.match(dates_info, "notAfter=(.+)")
	local p = "(%a+)%s+(%d+)%s+(%d+):(%d+):(%d+)%s+(%d+)%s+GMT"
	local month, day, hour, min, sec, year = date_string:match(p)
	month = months[month]
	local offset = os.time() - os.time(os.date("!*t"))
	return tostring(os.time({day = day, month = month, year = year, hour = hour, min = min, sec = sec }) + offset)
end

function certificates.validate_path(value, certificate)
	if not fs.access(value) then
		return false, "Provided file does not exist in the device"
	end

	for _, val in ipairs(certificate.default_values or {}) do
		if value == val then
			return true
		end
	end

	if not certificate.upload_only and not value:match("^/etc/certificates/cbid.*")  then
		local possible_options = {}
		for _, cert_type in ipairs(certificate.cert_types or {}) do
			local data = certificates:get_certificates(cert_type, certificate.tpm2)
			if data and data.data then
				data = data.data[certificate.type or "keys"]
			end
			for _, single_cert in pairs(data or {}) do
				table.insert(possible_options, single_cert.path)
			end
		end
		return dt:check_array(value, possible_options)
	end
	return dt:file_validation(value, { "/etc/certificates/", "/etc/vuci-uploads/", "/etc/ssl/certs/" })
end

function certificates.validate_service(path, cert_obj)
	local filename = path:match("^.+/(.+)$")
	if not filename then
		return nil
	end

	local res = 0
	local info_table
	info_table = certificates.get_single(_, filename, cert_obj.tpm2)
	if not next(info_table) then
		res, info_table = certificates:validate_cert(path, true, util.contains(cert_obj.cert_types, "keys"))
	end
	if res ~= RETURN_CODES.SUCCESS then
		if not cert_obj.failsafe then
			fs.remove(path)
			return nil
		else
			info_table = {
				name = "-",
				type = "-",
				key_size = "-",
				cert_type = "import",
				import = true,
				datetime = "-",
				fullname = filename,
				encryption = "-",
				path = path
			}
		end
	end

	return info_table
end

function certificates.get_pem_type(path)
	local f = io.open(path, "r")
	if not f then return nil end

	local first_lines = f:read("*all")
	f:close()

	if first_lines:find("-----BEGIN CERTIFICATE REQUEST-----") then
		return "req"
	elseif first_lines:find("-----BEGIN CERTIFICATE-----") then
		return "cert"
	elseif first_lines:find("-----BEGIN RSA PRIVATE KEY-----")
		or first_lines:find("-----BEGIN EC PRIVATE KEY-----")
		or first_lines:find("-----BEGIN PRIVATE KEY-----") then
		return "key"
	elseif first_lines:find("-----BEGIN PUBLIC KEY-----") then
		return "public_key"
	elseif first_lines:find("-----BEGIN DH PARAMETERS-----") then
		return "dh"
	else
		return "-"
	end
end

function certificates:validate_cert(path, true_valid, keys)
	if not true_valid then return 0 end
	if not fs.access(path) then fs.remove(path); return 2 end

	local messages
	local valid, encryption, messages, length = certificates.validate_cert_length(path)
	local info_table = {
		name = "-",
		type = "-",
		key_size = length or "-",
		cert_type = "import",
		import = true,
		datetime = "-",
		fullname = util.split(path, "/")[4],
		encryption = "-",
		pass_required = false,
		path = path
	}

	local t = certificates.get_pem_type(path)
	if keys and t ~= "key" and t ~= "-" then
		return RETURN_CODES.INVALID_FILE, info_table, messages
	end
	-- Fallback when type is not known or encoded
	if t == "-" then
		local res = certificates.execute_openssl({ "pkey", "-in", path, "-text", "-noout" })

		if res.code == 0 or (res.stderr and string.find(res.stderr, "Enter pass phrase for", nil, true)) then
			info_table.type = "key"
			info_table.pass_required = check_pass(path)
			return RETURN_CODES.SUCCESS, info_table, messages
		end
		if keys then return RETURN_CODES.INVALID_FILE end
		res = certificates.execute_openssl({"pkey", "-pubin", "-in", path, "-text", "-noout"})
		if res.code == 0 then
			info_table.type = "public_key"
			return RETURN_CODES.SUCCESS, info_table, messages
		end
		res = certificates.execute_openssl({ "req", "-in", path, "-text", "-noout" })
		if res.code == 0 then
			info_table.type = "req"
			local subject = certificates.execute_openssl({ "req", "-in", path, "-subject", "-noout", "-nameopt", "multiline" })
			if subject.code == 0 then
				info_table.name = certificates.parse_CN(subject.stdout)
				info_table.encryption = encryption
			end
			return RETURN_CODES.SUCCESS, info_table, messages
		end

		if valid then
			info_table.type = "cert"
			local subject = certificates.execute_openssl({ "x509", "-in", path, "-subject", "-noout", "-nameopt", "multiline", "-purpose" })
			if subject.code == 0 then
				info_table.name = certificates.parse_CN(subject.stdout)
				info_table.cert_type = parse_cert_type(subject.stdout)
				info_table.encryption = encryption
			end
			local d = certificates.execute_openssl({ "x509", "-in", path, "-dates", "-noout" })
			local expiry = certificates:parse_date(d.stdout)
			if expiry then info_table.datetime = expiry end
			return RETURN_CODES.SUCCESS, info_table, messages
		end

		res = certificates.execute_openssl({ "dhparam", "-in", path, "-text", "-noout" })
		if res.code == 0 then
			info_table.type = "dh"
			info_table.cert_type = "dh"
			info_table.key_size = length
			return RETURN_CODES.SUCCESS, info_table, messages
		end

		return RETURN_CODES.INVALID_FILE
	end

	if t == "key" then
		info_table.type = "key"
		info_table.pass_required = check_pass(path)

	elseif t == "public_key" then
		info_table.type = "public_key"

	elseif t == "req" then
		info_table.type = "req"
		local s = certificates.execute_openssl({"req", "-in", path, "-subject", "-noout", "-nameopt", "multiline"})
		if s.code == 0 then
			info_table.name = certificates.parse_CN(s.stdout)
			info_table.encryption = encryption
		end

	elseif t == "cert" then
		if not valid then return RETURN_CODES.INVALID_FILE end
		info_table.type = "cert"
		local s = certificates.execute_openssl({"x509", "-in", path, "-subject", "-noout", "-nameopt", "multiline", "-purpose"})
		if s.code == 0 then
			info_table.name = certificates.parse_CN(s.stdout)
			info_table.cert_type = parse_cert_type(s.stdout)
			info_table.encryption = encryption
		end
		local d = certificates.execute_openssl({"x509", "-in", path, "-dates", "-noout"})
		local expiry = certificates:parse_date(d.stdout)
		if expiry then info_table.datetime = expiry end

	elseif t == "dh" then
		local out = certificates.execute_openssl({"dhparam", "-in", path, "-text", "-noout"})
		if out.code ~= 0 then return RETURN_CODES.INVALID_FILE end
		info_table.type = "dh"
		info_table.cert_type = "dh"
	end

	return RETURN_CODES.SUCCESS, info_table, messages
end

local function _insert_tpm(path)
	local ret = util.file_exec(tpm2_importer, {path, "import"})
	if ret.code ~= RETURN_CODES.SUCCESS then
		if ret.code == RETURN_CODES.TPM2_FULL then
			return RETURN_CODES.TPM2_FULL
		end
		return RETURN_CODES.TPM2_IMPORT_FAILED
	end
	return RETURN_CODES.SUCCESS
end

function certificates.add_key_to_tpm2(path, validate)
	if path == "/etc/uhttpd.key" then return RETURN_CODES.SUCCESS end
	local res, info
	if not fs.access(path) then
		return RETURN_CODES.FILE_NOT_FOUND
	end
	if not fs.access(tpm2_importer) then
		return RETURN_CODES.TPM2_IMPORTER_NOT_FOUND
	end
	if validate then
		res, info = certificates:validate_cert(path, true)
		if res ~= RETURN_CODES.SUCCESS then return res end
		if pac.is_installed("vuci-app-certificates-api") then
			info.tpm2 = true
			res = _insert_tpm(path)
			if res ~= RETURN_CODES.SUCCESS then return res end
			certificates.append_cert_to_config(info)
		end
	else
		res = _insert_tpm(path)
		if res ~= RETURN_CODES.SUCCESS then return res end
		local fullname = util.split(path, "/")[4]
		info = certificates.get_single("key", fullname)
		uci:foreach(CONFIG, "certificate", function(cert)
			if cert.fullname == fullname then
				uci:set(CONFIG, cert[".name"], "tpm2", "1")
				return false
			end
		end)
		uci:save(CONFIG)
	end
	return RETURN_CODES.SUCCESS
end

function certificates.remove_key_from_tpm2(path, system)
	if path == "/etc/uhttpd.key" then return RETURN_CODES.SUCCESS end
	local ret = util.file_exec(tpm2_importer, {path, "delete"})
	if ret.code ~= RETURN_CODES.SUCCESS then
		return RETURN_CODES.TPM2_IMPORT_FAILED
	end
	fs.remove(path)
	certificates.remove_cert_from_config(util.split(path, "/")[4], _, _, system)
end

return certificates
