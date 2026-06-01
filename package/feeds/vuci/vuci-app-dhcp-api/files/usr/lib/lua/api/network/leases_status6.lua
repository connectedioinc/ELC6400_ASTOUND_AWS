local board = require("vuci.board")

if board:is_switch() then return nil end

local FunctionService = require("api/FunctionService")
local leases = FunctionService:new()

function leases:GET_TYPE_status()
	local status = require "vuci.status"
	return self:ResponseOK(status.dhcp_leases(6) or {})
end

return leases
