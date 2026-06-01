local sqlite = require("vuci.sqlite")
local json = require("luci.jsonc")
local dt = require("api.Validations")
local util = require("vuci.util")

local iec60870_utils = {}

iec60870_utils.max_instances = 20
iec60870_utils.max_information_objects_per_instance = 250
iec60870_utils.max_common_addresses = 16

local UBUS_NOT_FOUND = 4

local UBUS_OBJECT_APP = "iec60870_client.app"
local UBUS_OBJECT_RPC = "iec60870_client.rpc"
local DB_PATH = "/var/run/iec60870_client/iec60870_client.db"

local data_type_name_lookup = {
	[1  ] = "M_SP_NA_1",
	[2  ] = "M_SP_TA_1",
	[3  ] = "M_DP_NA_1",
	[4  ] = "M_DP_TA_1",
	[5  ] = "M_ST_NA_1",
	[6  ] = "M_ST_TA_1",
	[7  ] = "M_BO_NA_1",
	[8  ] = "M_BO_TA_1",
	[9  ] = "M_ME_NA_1",
	[10 ] = "M_ME_TA_1",
	[11 ] = "M_ME_NB_1",
	[12 ] = "M_ME_TB_1",
	[13 ] = "M_ME_NC_1",
	[14 ] = "M_ME_TC_1",
	[15 ] = "M_IT_NA_1",
	[16 ] = "M_IT_TA_1",
	[17 ] = "M_EP_TA_1",
	[18 ] = "M_EP_TB_1",
	[19 ] = "M_EP_TC_1",
	[20 ] = "M_PS_NA_1",
	[21 ] = "M_ME_ND_1",
	[30 ] = "M_SP_TB_1",
	[31 ] = "M_DP_TB_1",
	[32 ] = "M_ST_TB_1",
	[33 ] = "M_BO_TB_1",
	[34 ] = "M_ME_TD_1",
	[35 ] = "M_ME_TE_1",
	[36 ] = "M_ME_TF_1",
	[37 ] = "M_IT_TB_1",
	[38 ] = "M_EP_TD_1",
	[39 ] = "M_EP_TE_1",
	[40 ] = "M_EP_TF_1",
	[41 ] = "S_IT_TC_1",
	[45 ] = "C_SC_NA_1",
	[46 ] = "C_DC_NA_1",
	[47 ] = "C_RC_NA_1",
	[48 ] = "C_SE_NA_1",
	[49 ] = "C_SE_NB_1",
	[50 ] = "C_SE_NC_1",
	[51 ] = "C_BO_NA_1",
	[58 ] = "C_SC_TA_1",
	[59 ] = "C_DC_TA_1",
	[60 ] = "C_RC_TA_1",
	[61 ] = "C_SE_TA_1",
	[62 ] = "C_SE_TB_1",
	[63 ] = "C_SE_TC_1",
	[64 ] = "C_BO_TA_1",
	[70 ] = "M_EI_NA_1",
	[81 ] = "S_CH_NA_1",
	[82 ] = "S_RP_NA_1",
	[83 ] = "S_AR_NA_1",
	[84 ] = "S_KR_NA_1",
	[85 ] = "S_KS_NA_1",
	[86 ] = "S_KC_NA_1",
	[87 ] = "S_ER_NA_1",
	[90 ] = "S_US_NA_1",
	[91 ] = "S_UQ_NA_1",
	[92 ] = "S_UR_NA_1",
	[93 ] = "S_UK_NA_1",
	[94 ] = "S_UA_NA_1",
	[95 ] = "S_UC_NA_1",
	[100] = "C_IC_NA_1",
	[101] = "C_CI_NA_1",
	[102] = "C_RD_NA_1",
	[103] = "C_CS_NA_1",
	[104] = "C_TS_NA_1",
	[105] = "C_RP_NA_1",
	[106] = "C_CD_NA_1",
	[107] = "C_TS_TA_1",
	[110] = "P_ME_NA_1",
	[111] = "P_ME_NB_1",
	[112] = "P_ME_NC_1",
	[113] = "P_AC_NA_1",
	[120] = "F_FR_NA_1",
	[121] = "F_SR_NA_1",
	[122] = "F_SC_NA_1",
	[123] = "F_LS_NA_1",
	[124] = "F_AF_NA_1",
	[125] = "F_SG_NA_1",
	[126] = "F_DR_TA_1",
	[127] = "F_SC_NB_1",
}

