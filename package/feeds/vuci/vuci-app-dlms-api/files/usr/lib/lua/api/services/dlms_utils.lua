local util = require("vuci.util")
local sqlite = require("vuci.sqlite")
local dt = require("api.Validations")

local utils = {}

local DLMS_UBUS_RPC  = "dlms_client.rpc"
local DLMS_UBUS_APP  = "dlms_client.app"

utils.DLMS_DB_PATH = "/var/run/dlms_client/dlms.db"

local UBUS_UNKNOWN_ERROR = 9

local function attributes_up_to(count)
	local attributes = {}
	for i=1, count do
		table.insert(attributes, tostring(i))
	end
	return attributes
end

-- attribute number groups for each cosem class id
utils.COSEM_ATTRIBUTE_GROUPS = {
	['1' ] = attributes_up_to(2),
	['3' ] = attributes_up_to(3),
	['4' ] = attributes_up_to(5),
	['5' ] = attributes_up_to(8),
	['6' ] = attributes_up_to(4),
	['7' ] = attributes_up_to(8),
	['8' ] = attributes_up_to(9),
	['9' ] = attributes_up_to(2),
	['11'] = attributes_up_to(2),
	['15'] = {}, -- leftover to avoid breaking api
	['17'] = attributes_up_to(2),
	['18'] = attributes_up_to(7),
	['19'] = attributes_up_to(9),
	['20'] = attributes_up_to(10),
	['21'] = attributes_up_to(4),
	['22'] = attributes_up_to(4),
	['23'] = attributes_up_to(9),
	['24'] = attributes_up_to(5),
	['26'] = attributes_up_to(4),
	['27'] = attributes_up_to(4),
	['28'] = attributes_up_to(6),
	['29'] = attributes_up_to(6),
	['40'] = attributes_up_to(7),
	['41'] = attributes_up_to(6),
	['42'] = attributes_up_to(10),
	['43'] = attributes_up_to(2),
	['45'] = attributes_up_to(4),
	['47'] = attributes_up_to(8),
	['48'] = attributes_up_to(10),
	['62'] = attributes_up_to(6),
	['64'] = attributes_up_to(5),
	['68'] = attributes_up_to(3),
	['70'] = attributes_up_to(4),
	['71'] = attributes_up_to(11),
}

utils.INTERFACE_TYPE = {
	HDLC = "0",
	WRAPPER = "1",
	HDLCWITHMODEE = "4",
}

utils.available_access_security = { "0", "1", "2", "3", "4", "5", "6" }

function utils.call_dlms(ubus_object, method_name, payload)
	local result, err = util.ubus(ubus_object, method_name, payload, 10 * 60)
	if not result then
		return { error = err }
	end

	return result
end

function utils.get_available_device_interfaces(connection_type)
	local options = { utils.INTERFACE_TYPE.HDLC, utils.INTERFACE_TYPE.WRAPPER }
	if connection_type == "1" then
		table.insert(options, utils.INTERFACE_TYPE.HDLCWITHMODEE)
	end
	return options
end

function utils.get_connection_test_data(connection)
	return {
		id = connection.id,
		connection_type = tonumber(connection.connection_type),

		-- TCP
		address = connection.address,
		port    = tonumber(connection.port),

		-- Serial
		device      = connection.device,
		baudrate    = tonumber(connection.baudrate),
		databits    = tonumber(connection.databits),
		stopbits    = tonumber(connection.stopbits),
		parity      = connection.parity,
		flowcontrol = connection.flowcontrol,
	}
end

function utils.get_device_test_data(device)
	return {
		id                  = device.id,
		name                = device.name,
		client_addr         = tonumber(device.client_addr),
		server_addr_type    = tonumber(device.server_addr_type) or 0,
		server_addr         = tonumber(device.server_addr),
		log_server_addr     = tonumber(device.log_server_addr),
		transport_security  = tonumber(device.transport_security),
		interface           = tonumber(device.interface),
		access_security     = tonumber(device.access_security),
		connection          = tonumber(device.connection),
		password            = device.password,
		authentication_key  = device.authentication_key,
		block_cipher_key    = device.block_cipher_key,
		dedicated_key       = device.dedicated_key,
		invocation_counter  = device.invocation_counter,
		use_ln_ref          = tonumber(device.use_ln_ref),
	}
end

function utils.get_group_value_test_data(group_value)
	local attributes = group_value.attributes
	if type(attributes) == "table" then
		attributes = table.concat(attributes, " ")
	end

	local test_data = {
		name = group_value.name,
		logical_name = group_value.logical_name,
		short_name = group_value.short_name and tonumber(group_value.short_name),
		physical_device = group_value.devices,
		cosem_id = tonumber(group_value.cosem_id),
		entries = tonumber(group_value.entries),
		attributes = attributes
	}

	if group_value.obis then
		if not test_data.logical_name and utils:validate_logical_name(group_value.obis) then
			test_data.logical_name = group_value.obis
		end

		if not test_data.short_name and utils:validate_short_name(group_value.obis) then
			test_data.short_name = tonumber(group_value.obis)
		end
	end

	return test_data
