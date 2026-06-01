local util = require("vuci.util")
local uci = require "vuci.uci".cursor()
local b = {}

-- Checks if bluetooth is enabled.
---@return boolean enabled Bluetooth enabled.
function b:is_enabled()
	return uci:get("blesem", "general", "enabled") == "1"
end

-- Checks if Bluetooth (blesem) is ready.
---@return boolean ready Bluetooth status.
function b:is_ready()
	local result = util.ubus("blesem", "status")
	return result and result.ready
end

-- Updates bluetooth scan results to self.scan_data. Mainly used to cache values.
function b:update_scan_results()
	if self.scan_data then return end
	local devices = {}
	local scan_status = false
	if self:is_enabled() then
		if not self:is_ready() then
			return { response = {}, error = true }
		end
		local status = util.ubus("blesem", "scan.result")
		if status then
			if status.devices then
				for _, v in pairs(status.devices) do
					local paired, uci_name = self:is_paired(v.address)
					table.insert(devices, {
						name = v.name or "N/A",
						rssi = v.rssi and tostring(v.rssi) or "N/A",
						address = v.address,
						paired = paired and "1" or "0",
						uci_name = uci_name
					})
				end
			end
			scan_status = status.scanning == 1
		end
	end
	self.scan_data = {
		scanning = scan_status,
		data = devices
	}
	return { response = self.scan_data, error = false }
end

-- Checks if device is paired.
---@param address string Device mac address.
---@return boolean paired, string | nil uci_name Pair status and uci name if device is paired.
function b:is_paired(address)
	local paired = false
	local uci_name
	uci:foreach("ble_devices", "device", function (device)
		if device.address == address then
			paired = true
			uci_name = device[".name"]
		end
	end)
	return paired, uci_name
end

return b
