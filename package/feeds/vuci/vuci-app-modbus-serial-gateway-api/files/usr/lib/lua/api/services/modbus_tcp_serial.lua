local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local util = require("vuci.util")
local firewall_lib = require("api.network.firewall.firewall_lib")

local ModbusTcpOverSerial = ConfigService:new({ increment_name = true })

if not serial:check_device_serial() then
	return nil
end

local s = ModbusTcpOverSerial:section("rs_modbus", "modbus")
function s:create_defaults()
	return {
		enabled = "0",
		broadcasts = "1"
	}
end

function ModbusTcpOverSerial:validate_single_server_id(value)
	if (value == "0" and self:get_abs_value(self.main_config, self.sid, "broadcasts") == "1" ) then
		return false, "Server ID 0 is not allowed when broadcasts are enabled"
	end
	return self.dt:irange(value, 0, 247)
end

function ModbusTcpOverSerial:validate_server_id_range(value)
	local range_start, range_end = value:match("^(.+)%-(.+)$")
	if not range_start or not range_end then
		return false, "Specified range is incorrect"
	end

	local valid, msg = self:validate_single_server_id(range_start)
	if not valid then return false, msg end

	valid, msg = self:validate_single_server_id(range_end)
	if not valid then return false, msg end

	if tonumber(range_start) > tonumber(range_end) then
		return false, "Range start can't be larger than the end"
	end

	return true
end

function ModbusTcpOverSerial:validate_multi_server_id(value)
	for _, range_or_single in ipairs(util.split(value, ",")) do
		local valid, msg
		if range_or_single:find("-") then
			valid, msg = self:validate_server_id_range(range_or_single)
		else
			valid, msg = self:validate_single_server_id(range_or_single)
		end
		if not valid then return false, msg end
	end

	return true
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { 
		["1"] = { "device", "baudrate", "databits", "stopbits", "parity", "flowcontrol", "modbus_ip", "modbus_port", "server_id_config" }
	}
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

	local modbus_ip = s:option("modbus_ip")
		function modbus_ip:validate(value)
			return self.dt:ip4addr(value)
		end

	local modbus_port = s:option("modbus_port")
		function modbus_port:validate(value)
			return self.dt:port(value)
		end
		
	local timeout = s:option("timeout")
		function timeout:validate(value)
			return self.dt:irange(value, 1, 60)
		end

	local broadcasts = s:option("broadcasts")
		function broadcasts:validate(value)
			return self.dt:is_bool(value)
		end

	local server_id_config = s:option("server_id_config")
	server_id_config.require = {
		single = {"single_server_id"},
		multiple = {"multi_server_id"},
	}
		function server_id_config:validate(value)
			local server_id_config_options = { "single", "multiple" }
			return self.dt:check_array(value, server_id_config_options)
		end

	local single_server_id = s:option("single_server_id")
		function single_server_id:validate(value)
			return self:validate_single_server_id(value)
		end

	local multi_server_id = s:option("multi_server_id")
		function multi_server_id:validate(value)
			return self:validate_multi_server_id(value)
		end

	local crc_verification = s:option("crc_enabled")
	crc_verification.require = { ["1"] = { "crc_repeat" } }
		function crc_verification:validate(value)
			return self.dt:is_bool(value)
		end

	serial.append_duplex_option(s)

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

	local crc_repeat = s:option("crc_repeat")
		function crc_repeat:validate(value)
			return self.dt:range(value, 0, 3)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function ModbusTcpOverSerial:GET_TYPE_status()
	local res = {}

	local rs_modbus_service = util.ubus("service", "list", { name = "rs_modbus" })
	if rs_modbus_service and rs_modbus_service.rs_modbus and rs_modbus_service.rs_modbus.instances then
		local instances_by_device = {}
		for _, instance in pairs(rs_modbus_service.rs_modbus.instances) do
			instance.exit_code = instance.exit_code ~= 0 and instance.exit_code or nil
			instances_by_device[instance.command[3]] = instance
		end
		self:table_foreach(self.main_config, "modbus", function(_s)
			if _s.enabled == "1" then
				local sid = _s[".name"]
				local status = util.ubus("modbus-tcp-over-serial." .. sid, "status") or {}
				status.error_code = instances_by_device[sid] and instances_by_device[sid].exit_code
				status.section = sid
				table.insert(res, status)
			end
		end)
	end

	return self:ResponseOK(res)
end

-- End of status

function ModbusTcpOverSerial:list_modbus_rules()
	return firewall_lib:list_rules(self, "modbusgwd", self.sid)
end

function ModbusTcpOverSerial:POST_validate_section_hook()
	local device = self.current_data_block["device"]
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
end

function ModbusTcpOverSerial:PUT_validate_section_hook()
	local device = self:get_abs_value(self.main_config, self.sid, "device")
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
	if type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end
end

function ModbusTcpOverSerial:update_zones()
	local is_enabled = self:get_abs_value(self.main_config, self.sid, "enabled") or "0"
	local dest_port = self:get_abs_value(self.main_config, self.sid, "modbus_port")

	for _, rule in ipairs(self:list_modbus_rules()) do
		self:table_set("firewall", rule, "enabled", is_enabled)
		if dest_port then
			self:table_set("firewall", rule, "dest_port", dest_port)
		end
	end
end

ModbusTcpOverSerial.PUT_before_commit_hook = ModbusTcpOverSerial.update_zones
ModbusTcpOverSerial.POST_before_commit_hook = ModbusTcpOverSerial.update_zones

function ModbusTcpOverSerial:DELETE_before_section_delete_hook()
	for _, rule in ipairs(self:list_modbus_rules()) do
		self:table_delete("firewall", rule)
	end
end

return ModbusTcpOverSerial
