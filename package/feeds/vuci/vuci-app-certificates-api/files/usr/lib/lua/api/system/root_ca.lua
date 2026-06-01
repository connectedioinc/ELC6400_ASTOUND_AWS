local FunctionService = require("api/FunctionService")
local fs = require("nixio.fs")
local certs = require("vuci.certificates")
local util = require("vuci.util")

local RootCA = FunctionService:new()

function RootCA:GET_TYPE_config()
	if not fs.access("/etc/cacert.pem") then return self:ResponseNotFound("Root CA not found.") end
	local root_ca = fs.readfile("/etc/cacert.pem")
	return self:ResponseOK({ root_ca = root_ca })
end

function RootCA:PUT()
	if not self.arguments.data then
		self:add_critical_error(STD_CODES.INVALID_STRUCT, "Invalid PUT structure, data field is missing", "Validation")
	end
	for key, _ in pairs(self.arguments.data) do
		if key ~= "root_ca" then
			self:add_critical_error(
				STD_CODES.INVALID_OPT,
				"Invalid option",
				key
			)
		end
	end
	if not self.arguments.data.root_ca then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: [root_ca]", "Request", HTTP_STATUS_CODES.BAD_REQUEST)
	end
	if type(self.arguments.data.root_ca) ~= "string" then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Value must be a string",
			"Validation"
		)
	end
	if not fs.access("/etc/cacert.pem") then return self:ResponseNotFound("Root CA not found.") end
	fs.writefile("/etc/cacert.pem", self.arguments.data.root_ca)
	util.set_file_permissions("/etc/cacert.pem", "certificates", 660)
	local root_ca = fs.readfile("/etc/cacert.pem")
	return self:ResponseOK({ root_ca = root_ca })
end

function RootCA:reset()
	if fs.access("/etc/cacert.pem") then
		fs.copy("/rom/etc/ssl/certs/ca-certificates.crt", "/etc/ssl/certs/ca-certificates.crt")
		util.set_file_permissions("/etc/ssl/certs/ca-certificates.crt", "certificates", 660)
		local root_ca = fs.readfile("/etc/cacert.pem")
		return self:ResponseOK({ root_ca = root_ca })
	else
		return self:ResponseNotFound("Root CA not found.")
	end
end

RootCA:action("reset", RootCA.reset)

function RootCA:select_root_ca()
	if fs.access("/etc/cacert.pem") then
		fs.copy(self.arguments.data.certificate, "/etc/cacert.pem")
		util.set_file_permissions("/etc/cacert.pem", "certificates", 660)
		local root_ca = fs.readfile("/etc/cacert.pem")
		return self:ResponseOK({ root_ca = root_ca })
	else
		return self:ResponseNotFound("Root CA not found.")
	end
end

local change = RootCA:action("change", RootCA.select_root_ca)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local certificate = change:option("certificate")
	certificate.require = true
		function certificate:validate(value)
			local cert_dir = "/etc/certificates/"
			local ca_certs = {}
			local ca_info = certs:get_certificates("ca").data.certificates
			for _, single_cert in pairs(ca_info) do
				if fs.access(cert_dir .. single_cert.fullname) then
					table.insert(ca_certs, cert_dir .. single_cert.fullname)
				end
			end
			return self.dt:check_array(value, ca_certs)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function RootCA:UPLOAD_init()
	local function handle_request(upload_request)
		local check_file_size = fs.readfile("/etc/cacert.pem") ~= fs.readfile("/rom/etc/ssl/certs/ca-certificates.crt")

		for _, file in ipairs(upload_request.files) do
			file.location = "/etc/cacert.pem"

			if check_file_size and file.size > 1024 * 10 then
				return self:get_file_upload_too_large_error()
			end
		end

		return true
	end

	return { handle_request = handle_request }
end

function RootCA:UPLOAD_after_upload_hook(upload_request)
	if #upload_request.files == 1 then
		util.set_file_permissions(upload_request.files[1].location, "certificates", 660)
		return { path = upload_request.files[1].location }
	else
		local paths = {}
		for _, file in ipairs(upload_request) do
			util.set_file_permissions(file.location, "certificates", 660)
			table.insert(paths, file.location)
		end
		return { path = paths }
	end
end

return RootCA
