local FunctionService = require("api/FunctionService")
local fs = require "nixio.fs"

local data_sender_format = FunctionService:new()

local d_utils = require("api.services.data_sender_utils")(data_sender_format)

function data_sender_format:GET_TYPE_options()
	return self:ResponseOK(d_utils:available_format_types())
end

data_sender_format:action("download_example_format_lua", function (self)
    local file_path = "/etc/data_sender/modules/format/lua/example_format_lua.lua"
    if not fs.access(file_path) then
        return self:ResponseNotFound("Failed to download format example lua file.")
    end
    return self:File(file_path, "example_format_lua.lua")
end)

return data_sender_format