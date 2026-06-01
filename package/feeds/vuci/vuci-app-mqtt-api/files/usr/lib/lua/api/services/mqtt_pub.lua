local ConfigService = require("api/ConfigService")
local all_modems = require("vuci.modem"):get_all_modems()
local util = require("vuci.util")
local tls_type

local flags = {
	delete = false,
	create = false
}

local mqtt = ConfigService:new(flags)
function mqtt:filter(s)
	return s[".name"] == "mqtt_pub"
end

local enabled

function mqtt:PUT_validate_section_hook()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if opt_enabled and opt_enabled == "1" then
		local required_options = {"remote_addr", "remote_port"}
		local tls = self:get_abs_value(self.config, self.sid, "tls")
		if tls and tls == "1" then
			table.insert(required_options, "tls_type")
			local tls_type = self:get_abs_value(self.config, self.sid, "tls_type")
			if tls_type and tls_type == "psk" then
				table.insert(required_options, "identity")
				local opt_psk = self:get_abs_value(self.config, self.sid, "psk")
				if not opt_psk or opt_psk == "" then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: psk", "enabled")
				end
			elseif tls_type and tls_type == "cert" then
				table.insert(required_options, "cafile")
			end
		end
		if all_modems and #all_modems > 1 then
			table.insert(required_options, "modem_id")
		end
		enabled.require = {["1"] = required_options}
	end
end

local s = mqtt:section("mqtt_pub", "mqtt_pub")

	enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local _device_files = s:option("device_files")
		function _device_files:validate(value)
			return self.dt:is_bool(value)
		end
		function _device_files:set(value)
			self:table_set(self.config, self.sid, "_device_files", value)
		end
		function _device_files:get()
			return self:table_get(self.config, self.sid, "_device_files")
		end

	local remote_addr = s:option("remote_addr")
		function remote_addr:validate(value)
			return self.dt:host(value)
		end

	local remote_port = s:option("remote_port")
		function remote_port:validate(value)
			return self.dt:port(value)
		end

	local client_id = s:option("client_id")
	client_id.maxlength = 64
		function client_id:validate(value)
			return self.dt:mqtt_client_id(value)
		end

	local username = s:option("username")
		username.maxlength = 512
		function username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 512
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local tls = s:option("tls")
		function tls:validate(value)
			return self.dt:is_bool(value)
		end

	local tls_type = s:option("tls_type")
		function tls_type:validate(value)
			return self.dt:check_array(value, {"cert", "psk"})
		end

	local tls_insecure = s:option("tls_insecure")
		function tls_insecure:validate(value)
			return self.dt:is_bool(value)
		end

	s:option("cafile", {
		certificate = {
			service = "mqtt_pub",
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			failsafe = true
		}
	})

	s:option("certfile", { 
		certificate = {
			service = "mqtt_pub",
			cert_types = { "certificates" },
			failsafe = true
		}
	})

	s:option("keyfile", { 
		certificate = {
			service = "mqtt_pub",
			cert_types = { "keys" },
			failsafe = true
		}
	})

	local psk = s:option("psk", { sensitive = true })
		psk.maxlength = 128
		function psk:validate(value)
			return self.dt:hexstring(value)
		end

	local identity = s:option("identity")
		identity.maxlength = 128
		function identity:validate(value)
			return self.dt:uciname(value)
		end

	local pub_prefix = s:option("pub_prefix")
		function pub_prefix:validate(value)
			if value:match("[#+]") then
				return false, "Values with '#' or '+' are not accepted."
			end
			return self.dt:string(value)
		end

	local sub_prefix = s:option("sub_prefix")
		function sub_prefix:validate(value)
			return self.dt:string(value)
		end

	local modem_id = s:option("modem_id")
		function modem_id:validate(value)
			return self.dt:check_modem(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function mqtt:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "mqtt_pub")
	return { path = path }
end

return mqtt
