local json = require("luci.jsonc")
local fs = require("nixio.fs")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local pac = require("vuci.package_checker")
local pki_installed = pac.is_installed("scep")
local letsencrypt_installed = pac.is_installed("letsencrypt")
local cert_util = require("api.system.certificate_utils")
local cert = require("vuci.certificates")
local cert_temp = "/tmp/certificates-status"
local has_tpm = require("vuci.board"):has_tpm()

local certificates = {}
local tpm_certificates = {}
local ConfigService = require("api/ConfigService")

local Certificates = ConfigService:new({ increment_name = true })

local root_ca_dir = "/etc/ssl/certs/"
local cert_dir = "/etc/certificates/"
local renew_cronjob = "0 12 * * 1 /sbin/tls_generate_lua cron"


function Certificates:initialize_hook()
	local include_tpm = self.query_parameters.include_tpm
	if has_tpm then
		-- for file checking
		tpm_certificates = cert.get_cert_files(true)
	end
	certificates = cert.get_cert_files(include_tpm)
end

local function get_generating_list()
	if fs.access(cert_temp) then return json.parse(fs.readfile(cert_temp) or "") or {} end
end

local function files_exist(files_table, check_temp)
	local selection
	if has_tpm then
		selection = tpm_certificates
	else
		selection = certificates
	end
	files_table = util.to_table(files_table)
	local exists, tpm = nil, false

	for _, cert in pairs(selection) do
		for _, file in pairs(files_table) do
			if cert.fullname == file then
				exists = file
				if cert.tpm2 then tpm = true end
				break
			end
		end
		if exists then break end
	end

	if not exists and check_temp then
		local generating_list = get_generating_list() or {}
		for _, cert in ipairs(generating_list) do
			for _, file in pairs(files_table) do
				if cert.fullname == file then
					exists = file
					break
				end
			end
			if exists then break end
		end
	end

	if exists then
		return true, exists, tpm
	end
	return false, nil, false
end

local function get_cert(_type, fullname, cert_type)
	for _, crt in ipairs(certificates) do
		if crt.type == _type and crt.fullname == fullname and (not cert_type or crt.cert_type == cert_type) then
			return crt
		end
	end
	return nil
end

local certs = Certificates:section("certificates", "certificate")