local cause_of_transmission_lookup = {
	[1 ] = "PERIODIC",
	[2 ] = "BACKGROUND_SCAN",
	[3 ] = "SPONTANEOUS",
	[4 ] = "INITIALIZED",
	[5 ] = "REQUEST",
	[6 ] = "ACTIVATION",
	[7 ] = "ACTIVATION_CON",
	[8 ] = "DEACTIVATION",
	[9 ] = "DEACTIVATION_CON",
	[10] = "ACTIVATION_TERMINATION",
	[11] = "RETURN_INFO_REMOTE",
	[12] = "RETURN_INFO_LOCAL",
	[13] = "FILE_TRANSFER",
	[14] = "AUTHENTICATION",
	[15] = "MAINTENANCE_OF_AUTH_SESSION_KEY",
	[16] = "MAINTENANCE_OF_USER_ROLE_AND_UPDATE_KEY",
	[20] = "INTERROGATED_BY_STATION",
	[21] = "INTERROGATED_BY_GROUP_1",
	[22] = "INTERROGATED_BY_GROUP_2",
	[23] = "INTERROGATED_BY_GROUP_3",
	[24] = "INTERROGATED_BY_GROUP_4",
	[25] = "INTERROGATED_BY_GROUP_5",
	[26] = "INTERROGATED_BY_GROUP_6",
	[27] = "INTERROGATED_BY_GROUP_7",
	[28] = "INTERROGATED_BY_GROUP_8",
	[29] = "INTERROGATED_BY_GROUP_9",
	[30] = "INTERROGATED_BY_GROUP_10",
	[31] = "INTERROGATED_BY_GROUP_11",
	[32] = "INTERROGATED_BY_GROUP_12",
	[33] = "INTERROGATED_BY_GROUP_13",
	[34] = "INTERROGATED_BY_GROUP_14",
	[35] = "INTERROGATED_BY_GROUP_15",
	[36] = "INTERROGATED_BY_GROUP_16",
	[37] = "REQUESTED_BY_GENERAL_COUNTER",
	[38] = "REQUESTED_BY_GROUP_1_COUNTER",
	[39] = "REQUESTED_BY_GROUP_2_COUNTER",
	[40] = "REQUESTED_BY_GROUP_3_COUNTER",
	[41] = "REQUESTED_BY_GROUP_4_COUNTER",
	[44] = "UNKNOWN_TYPE_ID",
	[45] = "UNKNOWN_COT",
	[46] = "UNKNOWN_CA",
	[47] = "UNKNOWN_IOA",
}

local function get_data_type_id(data_type_name)
	for id, name in pairs(data_type_name_lookup) do
		if name == data_type_name then
			return id
		end
	end
end

local function get_cause_of_transmission_id(cot_name)
	for id, name in pairs(cause_of_transmission_lookup) do
		if name == cot_name then
			return id
		end
	end
end

function iec60870_utils.list_db(options)
	options = options or {}
	assert(type(options) == "table")

	local db = sqlite.database({ path = DB_PATH })

	local where = {
		id = options.id,
		client_id = tonumber(options.client_id)
	}
	local where_clause = sqlite.create_where_clause(where)

	if options.information_object_address then
		where_clause = sqlite.append_where_clause(where_clause, "ioa=:ioa")
		where.ioa = tonumber(options.information_object_address)
	end

	if options.common_address then
		where_clause = sqlite.append_where_clause(where_clause, "ca=:ca")
		where.ca = tonumber(options.common_address)
	end

	if options.data_type then
		local type_id = get_data_type_id(options.data_type)
		if type_id == nil then
			return {}, 0
		end

		where_clause = sqlite.append_where_clause(where_clause, "type=:type")
		where.type = type_id
	end

	if options.cause_of_transmission then
		local cot_id = get_cause_of_transmission_id(options.cause_of_transmission)
		if cot_id == nil then
			return {}, 0
		end

		where_clause = sqlite.append_where_clause(where_clause, "cot=:cot")
		where.cot = cot_id
	end

	local total = db:row_count("iec60870_data", where_clause, where)

	local entries = {}
	local rows = db:select_paginated(
		"SELECT * FROM iec60870_data " .. where_clause,
		where,
		options.limit,
		options.offset
	)
	for _, row in ipairs(rows) do
		table.insert(entries, {
			id = row.id,
			timestamp = row.timestamp,
			client_id = tostring(row.client_id),
			common_address = row.ca,
			information_object_address = row.ioa,
			cause_of_transmission = cause_of_transmission_lookup[row.cot] or "UNKNOWN_COT",
			data_type = data_type_name_lookup[row.type] or "unknown",
			data = json.parse(row.data),
			-- `data.iteration` is not used
		})
	end

	return entries, total
end

