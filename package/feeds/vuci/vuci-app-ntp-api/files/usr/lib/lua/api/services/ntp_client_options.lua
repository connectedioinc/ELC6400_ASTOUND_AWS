
local FunctionService = require("api/FunctionService")

local ntp_client_options = FunctionService:new()

function ntp_client_options:GET_TYPE_timezones()
	local timezones = {}
	local tz = require "vuci.tz"
	for _, timezone in ipairs(tz) do
		timezones[#timezones+1] = timezone[1]
	end
	return self:ResponseOK({ timezones = timezones })
end

return ntp_client_options