local generate = Certificates:action("generate", function (self)
	local free_space, _, err = util_tlt.check_reserved_space(20, util_tlt.get_mount_point(cert_dir))
	if not free_space then
		self:add_critical_error(STD_CODES.NO_SPACE,
			"Certificate generation failed. " .. err,
			"memory")
	end

	local data = self.arguments.data
	local command, command_options, files_list, name

	if data.type ~= "simple" then
		if not data.name or data.name == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: name", "name")
		end
		data.name = util.urldecode(data.name)
		name = data.name:gsub("\\/", ""):gsub("/", "")
	end
	if data.type == "simple" then
		files_list = {
			"ca.cert.pem", "client.cert.pem", "server.cert.pem", "ca.req.pem", "client.req.pem", "server.req.pem",
			"ca.key.pem", "client.key.pem", "server.key.pem", "dh.pem"
		}
		local files_exists, file_name, tpm = files_exist(files_list, true)
		if files_exists then
			self:add_critical_error(6, "File exists: " .. file_name, "file: " .. file_name)
		end
		command = "/sbin/tls_generate_lua -t simple"
		if data.host then
			for _, host in ipairs(data.host) do
				command = command .. " -f " .. host
			end
		end
		if data.ip_address then
			for _, ip_addr in ipairs(data.ip_address) do
				command = command .. " -i " .. ip_addr
			end
		end
	elseif data.type == "letsencrypt" then
		files_list = {
			"ca-" .. name .. ".cert.pem", name .. ".cert.pem", name .. ".key.pem"
		}

		local files_exists, file_name = files_exist(files_list, true)
		if files_exists then
			self:add_critical_error(6, "File exists: " .. file_name, "file: " .. file_name)
		end

		if not data.name or data.name == "" then self:add_critical_error(7, "Domain is not provided") end

		local domain_addrs = cert_util.resolve_ip(data.name)
		if #domain_addrs == 0 then self:add_critical_error(8, "Invalid domain provided") end

		local found_addr = false
		local ntm = require("vuci.network").init(self.uci)
		for _, iface in ipairs(ntm:get_networks()) do
			if iface:get("area_type") ~= "lan" then
				for _, ip_cidr in ipairs(iface:ipaddrs() or {}) do
					local ip_address = ip_cidr:match("([^/]+)")
					if util.contains(domain_addrs, ip_address) then
						found_addr = true
						break
					end
				end
				for _, ip_cidr in ipairs(iface:ip6addrs() or {}) do
					local ip_address = ip_cidr:match("([^/]+)")
					if util.contains(domain_addrs, ip_address) then
						found_addr = true
						break
					end
				end
			end
		end

		if not found_addr then
			self:add_critical_error(9, "Could not resolve domain to device IP address, make sure domain is pointed to device public IP address")
		end

		local params = {"-t", "letsencrypt"}
		table.insert(params, "-n")
		table.insert(params, util.shellquote(data.name))
		if data.host then
			for _, host in ipairs(data.host) do
				command = command .. " -f " .. host
			end
		end
		if data.renew == "1" then
			table.insert(params, "-a")
			if not cert_util.crontab_entry_exists(renew_cronjob) then cert_util.crontab_add_entry(renew_cronjob) end
		end

		command = "/sbin/tls_generate_lua " .. table.concat(params, " ")
		command_options = { stderr = true }
	elseif data.type == "dh" then
		files_list = {name .. ".pem"}

		local files_exists, file_name = files_exist(files_list, true)
		if files_exists then
			self:add_critical_error(6, "File exists: " .. file_name, "file: " .. file_name)
		end

		local params = {"-t", "dh"}
		cert_util.check_insert(params, "-k", data.key_size)
		cert_util.check_insert(params, "-n", data.name)

		command = "/sbin/tls_generate_lua " .. table.concat(params, " ")
	elseif data.type == "scep" then
		files_list = {
			name ..".cert.pem", name ..".key.pem", "ca-" .. name .. "cert.pem"
		}

		if not data.name or data.name == "" then self:add_critical_error(7, "CN is not provided") end
		if not data.key_size or data.key_size == "" then data.key_size = "2048" end
		if not data.scep_server or data.scep_server == "" then self:add_critical_error(7, "Missing required option: scep_server") end

		local params_generate = {"-t", "scep", "-n", data.name, "-u", data.scep_server, "-k", data.key_size}
		cert_util.check_insert(params_generate, "-up", data.password)
		command = "/sbin/tls_generate_lua " .. table.concat(params_generate, " ")
		local ret = os.execute(command)
		local code = ret / 256
		if code == 10 then self:add_critical_error(10, "Failed to enroll certificate") end
		if code == 7 then self:add_critical_error(7, "Failed to renew certificate") end
		self:ResponseOK(STD_CODES.OK)
	else
		if data.type == "client" or data.type == "server" or data.type == "ca" then
			files_list = {
				name .. ".req.pem", name .. ".key.pem"
			}
			if data.sign then
				table.insert(files_list, name .. ".cert.pem")
			end

			local files_exists, file_name = files_exist(files_list, true)
			if files_exists then
				self:add_critical_error(6, "File exists: " .. file_name, "file: " .. file_name)
			end
		end
		local params = {"-t", data.type}
		cert_util.check_insert(params, "-d", data.days)
		cert_util.check_insert(params, "-k", data.key_size)
		cert_util.check_insert(params, "-n", data.name)
		cert_util.check_insert(params, "-s", data.subject)

		if data.sign == true or data.sign == "1" then
			table.insert(params, "-g")
			if data.type == "client" or data.type == "server" then
				if data.ca == "" or data.ca_key == "" then
					return self:add_critical_error(7, "CA certificate and CA key are required for certificate signing", "ca")
				end
				table.insert(params, "-c")
				table.insert(params, util.shellquote(data.ca))
				table.insert(params, "-v")
				table.insert(params, util.shellquote(data.ca_key))
			end
			if data.delete == true or data.delete == "1" then
				table.insert(params, "-r")
			end
		end

		if data.type == "client" then
			cert_util.check_insert(params, "-p", data.pass)
		end

		command = "/sbin/tls_generate_lua " .. table.concat(params, " ")
	end
	local out = util_tlt.fork_exec(command, command_options)
	if out and out.code == 10 then self:add_critical_error(10, "Failed to enroll certificate") end
	if out and out.code == 7 then self:add_critical_error(7, "Failed to renew certificate") end
	self:ResponseOK(STD_CODES.OK)
end)

	local ce_type = generate:option("type")
		function ce_type:validate(value)
			local types = { "simple", "ca", "server", "client", "dh" }
			if letsencrypt_installed then
				table.insert(types, "letsencrypt")
			end
			if pki_installed then
				table.insert(types, "scep")
			end
			return self.dt:check_array(value, types)
		end

	local host = generate:option("host", { list = true })
		function host:validate(value)
			return self.dt:hostname(value)
		end

	local ip_addr = generate:option("ip_address", { list = true })
	function ip_addr:validate(value)
		return self.dt:ip4addr(value)
	end

	local days = generate:option("days")
		function days:validate(value)
			local data = self.arguments.data or {}
			if util.contains({"scep", "letsencrypt", "simple", "dh"}, data.type) then self:add_error(STD_CODES.INVALID_OPT, "Invalid option", "days") end
			return self.dt:uinteger(value)
		end

	local key_size = generate:option("key_size")
		function key_size:validate(value)
			return self.dt:check_array(value, { "512", "1024", "2048", "4096" })
		end

	local subject = generate:option("subject")
		function subject:validate(value)
			return self.dt:string(value)
		end

	local ca = generate:option("ca")
	function ca:validate(value)
		if not files_exist(value) then return false, "File does not exist" end
		if value:match("%.%./") then return false, "File name can not contain ../" end
		return true
	end

	local ca_key = generate:option("ca_key")
		function ca_key:validate(value)
			if not files_exist(value) then return false, "File does not exist" end
			if value:match("%.%./") then return false, "File name can not contain ../" end
			return true
		end

	local name = generate:option("name")
		name.maxlength = 64
		function name:validate(value)
			local data = self.arguments.data or {}
			if data.type == "letsencrypt" then
				return self.dt:hostname(value)
			end
			if value:match("%.%./") then return false, "File name can not contain ../" end
			return true
		end

	local sign = generate:option("sign")
		function sign:validate(value)
			return self.dt:is_bool(value)
		end

	local delete = generate:option("delete")
		function delete:validate(value)
			return self.dt:is_bool(value)
		end

	local renew = generate:option("renew")
		function renew:validate(value)
			local data = self.arguments.data or {}
			if data.type ~= "letsencrypt" then
				return false, "Renew only allowed for type 'letsencrypt'"
			end
			return self.dt:is_bool(value)
		end

	local pass = generate:option("pass")
		pass.maxlength = 512
		function pass:validate(value)
			return self.dt:credentials_validate(value)
		end

	local scep_server = generate:option("scep_server")
		function scep_server:validate(value)
			return self.dt:protourl(value)
		end

	local password = generate:option("password")
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end


