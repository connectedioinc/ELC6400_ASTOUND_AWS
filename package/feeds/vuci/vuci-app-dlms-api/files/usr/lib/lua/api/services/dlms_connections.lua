local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local util = require("vuci.util")
local dlms_utils = require("api.services.dlms_utils")
local DLMS = ConfigService:new({ increment_name = true })

local CONNECTION_TYPE = {
	TCP = "0",
	SERIAL = "1"
}

DLMS.ERROR_CODES = {
	SERIAL_UNAVAILABLE = 1,
	SERIAL_DISCONNECTED = 2
}

local s = DLMS:section("dlms_client", "connection")

function s:create_defaults()
	if self.current_data_block["connection_type"] == CONNECTION_TYPE.SERIAL then
		return {
			device = serial:get_devices(true)[1],
			enabled = "0",
			timeout = "1500",
			baudrate = "9600",
			databits = "8",
			stopbits = "1",
			parity = "none",
			flowcontrol = "none"
		}
	end

	return {}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "name", "connection_type" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 200
	function name:validate(value)
		return self.dt:default_validation(value)
	end
	local address = s:option("address")
		function address:validate(value)
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type ~= CONNECTION_TYPE.TCP then
				return false, "Connection type must be TCP"
			end
			return self.dt:ipaddr(value)
		end
	local port = s:option("port")
		function port:validate(value)
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type ~= CONNECTION_TYPE.TCP then
				return false, "Connection type must be TCP"
			end
			return self.dt:port(value)
		end

	local persistent = s:option("persistent")
		function persistent:validate(value)
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type == CONNECTION_TYPE.SERIAL then
				return false, "Cannot use TCP options with serial connection"
			end
			return self.dt:is_bool(value)
		end

	local baudrate = s:option("baudrate")
		function baudrate:validate(value)
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type == CONNECTION_TYPE.TCP then
				return false, "Cannot use serial options with TCP connection"
			end
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			local allowed_values = serial:get_baudrates(serial_device)
			if (#allowed_values == 0) then return false, "There are no allowed values, check if your serial device is available" end
			return self.dt:check_array(value, allowed_values)
		end

	local databits = s:option("databits")
		function databits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type == CONNECTION_TYPE.TCP then
				return false, "Cannot use serial options with TCP connection"
			end
			local allowed_values = serial:get_databits(serial_device)
			if (#allowed_values == 0) then return false, "There are no allowed values, check if your serial device is available" end
			return self.dt:check_array(value, allowed_values)
		end

	local stopbits = s:option("stopbits")
		function stopbits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type == CONNECTION_TYPE.TCP  then
				return false, "Cannot use serial options with TCP connection"
			end
			local allowed_values = serial:get_stopbits(serial_device)
			if (#allowed_values == 0) then return false, "There are no allowed values, check if your serial device is available" end
			return self.dt:check_array(value, allowed_values)
		end

	local parity = s:option("parity")
		function parity:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type == CONNECTION_TYPE.TCP then
				return false, "Cannot use serial options with TCP connection"
			end
			local allowed_values = serial:get_parity(serial_device)
			if (#allowed_values == 0) then return false, "There are no allowed values, check if your serial device is available" end
			return self.dt:check_array(value, allowed_values)
		end

	local flow_control = s:option("flowcontrol")
		function flow_control:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type == CONNECTION_TYPE.TCP then
				return false, "Cannot use serial options with TCP connection"
			end
			local allowed_values = serial:get_flowcontrol(serial_device)
			if (#allowed_values == 0) then return false, "There are no allowed values, check if your serial device is available" end
			local validated_opts = serial:validate_flowcontrol(self)
			return self.dt:check_array(value, validated_opts)
		end
	serial.append_duplex_option(s, "dlms")

	local connection_type = s:option("connection_type")
	connection_type.require = { [CONNECTION_TYPE.TCP] = { "address", "port" } }
		function connection_type:validate(value)
			return self.dt:check_array(value, { CONNECTION_TYPE.TCP, CONNECTION_TYPE.SERIAL })
		end

	local device = s:option("device")
		function device:validate(value)
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type == CONNECTION_TYPE.TCP then
				return false, "Cannot use serial options with TCP connection"
			end
			if value:find("usb") then
				if self:table_get(self.config, self.sid, "device") == value then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	local timeout = s:option("timeout")
		function timeout:validate(value)
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type ~= CONNECTION_TYPE.SERIAL then
				return false, "Cannot use serial options with TCP connection"
			end
			return self.dt:irange(value, 0, 4294967295)
		end

		-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------



	function DLMS:list_physical_devices(connection_id)
		local devices = {}
		self:table_foreach(self.main_config, "physical_device", function(r)
			if r.connection == connection_id then
				table.insert(devices, r)
			end
		end)
		return devices
	end

	function DLMS:assert_unique_adresss_and_port()
		local address = self:get_abs_value(self.config, self.sid, "address")
		local port = self:get_abs_value(self.config, self.sid, "port")
		local ip_port = {}
		self:table_foreach("dlms_client", "connection", function(config)
			if not (config.address and config.port) then return end
			if config.connection_type ~= CONNECTION_TYPE.TCP then return end

			local key = config.address..":"..config.port
			if ip_port[key] then
				self:add_critical_error(
					STD_CODES.INVALID_OPT,
					"Current address and port combination is already used in another connection.",
					"Validation"
				)
			end
			ip_port[key] = true
			if address and port then
				local incomming_key = address..":"..port
				if key == incomming_key and self.sid ~= config[".name"] then
					if ip_port[incomming_key] then
							self:add_critical_error(
								STD_CODES.INVALID_OPT,
								"Current address and port combination is already used in another connection.",
								"Validation"
							)
					end
				end
			end
		end)
	end

	function DLMS:POST_before_commit_hook()
		self:assert_unique_adresss_and_port()
	end

	function DLMS:PUT_after_validate_section_hook()
		self:assert_unique_adresss_and_port()

		-- When switching from "serial" to "tcp", you need to update all associated
		-- physical devices to use "HDLC" instead of "HDLC with mode E".
		local config = self.t_func:get_uci_config(self.main_config)
		local curr_conn_type = config[self.sid].connection_type
		local new_conn_type = self.current_data_block.connection_type
		if curr_conn_type == CONNECTION_TYPE.SERIAL and new_conn_type == CONNECTION_TYPE.TCP then
			for _, physical_device in ipairs(self:list_physical_devices(self.sid)) do
				if physical_device.interface == dlms_utils.INTERFACE_TYPE.HDLCWITHMODEE then
					self:table_set(self.main_config, physical_device[".name"], "interface", dlms_utils.INTERFACE_TYPE.HDLC)
				end
			end
		end

		local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
		if connection_type ~= CONNECTION_TYPE.TCP then
			self:table_delete(self.main_config, self.sid, "port")
			self:table_delete(self.main_config, self.sid, "address")
		end
	end

	function DLMS:POST_validate_hook()
		local interfaces = 0
		self:table_foreach("dlms_client", "connection", function (_)
			interfaces = interfaces + 1
		end)
		if interfaces >= 30 then
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 30 instances are allowed")
		end
	end

	function DLMS:POST_validate_section_hook()
		local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
		if connection_type == CONNECTION_TYPE.SERIAL then
			serial:handle_duplex(self)
			local device = self.current_data_block["device"]
			if type(device) == "string" then
				serial:assert_device_is_available(self, device)
			end
		end
	end

	function DLMS:PUT_validate_section_hook()
		local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
		local device = self:get_abs_value(self.main_config, self.sid, "device")
		if connection_type == CONNECTION_TYPE.SERIAL and device and type(device) == "string" then
			serial:handle_duplex(self)

			serial:assert_device_is_available(self, device)
			if device:find("usb") then
				serial:assert_device_is_connected(self, device)
			end
		end
	end

	function DLMS:DELETE_before_section_delete_hook()
		self:table_foreach(self.main_config, "physical_device", function(d)
			if self.sid == d.connection then
				self:table_delete(self.config, d[".name"], "connection")
				self:table_foreach(self.main_config, "cosem", function(r)
					if r.physical_device then
						for opt, val in pairs(r.physical_device) do
							if val == d[".name"] then
								self:add_critical_error(STD_CODES.INVALID_SECTION, "Connection with a physical device that is in use cannot be deleted.")
							end
						end
					end
				end)
			end
		end)
	end

return DLMS
