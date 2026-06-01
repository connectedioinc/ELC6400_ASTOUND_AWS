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

-- Gets current scan status. Sends scanning = "1" if scan is running.
function Bluetooth:scan_status()
	if b_lib:is_enabled() then
		local data = b_lib:update_scan_results()
		if data.error then self:add_critical_error(STATUS_CODES.NOT_READY, "Service is not ready yet.") end
		self:ResponseOK({
			scanning = data.response.scanning and "1" or "0"
		})
	end
	self:add_critical_error(
		STATUS_CODES.SERVICE_DISABLED,
		"Bluetooth service is disabled"
	)
end

function Bluetooth:GET_TYPE_status()
	self:ResponseOK(self:scan_status())
end

return Bluetooth