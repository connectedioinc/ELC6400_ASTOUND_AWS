local FunctionService = require("api.FunctionService")
local modbus_utils = require("vuci.modbus_utils")
local query_parsing = require("api/query")

local DatabaseEntries = FunctionService:new()

function DatabaseEntries:validate_query_parameters()
	local params_to_check = {
		limit = "number",
		offset = "number",
		db_path = "string",
		id = "string",
		request_id = "string",
		server_id = "string",
		request_name = "string",
		server_name = "string"
	}
	query_parsing:validate_query_format(params_to_check, self)

	local query_params = self.query_parameters

	local limit = 100
	if query_params.limit then
		limit = tonumber(query_params.limit)

		local success, err = self.dt:irange(query_params.limit, 0, 1000)
		if not success then
			self:add_error(STD_CODES.INVALID_QUERY, err, "limit", nil, query_params.limit)
		end
	end

	local offset = nil
	if query_params.offset then
		offset = tonumber(query_params.offset)

		local success, err = self.dt:uinteger(query_params.offset)
		if not success then
			self:add_error(STD_CODES.INVALID_QUERY, err, "offset", nil, query_params.offset)
		end
	end

	local db_path = modbus_utils:get_db_path()
	if self.query_parameters.db_path then
		db_path = self.query_parameters.db_path

		local success, err = self.dt:check_array(db_path, modbus_utils:available_db_paths())
		if not success then
			self:add_error(STD_CODES.INVALID_QUERY, err, "db_path", nil, query_params.db_path)
		end
	end

	self:return_if_error(400)
	db_path = modbus_utils:convert_legacy_path(db_path)

	-- If offset is set, then limit must always be set.
	-- This should always be true, because limit has a default value
	if offset then
		assert(limit)
	end

	return {
		limit = limit,
		offset = offset,
		db_path = db_path,
		id = query_params.id,
		request_id = query_params.request_id,
		server_id = query_params.server_id,
		request_name = query_params.request_name,
		server_name = query_params.server_name,
	}
end

function DatabaseEntries:GET_TYPE_status()
	local query = self:validate_query_parameters()

	local entries, total = modbus_utils:list_db(query)

	local metadata = {
		limit = query.limit and tostring(query.limit),
		offset = query.offset and tostring(query.offset),
		total = tostring(total)
	}

	coroutine.yield({
		payload = {
			success = true,
			data = entries,
			metadata = metadata,
		},
		code = "200"
	})
end

return DatabaseEntries
