local FunctionService = require("api.FunctionService")
local sqlite = require("vuci.sqlite")
local dlms_utils = require("api.services.dlms_utils")
local query_parsing = require("api/query")

local DatabaseEntries = FunctionService:new()

local function list_db(options)
	options = options or {}
	assert(type(options) == "table")

	local db = dlms_utils:open_db()

	local where = {
		id = options.id,
		name = options.group_name,
		group_id = options.group_id,
	}

	local where_clause = sqlite.create_where_clause(where)
	local total = db:row_count("dlms_data", where_clause, where)

	local entries = {}
	local rows = db:select_paginated(
		"SELECT * FROM dlms_data " .. where_clause,
		where,
		options.limit,
		options.offset
	)
	for _, row in ipairs(rows) do
		table.insert(entries, {
			id = tostring(row.id),
			timestamp = tostring(row.time),
			group_name = tostring(row.name),
			group_id = row.group_id,
			data = row.data,
		})
	end

	return entries, total
end

function DatabaseEntries:validate_query_parameters()
	local params_to_check = {
		limit = "number",
		offset = "number",
		group_name = "string",
		group_id = "string",
		id = "string"
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

	self:return_if_error(400)

	-- If offset is set, then limit must always be set.
	-- This should always be true, because limit has a default value
	if offset then
		assert(limit)
	end

	return {
		limit = limit,
		offset = offset,
		group_name = query_params.group_name,
		group_id = query_params.group_id,
		id = query_params.id,
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