function Certificates:GET_TYPE_ca()
	if self.sid ~= "config" then
		self:add_critical_error(
			STD_CODES.NOT_IMPLEMENTED,
			"Endpoint not implemented.",
			"Request",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	local keys, ca_certs = cert.get_cert_key("ca")
	self:ResponseOK({
		keys = keys,
		certificates = ca_certs
	})
end

function Certificates:GET_TYPE_client()
	if self.sid ~= "config" then
		self:add_critical_error(
			STD_CODES.NOT_IMPLEMENTED,
			"Endpoint not implemented.",
			"Request",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	local keys, client_certs = cert.get_cert_key("client")
	self:ResponseOK({
		keys = keys,
		certificates = client_certs
	})
end
function Certificates:GET_TYPE_server()
	if self.sid ~= "config" then
		self:add_critical_error(
			STD_CODES.NOT_IMPLEMENTED,
			"Endpoint not implemented.",
			"Request",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	local keys, server_certs = cert.get_cert_key("server")
	self:ResponseOK({
		keys = keys,
		certificates = server_certs
	})
end

function Certificates:GET_TYPE_dh()
	if self.sid ~= "config" then
		self:add_critical_error(
			STD_CODES.NOT_IMPLEMENTED,
			"Endpoint not implemented.",
			"Request",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	self:ResponseOK(cert.get_single("dh"))
end

function Certificates:GET_TYPE_keys()
	if self.sid ~= "config" then
		self:add_critical_error(
			STD_CODES.NOT_IMPLEMENTED,
			"Endpoint not implemented.",
			"Request",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	self:ResponseOK(cert.get_single("key"))
end

function Certificates:GET_TYPE_certs()
	if self.sid ~= "config" then
		self:add_critical_error(
			STD_CODES.NOT_IMPLEMENTED,
			"Endpoint not implemented.",
			"Request",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	local cert_list = {}
	for _, cert in pairs(certificates) do
		if cert.timestamp then cert.timestamp = tostring(cert.timestamp) end
		if cert.type == "cert" and cert.cert_type ~= "ca" then
			table.insert(cert_list, cert)
		end
	end
	self:ResponseOK(cert_list)
end

local sign = Certificates:action("sign", function (self)
	local data = self.arguments.data
	if type(data.days) ~= "string" then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Value must be a string",
			"Validation"
		)
	end

	data.name = util.urldecode(data.name)
	local name = data.name:gsub("\\/", ""):gsub("/", "")

	local files_exists, file_name = files_exist(name .. ".cert.pem", true)
	if files_exists then
		self:add_critical_error(6, "File exists: " .. file_name, "file: " .. file_name)
	end

	local params = {
		"-l", "-t", util.shellquote(data.type), "-n", util.shellquote(
			data.name), "-q", util.shellquote(data.req_file),
			"-d", util.shellquote(data.days),
			"-k", util.shellquote(get_cert("req", data.req_file).key_size),
	}
	if data.host then
		for _, host in ipairs(data.host) do
			table.insert(params, "-f")
			table.insert(params, util.shellquote(host))
		end
	end
	if data.ip_address then
		for _, ip_addr in ipairs(data.ip_address) do
			table.insert(params, "-i")
			table.insert(params, util.shellquote(ip_addr))
		end
	end
	if data.type == "ca" then
		table.insert(params, "-y")
		table.insert(params, util.shellquote(data.ca_key))
	else
		if not data.ca or data.ca == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: ca", "ca")
		end
		table.insert(params, "-c")
		table.insert(params, util.shellquote(data.ca))
		table.insert(params, "-v")
		table.insert(params, util.shellquote(data.ca_key))
	end

	if data.delete == true or data.delete == "1" then
		table.insert(params, "-r")
	end

	local free_space, _, err = util_tlt.check_reserved_space(20, util_tlt.get_mount_point(cert_dir))
	if not free_space then
		self:add_critical_error(STD_CODES.NO_SPACE,
			"Certificate signing failed. " .. err,
			"memory")
	end
	local command = "/sbin/tls_generate_lua " .. table.concat(params, " ")
	local ret = os.execute(command)
	if ret == 0 then
		self:ResponseOK(self.arguments.data.name .. " Created and signed successfully.")
	end
	self:ResponseError("Failed to sign certificate.")
end)
	sign:add_option("type", ce_type)
	sign:add_option("name", name)
	sign:add_option("host", host)
	sign:add_option("ip_address", ip_addr)
	sign:add_option("ca_key", ca_key)
	sign:add_option("ca", ca)
	local sign_days = sign:option("days")
		sign_days.require = true
		function sign_days:validate(value)
			if type(value) ~= "string" then
				return false, "Invalid type for days, expected string"
			end
			return self.dt:range(value, 0, 3650)
		end

	local req_file = sign:option("req_file")
		req_file.require = true
		function req_file:validate(value)
			if value:match("%.%./") then return false, "File name can not contain ../" end
			if not get_cert("req", value) then return false, "Certificate request file not found" end
			return true
		end

	local delete = sign:option("delete")
		function delete:validate(value)
			return self.dt:is_bool(value)
		end

function Certificates:UPLOAD_init()
	local function handle_request(upload_request)
		if #upload_request.files > 1 then
			return false, { code = 5, error = "Only uploading a single file is allowed", source = "filename" }
		end

		local file = upload_request.files[1]
		file.location = cert_dir .. file.filename
		if not self.dt:fieldvalidation(file.filename, "^[a-zA-Z0-9-_\\%.%(%)%[%]]+$") then
			return false, {
				code = 4,
				error = "Following characters are accepted for filename: a-zA-Z0-9-_\\.()[]",
				source = "filename"
			}
		end

		local files_exists, file_name = files_exist(file.filename, true)
		if files_exists then
			return false, { code = 3, error = "File exists: " .. file_name, source = "filename" }
		end
		return true
	end

	local function list_files_to_delete()
		return {}
	end

	return { handle_request = handle_request, list_files_to_delete = list_files_to_delete }
end

local function is_certificate_bundle(path)
	local content = fs.readfile(path)
	if not content then
		return false, ""
	end

	local cert_count = 0
	local key_count = 0
	local pattern_cert = "-----BEGIN CERTIFICATE-----"
	local pattern_key = "PRIVATE KEY-----"

	for _ in content:gmatch(pattern_cert) do
		cert_count = cert_count + 1
	end

	for _ in content:gmatch(pattern_key) do
		key_count = key_count + 1
	end

	if cert_count > 0 and key_count > 0 then
		return true, content
	end

	return false, content
end

function Certificates:split_and_process_bundle(path, content)
	local parts = {}
	local info, valid
	local current = ""
	for line in content:gmatch("([^\n]*)\n?") do
		if line ~= "" then
			current = current .. line .. "\n"
			if line:find("^-----END") then
				table.insert(parts, current)
				current = ""
			end
		end
	end
	local base_name = path:match("([^/]+)%.pem$")
	local cert_index, key_index = 1, 1
	for _, part in ipairs(parts) do
		local part_type = part:match("-----BEGIN ([A-Za-z ]+)-----")
		local cert_path = nil
		if part_type and part_type:find("CERTIFICATE") then
			cert_path = string.format("/etc/certificates/%s_cert_%d.pem", base_name, cert_index)
			cert_index = cert_index + 1
		elseif part_type and part_type:find("KEY") then
			cert_path = string.format("/etc/certificates/%s_key_%d.pem", base_name, key_index)
			key_index = key_index + 1
		end
		if cert_path then
			fs.writefile(cert_path, part)
			valid, info, self.messages = cert:validate_cert(cert_path, true)
			if valid ~= 0 then
				return self:add_critical_error(2, "Incorrect file uploaded.", "Upload")
			end
			if self.messages and #self.messages>0 then
				return {message=self.messages[1].message}
			end
			if info then cert.append_cert_to_config(info, true) end
		end
	end
end

function Certificates:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	local is_bundle, content = is_certificate_bundle(path)
	local info, valid
	if is_bundle then
		self:split_and_process_bundle(path, content)
	else
		valid, info, self.messages = cert:validate_cert(path, true)
		if valid ~= 0 then
			return self:add_critical_error(2, "Incorrect file uploaded.", "Upload")
		end
		if info then cert.append_cert_to_config(info, true) end
		if self.messages and #self.messages>0 then
			return {message=self.messages[1].message}
		end
	end
end

local download = Certificates:action("download", function (self)
	local file = self.type
	if not file then
		self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "No file provided.", "Request")
	end
	file = util.urldecode(file)
	if file:match("/") then
		self:ResponseNotFound("Filename can not contain /")
	end
	local cert_info = cert.get_single("key", file)
	local exists, _, tpm = files_exist(file)
	if tpm then
		self:ResponseError("Keys from tpm storage cannot be downloaded")
	end
	if not exists then
		self:ResponseError("Provided file does not exist in the device")
	end
	local root_path = root_ca_dir .. file

	if fs.access(cert_info.path) then
		return self:File(cert_info.path, file, nil, false)
	elseif fs.access(root_path) then
		return self:File(root_path, file, nil, false)
	end

	self:ResponseNotFound("Provided file does not exist in the device")
end)

local function uhttpd_used(cert_info)
	if cert_info and cert_info.services and #cert_info.services > 0 then
		for _, service in ipairs(cert_info.services) do
			if service == "uhttpd:main" then
				return true
			end
		end
	end
	return false
end

local import_tpm2 = Certificates:action("import_tpm2", function (self)
	if not has_tpm then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end
	local key = self.arguments.data.key
	if not key then
		self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "No key provided.", "Request")
	end
	local cert_info = cert.get_single("key", key, true)
	if uhttpd_used(cert_info) then
		return self:ResponseError("Provided key is in use by uhttpd, please stop uhttpd before importing the key")
	end

	local path = cert_dir .. key

	local ret = cert.add_key_to_tpm2(path)
	if ret ~= 0 then
		return self:ResponseError({ status = ret,
		error = "Failed to import key to tpm2 storage" })
	end

	local cert_info = cert.get_single("key", key, has_tpm)
	if cert_info and cert_info.services and #cert_info.services > 0 then
		for _, service in ipairs(cert_info.services) do
			local serv = service:match("^([^:]+)")
			-- propagates config change
			util.ubus("service", "event", { type = "config.change", data = { package = serv } })
		end
	end
	self:ResponseOK(key .. " Imported successfully")
end)
local key = import_tpm2:option("key")
	key.maxlength = 64
	function key:validate(value)
		if not fs.access(cert_dir .. value) then
			return self:ResponseError("Provided file does not exist in the device")
		end
		if value:match("%.%./") then return false, "Key name can not contain ../" end
		return true
	end


function Certificates:GET_TYPE_config()
	if self.sid then
		local section = self.sid
		section = util.urldecode(section)
		if not files_exist(section) then
			self:ResponseError("Provided file does not exist in the device")
		end
		local cert = cert.get_single(_, section)
		local res = cert_util.parse_cert(cert.path)
		if not res then
			self:ResponseError("Only certificates and certificate requests can be viewed.")
		end
		self:ResponseOK(res)
	end
	if has_tpm then
		local include_tpm = self.query_parameters.include_tpm
		if include_tpm then certificates = cert.get_cert_files(include_tpm) end
	end

	local response = {}
	response.generated = certificates
	response.generating = get_generating_list() or {}
	self:ResponseOK(response)
end

function Certificates:DELETE()
	local section = self.sid
	if not section then
		self:add_critical_error(5, "Certificate not provided", "URL")
	end
	section = util.urldecode(section)
	if section:match("/") then
		self:ResponseError("Filename can not contain /")
	end
	local exists, _, tpm = files_exist(section)
	if not exists and not tpm then
		self:ResponseError("Provided file does not exist in the device")
	end
	local cert_info = cert.get_single("key", section, tpm)
	if uhttpd_used(cert_info) then
		self:ResponseError("Provided file is in use by uhttpd, please stop uhttpd before deleting the certificate")
	end
	if get_cert("cert", section, "root_ca") or section == "uhttpd.crt" or section == 'uhttpd.key' then
		self:ResponseError("Provided file can not be deleted")
	end
	if pki_installed then cert_util.scep_cleanup(section) end
	if tpm then
		cert.remove_key_from_tpm2(cert_info.path, true)
	else
		fs.remove(cert_info.path)
		cert.remove_cert_from_config(section, _, _, true)
	end
	if letsencrypt_installed and cert_util.crontab_entry_exists(renew_cronjob) then
		local has_lets_encrypt = false
		for _, cert in ipairs(cert.get_cert_files() or {}) do
			if cert.cert_type == "letsencrypt" then
				has_lets_encrypt = true
				break
			end
		end
		if not has_lets_encrypt then
			cert_util.crontab_remove_entry(renew_cronjob)
		end
	end
	self:ResponseOK({id = section})
end

return Certificates
