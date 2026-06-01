local io = require("vuci.io")
local uci = require("vuci.uci")
local util = require "vuci.util"
local board = require("vuci.board")
local dt = require("api.Validations")
local sqlite = require("vuci.sqlite")
local usb_mod = require("vuci/usb")
local universal_gateway_utils = require("vuci.universal_gateway_utils")

local FUNCTION = {
	READ_COILS = '1',
	READ_INPUT_COILS = '2',
	READ_HOLDING_REGISTERS = '3',
	READ_INPUT_REGISTERS = '4',
	WRITE_SINGLE_COIL = '5',
	WRITE_SINGLE_REGISTER = '6',
	WRITE_MULTIPLE_COILS = '15',
	WRITE_MULTIPLE_REGISTERS = '16'
}

local DATA_TYPES_METADATA = {
	["8bit_int"]             = { bit_size = 8 , number_type = "int"   },
	["8bit_uint"]            = { bit_size = 8 , number_type = "uint"  },
	["16bit_int_hi_first"]   = { bit_size = 16, number_type = "int"   },
	["16bit_int_low_first"]  = { bit_size = 16, number_type = "int"   },
	["16bit_uint_hi_first"]  = { bit_size = 16, number_type = "uint"  },
	["16bit_uint_low_first"] = { bit_size = 16, number_type = "uint"  },
	["32bit_int1234"]        = { bit_size = 32, number_type = "int"   },
	["32bit_int4321"]        = { bit_size = 32, number_type = "int"   },
	["32bit_int2143"]        = { bit_size = 32, number_type = "int"   },
	["32bit_int3412"]        = { bit_size = 32, number_type = "int"   },
	["32bit_uint1234"]       = { bit_size = 32, number_type = "uint"  },
	["32bit_uint4321"]       = { bit_size = 32, number_type = "uint"  },
	["32bit_uint2143"]       = { bit_size = 32, number_type = "uint"  },
	["32bit_uint3412"]       = { bit_size = 32, number_type = "uint"  },
	["32bit_float1234"]      = { bit_size = 32, number_type = "float" },
	["32bit_float4321"]      = { bit_size = 32, number_type = "float" },
	["32bit_float2143"]      = { bit_size = 32, number_type = "float" },
	["32bit_float3412"]      = { bit_size = 32, number_type = "float" },
	["64bit_int12345678"]    = { bit_size = 64, number_type = "int" },
	["64bit_int87654321"]    = { bit_size = 64, number_type = "int" },
	["64bit_int21436587"]    = { bit_size = 64, number_type = "int" },
	["64bit_int78563412"]    = { bit_size = 64, number_type = "int" },
	["64bit_uint12345678"]   = { bit_size = 64, number_type = "uint" },
	["64bit_uint87654321"]   = { bit_size = 64, number_type = "uint" },
	["64bit_uint21436587"]   = { bit_size = 64, number_type = "uint" },
	["64bit_uint78563412"]   = { bit_size = 64, number_type = "uint" },
	["64bit_double12345678"] = { bit_size = 64, number_type = "float" },
	["64bit_double87654321"] = { bit_size = 64, number_type = "float" },
	["64bit_double21436587"] = { bit_size = 64, number_type = "float" },
	["64bit_double78563412"] = { bit_size = 64, number_type = "float" },
	["ascii"]                = { bit_size = 8 },
	["hex"]                  = { bit_size = 8 },
	["bool"]                 = { bit_size = 1 },
	["pdu"]                  = { }
}

local m = {
	conditions = {
		"1", -- More than
		"2", -- Less than
		"4", -- Equal to
		"8", -- Not Equal to
		"16", -- Less or equal
		"32", -- More or equal
	},
	read_functions = {
		FUNCTION.READ_COILS,
		FUNCTION.READ_INPUT_COILS,
		FUNCTION.READ_HOLDING_REGISTERS,
		FUNCTION.READ_INPUT_REGISTERS,
	},
	write_functions = {
		FUNCTION.WRITE_SINGLE_COIL,
		FUNCTION.WRITE_SINGLE_REGISTER,
		FUNCTION.WRITE_MULTIPLE_COILS,
		FUNCTION.WRITE_MULTIPLE_REGISTERS,
	}
}

