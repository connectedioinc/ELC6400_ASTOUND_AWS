local board = require("vuci.board")
if not board:has_serial() then
	return nil
end

local ConfigService = require("api.ConfigService")
local serial = require("vuci.serial")

local SerialDevices = ConfigService:new({ increment_name = true })

local s = SerialDevices:section("iec60870_client", "serial_device")
do
	local opt_name = s:option("name")
	function opt_name:validate(value)
		return self.dt:string(value)
	end

	local opt_enabled = s:option("enabled")
	opt_enabled.require = {
		["1"] = { "balanced", "device", "baudrate", "databits", "stopbits", "parity", "flowcontrol" }
	}
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_balanced = s:option("balanced")
		function opt_balanced:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_device = s:option("device")
		function opt_device:validate(value)
			if value:find("usb") then
				if self:table_get(self.config, self.sid, "device") == value then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	local opt_baudrate = s:option("baudrate")
		function opt_baudrate:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_baudrates(serial_device))
		end

	local opt_databits = s:option("databits")
		function opt_databits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_databits(serial_device))
		end

	local opt_stopbits = s:option("stopbits")
		function opt_stopbits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_stopbits(serial_device))
		end

	local opt_parity = s:option("parity")
		function opt_parity:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_parity(serial_device))
		end

	local opt_flow_control = s:option("flowcontrol")
		function opt_flow_control:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_flowcontrol(serial_device))
		end

	serial.append_duplex_option(s)
end

return SerialDevices
