local FunctionService = require("api/FunctionService")
local board = require("vuci.board")
local mdm = require("vuci.modem")
local util = require("vuci.util")

if not board:has_gps()then
	return nil
end

local GPS = FunctionService:new()

	local has_dpo_support = false
	for modem in mdm:info_iterator() do
		if mdm:has_dpo_mode_support(modem.usb_id) then
			has_dpo_support = true
			break
		end
	end
-- Modem features that are needed for specific gps feature support
function GPS:GET_TYPE_status()
	local res = util.ubus("gpsd", "status") or {}
	res.dpo_support = has_dpo_support and "1" or "0"
	return self:ResponseOK(res)
end

return GPS
