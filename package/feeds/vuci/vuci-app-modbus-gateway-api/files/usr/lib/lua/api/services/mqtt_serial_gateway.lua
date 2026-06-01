local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")

local MqttModbusSerialGateway = ConfigService:new()

if not serial:check_device_serial() then
	return nil
end

local s = MqttModbusSerialGateway:section("modbusgateway", "rtu_device")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "device", "baudrate", "databits", "stopbits", "parity", "flowcontrol" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local baudrate = s:option("baudrate")
		function baudrate:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_baudrates(serial_device))
		end

	local databits = s:option("databits")
		function databits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_databits(serial_device))
		end

	local stopbits = s:option("stopbits")
		function stopbits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_stopbits(serial_device))
		end

	local parity = s:option("parity")
		function parity:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_parity(serial_device))
		end

	local flow_control = s:option("flowcontrol")
		function flow_control:validate(value)
			local validated_opts = serial:validate_flowcontrol(self)
			return self.dt:check_array(value, validated_opts)
		end

	local serial_device = s:option("device")
		function serial_device:validate(value)
			if type(value) == "string" and value:find("usb") then
				if self:table_find(self.config, "rtu_device", { device = value }) then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	serial.append_duplex_option(s)

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function MqttModbusSerialGateway:POST_validate_section_hook()
	local device = self.current_data_block["device"]
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
end

function MqttModbusSerialGateway:PUT_validate_section_hook()
	local device = self:get_abs_value(self.main_config, self.sid, "device")

	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
	if type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end
end

return MqttModbusSerialGateway