-- for backwards compatibility
local LEGACY_PATH_MAP = {
	-- legacy = current
	["/tmp/modbus_db"] = "/var/run/modbus_client/modbus.db",
	["/usr/local/share/modbus_db"] = "/usr/local/share/modbus_client/modbus_db"
}

local ALARM_ACTION = {
	SMS        = "0",
	IO         = "1",
	MODBUS     = "2",
	MQTT       = "3",
	UBUS_EVENT = "4",
	EMAIL      = "5",
}

m.ALARM_ACTION = ALARM_ACTION

local UBUS_STATUS_TIMEOUT = 7

m.TEST_ERROR = {
	TIMEOUT = 1,
	UNKNOWN = 2
}

local function is_read_function(func)
	return func == FUNCTION.READ_COILS or
		func == FUNCTION.READ_INPUT_COILS or
		func == FUNCTION.READ_HOLDING_REGISTERS or
		func == FUNCTION.READ_INPUT_REGISTERS
end

function m:get_data_types(f_code, incldue_pdu)
	incldue_pdu = incldue_pdu or false
	local data_types = {}

	if f_code == FUNCTION.WRITE_SINGLE_COIL then
		table.insert(data_types, "bool")
	elseif f_code == FUNCTION.WRITE_SINGLE_REGISTER then
		for name, metadata in pairs(DATA_TYPES_METADATA) do
			if metadata.bit_size and metadata.bit_size <= 16 then
				table.insert(data_types, name)
			end
		end
	else
		for name, _ in pairs(DATA_TYPES_METADATA) do
			if name ~= "pdu" then
				table.insert(data_types, name)
			end
		end

		if is_read_function(f_code) and incldue_pdu then
			table.insert(data_types, "pdu")
		end
	end

	table.sort(data_types)

	return data_types
end

function m:get_all_functions()
	local functions = {}
	for _, function_code in pairs(FUNCTION) do
		table.insert(functions, function_code)
	end
	return functions
end

---@param value string
---@param number_type string
---@param bit_size number
local function validate_number(value, number_type, bit_size)
	local error_msg = "Provided value '%s' is not %s."

	if number_type == "int" then
		if bit_size == 8 then
			return dt:irange(value, -128, 127), error_msg:format(value, "8bit int")
		elseif bit_size == 16 then
			return dt:irange(value, -32768, 32767), error_msg:format(value, "16bit int")
		elseif bit_size == 32 then
			return dt:irange(value, -2147483648, 2147483647), error_msg:format(value, "32bit int")
		elseif bit_size == 64 then
			return dt:integer64(value)
		end
	elseif number_type == "uint" then
		if bit_size == 8 then
			return dt:irange(value, 0, 255), error_msg:format(value, "8bit uint")
		elseif bit_size == 16 then
			return dt:irange(value, 0, 65535), error_msg:format(value, "16bit uint")
		elseif bit_size == 32 then
			return dt:irange(value, 0, 4294967295), error_msg:format(value, "32bit uint")
		elseif bit_size == 64 then
			return dt:uinteger64(value)
		end
	elseif number_type == "float" then
		local parsed = tonumber(value)
		local is_valid = parsed ~= nil and math.abs(parsed) ~= math.huge
		return is_valid, error_msg:format(value, "32bit float")
	end

	return false, "Invalid number data type"
end

---@param data_type string
---@param value string
function m:validate_write_value(data_type, value)
	if data_type == "bool" then
		return dt:is_bool(value)
	elseif data_type == "ascii" then
		local _, count = value:gsub("\\u00[a-fA-F0-9][a-fA-F0-9]", "") -- Count escaped hex \u0000 - \u00FF
		local length = #value + count
		return length <= 250, "Only 250 characters are allowed"
	elseif data_type == "hex" then
		if #value ~= 2 then
			return false, "Only hex values are accepted. E.g. FF."
		end
		return dt:hexstring(value)
	end

	local metadata = DATA_TYPES_METADATA[data_type]
	if metadata and metadata.bit_size and metadata.number_type then
		return validate_number(value, metadata.number_type, metadata.bit_size)
	end

	return false, ("Validation for type '%s' not found."):format(data_type)
