local modbus_utils = require("vuci.modbus_utils")
local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")

if not serial:check_device_serial() then
	return nil
end

local ModbusSerialClient = ConfigService:new({ increment_name = true })

local s = ModbusSerialClient:section("modbus_client", "rtu_device")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "name", "device", "baudrate", "databits", "stopbits", "parity", "flowcontrol" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local baudrate = s:option("baudrate")
		function baudrate:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_baudrates(device))
		end

	local databits = s:option("databits")
		function databits:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_databits(device))
		end

	local parity = s:option("parity")
		function parity:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_parity(device))
		end

	local stop_bits = s:option("stopbits")
		function stop_bits:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_stopbits(device))
		end

	local flow_control = s:option("flowcontrol")
		function flow_control:validate(value)
			local validated_opts = serial:validate_flowcontrol(self)
			return self.dt:check_array(value, validated_opts)
		end

	local serial_device = s:option("device")
	serial_device.cfg_require = true
		function serial_device:validate(value)
			if type(value) == "string" and value:find("rs485") then
				if self:table_get(self.config, self.sid, "device") == value then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	local name = s:option("name")
	name.cfg_require = true
	name.maxlength = 200
		function name:validate(value)
			local found
			self:table_foreach(self.main_config, "rtu_device", function(c)
				if value == c.name and c[".name"] ~= self.sid then found = true end
			end)
			if found then return false, "Name is already used." end
			return self.dt:default_validation(value)
		end

	serial.append_duplex_option(s)

	local switch_server_delay = s:option("inter_device_delay")
		function switch_server_delay:validate(value)
			return self.dt:irange(value, 0, 1000)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function ModbusSerialClient:POST_validate_section_hook()
	local device = self.current_data_block["device"]
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
end

function ModbusSerialClient:PUT_validate_section_hook()
	local device = self:get_abs_value(self.main_config, self.sid, "device")
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
	if type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end
end

function ModbusSerialClient:DELETE_before_section_delete_hook()
	modbus_utils:cleanup_client(self, self.sid)
end

return ModbusSerialClient
