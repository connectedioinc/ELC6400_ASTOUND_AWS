local FunctionService = require("api/FunctionService")
local ulog_utils = require("api.services.ulog_utils")

local ulog_options = FunctionService:new()

function ulog_options:GET_TYPE_available_interfaces()
	self:ResponseOK({
		network = ulog_utils:networks()
	})
end

return ulog_options
