local util = require("vuci.util")
local nixio = require("nixio")
local fs = require("nixio.fs")
local cert = require("vuci.certificates")

local cert_utils = {}

function cert_utils.crontab_entry_exists(entry, scep)
	local current_crontab = util.file_exec("/usr/bin/crontab", { "-l" })
	if not current_crontab or not current_crontab.stdout then
		return false
	end
	for line in current_crontab.stdout:gmatch("[^\r\n]+") do
		if (scep and string.find(line, entry, nil, true)) or (not scep and line == entry) then
			return true
		end
	end
	return false
end

function cert_utils.crontab_add_entry(entry)
	local current_crontab = (util.file_exec("/usr/bin/crontab", { "-l" }) or {}).stdout or ""
	current_crontab = current_crontab .. entry .. "\n"
	local temp_file = os.tmpname()
	fs.writefile(temp_file, current_crontab)
	local result = util.file_exec("/usr/bin/crontab", { temp_file })
	fs.remove(temp_file)
	if not result or result.code ~= 0 then
		return false
	end
	return true
end

function cert_utils.crontab_remove_entry(entry, scep)
	local current_crontab = util.file_exec("/usr/bin/crontab", { "-l" })
	if not current_crontab or not current_crontab.stdout then
		return false
	end
	local lines = {}
	for line in current_crontab.stdout:gmatch("[^\r\n]+") do
		if (scep and not string.find(line, entry, nil, true)) or (not scep and line ~= entry) then
			table.insert(lines, line)
		end
	end
	local temp_file = os.tmpname()
	fs.writefile(temp_file, #lines > 0 and (table.concat(lines, "\n") .. "\n") or "")
	local result = util.file_exec("/usr/bin/crontab", { temp_file })
	fs.remove(temp_file)
	if not result or result.code ~= 0 then
		return false
	end
	return true
end

function cert_utils.check_insert(params_table, prefix , option)
	if option then
		if prefix then
			table.insert(params_table, prefix)
		end
		table.insert(params_table, util.shellquote(option))
	end
end

function cert_utils.resolve_ip(domain)
	local info = nixio.getaddrinfo(domain, "any")
	local addr = {}
	if not info then return addr end
	for _, v in pairs(info) do
		if v.address then
			table.insert(addr, v.address)
		end
	end
	return addr
end

function cert_utils.scep_cleanup(section)
	local data = cert.get_single(_, section, "scep")

	if not data.path or data.path == "" then return end
	local enroll_dir = "/etc/certificates/cert-enroll/"
	local symlink = fs.readlink(data.path)
	if symlink then fs.remove(symlink) end
	if string.sub(data.fullname, 1, 3) == "ca-" then
		local filename = data.fullname:match("^ca%-(.-)%.cert%.pem$")
		for file in fs.glob(enroll_dir .. filename .. "-ca*.pem") do
			fs.remove(file)
		end
		for file in fs.glob(enroll_dir .. filename .. "-ra*.pem") do
			fs.remove(file)
		end
	end
	data.fullname = data.fullname:gsub("`", "\\`")
	data.fullname = data.fullname:gsub("'", "\\'")
	data.fullname = data.fullname:gsub('"', '\\"')
	local fqdn = data.fullname
	for _, ext in ipairs({"%.cert%.pem$", "%.key%.pem$"}) do
		fqdn = fqdn:gsub(ext, "")
	end
	local crontab_entry = "FQDN=" .. fqdn .. " "
	if cert_utils.crontab_entry_exists(crontab_entry, true) then
		cert_utils.crontab_remove_entry(crontab_entry, true)
	end
end

function cert_utils.parse_cert(cert_path)
	local cert_info = {}
	local file_out = {}
	file_out = cert.execute_openssl({
	        "x509", "-in", cert_path, "-text", "-noout",
	        "-nameopt", "sep_multiline,-space_eq",
	        "-certopt", "no_header,no_version,no_pubkey,no_sigdump"
	})

	if not file_out or not file_out.stdout then
		file_out = cert.execute_openssl({
		       "req", "-in", cert_path, "-text", "-noout",
		       "-nameopt", "sep_multiline,-space_eq"
		})
		if not file_out or not file_out.stdout then
			return nil
		end
	end

	local function extract_info(pattern)
		return string.match(file_out.stdout, pattern)
	end

	-- Subject Fields
	cert_info.country = extract_info("C%s*=%s*([^\n]+)")
	cert_info.state = extract_info("ST%s*=%s*([^\n]+)")
	cert_info.locality = extract_info("L%s*=%s*([^\n]+)")
	cert_info.organization = extract_info("O%s*=%s*([^\n]+)")
	cert_info.organizational_unit = extract_info("OU%s*=%s*([^\n]+)")
	cert_info.common_name = extract_info("CN%s*=%s*([^\n]+)")
	cert_info.email = extract_info("emailAddress%s*=%s*([^\n]+)")

	-- Validity Period
	cert_info.valid_from = extract_info("Not Before%s*:%s*([^\n]+)")
	cert_info.valid_to = extract_info("Not After%s*:%s*([^\n]+)")

	-- Fingerprints & Security Features
	cert_info.fingerprint = extract_info("SHA256 Fingerprint%s*=%s*([^\n]+)")

	-- X509v3 Extensions
	cert_info.basic_constraints = extract_info("X509v3 Basic Constraints:%s*\n%s*CA:%s*([^\n]+)")
	cert_info.key_usage = extract_info("X509v3 Key Usage:%s*\n%s*([^\n]+)")
	cert_info.subject_key_identifier = extract_info("X509v3 Subject Key Identifier:%s*\n%s*([%x:]+)")
	cert_info.authority_key_identifier = extract_info("X509v3 Authority Key Identifier:%s*\n%s*keyid:%s*([%x:]+)")

	for k, v in pairs(cert_info) do
	   	cert_info[k] = v:gsub("%s+$", ""):gsub("^%s+", "")
		if v == "" or v =="''" then
			cert_info[k] = nil
		end
	end

	return cert_info
end

return cert_utils
