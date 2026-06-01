local FunctionService = require("api/FunctionService")
local fs = require "nixio.fs"

local data_sender_encoder = FunctionService:new()

local d_utils = require("api.services.data_sender_utils")(data_sender_encoder)

function data_sender_encoder:GET_TYPE_options()
	return self:ResponseOK(d_utils:available_encoder_types())
end

return data_sender_encoder