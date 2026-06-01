local util = require("vuci.util")
local board = require("vuci.board")

local UBUS_OBJECT = "iec60870_server"

local iec60870_utils = {}

iec60870_utils.max_instances = 20

iec60870_utils.max_pin_count = 8

local UBUS_ERROR_NOT_FOUND = 4

function iec60870_utils.call_ubus(method_name, payload)
	return util.ubus(UBUS_OBJECT, method_name, payload)
end

function iec60870_utils.get_status()
	local result, err = iec60870_utils.call_ubus("status", {})
	if not result then
		if err == UBUS_ERROR_NOT_FOUND then
			return {}
		end

		return nil, err
	end

	result.uptime = tostring(result.uptime)
	for _, instance in ipairs(result.instances) do
		if instance.error then
			instance.error = tostring(instance.error)
		else
			if instance.connection_type == "iec104" then
				instance.connected_clients = tostring(instance.connected_clients)
			elseif instance.connection_type == "iec101" then
				instance.link_layer_state = tostring(instance.link_layer_state)
			end
		end
	end

	return result
end

function iec60870_utils.list_io_fields(io_info)
	if io_info.type == 'relay' then
		return { 'closed' }
	elseif io_info.type == 'adc' then
		return { 'value' }
	elseif io_info.type == 'acl' then
		return { 'current', 'active' }
	elseif io_info.type == 'therm' then
		return { 'value' }
	elseif io_info.type == 'dwi' then
		return { 'high', 'dry' }
	elseif io_info.type == 'gpio' then
		if io_info.bi_dir then
			return { 'high', 'input' }
		else
			return {'high'}
		end
	end

	return {}
end

function iec60870_utils.list_available_pins()
	if not board:has_ios() then
		return {}
	end

	local io = require("vuci.io")
	local io_info_list = io:ioman_info()
	if not io_info_list then
		return {}
	end

	local pins = {}

	for _, io_info in ipairs(io_info_list) do
		for _, field in ipairs(iec60870_utils.list_io_fields(io_info)) do
			table.insert(pins, ("%s.%s"):format(io_info.name, field))
		end
	end

	return pins
end

function iec60870_utils.list_available_information_objects(configured_pins)
	local io_list = {"uptime", "unix_timestamp", "serial_number"}

	if board:has_mobile() then
		table.insert(io_list, "modem_number")
		table.insert(io_list, "sim_number")
		table.insert(io_list, "signal_strength")
		table.insert(io_list, "temperature")
		table.insert(io_list, "sim_stats_this_day")
		table.insert(io_list, "sim_stats_last_day")
		table.insert(io_list, "sim_stats_this_week")
		table.insert(io_list, "sim_stats_last_week")
		table.insert(io_list, "sim_stats_this_month")
		table.insert(io_list, "sim_stats_last_month")
		table.insert(io_list, "imsi")
	end

	if board:has_gps() then
		table.insert(io_list, "gps_timestamp")
		table.insert(io_list, "gps_longitude")
		table.insert(io_list, "gps_latitude")
		table.insert(io_list, "gps_altitude")
		table.insert(io_list, "gps_angle")
		table.insert(io_list, "gps_speed")
		table.insert(io_list, "gps_accuracy")
		table.insert(io_list, "gps_satellites")
	end

	if board:has_ios() then
		local io_pin_count = configured_pins and #configured_pins or iec60870_utils.max_pin_count

		for i = 1, io_pin_count do
			table.insert(io_list, ("io_pin%s"):format(i - 1))
		end
	end

	return io_list
end

return iec60870_utils
