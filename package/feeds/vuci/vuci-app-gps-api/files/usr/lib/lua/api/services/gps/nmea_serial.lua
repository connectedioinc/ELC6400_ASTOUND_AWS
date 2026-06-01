local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local serial = require("vuci.serial")

if not board:has_gps() or not board:has_serial() then
	return nil
end

local GPS = ConfigService:new({ increment_name = true })

local NMEASerialPorts = GPS:section("gps", "serial_port")

function GPS:get_serial_device()
	return self:get_abs_value(self.config, self.sid, "device")
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = NMEASerialPorts:option("enabled")
	enabled.require = { ["1"] = { "name", "device" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = NMEASerialPorts:option("name")
	name.maxlength = 200
		function name:validate(value)
			return self.dt:default_validation(value)
		end

	local flow_control = NMEASerialPorts:option("flowcontrol")
		function flow_control:validate(value)
			local validated_opts = serial:validate_flowcontrol(self)
			return self.dt:check_array(value, validated_opts)
		end

	local device = NMEASerialPorts:option("device")
		function device:validate(value)
			if type(value) == "string" and value:find("usb") then
				if self:table_find(self.config, self.sid, { device = value }) then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	local stopbits = NMEASerialPorts:option("stopbits")
		function stopbits:validate(value)
			return self.dt:check_array(value, serial:get_stopbits(self:get_serial_device()))
		end

	local databits = NMEASerialPorts:option("databits")
		function databits:validate(value)
			return self.dt:check_array(value, serial:get_databits(self:get_serial_device()))
		end

	local baudrate = NMEASerialPorts:option("baudrate")
		function baudrate:validate(value)
			return self.dt:check_array(value, serial:get_baudrates(self:get_serial_device()))
		end

	local parity = NMEASerialPorts:option("parity")
		function parity:validate(value)
			return self.dt:check_array(value, serial:get_parity(self:get_serial_device()))
		end

	serial.append_duplex_option(NMEASerialPorts)

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function NMEASerialPorts:POST_validate_hook()
	local ports = self:table_count(self.config, self.section_type)
	if ports >= 8 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 8 instances are allowed")
	end
end

function NMEASerialPorts:POST_validate_section_hook()
	local device = self.current_data_block["device"]
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
end

function NMEASerialPorts:PUT_validate_section_hook()
	local device = self:get_serial_device()

	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
	if type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end
end

return NMEASerialPorts