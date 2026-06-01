local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local util = require("vuci.util")

local Dnp3SerialOutstation = ConfigService:new({ increment_name = true })

if not serial:check_device_serial() then
	return nil
end

local s = Dnp3SerialOutstation:section("dnp3_outstation", "dnp3_serial_outstation")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "device", "baudrate", "databits", "stopbits", "parity", "flowcontrol" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 200

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

	local local_address = s:option("local_addr")
		function local_address:validate(value)
			return self.dt:irange(value, 0, 65519)
		end

	local remote_address = s:option("remote_addr")
		function remote_address:validate(value)
			return self.dt:irange(value, 0, 65519)
		end

	local unsolicited_enabled = s:option("unsolicited_enabled")
		function unsolicited_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local serial_device = s:option("device")
	serial_device.cfg_require = true
		function serial_device:validate(value)
			if type(value) == "string" and value:find("usb") then
				if self:table_get(self.config, self.sid, "device") == value then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	serial.append_duplex_option(s)

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function Dnp3SerialOutstation:GET_TYPE_status()
	local res = {}

	local dnp3_status = util.ubus("dnp3_outstation", "status")
	if dnp3_status then
		res.uptime = dnp3_status.uptime
		res.servers = {}
		local server_statuses = {}
		for _, server_status in pairs(dnp3_status.servers) do
			server_statuses[server_status.id] = server_status
		end
		self:table_foreach(self.main_config, "dnp3_serial_outstation", function(_s)
			if _s.enabled == "1" and server_statuses[_s[".name"]] then
				table.insert(res.servers, server_statuses[_s[".name"]])
			end
		end)
	end

	return self:ResponseOK(res)
end

-- End of status

function Dnp3SerialOutstation:POST_validate_section_hook()
	local device = self.current_data_block.device
	serial:handle_duplex(self)
	serial:assert_device_is_available(self, device)
end

function Dnp3SerialOutstation:PUT_validate_section_hook()
	local device = self:get_abs_value(self.main_config, self.sid, "device")
	serial:handle_duplex(self)
	serial:assert_device_is_available(self, device)
	if type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end
end

function Dnp3SerialOutstation:UPDATE_before_commit_hook()
	local local_address_lookup = {}
    self:table_foreach(self.config, "dnp3_serial_outstation", function(config)
		if not (config.device and config.local_addr) then return end

		local key = config.device..":"..config.local_addr
		if local_address_lookup[key] then
			self:add_critical_error(
				STD_CODES.INVALID_STRUCT,
				("Current Local Address already set in the same layer."):format(),
				"Validation"
			)
		end
		local_address_lookup[key] = true
	end)
end
Dnp3SerialOutstation.POST_before_commit_hook = Dnp3SerialOutstation.UPDATE_before_commit_hook
Dnp3SerialOutstation.PUT_before_commit_hook = Dnp3SerialOutstation.UPDATE_before_commit_hook

return Dnp3SerialOutstation
