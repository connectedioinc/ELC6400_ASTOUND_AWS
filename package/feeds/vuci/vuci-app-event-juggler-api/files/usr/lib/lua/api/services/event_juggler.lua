
local FunctionService = require("api/FunctionService")

local events_juggler = FunctionService:new()

local jg_utils = require ("api.services.event_juggler_utils")(events_juggler)

function events_juggler:GET_TYPE_options()
	self:ResponseOK(jg_utils:get_instance_limits())
end

return events_juggler