end

local function split_by_whitespace(text)
	local values = {}
	for val in text:gmatch("[^%s]+") do
		table.insert(values, val)
	end
	return values
end

---@param data_type string
---@param value string
---@param max_registers number
function m:validate_write_multiple(data_type, value, max_registers)
	if data_type == "ascii" then
		return self:validate_write_value(data_type, value)
	end

	local parts = split_by_whitespace(value)

	local metadata = DATA_TYPES_METADATA[data_type]
	if metadata and metadata.bit_size then
		local max_length = math.floor((max_registers * 16) / metadata.bit_size)
		if #parts > max_length then
			return false, ("Maximum numbers of values is %s for '%s' type."):format(max_length, data_type)
		end
	end

	for _, part in ipairs(parts) do
		local ok, err = self:validate_write_value(data_type, part)
		if not ok then return ok, err end
	end

	if #parts == 0 then
		return false, ("Minimum numbers of values is 1 for '%s' type."):format(data_type)
	end

	return true
end

---@param func string?
---@param value string
---@param data_type string?
function m:validate_value(func, value, data_type)
	if type(func) ~= "string" then
		return false, "Function is not set."
	end

	if func == FUNCTION.READ_COILS or func == FUNCTION.READ_INPUT_COILS then
		return dt:irange(value, 1, 2000)
	end
	if func == FUNCTION.READ_INPUT_REGISTERS or func == FUNCTION.READ_HOLDING_REGISTERS then
		return dt:irange(value, 1, 125)
	end

	-- Everything below needs data_type
	if type(data_type) ~= "string" then
		return false, "data_type is not set."
	end

	if func == FUNCTION.WRITE_SINGLE_COIL then
		if data_type ~= "bool" then
			return false, "Function 5 accepts only bool data_types."
		end
		return self:validate_write_value(data_type, value)
	end
	if func == FUNCTION.WRITE_SINGLE_REGISTER then
		return self:validate_write_multiple(data_type, value, 1)
	end
	if func == FUNCTION.WRITE_MULTIPLE_REGISTERS or func == FUNCTION.WRITE_MULTIPLE_COILS then
		return self:validate_write_multiple(data_type, value, 125)
	end

	return false, ("Function '%s' not found."):format(func)
end

---@param func string?
---@param value string
---@param data_type string?
function m:validate_alarm_value(func, value, data_type)
	if type(func) ~= "string" then
		return false, "Function is not set."
	end
	if type(data_type) ~= "string" then
		return false, "Data type is not set."
	end
	if is_read_function(func) then
		return self:validate_write_multiple(data_type, value, 125)
	end
	return false, ("Function '%s' not found."):format(func)
end

function m:validate_schedule(schedule)
	if not schedule:find("*") then
		return dt:timehhmmss(schedule)
	end

	local parts = util.split(schedule, ":")
	if #parts ~= 3 then return false, "Time of format hh:mm:ss is accepted." end

	local value_ranges = { {"Hours: ", 0, 23}, {"Minutes: ", 0, 59}, {"Seconds: ", 0, 59} }

	local valid, err
	for i = 1, 3 do
		local part = parts[i]
		if part ~= "*" then
			local value_range = value_ranges[i]
			local prefix = value_range[1]
			valid = part:match("%d%d")
			if not valid then
				return false, "Time of format hh:mm:ss is accepted."
			end

			-- Remove leading zero,
			-- because the `:range()` does not allow having them
			part = part:gsub("^0", "")

			local min = value_range[2]
			local max = value_range[3]
			valid, err = dt:range(part, min, max)
			if not valid then
				return false, prefix .. err
			end
		end
	end

	return true
