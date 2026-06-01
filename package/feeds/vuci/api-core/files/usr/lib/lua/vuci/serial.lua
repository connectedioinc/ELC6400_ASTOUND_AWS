local util = require("vuci.util")
local api_utils = require("api.api_utils")
local board = require("vuci.board")
local serial_info = board:get_serial_info()

local serial = {}

local ERROR_CODES = {
	SERIAL_UNAVAILABLE = 1,
	SERIAL_DISCONNECTED = 2
}

-- A collection of services, that have the same logic for determining if it has a serial device enabled.
-- This assumes that ALL common services use the key `device` and `enabled`
local common_services = {
--  config name         display name                          section type in config
	rs_overip       = { name = "OverIP"                        , section = "overip"                 },
	rs_ntrip        = { name = "NTrip"                         , section = "ntrip"                  },
	rs_modem        = { name = "RS Modem"                      , section = "modem"                  },
	rs_console      = { name = "Console"                       , section = "console"                },
	modbusgateway   = { name = "MQTT Modbus Serial Gateway"    , section = "rtu_device"             },
	dnp3_client     = { name = "DNP3 Serial Client"            , section = "serial_client"          },
	dnp3_outstation = { name = "DNP3 Serial Outstation"        , section = "dnp3_serial_outstation" },
	modbus_client   = { name = "Modbus Serial Client"          , section = "rtu_device"             },
	modbus_server   = { name = "Modbus Serial Server"          , section = "rtu_device"             },
	rs_modbus       = { name = "Modbus TCP over Serial Gateway", section = "modbus"                 },
	gps             = { name = "NMEA Serial Port"              , section = "serial_port"            },
	bacnet_router   = { name = "BACnet"                        , section = "port"                   },
}
local mbus_config = "mbus_client"
local dlms_config, dlms_section = "dlms_client", "connection"
local iec60870_server_config, iec60870_server_section = "iec60870_server", "instance"

-- `get_service_pretty_name`, `get_using_device` and `get_device_status` only exist to support
-- handling the edge case of BACnet router, because the device for BACnet is always "/dev/rs485"
--
-- All other functions use these 3, so they wouldn't need to worry about this special case

local function get_service_pretty_name(config)
	if common_services[config] then
		return common_services[config].name
	elseif config == mbus_config then
		return "Mbus"
	elseif config == dlms_config then
		return "DLMS"
	elseif config == iec60870_server_config then
		return "IEC 60870-5 Server"
	else
		error(("Unknown service name '%s'"):format(tostring(config)))
	end
end

local function get_using_device(config, section, config_service)
	if common_services[config] then
		return config_service:get_abs_value(config, section.id, "device")
	elseif config == dlms_config then
		local dev = config_service:get_abs_value(config, section.id, "device")
		if dev then return dev end
		return "tcp"
	elseif config == mbus_config then
		return "/dev/mbus"
	elseif config == iec60870_server_config then
		if config_service:get_abs_value(config, section.id, "connection_type") == "iec101" then
			return config_service:get_abs_value(config, section.id, "device")
		end
	else
		error(("Unknown rs service config '%s'"):format(tostring(config)))
	end
end

-- Finds a section in a config that has the matching required options
local function find_by_options(uci_foreach, config_name, section_type, required_options)
	local id
	uci_foreach(config_name, section_type, function(c)
		for name, value in pairs(required_options) do
			if c[name] ~= value then
				return true -- continue
			end
		end

		id = c['.name']
		return false -- break
	end)
	return id
end

---@param device string serial device name
---@return string|nil, string|nil
local function get_device_status(device, uci_foreach, uci_get_value)
	for config, service in pairs(common_services) do
		local id = find_by_options(uci_foreach, config, service.section, {
			device = device,
			enabled = "1"
		})
		if id then
			return id, config
		end
	end

	local id = find_by_options(uci_foreach, dlms_config, dlms_section, {
		device = device,
		enabled = "1",
		connection_type = "1"
	})
	if id then
		return id, dlms_config
	end

	id = find_by_options(uci_foreach, iec60870_server_config, iec60870_server_section, {
		device = device,
		enabled = "1",
		connection_type = "iec101"
	})
	if id then
		return id, iec60870_server_config
	end

	if device == "/dev/mbus" then
		local enabled = uci_get_value(mbus_config, "main", "enabled")
		if enabled == "1" then
			local group_id = find_by_options(uci_foreach, mbus_config, "group", {
				enabled = "1",
			})
			if group_id then
				local group_value_id = find_by_options(uci_foreach, mbus_config, ("value_%s"):format(group_id), {
					enabled = "1"
				})
				if group_value_id then
					return group_id, mbus_config
				end
			end
		end

		local success, mbus_utils = pcall(require, "api.services.mbus_utils")
		if success and mbus_utils:get_scan_progress().status == "running" then
			return "scan", mbus_config
		end
	end
