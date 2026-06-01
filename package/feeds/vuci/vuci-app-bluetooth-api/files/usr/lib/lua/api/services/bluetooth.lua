local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local board = require("vuci.board")
local b_lib = require("api/services/bluetooth_utils")

if not board:has_bluetooth()then
	return nil
end

local STATUS_CODES = {
	SCAN_FAILED = 1,
	SERVICE_DISABLED = 2,
	PAIR_ERROR = 4,
	PAIR_FAILED = 5,
	ALREADY_PAIRED = 6,
	NOT_READY = 7,
	UNPAIR_ERROR = 8,
	PAIRED_DEVICE_NOT_EXISTS = 9,
	SCAN_RUNNING = 10,
}

local UBUS_STATUS_PERMISSION_DENIED = 6

local Bluetooth = ConfigService:new({
	create = false,
	delete = false
})

-- Pairs bluetooth device.
---@param address string Device mac address.
---@return boolean status True if pairing was successful.
function Bluetooth:pair_device(address)
    local data = util.ubus("blesem", "pair", {address = address})
    if not data then return false end
    if not data.success then return false end
    return true
end

-- Pairs bluetooth device.
---@param address string Device mac address.
---@return boolean status True if unpairing was successful.
function Bluetooth:unpair_device(address)
    local data = util.ubus("blesem", "unpair", {address = address})
    if not data then return false end
    if not data.success then return false end
    return true
end

-- Starts bluetooth scan.
function Bluetooth:scan()
	if not b_lib:is_enabled() then
		self:add_critical_error(
			STATUS_CODES.SERVICE_DISABLED,
			"Service disabled, not scanning"
		)
	end

	if not b_lib:is_ready() then
		self:add_critical_error(STATUS_CODES.NOT_READY, "Service is not ready yet.")
	end

	local _, status = util.ubus("blesem", "scan.start")
	if status == UBUS_STATUS_PERMISSION_DENIED then
		self:add_critical_error(
			STATUS_CODES.SCAN_RUNNING,
			"Scan is already running"
		)
	elseif status ~= nil then
		self:add_critical_error(
			STATUS_CODES.SCAN_FAILED,
			"Failed to start a scan"
		)
	end

	self:ResponseOK()
end

function Bluetooth:GET_TYPE_status()
	local result = {}

	local status = util.ubus("blesem", "status")
	if status then
		result = status
	end

	self:ResponseOK(result)
end

Bluetooth:action("scan", function (self)
	self:scan()
end)

local BluetoothPair = Bluetooth:action("pair", function (self, data)
	if not b_lib:is_enabled() then
		self:add_critical_error(STATUS_CODES.SERVICE_DISABLED, "Bluetooth is disabled")
	end
	if not b_lib:is_ready() then
		self:add_critical_error(STATUS_CODES.NOT_READY, "Bluetooth has not started yet")
	end

	for _, v in pairs(data.address) do
		if not self:pair_device(v) then
			self:add_critical_error(STATUS_CODES.PAIR_ERROR, "Device "..v.." failed to pair")
		end
	end
	self:ResponseOK()
end)

local opt_address = BluetoothPair:option("address", { list = true })
	opt_address.require = true
	function opt_address:validate(value)
		local ok, err = self.dt:macaddr(value)
		if not ok then return ok, err end

		self:table_foreach("ble_devices", "device", function (device)
			if value == device.address then
				self:add_error(STATUS_CODES.ALREADY_PAIRED, "Device "..value.." is already paired.", self.api_key)
			end
		end)

		return true
	end

local BluetoothUnpair = Bluetooth:action("unpair", function (self, data)
	if not b_lib:is_enabled() then
		self:add_critical_error(STATUS_CODES.SERVICE_DISABLED, "Bluetooth is disabled")
	end
	if not b_lib:is_ready() then
		self:add_critical_error(STATUS_CODES.NOT_READY, "Bluetooth has not started yet")
	end

	for _, v in pairs(data.address) do
		if not self:unpair_device(v) then
			self:add_critical_error(STATUS_CODES.UNPAIR_ERROR, "Device "..v.." failed to unpair")
		end
	end
	self:ResponseOK()
end)

local opt_address = BluetoothUnpair:option("address", { list = true })
	opt_address.require = true
	function opt_address:validate(value)
		local ok, err = self.dt:macaddr(value)
		if not ok then return ok, err end

		local exist = false
		self:table_foreach("ble_devices", "device", function (device)
			if value == device.address then
				exist = true
				return false
			end
		end)
		if not exist then
			self:add_error(STATUS_CODES.PAIRED_DEVICE_NOT_EXISTS, "Device "..value.." is not paired", self.api_key)
		end

		return true
	end

local BluetoothGeneral = Bluetooth:section("blesem", "section")

	local opt_enabled = BluetoothGeneral:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

return Bluetooth