end

local main_config = "modbus_client"

local function delete_sections_by_type(service, section_type)
	service:table_foreach(main_config, section_type, function(c)
		service:table_delete(main_config, c[".name"])
	end)
end

function m:cleanup_client(service, id)
	service:table_foreach(main_config, "rtu_server", function(c)
		if c["rtu_device"] == id then
			m:cleanup_server(service, c[".name"])
			service:table_delete(main_config, c[".name"])
		end
	end)
end

function m:cleanup_server(service, id)
	delete_sections_by_type(service, "register_" .. id)
	delete_sections_by_type(service, "alarm_" .. id)
	delete_sections_by_type(service, "request_" .. id)
end

function m:fetch_io_output_options()
	if self.io_output_options then return self.io_output_options end

	self.io_output_options = {}
	local io_info = io:ioman_info()
	if not io_info then return {} end

	for _, single_pin in ipairs(io_info) do
		if single_pin.direction == "out" or single_pin.type == "relay" then
			table.insert(self.io_output_options, single_pin.name)
		end
	end

	return self.io_output_options
end

function m:get_alarm_action_options()
	local available = { ALARM_ACTION.MQTT, ALARM_ACTION.MODBUS, ALARM_ACTION.UBUS_EVENT, ALARM_ACTION.EMAIL }

	if board:has_mobile() then
		table.insert(available, ALARM_ACTION.SMS)
	end
	if board:has_ios() and #self:fetch_io_output_options() > 0 then
		table.insert(available, ALARM_ACTION.IO)
	end

	return available
end

