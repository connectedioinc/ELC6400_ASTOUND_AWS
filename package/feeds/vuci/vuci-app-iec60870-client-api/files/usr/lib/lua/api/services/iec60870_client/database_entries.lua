local FunctionService = require("api.FunctionService")
local utils = require("api.services.iec60870_client.utils")

local DatabaseEntries = FunctionService:new()

function DatabaseEntries:validate_query_parameters()
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
		id = query_params.id,
		client_id = query_params.client_id,
		information_object_address = query_params.information_object_address,
		common_address = query_params.common_address,
		data_type = query_params.data_type,
		cause_of_transmission = query_params.cause_of_transmission
	}
end

function DatabaseEntries:GET_TYPE_status()
	local query = self:validate_query_parameters()

	local entries, total = utils.list_db(query)

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