function iec60870_utils.validate_io_triplet(io_triplet)
	local io_name, io_address, io_ca = io_triplet:match("^([^:]*):(%d+):(%d+)$")
	if not io_name or not io_address or not io_ca then
		return false, "Incorrect information object format, expected '<name>:<address>:<common-address>'"
	end

	if not dt:irange(io_ca, 1, 2^16 - 1) then
		return false, ("Address must be an integer and range of the value must be from 1 to %d"):format(2^16 - 1)
	end

	if not dt:irange(io_address, 0, 2^24 - 1) then
		return false, ("Address must be an integer and range of the value must be from 0 to %d"):format(2^24 - 1)
	end

	if not dt:no_control_codes(io_name) then
		return false, "Name can not contain control codes"
	end

	-- This is an arbitrary limit, it can be adjusted if needed
	if #io_name > 256 then
		return false, "Name can not be longer than 256 characters"
	end

	return true
end

function iec60870_utils.split_io_triplet(io_triplet)
	local io_name, io_address, io_ca = io_triplet:match("^([^:]*):(%d+):(%d+)$")
	return {
		name = io_name,
		address = io_address,
		common_address = io_ca
	}
end

function iec60870_utils.test_information_objects(opts)
	assert(type(opts) == "table")
	assert(type(opts.connection_type) == "string")

	local payload = {}

	if opts.connection_type == "iec104" then
		-- TCP
		payload.proto = 104

		payload.ip = opts.ip
		payload.port = tonumber(opts.port)

	elseif opts.connection_type == "iec101" then
		-- Serial
		payload.proto = 101

		-- TODO: Add serial options to payload
		assert(false, "TODO: Add support for iec104")

	else
		assert(false, "Invalid connection type")
	end

	local name_mapping = {}
	if opts.information_objects_selection == "0" then
		assert(type(opts.information_objects) == "table")
		payload.io = opts.information_objects

		for _, io_triplet in ipairs(opts.information_objects) do
			local information_object = iec60870_utils.split_io_triplet(io_triplet)

			local lookup_key = ("%s:%s"):format(information_object.address, information_object.common_address)
			name_mapping[lookup_key] = information_object.name
		end

	elseif opts.information_objects_selection == "1" then
		assert(type(opts.common_addresses) == "table")
		payload.ca = opts.common_addresses

	else
		assert(false, "Invalid 'information_objects_selection'")
	end

	if opts.timeout and opts.timeout ~= "" then
		payload.timeout = tonumber(opts.timeout)
	end

	local ubus_result, err = util.ubus(UBUS_OBJECT_RPC, "test", payload)
	if err then
		return nil, err
	end
	if ubus_result.error then
		return nil, ubus_result.error
	end

	local result = {}
	local errors = {}

	for _, io_result in ipairs(ubus_result.data) do
		if io_result.negative then
			table.insert(errors, {
				data_type = io_result.type,
				common_address = io_result.ca,
				cause_of_transmission = io_result.cot,
			})
		else
			local address = io_result.ioa
			local common_address = io_result.ca
			local lookup_key = ("%s:%s"):format(address, common_address)

			table.insert(result, {
				common_address = io_result.ca,
				name = name_mapping[lookup_key] or "",
				cause_of_transmission = io_result.cot,
				information_object_address = io_result.ioa,
				data_type = io_result.type,
				data = io_result.data
			})
		end
	end

	return {
		information_objects = result,
		errors = errors
	}
end

function iec60870_utils.list_information_objects(opts)
	assert(type(opts) == "table")
	assert(type(opts.connection_type) == "string")

	assert(opts.connection_type == "iec104", "TODO: Add iec101 support")
	local payload = {
		proto = 104,
		ip = opts.ip,
		port = tonumber(opts.port),
		ca = {tonumber(opts.common_address)}
	}

	local ubus_result, err = util.ubus(UBUS_OBJECT_RPC, "scan", payload)
	if err then
		return nil, err
	end
	if ubus_result.error then
		return nil, ubus_result.error
	end

	local result = {}
	local errors = {}

	for _, io_result in ipairs(ubus_result.data) do
		if io_result.negative then
			table.insert(errors, {
				data_type = io_result.type,
				common_address = io_result.ca,
				cause_of_transmission = io_result.cot,
			})
		else
			table.insert(result, {
				common_address = io_result.ca,
				cause_of_transmission = io_result.cot,
				information_object_address = io_result.ioa,
				data_type = io_result.type,
				data = io_result.data
			})
		end
	end

	return {
		information_objects = result,
		errors = errors
	}
end

function iec60870_utils.service_status()
	local ubus_result, err = util.ubus(UBUS_OBJECT_APP, "status")
	if err then
		if err == UBUS_NOT_FOUND then
			return {}
		end

		return nil, err
	end

	local instances = {}
	for _, client in ipairs(ubus_result.clients or {}) do
		table.insert(instances, {
			id = tostring(client.id),
			state = client.state or "Unknown"
		})
	end

	return {
		uptime = tostring(ubus_result.uptime),
		instances = instances
	}
end

return iec60870_utils