function m:fetch_modem_options()
	if self.modem_options then return self.modem_options end

	self.modem_options = {}
	local mdm = require("vuci.modem")
	local modem_list = mdm:get_all_modems()
	for _, modems_value in pairs(modem_list) do
		for single_key, single_value in pairs(modems_value) do
			if single_key == 'id' then
				self.modem_options[#self.modem_options + 1] = single_value
			end
		end
	end

	return self.modem_options
end

--- Converts paths between legacy and current. If no change is needed, provided path will be returned
---@param path string
---@param to_legacy? boolean to convert from current path to legacy
function m:convert_legacy_path(path, to_legacy)
	if to_legacy then
		for legacy_path, current_path in pairs(LEGACY_PATH_MAP) do
			if path == current_path then
				return legacy_path
			end
		end

		return path
	end

	return LEGACY_PATH_MAP[path] or path
end

--- Returns paths. To fix legacy hard-coded paths use convert_legacy_path function
---@return table paths paths (static and dynamic)
function m:available_db_paths()
	local paths = {"/tmp/modbus_db", "/usr/local/share/modbus_db"}

	if board:has_sd() or board:has_usb() then
		for _, mountpoint in pairs(usb_mod:mount_points()) do
			table.insert(paths, mountpoint .. "/modbus_db")
		end
	end

	return paths
end

--- Returns path. To fix legacy hard-coded paths use convert_legacy_path function
function m:get_db_path()
	return uci:get("modbus_client", "main", "db_path") or "/tmp/modbus_db"
end

function m:list_db(options)
	options = options or {}
	assert(type(options) == "table")
	assert(type(options.db_path) == "string")

	local db = sqlite.database({
		path = options.db_path
	})

	local where = {
		id = options.id,
		request_id = options.request_id,
		server_id = options.server_id,
		request_name = options.request_name,
		server_name = options.server_name,
	}

	local where_clause = sqlite.create_where_clause(where)
	local total = db:row_count("modbus_data", where_clause, where)

	local entries = {}
	local rows = db:select_paginated(
		"SELECT * FROM modbus_data " .. where_clause,
		where,
		options.limit,
		options.offset
	)
	for _, row in ipairs(rows) do
		table.insert(entries, {
			id = tostring(row.id),
			timestamp = tostring(row.time),
			server_name = row.server_name,
			request_name = row.request_name,
			request_id = row.request_id,
			server_id = row.server_id,
			data = row.response_data,
		})
	end

	return entries, total
end

function m:send_tcp_test(client_config, request_config)
	local result, err = util.ubus("modbus_client.rpc", "tcp.test", {
		-- Client config
		id = tonumber(client_config.server_id),
		timeout = tonumber(client_config.timeout),
		ip = client_config.dev_ipaddr,
		port = client_config.port,
		delay = tonumber(client_config.delay),

		-- Request config
		["function"] = tonumber(request_config["function"]),
		first_reg = tonumber(request_config.first_reg),
		reg_count = request_config.reg_count,
		data_type = request_config.data_type,
		no_brackets = tonumber(request_config.no_brackets),
		broadcast = tonumber(request_config.broadcast) or 0,
	}, 10 * 60)
	if err == UBUS_STATUS_TIMEOUT or err == 255 then
		return nil, m.TEST_ERROR.TIMEOUT
	end

	if not result then
		return nil, m.TEST_ERROR.UNKNOWN
	end

	return result
end

function m:send_serial_test(serial_device_config, client_config, request_config)
	local result, err = util.ubus("modbus_client.rpc", "serial.test", {
		-- Client config
		id = tonumber(client_config.server_id),
		timeout = tonumber(client_config.timeout),

		-- Serial device config
		serial_type  = serial_device_config.device,
		baudrate     = tonumber(serial_device_config.baudrate),
		databits     = tonumber(serial_device_config.databits),
		stopbits     = tonumber(serial_device_config.stopbits),
		parity       = serial_device_config.parity,
		flowcontrol  = serial_device_config.flowcontrol,

		-- Request config
		["function"] = tonumber(request_config["function"]),
		first_reg = tonumber(request_config.first_reg),
		reg_count = request_config.reg_count,
		data_type = request_config.data_type,
		no_brackets = tonumber(request_config.no_brackets),
		broadcast = tonumber(request_config.broadcast) or 0,
	}, 10 * 60)

	if err == UBUS_STATUS_TIMEOUT or err == 255 then
		return nil, m.TEST_ERROR.TIMEOUT
	end

	if not result then
		return nil, m.TEST_ERROR.UNKNOWN
	end

	return result
end

function m:test_error_code_to_string(err)
	if err == nil then
		return
	end

	if err == m.TEST_ERROR.TIMEOUT then
		return "Timeout"
	else
		return "Unknown"
	end
end

function m:is_tolerance_applicable(function_code, data_type, store_on_change)
	local valid_data_types = { "8bit", "16bit", "32bit", "64bit" }

	if store_on_change ~= "1" then
		return false, "Store on change is not enabled."
	end

	if not is_read_function(function_code) then
		return false, "Function is not a read function."
	end

	for _, valid_type in ipairs(valid_data_types) do
		if data_type:find(valid_type) then
			return true
		end
	end

	return false, "Data type is not applicable for tolerance."
end

function m:validate_tolerance_value(data_type, tolerance_value)
	if data_type:find("float") or data_type:find("double") then
		return dt:ufloat(tolerance_value)
	elseif data_type:find("int") then
		return dt:uinteger(tolerance_value)
	end

	return false, "Data type is not applicable for tolerance."
end

--------------------------------------------------START OF Modbus Tag utils---------------------------------------------------------------------------

local MB_FUNCTION_BYTES = {
	['1'] = 0.125,
	['2'] = 0.125,
	['3'] = 2,
	['4'] = 2,
	['5'] = 0.125,
	['6'] = 2,
	['15'] = 0.125,
	['16'] = 2,
}
local TAG_ERR_CODES = {
	OVERLAPPING = 10,
}
local REGISTER_NUMBER_RANGE = {1025, 65536}

---@param section table section object
---@return boolean
function m.has_ethernet_server(section)
	return section.modbus_dev_config == "modbus"
end

---@param service table section instance
function m.validate_tag_size(service)
	local opt_tag_type = service:get_abs_value(service.config, service.sid, "tag_type")
	if universal_gateway_utils.is_tag_size_fixed(opt_tag_type) then return end

	local opt_tag_size = service:get_abs_value(service.config, service.sid, "tag_size")
	local opt_modbus_type = service:get_abs_value(service.config, service.sid, "modbus_type")
	if not opt_tag_size or not MB_FUNCTION_BYTES[opt_modbus_type] then return end

	local total_size_of_registers = MB_FUNCTION_BYTES[opt_modbus_type] * (REGISTER_NUMBER_RANGE[2] - REGISTER_NUMBER_RANGE[1] + 1)
	local valid, msg = service.dt:irange(opt_tag_size, 1, total_size_of_registers)
	if not valid then
		service:add_error(STD_CODES.INVALID_OPT, msg, "tag_size")
	end
end

---@param service table section instance
function m.validate_modbus_reg_num(service)
	local tag_bytes = universal_gateway_utils.get_tag_bytes(service)
	local opt_modbus_reg_num = service:get_abs_value(service.config, service.sid, "modbus_reg_num")
	local opt_modbus_type = service:get_abs_value(service.config, service.sid, "modbus_type")
	if not opt_modbus_reg_num or not tag_bytes or not MB_FUNCTION_BYTES[opt_modbus_type] then return end

	local register_numbers = math.ceil(tag_bytes / MB_FUNCTION_BYTES[opt_modbus_type]) - 1
	local valid, msg = service.dt:irange(opt_modbus_reg_num, REGISTER_NUMBER_RANGE[1], math.max(REGISTER_NUMBER_RANGE[2] - register_numbers, REGISTER_NUMBER_RANGE[1]))
	if not valid then
		service:add_error(STD_CODES.INVALID_OPT, msg, "modbus_reg_num")
	end
end

local function get_occupied_register_range(_modbus_reg_num, _modbus_type, _tag_bytes)
	local reg_numbers = math.ceil(_tag_bytes / MB_FUNCTION_BYTES[_modbus_type]) - 1
	local reg_start = tonumber(_modbus_reg_num)
	local reg_end = reg_start + reg_numbers
	return { reg_start, reg_end }
end

local function is_registers_overlapping(register_range, other_register_range)
	return (register_range[1] <= other_register_range[2] and other_register_range[1] <= register_range[2])
end

---Checks if there is overlap between given tag and its modbus server instance register numbers
local function is_tag_overlapping_modbus_server_instance(self, section_type, opt_modbus_dev_config, new_register_range)
	local is_overlapping = false
	self:table_foreach(self.config, section_type, function(_s)
		if opt_modbus_dev_config == _s[".name"] and _s.enabled == "1" and _s.clientregs == "1" then
			local other_register_range = {tonumber(_s.regfilestart), tonumber(_s.regfilestart) + tonumber(_s.regfilesize) - 1}
			if is_registers_overlapping(new_register_range, other_register_range) then
				is_overlapping = true
			end
			return false
		end
	end)
	return is_overlapping
end

---Checks if there is register number overlap between given tag and other tag sections
--- @param service table config service instance
--- @param section_type "rtu_device" | "modbus" which section to check against
--- @param tag_options {tag_permissions: 'r' | 'w' | 'rw', modbus_type: string, tag_source?: string}
--- @param register_range table {start, end}
--- @param check_itself boolean
--- @return string?
local function find_overlapped_register_name(service, section_type, tag_options, register_range, check_itself)
	local overlapped_register_name = nil
	service:table_foreach("modbus_server", "tag", function(_s)
		-- check only other tags, unless check_itself is true
		local skip_self = not check_itself and (_s[".name"] == service.sid)
		-- filter to validate only matching section connections (modbus=tcp, non-modbus=serial)
		local section_connection_filter = section_type == "modbus" and _s.modbus_dev_config == "modbus" or section_type == "rtu_device" and _s.modbus_dev_config ~= "modbus"
		local is_perms_non_overlapping = _s.tag_permissions == tag_options.tag_permissions
		-- filter by tag source if specified
		local source_filter  = not tag_options.tag_source or _s.tag_source == tag_options.tag_source
		if _s.enabled == "1" and not skip_self and _s.modbus_type == tag_options.modbus_type and section_connection_filter and is_perms_non_overlapping and source_filter then
			-- get iterable tag registers
			local other_tag_bytes = universal_gateway_utils.get_tag_bytes(service, _s[".name"], "modbus_server")
			local other_register_range = get_occupied_register_range(_s.modbus_reg_num, _s.modbus_type, other_tag_bytes)
			-- compare given register range with other tag's register range
			if is_registers_overlapping(register_range, other_register_range) then
				overlapped_register_name = _s.tag_name
				return false
			end
		end
	end)
	return overlapped_register_name
end

---Validates register overlaps between modbus registers and custom register file
--- @param service table config service instance
--- @param section_type "rtu_device" | "modbus" which section to check against
function m.validate_register_overlap(service, section_type)
	if section_type ~= "rtu_device" and section_type ~= "modbus" then
		error('section_type must be: "rtu_device", "modbus"')
	end

	local opt_enabled = service:get_abs_value(service.config, service.sid, "enabled")
	if opt_enabled ~= "1" then return end

	local tag_bytes = universal_gateway_utils.get_tag_bytes(service)
	local opt_tag_permissions = service:table_get(service.config, service.sid, "tag_permissions")
	local opt_modbus_type = service:get_abs_value(service.config, service.sid, "modbus_type")
	local opt_modbus_reg_num = service:get_abs_value(service.config, service.sid, "modbus_reg_num")
	local opt_modbus_dev_config = service:get_abs_value(service.config, service.sid, "modbus_dev_config")

	local register_range = get_occupied_register_range(opt_modbus_reg_num, opt_modbus_type, tag_bytes)
	if opt_modbus_type == "3" or opt_modbus_type == "4" then -- validates only register types
		if is_tag_overlapping_modbus_server_instance(service, section_type, opt_modbus_dev_config, register_range) then
			service:add_error(TAG_ERR_CODES.OVERLAPPING, "Register range overlaps with server's custom register block", "Validation")
		end
	end
	local tag_options = {
		modbus_type = opt_modbus_type,
		tag_permissions = opt_tag_permissions,
	}
	local overlapped_reg_name = find_overlapped_register_name(service, section_type, tag_options, register_range, false)
	if overlapped_reg_name then
		service:add_error(TAG_ERR_CODES.OVERLAPPING, "Register range overlaps with register '" .. overlapped_reg_name .. "'. Try changing these options: tag_type or tag_size, modbus_type, modbus_reg_num, modbus_dev_config", "Validation")
	end
end

---Validates if request is overlapping with tags in modbus data sources
--- @param service table config service instance
--- @param request_config table test request options
--- @param section_type "rtu_device" | "modbus" which section to check against
function m.validate_request_overlap(service, request_config, section_type)
	if section_type ~= "rtu_device" and section_type ~= "modbus" then
		error('section_type must be: "rtu_device", "modbus"')
	end

	local req_bytes = (DATA_TYPES_METADATA[request_config.data_type].bit_size or 8) / 8
	local req_register_range = get_occupied_register_range(request_config.first_reg, request_config["function"], req_bytes)
	local request_permissions = (util.contains(m.read_functions, request_config["function"]) and "r") or (util.contains(m.write_functions, request_config["function"]) and "w")
	local tag_options = {
		modbus_type = request_config["function"],
		tag_source = "modbus_client",
		tag_permissions = request_permissions,
	}
	local overlapped_reg_name = find_overlapped_register_name(service, section_type, tag_options, req_register_range, true)
	if overlapped_reg_name then
		service:add_critical_error(TAG_ERR_CODES.OVERLAPPING, "Request range overlaps with register '" .. overlapped_reg_name .. "'.", "Validation")
	end
end

--------------------------------------------------END OF Modbus Tag utils---------------------------------------------------------------------------

return m
