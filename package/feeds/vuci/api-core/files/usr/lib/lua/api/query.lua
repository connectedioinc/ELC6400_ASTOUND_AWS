local api_utils = require("api/api_utils")

local query = {}

local reserved_parameters = {
    offset = true,
    limit = true,
    all_options = true
}

local function get_search_params(params)
    local search_params = {}
    for k, v in pairs(params) do
        if not reserved_parameters[k] then
            search_params[k] = v
        end
    end
    return search_params
end

--- Stops further request processing if invalid query parameters are found
---@param param_types table<string, "string"|"number">
---@param config_service any
function query:validate_query_format(param_types, config_service)
	for param, expected_type in pairs(param_types) do
		local value = config_service.query_parameters[param]
		if value then
			local is_invalid = (expected_type == "number" and tonumber(value) == nil) or (expected_type == "string" and type(value) ~= "string")
			if is_invalid then
				config_service:add_error(
					STD_CODES.INVALID_QUERY,
					string.format("Malformed query parameter '%s'", param),
					HTTP_STATUS_CODES.BAD_REQUEST
				)
			end
		end
	end

	config_service:return_if_error(400)
end

function query:validate_query(params, config_service)
	if not params then return end

	if params.limit then
		if not tonumber(params.limit) then
			config_service:add_error(STD_CODES.INVALID_QUERY, "Provided limit is not a number", "Query")
		end
	end
	if params.offset then
		if not tonumber(params.offset) then
			config_service:add_error(STD_CODES.INVALID_QUERY, "Provided offset is not a number", "Query")
		end
	end
	if params.offset and not params.limit then
		config_service:add_error(STD_CODES.INVALID_QUERY, "Limit must be provided with offset", "Query")
	end
	config_service:return_if_error(400)
end

-- selects a certais amount of sections depending on sections
function query:limit(params, sections)
	local limited_sections = {}
	for i, section in pairs(sections) do
		if i <= tonumber(params.limit) then
			table.insert(limited_sections, section)
		end
	end
	return limited_sections
end

--selects sections from some offset
function query:offset(params, sections)

	local limited_sections = {}
	local offset = tonumber(params.offset)
	local limit = tonumber(params.limit)
	local used_limit = 0
	for i, section in pairs(sections) do
		if i > offset then
			table.insert(limited_sections, section)
			used_limit = used_limit + 1
		end
		if used_limit == limit then
			return limited_sections
		end
	end
	return limited_sections
end

-- *first search, then apply limit (if exists), then offset(if exists)
-- *by useing the logic of databases, offset must have a limit
-- filters the response sections by the value provided
function query:query_filter(params, response, response_table)
	if not params then return end
	response = query:query_search(params, response)
	if not api_utils:is_table_empty(response) then
		table.insert(response_table, response)
	end
end

-- return some amount of values depending on offset(the start index of all returned sections)
-- and limit(number of entries from offset)
function query:query_slice(params, response_table)
	if not params then return response_table end
	if params.offset and params.limit then
		response_table = query:offset(params, response_table)
	elseif params.limit then
		response_table = query:limit(params, response_table)
	end
    return response_table
end

-- query search function that uses a value and optionaly a key to find sections
function query:query_search(params, section)
    local search_params = get_search_params(params)
	if not api_utils:is_table_empty(search_params) and section then
		for k, v in pairs(search_params) do
			if not section[k] or section[k] ~= v then
				return nil
			end
		end
		return section
	end
	return section
end

return query