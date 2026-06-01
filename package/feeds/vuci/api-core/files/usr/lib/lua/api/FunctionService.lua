local BasicService = require("api/BasicService")
local api_utils = require("api/api_utils")

local FunctionService = {}

-- Class that is used when a service has no associated configuration file
function FunctionService:new()
    local o = BasicService:new()
    setmetatable(o, self)
    self.__index = self
    -- POST entry point
    function o:POST()
        self:validate_body()
        if api_utils:is_table_empty(self.actions) then
            self:ResponseNotImplemented("POST not implemented")
        end
        if self.service_group == self.service_groups_enum.actions then
            return self:POST_action()
        else
            self:add_critical_error(STD_CODES.NO_ACTION, "No action provided", "Validation")
        end
    end

    return o
end

return FunctionService