end

function utils.get_scan_status()
	local result = util.ubus(DLMS_UBUS_RPC, "scan_status")
	return result and result.status
end

function utils.get_service_status()
	return util.ubus(DLMS_UBUS_APP, "status") or {}
end

function utils.start_scan(device_ids)
	assert(type(device_ids) == "table")

	local errors = {}

	for _, device_id in ipairs(device_ids) do
		local result, err, err_str = util.ubus(DLMS_UBUS_RPC, "scan_start", { device_id = device_id })
		if result and result.error ~= 0 then
			table.insert(errors, result)
		elseif not result then
			table.insert(errors, {
				error = err,
				result = err_str
			})
		end
	end

	if #errors > 0 then
		return false, errors[1]
	end

	return true
end

function utils.stop_scan(device_ids)
	assert(type(device_ids) == "table")

	local errors = {}

	for _, device_id in ipairs(device_ids) do
		local result, err, err_str = util.ubus(DLMS_UBUS_RPC, "scan_stop", { device_id = device_id })

		if result and result.error ~= 0 then
			table.insert(errors, result)
		elseif not result then
			table.insert(errors, {
				error = err,
				result = err_str
			})
		end
	end

	if #errors > 0 then
		return false, errors[1]
	end

	return true
end

function utils.test_device(connection, device)
	return utils.call_dlms(DLMS_UBUS_RPC, "test_device", {
		connection = utils.get_connection_test_data(connection),
		device = utils.get_device_test_data(device)
	})
end

function utils.test_cosem_group(connections, devices, group_values)
	local connections_test_data = {}
	for _, connection in ipairs(connections) do
		table.insert(connections_test_data, utils.get_connection_test_data(connection))
	end

	local devices_test_data = {}
	for _, device in ipairs(devices) do
		table.insert(devices_test_data, utils.get_device_test_data(device))
	end

	local group_values_test_data = {}
	for _, group_value in ipairs(group_values) do
		table.insert(group_values_test_data, utils.get_group_value_test_data(group_value))
	end

	return utils.call_dlms(DLMS_UBUS_RPC, "test_cosem_group", {
		objects = group_values_test_data,
		connections = connections_test_data,
		devices = devices_test_data
	})
end

function utils:validate_logical_name(value)
	local valid, err = dt:nospace(value)
	if not valid then return false, err end

	local obis_group_max_values = { 15, 255, 255, 255, 255, 255 }
	local groups = util.split(value, ".")
	if #groups ~= 6 then
		return false, "Must have exactly 6 integers separated by dots"
	end

	for i, v in ipairs(groups) do
		local valid, err = dt:irange(v, 0, obis_group_max_values[i])
		if not valid then return false, ("Number %s: %s"):format(i + 1, err) end
	end

	return dt:string()
end

function utils:validate_short_name(value)
	return dt:irange(value, 0, 65535)
end

function utils:validate_obis(value)
	local valid, err = dt:nospace(value)
	if not valid then return false, err end
	if value:find("[.]") then
		local obis_group_max_values = { 15, 255, 255, 255, 255, 255 }
		local groups = util.split(value, ".")
		if #groups ~= 6 then
			return false, "OBIS must have exactly 6 groups"
		end
		for i, v in ipairs(groups) do
			local valid, _ = dt:irange(v, 0, obis_group_max_values[i])
			if not valid then return false, "Valid OBIS code groups are accepted. E.g. 15.255.1.0.255.0." end
		end
	else
		return self:validate_short_name(value)
	end

	return dt:string()
end

function utils:validate_cosem_id(value)
	local cosem_class_codes = util.keys(utils.COSEM_ATTRIBUTE_GROUPS)
	return dt:check_array(value, cosem_class_codes)
end

function utils:open_db()
	return sqlite.database({
		path = utils.DLMS_DB_PATH
	})
end

--- @param ids string[]
function utils.delete_db_device_parameters(ids)
	if not ids or #ids == 0 then return end

	local db = utils:open_db()
	db:busy_timeout(5000)

	if not db:get_db() then
		return
	end

	local placeholders = string.rep("?,", #ids - 1) .. "?"
	local delete_query = string.format("DELETE FROM association_view WHERE physical_device_id IN (%s)", placeholders)
	local stmt = db:get_db():prepare(delete_query)
	if not stmt then
		return
	end

	for i, id in ipairs(ids) do
		stmt:bind(i, id)
	end
	stmt:step()
	stmt:finalize()

	db:close()
end

return utils
