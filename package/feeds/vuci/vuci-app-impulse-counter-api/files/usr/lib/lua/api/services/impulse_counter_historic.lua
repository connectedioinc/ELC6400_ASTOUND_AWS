local FunctionService = require("api/FunctionService")
local impulse_counter_utils = require("api.services.impulse_counter_utils")

local impulse_counter = FunctionService:new()

function impulse_counter:GET_TYPE_status()
	local filter = self.query_parameters.filter
	if filter and type(filter) ~= "string" then
		return self:add_critical_error(STD_CODES.INVALID_QUERY, "Malformed query parameter 'filter'", HTTP_STATUS_CODES.BAD_REQUEST)
	end

	local entries = impulse_counter_utils.list_db_entries(filter)
	return self:ResponseOK(entries)
end


return impulse_counter
