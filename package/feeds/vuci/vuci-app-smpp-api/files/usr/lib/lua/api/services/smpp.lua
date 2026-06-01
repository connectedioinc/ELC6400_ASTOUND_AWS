local ConfigService = require("api/ConfigService")
local mdm = require("vuci.modem")
local util = require("vuci.util")
local all_modems = mdm:get_all_modems()

local smpp = ConfigService:new({ create = false, delete = false })

local s = smpp:section("smpp", "smpp")

local enabled

function smpp:PUT_validate_section_hook()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled") or ""
	if opt_enabled == "1" then
		local required_options = {"username", "password", "port"}
		if #all_modems > 1 then
			table.insert(required_options, "modem")
		end
		local use_tls_ssl = self:get_abs_value(self.config, self.sid, "use_tls_ssl")
		if use_tls_ssl and use_tls_ssl == "1" then
			table.insert(required_options, "tls_ciphers")
			table.insert(required_options, "tls_crt")
			table.insert(required_options, "tls_key")
		end
		enabled.require = {["1"] = required_options}
	end
end
	enabled = s:option("enabled")
		function enabled:validate(value) return self.dt:is_bool(value) end

	local username = s:option("username")
		username.maxlength = 15
		function username:validate(value) return self.dt:credentials_validate(value) end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 8
		function password:validate(value) return self.dt:credentials_validate(value) end

	local port = s:option("port")
		function port:validate(value) return self.dt:port(value) end

	local modem = s:option("modem")
		function modem:validate(value)
			return self.dt:check_modem(value)
		end

	local timeout = s:option("timeout")
	function timeout:validate(value)
		return self.dt:irange(value, 1, 500)
	end

	local use_tls_ssl = s:option("use_tls_ssl")
	function use_tls_ssl:validate(value)
		return self.dt:is_bool(value)
	end

	local cert_from_device = s:option("device_files")
	function cert_from_device:validate(value)
		return self.dt:is_bool(value)
	end

	function cert_from_device:set(value)
		self:table_set(self.config, self.sid, "_device_files", value)
	end

	function cert_from_device:get()
		return self:table_get(self.config, self.sid, "_device_files")
	end

	s:option("tls_ciphers", {
		certificate = {
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			failsafe = true
		}
	})

	s:option("tls_crt", {
		certificate = {
			cert_types = { "certificates" },
			failsafe = true
		}
	})

	s:option("tls_key", {
		certificate = {
			cert_types = { "keys" },
			failsafe = true
		}
	})

function smpp:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "smppd")
	return { path = path }
end

return smpp

