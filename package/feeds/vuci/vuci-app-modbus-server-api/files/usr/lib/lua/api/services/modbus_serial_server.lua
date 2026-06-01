local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local fs = require("nixio.fs")
local util = require("vuci.util")
local board = require("vuci.board")

local ModbusSerialServer = ConfigService:new({ increment_name = true })

if not serial:check_device_serial() then
	return nil
end

ModbusSerialServer.ERROR_CODES = {
	FILE_IS_DIR_ERR = 3,
	FILE_READ_ERR = 4,
	FILE_USED_ERR = 5,
	DIR_ERR = 6
}

local s = ModbusSerialServer:section("modbus_server", "rtu_device")
function s:create_defaults()
	return {
		device_id = "1"
	}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "name", "device", "baudrate", "databits", "stopbits", "parity", "flowcontrol" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function enabled:set(val)
			self:add_overlap_message()
			self:modbus_serial_set(self.api_key, val)
		end

	local name = s:option("name")
	name.cfg_require = true
	name.maxlength = 200

	local device_id = s:option("device_id")
	device_id.cfg_require = true
		function device_id:validate(value)
			return self.dt:irange(value, 0, 255)
		end

	local baudrate = s:option("baudrate")
		function baudrate:validate(value)
			local serial_device = self:modbus_serial_get_abs("device")
			return self.dt:check_array(value, serial:get_baudrates(serial_device))
		end

	local databits = s:option("databits")
		function databits:validate(value)
			local serial_device = self:modbus_serial_get_abs("device")
			return self.dt:check_array(value, serial:get_databits(serial_device))
		end

	local stopbits = s:option("stopbits")
		function stopbits:validate(value)
			local serial_device = self:modbus_serial_get_abs("device")
			return self.dt:check_array(value, serial:get_stopbits(serial_device))
		end

	local parity = s:option("parity")
		function parity:validate(value)
			local serial_device = self:modbus_serial_get_abs("device")
			return self.dt:check_array(value, serial:get_parity(serial_device))
		end

	local flow_control = s:option("flowcontrol")
		function flow_control:validate(value)
			local validated_opts = serial:validate_flowcontrol(self)
			return self.dt:check_array(value, validated_opts)
		end

	local custom_reg_block = s:option("clientregs")
	custom_reg_block.require = { ["1"] = { "regfile", "regfilestart", "regfilesize" }}
		function custom_reg_block:validate(value)
			return self.dt:is_bool(value)
		end

	local broadcasts = s:option("broadcasts")
		function broadcasts:validate(value)
			return self.dt:is_bool(value)
		end

		function custom_reg_block:set(value)
			self:add_overlap_message()
			self:table_set(self.config, self.sid, "clientregs", value)
		end

	local reg_file_path = s:option("regfile")
		function reg_file_path:validate(value)
			-- TSWOS doesn't have users, so we can't prevent overwriting files owned by other users
			local prevent_overwrite = not board:is_switch()

			if not value:match("^/") then
				return false, "Absolute file path must be provided (must start with /).", 3
			end

			local is_valid, err, err_code = self.dt:posix_path(value, "reg", true, prevent_overwrite, 533)
			if not is_valid then
				return false, err, err_code
			end

			value = ModbusSerialServer:adjust_path(value)

			local regfile = self:modbus_serial_get(self.api_key)
			local actual_path = value:gsub("^/var", "/tmp")
			if regfile and (regfile:gsub("^/var", "/tmp") == actual_path) then -- checks if path strings matches or are symlinked
				return true
			end

			local duplicate_regfile_instance
			self:table_foreach(self.main_config, "rtu_device", function(_s)
				if _s[".name"] ~= self.sid and _s.regfile and _s.regfile:gsub("^/var", "/tmp") == actual_path then
					duplicate_regfile_instance = _s.name
					return false
				end
			end)
			if self:table_get(self.main_config, "modbus", "regfile") == actual_path then
				duplicate_regfile_instance = "modbus"
			end
			if duplicate_regfile_instance then
				return false, string.format("Provided file path is already used by '%s' Modbus TCP/Serial server instance.", duplicate_regfile_instance)
			end

			return self.dt:posix_path(value, "reg", true, prevent_overwrite, 533)
		end
		function reg_file_path:set(value)
			if value == "" then
				local regfile = self:modbus_serial_get(self.api_key)
				if regfile then
					if not regfile:match("^/usr/local/share/modbus") then
						regfile = ModbusSerialServer:adjust_path(regfile)
					end
					os.remove(regfile)
				end
			else
				value = ModbusSerialServer:adjust_path(value)
			end
			self:modbus_serial_set(self.api_key, value)
		end
		function reg_file_path:get()
			local value = self:modbus_serial_get(self.api_key)
			if self:modbus_serial_get_abs("clientregs") == "1" then
				if value and value:match("^/usr/local/share/modbus") then
					value = value:gsub("^/usr/local/share/modbus", "")
				end
				return value
			end
		end

	local first_reg_no = s:option("regfilestart")
		function first_reg_no:validate(value)
			local start_reg = board:is_switch() and 10000 or 1025
			return self.dt:irange(value, start_reg, 65536)
		end
		function first_reg_no:get(value)
			if self:modbus_serial_get_abs("clientregs") == "1" then
				return value
			end
		end

	local reg_count = s:option("regfilesize")
		function reg_count:validate(value)
			return self.dt:irange(value, 1, 64512)
		end
		function reg_count:get(value)
			if self:modbus_serial_get_abs("clientregs") == "1" then
				return value
			end
		end

	local serial_device = s:option("device")
	serial_device.cfg_require = true
		function serial_device:validate(value)
			if type(value) == "string" and value:find("rs485") then
				if self:modbus_serial_get_abs("device") == value then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	serial.append_duplex_option(s)

	if not board:is_switch() then
		local mobile_data_type = s:option("md_data_type")
			function mobile_data_type:validate(value)
				return self.dt:irange(value, 0, 2)
			end
	end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function ModbusSerialServer:DELETE_before_section_delete_hook()
	local regfile = self:modbus_serial_get_abs("regfile")
	if regfile and fs.stat(regfile) then
		os.remove(regfile)
	end
