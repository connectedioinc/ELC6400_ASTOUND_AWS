local FunctionService = require("api.FunctionService")
local sqlite = require("vuci.sqlite")
local dnp3_utils = require("api.services.dnp3_utils")
local query_parsing = require("api/query")

local DatabaseEntries = FunctionService:new()

local function list_db(options)
	options = options or {}
	assert(type(options) == "table")

	local db_path
	if options.db_location == "ram" then
		db_path = dnp3_utils.DB_LOCATION_RAM
	elseif options.db_location == "flash" then
		db_path = dnp3_utils.DB_LOCATION_FLASH
	else
		-- This should be unreachable,
		-- :validate_query_parameters() validates that `options.db_location` is a valid value.
		error("Invalid db_location")
	end

	local db = sqlite.database({ path = db_path })

	local where = {
		id = options.id,
		data_type = options.data_type,
		name = options.name,
		client_id = options.client_id,
		client_name = options.client_name,
		request_id = options.request_id,
	}

	local where_clause = sqlite.create_where_clause(where)
	local total = db:row_count("dnp3_data", where_clause, where)

	local entries = {}
	local rows = db:select_paginated(
		"SELECT * FROM dnp3_data " .. where_clause,
		where,
		options.limit,
		options.offset
	)
	for _, row in ipairs(rows) do
		table.insert(entries, {
			id = tostring(row.id),
			timestamp = tostring(row.time),
			name = row.name,
			data_type = row.data_type,
			data = row.response_data,
			request_id = row.request_id,
			client_id = row.client_id,
			client_name = row.client_name,
		})
	end

	return entries, total
end

function DatabaseEntries:validate_query_parameters()
	local query_params = self.query_parameters

	local params_to_check = {
		limit = "number",
		offset = "number",
		db_location = "string",
		name = "string",
		id = "string",
		data_type = "string",
		client_id = "string",
		client_name = "string",
		request_id = "string",
	}
	query_parsing:validate_query_format(params_to_check, self)

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

	local db_location = "ram"
	if query_params.db_location then
		db_location = query_params.db_location

		local success, err = self.dt:check_array(db_location, { "ram", "flash" })
		if not success then
			self:add_error(STD_CODES.INVALID_QUERY, err, "db_location", nil, db_location)
		end
	end

	self:return_if_error(400)

	-- If offset is set, then limit must always be set.
	-- This should always be true, because limit has a default value
	if offset then
		assert(limit)
	end

	return {
		limit = limit,
		offset = offset,
		db_location = db_location,
		name = query_params.name,
		id = query_params.id,
		data_type = query_params.data_type,
		client_id = query_params.client_id,
		client_name = query_params.client_name,
		request_id = query_params.request_id,
	}
end

function DatabaseEntries:GET_TYPE_status()
	local query = self:validate_query_parameters()

	local entries, total = list_db(query)

	local metadata = {
		limit = query.limit and tostring(query.limit),
		offset = query.offset and tostring(query.offset),
		total = tostring(total)
	}

	coroutine.yield({
		payload = {
			success = true,
			data = entries,
			metadata = metadata
		},
		code = "200"
	})
end

return DatabaseEntries
