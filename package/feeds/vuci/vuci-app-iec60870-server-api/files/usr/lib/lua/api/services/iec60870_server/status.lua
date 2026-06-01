local FunctionService = require("api.FunctionService")
local iec60870_utils = require("api.services.iec60870_server.utils")
local util = require("vuci.util")

local Status = FunctionService:new()

function Status:GET_TYPE_status()
	local result, err = iec60870_utils.get_status()
	if not result then
		self:add_critical_error(err, "Unexpected error occured")
	end

	self:ResponseOK(util.table_to_json_object(result))
end

return Status