end

function serial:get_devices_status(serial_device, uci_foreach, uci_get_value)
	local device = { name = serial_device, is_used = "0" }

	local id, config_name = get_device_status(serial_device, uci_foreach, uci_get_value)
	if id then
		device.is_used = "1"
		device.service = get_service_pretty_name(config_name)
		device.configuration = id
	end

	return device
end

-- Returns all devices with their information
---@return table serial devices with their usage information from configurations
function serial:get_all_devices_status(uci_foreach, uci_get_value)
	local data = {}
	local devices = self:get_devices(true)
	for _, serial_device in ipairs(devices) do
		local device_status = serial:get_devices_status(serial_device, uci_foreach, uci_get_value)
		table.insert(data, device_status)
	end
	return data
end

-- Calls `api_error_callback` if given device is not found.
---@param config_service _ Instance of ConfigService
---@param device string serial device name
function serial:assert_device_is_connected(config_service, device)
	local cfg = config_service.current_data_block
	local is_enabled = cfg["enabled"] and cfg["enabled"] or "0"
	local was_enabled = config_service:table_get(config_service.main_config, config_service.sid, "enabled")
	-- Only check when configuration is being enabled
	if was_enabled == "0" and is_enabled == "1" then
		local devices = serial:get_devices(true)
		if not util.contains(devices, device) then
			config_service:add_critical_error(
				ERROR_CODES.SERIAL_DISCONNECTED,
				"Serial device is disconnected, can not enable configuration.",
				"Validation"
			)
		end
	end
end

local function insert_to_set(set, value)
	local key = util.contains(set, value)
	if not key then
		table.insert(set, value)
	end
end

local function remove_from_set(set, value)
	local key = util.contains(set, value)
	if key then
		table.remove(set, key)
	end
end

---@param config_service _ config service object
---@param device string serial device name
function serial:assert_device_is_available(config_service, device)
	local main_config = config_service.main_config
	local sid = config_service.sid
	local enabled = config_service:get_abs_value(main_config, sid, "enabled")
	if enabled ~= "1" then return end

	local function uci_foreach(...) return config_service:table_foreach(...) end
	local function uci_get_value(...) return config_service:get_abs_value(...) end
	local id, config_name = get_device_status(device, uci_foreach, uci_get_value)

	local who_is_using_device = nil
	local should_throw_error = false

	-- If current request is coming from the save config as an already enabled device, then...
	-- Need to check if currently enabled config is also being disabled/enabled in the same request
	if config_name == config_service.main_config then
		-- Actively keep track of which configuration are holding on to the device
		local device_users = { id }
		insert_to_set(device_users, sid)

		-- If request contains multiple configurations, all of them need to checked.
		-- Because configuration that used a device might have been disabled.
		if api_utils:is_array(config_service.arguments.data) then
			local config = config_service.main_config
			for _, section in ipairs(config_service.arguments.data) do
				local section_device = get_using_device(config, section, config_service)
				if section_device == device then
					local is_enabled = config_service:get_abs_value(config, section.id, "enabled")
					if is_enabled == "1" then
						insert_to_set(device_users, section.id)
					else
						remove_from_set(device_users, section.id)
					end
				end
			end
		end

		-- If more than 1 device users exist, throw error.
		should_throw_error = #device_users > 1
		who_is_using_device = device_users[1]
	else
		-- If where device is already used is from another config,
		-- then nothing can be done current request to disable it,
		-- so don't allow using that device
		should_throw_error = id ~= nil
		who_is_using_device = id
	end

	if should_throw_error then
		if main_config ~= config_name or (main_config == config_name and sid ~= who_is_using_device) then
			local service_name = get_service_pretty_name(config_name)
			config_service:add_error(
				ERROR_CODES.SERIAL_UNAVAILABLE,
				("Serial device is unavailable as it is used in %s service configuration %s."):format(service_name, who_is_using_device),
				"Validation"
			)
		end
	end
end

-- Returns serial devices
---@param with_path boolean whether you want full path to serial devices or just names
---@return table all on router available serial devices
function serial:get_devices(with_path)
	local serial_device_options = {}

	if board:has_serial() then
		for _, single_serial in ipairs(serial_info) do
			if single_serial.devices then
				for _, device in ipairs(single_serial.devices) do
					table.insert(serial_device_options, device)
				end
			end
		end
	end

	local external_devices = util.ubus("serial", "usb_adapters") or {}
	for device, serials in pairs(external_devices) do
		for _, single_serial in ipairs(serials) do
			table.insert(serial_device_options, device .. "_" .. single_serial)
		end
	end

	if with_path then
		for i, serial_device in ipairs(serial_device_options) do
			serial_device_options[i] = "/dev/" .. serial_device
		end
	end

	return serial_device_options
end

