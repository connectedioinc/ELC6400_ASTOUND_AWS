local FunctionService = require("api/FunctionService")
local board = require("vuci.board")
local util = require("vuci.util")

if not board:has_gps()then
	return nil
end

local GPS = FunctionService:new()

-- Formats value to return as a string and if it fails return as "N/A"
---@param val any Value to be transformed
---@return string value Transformed value
local function get_value(val)
	return val and tostring(val) or "N/A"
end

-- Gets GPS position data
function GPS:get_position_data()
	local info = util.ubus("gpsd", "position") or {}
	return {
		fix_status = get_value(info.fix_status),
		accuracy = get_value(info.accuracy),
		altitude = get_value(info.altitude),
		latitude = info.latitude and string.format("%.6f", info.latitude) or "N/A",
		longitude = info.longitude and string.format("%.6f", info.longitude) or "N/A",
		speed = get_value(info.speed),
		angle = get_value(info.angle),
		satellites = get_value(info.satellites),
		timestamp = get_value(info.timestamp),
		utc_timestamp = get_value(info.utc_timestamp)
	}
end

function GPS:GET_TYPE_status()
	self:ResponseOK(self:get_position_data())
end

return GPS