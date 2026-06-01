local FunctionService = require("api/FunctionService")
local board = require("vuci.board")
local b_lib = require("api/services/bluetooth_utils")
if not board:has_bluetooth()then
	return nil
end

local STATUS_CODES = {
	SERVICE_DISABLED = 2,
	NOT_READY = 7
}

local Bluetooth = FunctionService:new()

-- Gets bluetooth scan results. Sends found table of devices that was found.
function Bluetooth:scan_results()
	if b_lib:is_enabled() then
		local data = b_lib:update_scan_results()
		if data.error then self:add_critical_error(STATUS_CODES.NOT_READY, "Service is not ready yet.") end
		self:ResponseOK({
			devices = data.response.data
		})
	end
	self:add_critical_error(
		STATUS_CODES.SERVICE_DISABLED,
		"Bluetooth service is disabled"
	)
end

function Bluetooth:GET_TYPE_status()
	self:ResponseOK(self:scan_results())
end

return Bluetooth