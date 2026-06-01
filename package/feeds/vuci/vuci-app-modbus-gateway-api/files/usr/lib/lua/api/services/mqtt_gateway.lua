local ConfigService = require("api/ConfigService")
local certs = require("vuci.certificates")
local util = require("vuci.util")

local MqttModbusGateway = ConfigService:new({ create = false, delete = false })

local s = MqttModbusGateway:section("modbusgateway", "gateway")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = {["1"] = {"host", "port", "message_type", "request", "response", "qos"}}
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local host = s:option("host")
	host.cfg_require = true
		function host:validate(value)
			return self.dt:host(value)
		end

	local port = s:option("port")
	port.cfg_require = true
		function port:validate(value)
			return self.dt:port(value)
		end

	local message_type = s:option("message_type")
		function message_type:validate(value)
			return self.dt:check_array(value, { "ascii", "json" })
		end

	local request = s:option("request")
	request.cfg_require = true
	request.maxlength = 65535
		function request:validate(value)
			return self.dt:string(value)
		end

	local response = s:option("response")
	response.cfg_require = true
	response.maxlength = 65535
		function response:validate(value)
			return self.dt:string(value)
		end

	local qos = s:option("qos")
		function qos:validate(value)
			return self.dt:check_array(value, { "0", "1", "2" })
		end

	local user = s:option("user")
	user.maxlength = 512
		function user:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local password = s:option("pass", { sensitive = true })
	password.maxlength = 512
		function password:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local client_id = s:option("client_id")
	client_id.maxlength = 64
		function client_id:validate(value)
			return self.dt:mqtt_client_id(value)
		end

	local keep_alive = s:option("keepalive")
		function keep_alive:validate(value)
			return self.dt:uinteger(value)
		end

	local tls = s:option("tls")
	tls.require = { ["1"] = { "tls_type" } }
		function tls:validate(value)
			return self.dt:is_bool(value)
		end

	local tls_type = s:option("tls_type")
	tls_type.require = { ["cert"] = { "cafile" } }
		function tls_type:validate(value)
			local tls_type_options = { "cert", "psk" }
			return self.dt:check_array(value, tls_type_options)
		end

	local psk = s:option("psk", { sensitive = true })
	psk.maxlength = 512
		function psk:validate(value)
			return self.dt:credentials_validate(value)
		end

	local identity = s:option("identity")
	identity.maxlength = 255
		function identity:validate(value)
			return self.dt:uciname(value)
		end

	local tls_insecure = s:option("tls_insecure")
		function tls_insecure:validate(value)
			return self.dt:is_bool(value)
		end

	local device_files = s:option("device_files")
		function device_files:validate(value)
			return self.dt:is_bool(value)
		end

	local ca = s:option("cafile", { file = true })

	local cert = s:option("certfile", { file = true })

	local key = s:option("keyfile", { file = true })

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function MqttModbusGateway:GET_TYPE_status()
	local res = {}

	local gateway_status = util.ubus("mqtt-modbus-gateway", "status")
	if gateway_status then
		res = gateway_status
		local enabled_gateways = {}
		local serial_gateway_statuses = {}
		for _, serial_gateway in pairs(gateway_status.serial_gateways) do
			serial_gateway_statuses[serial_gateway.id] = serial_gateway
		end
		self:table_foreach(self.main_config, "rtu_device", function(_s)
			if _s.enabled == "1" and serial_gateway_statuses[_s[".name"]] then
				table.insert(enabled_gateways, serial_gateway_statuses[_s[".name"]])
			end
		end)
		res.serial_gateways = enabled_gateways
	end

	return self:ResponseOK(res)
end

-- End of status

function MqttModbusGateway:UPLOAD_after_upload_hook(upload_request)
	local v_table = upload_request.parameters
	local path = upload_request.files[1].location

	if v_table.option == "cafile" or v_table.option == "certfile" or v_table.option == "keyfile" then
		local valid = certs:validate_cert(path)
		if valid ~= 0 then os.remove(path) end
		if valid == 1 then self:add_critical_error(2, "Incorrect file uploaded.", "Upload") end
		if valid == 2 then self:add_critical_error(4, "File does not exist.", "Upload") end
	end
	util.set_file_permissions(path, "mqtt_modbus_gateway")
	return { path = path }
end

return MqttModbusGateway