---@param device string serial device name
---@param option string option to get available values. Correct options: [bauds, data_bits, parity_types, flow_control, stop_bits]
---@return table available option values
local function get_option(device, option)
	local data = { }
	if board:has_serial() then
		for _, single_serial in ipairs(serial_info) do
			local this_device
			for _, serial_device in ipairs(single_serial.devices or {}) do
				if device:find(serial_device) then this_device = true end
			end
			if this_device then
				data = single_serial[option]
			end
		end
	end
	return data
end

local function parse_options(device, options, key)
	if type(device) ~= "string" then
		return {}
	elseif device and device:find("usb") and key ~= "duplex" then
		return options
	end
	return get_option(device, key)
end

-- Returns serial device baud rates
---@param device string serial device name
---@return table available baud rates for specific serial device
function serial:get_baudrates(device)
	local baud_rates = { "300", "600", "1200", "1800", "2400", "4800", "9600", "19200", "38400", "57600", "115200",
		"230400", "460800", "500000", "576000", "921600", "1000000", "1152000", "1500000", "2000000", "2500000",
		"3000000", "3500000", "4000000" } -- default USB to SERIAL baud rates
	return parse_options(device, baud_rates, "bauds")
end

-- Returns serial device data bits
---@param device string serial device name
---@return table available data bits for specific serial device
function serial:get_databits(device)
	local data_bits = { "5", "6", "7", "8" } -- default USB to SERIAL data bits
	return parse_options(device, data_bits, "data_bits")
end

---@param device string serial device name
---@return table serial device supported parity values
function serial:get_parity(device)
	local parity_options = { "odd", "even", "none" } -- default USB TO SERIAL parity options
	return parse_options(device, parity_options, "parity_types")
end

---@param device string serial device name
---@return table serial device supported duplex values
function serial:get_duplex(device)
	local duplex_params = { none = false, half = false, full = false }
	local duplex_options = parse_options(device, {}, "duplex")
	for _, value in ipairs(duplex_options) do
		duplex_params[value] = true
	end
	return duplex_params
end

function serial.append_duplex_option(section, service)
	local opt_full_duplex_enabled = section:option("full_duplex_enabled")
	function opt_full_duplex_enabled:validate(value)
		local device = self:get_abs_value(self.config, self.sid, "device")
		local duplex_params = serial:get_duplex(device)
		if service == "dlms" then
			local connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
			if connection_type == "0" then
				return false, "Cannot use serial options with TCP connection"
			end
		end
		if duplex_params.half and duplex_params.full then
			return self.dt:is_bool(value)
		else
			return false, "Option is only available on devices that support duplex setting."
		end
	end
	function opt_full_duplex_enabled:get(value)
		local device = self:get_abs_value(self.config, self.sid, "device")
		local duplex_params = serial:get_duplex(device)
		if duplex_params.half and duplex_params.full then return value end
		return nil
	end
end

function serial:handle_duplex(self)
	local duplex_value = self:get_abs_value(self.config, self.sid, "full_duplex_enabled")
	local device = self:get_abs_value(self.config, self.sid, "device")
	local duplex_params = serial:get_duplex(device)
	if not duplex_value and not duplex_params.none then
		return self:table_set(self.main_config, self.sid, "full_duplex_enabled", "0")
	elseif duplex_params.none and duplex_value then
		self:table_delete(self.main_config, self.sid, "full_duplex_enabled")
	elseif duplex_params.half and not duplex_params.full then
		self:table_set(self.main_config, self.sid, "full_duplex_enabled", "0")
	end
end

---@param device string serial device name
---@return table serial device supported flow control values
function serial:get_flowcontrol(device)
	local flow_control_options = { "none", "xon/xoff", "rts/cts" } -- default USB TO SERIAL flow control options
	return parse_options(device, flow_control_options, "flow_control")
end

function serial:validate_flowcontrol(self)
	local serial_device = self:get_abs_value(self.config, self.sid, "device")
	local full_duplex = self:get_abs_value(self.config, self.sid, "full_duplex_enabled")

	local duplex = serial:get_duplex(serial_device)
	local options = serial:get_flowcontrol(serial_device)

	if not duplex.half and not duplex.full then
		return options
	end

	if full_duplex ~= "1" and (full_duplex ~= nil or full_duplex ~= "") then
		local filtered = {}
		for _, option in ipairs(options) do
			if option ~= "xon/xoff" then
				table.insert(filtered, option)
			end
		end
		options = filtered
	end

	return options
end

-- Returns serial stop bits values
---@param device string serial device name
---@return table serial device supported stop bits values
function serial:get_stopbits(device)
	local stopbits_options = { "1", "2" } -- default USB TO SERIAL stop bits options
	return parse_options(device, stopbits_options, "stop_bits")
end

-- Returns if device is eligible for serial service
---@return boolean if device is eligible for serial service
function serial:check_device_serial()
	if board:has_serial() or board:has_mbus() then
		return true
	end
	return false
end

return serial