end

-- STATUS

function ModbusSerialServer:GET_TYPE_status()
	local res = {}

	local modbus_service = util.ubus("service", "list", { name = "modbus_server" })
	if modbus_service and modbus_service.modbus_server and modbus_service.modbus_server.instances then
		local instances_by_device = {}
		for _, instance in pairs(modbus_service.modbus_server.instances) do
			instance.exit_code = instance.exit_code ~= 0 and instance.exit_code or nil
			instances_by_device[instance.command[3]] = instance
		end
		self:table_foreach(self.main_config, "rtu_device", function(_s)
			if _s.enabled == "1" then
				local sid = _s[".name"]
				local status = util.ubus("modbus_server." .. sid, "status") or {}
				status.error_code = instances_by_device[sid] and instances_by_device[sid].exit_code
				status.section = sid
				table.insert(res, status)
			end
		end)
	end

	return self:ResponseOK(res)
end

-- End of status

function ModbusSerialServer:modbus_serial_get(key)
	return self:table_get(self.main_config, self.sid, key)
end

function ModbusSerialServer:modbus_serial_get_abs(key)
	return self:get_abs_value(self.main_config, self.sid, key)
end

function ModbusSerialServer:modbus_serial_set(key, value)
	return self:table_set(self.main_config, self.sid, key, value)
end

function ModbusSerialServer:modbus_tcp_get_abs(key)
	return self:get_abs_value(self.main_config, "modbus", key)
end

function ModbusSerialServer:modbus_tcp_get(key)
	return self:table_get(self.main_config, "modbus", key)
end

function ModbusSerialServer:modbus_tcp_set(key, value)
	return self:table_set(self.main_config, "modbus", key, value)
end

function ModbusSerialServer:adjust_path(path)
	if not path:match("^/tmp") and not path:match("^/mnt") and not path:match("^/var") then
		return "/usr/local/share/modbus" .. path
	end
	return path
end

function ModbusSerialServer:validate_file_exist(path)
	local stat = fs.stat(path)
	if stat then
		if stat.type == "dir" then return false, "Provided path is a directory.", self.ERROR_CODES.FILE_IS_DIR_ERR end
		return false, "File already exists.", self.ERROR_CODES.FILE_USED_ERR
	end
	return true
end

function ModbusSerialServer:PUT_validate_hook()
	local regfile_counter = {}
	for _, section in ipairs(self.arguments.data) do
		local opt_regfile = self:get_abs_value(self.main_config, section.id, "regfile")
		if type(opt_regfile) == "string" then
			opt_regfile = opt_regfile:gsub("^/var", "/tmp") -- symlinked dirs
			if regfile_counter[opt_regfile] == 1 then
				self:add_error(STD_CODES.INVALID_OPT, "Instances cannot share the same regfile '" .. opt_regfile .. "' path", "Validation")
			end
			regfile_counter[opt_regfile] = (regfile_counter[opt_regfile] or 0) + 1
		end
	end
end

function ModbusSerialServer:POST_validate_section_hook()
	local device = self.current_data_block["device"]
	serial:handle_duplex(self)
	serial:assert_device_is_available(self, device)
end

function ModbusSerialServer:PUT_validate_section_hook()
	local device = self:modbus_serial_get_abs("device")
	serial:handle_duplex(self)
	serial:assert_device_is_available(self, device)
	if type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end
end

function ModbusSerialServer:add_overlap_message()
	if not board:is_switch() then return end

	if self:modbus_serial_get_abs("clientregs") == "1" and self:modbus_serial_get_abs("enabled") == "1" then
		self:add_message(1, "Enabled custom register block may cause register overlapping in data sources.")
	end
end

return ModbusSerialServer
