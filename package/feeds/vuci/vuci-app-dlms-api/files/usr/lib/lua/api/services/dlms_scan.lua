local FunctionService = require("api/FunctionService")
local dlms_utils = require("api.services.dlms_utils")

local ScanEndpoint = FunctionService:new()

local SCAN_STATUSES = {
	IDLE = 0,
	IN_QUEUE = 1,
	IN_PROGRESS = 2,
	ERROR = 3,
	COMPLETED = 4,
}

do
	local StartScan = ScanEndpoint:action("start", function(self, data)
		local success, err_result = dlms_utils.start_scan(data.device_ids)
		if not success then
			self:ResponseError(err_result)
		end
		self:ResponseOK()
	end)

	local device_ids = StartScan:option("device_ids", { list = true })
	device_ids.require = true
	function device_ids:validate(value)
		return self.dt:uinteger(value)
	end
end

do
	local StopScan = ScanEndpoint:action("stop", function(self, data)
		local success, err_result = dlms_utils.stop_scan(data.device_ids)
		if not success then
			self:ResponseError(err_result)
		end
		self:ResponseOK()
	end)

	local device_ids = StopScan:option("device_ids", { list = true })
	device_ids.require = true
	function device_ids:validate(value)
		return self.dt:uinteger(value)
	end
end

local function has_physical_device(statuses, physical_device_id)
	for _, status in ipairs(statuses) do
		if status.physical_device_id == physical_device_id then
			return true
		end
	end
	return false
end

function ScanEndpoint:GET_TYPE_status()
	local UBUS_STATUS = { UNKNOWN_ERROR = 1 }
	local res = {}

	local db = dlms_utils:open_db()

	local scan_status = dlms_utils.get_scan_status()
	if not scan_status then
		self:add_critical_error(UBUS_STATUS.UNKNOWN_ERROR, "Failed to get scan progress")
	end

	local scanned_devices = db:select("SELECT DISTINCT physical_device_id FROM association_view")
	for _, scanned_device in pairs(scanned_devices) do
		if not has_physical_device(scan_status, scanned_device.physical_device_id) then
			table.insert(scan_status, {
				status = SCAN_STATUSES.COMPLETED,
				physical_device_id = scanned_device.physical_device_id
			})
		end
	end
	res = scan_status

	self:ResponseOK(res)
end

return ScanEndpoint
