local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local board = require("vuci.board")

if not board:has_bluetooth()then
    return nil
end

local Bluetooth = ConfigService:new({
    create = false,
    anonymous = true,
    delete = false
})

-- Checks if bluetooth is enabled.
---@return boolean enabled Bluetooth enabled.
function Bluetooth:is_enabled()
	return self:table_get("blesem", "general", "enabled") == "1" or false
end

-- Gets bluetooth device data table from ubus.
---@param address string Device mac address.
---@return string | table data Device data table.
function Bluetooth:get_device_info(address)
	if not address or not self:is_enabled() then return "N/A" end

	local data = util.ubus("blesem", "stat", { address = address })
	if not (data and next(data)) then return "N/A" end

	-- Rename field
	data["mac address"] = data["address"]
	data["address"] = nil

	return data
end

-- Updates bluetooth device rssi data to self.rssi[mac_address] .
function Bluetooth:update_all_rssi()
    if self:is_enabled() then
        self.rssi = {}
        local rssi = util.ubus("blesem", "scan.result")
        if rssi and rssi.devices then
            for _, v in ipairs(rssi.devices) do
                if v.address then
                    self.rssi[v.address] = v.rssi and tostring(v.rssi) or "N/A"
                end
            end
        end
    end
end

local Paired = Bluetooth:section("ble_devices", "device")

    local opt_store_data = Paired:option("store_data")
        function opt_store_data:validate(value)
            return self.dt:is_bool(value)
        end

    local opt_name = Paired:option("name")
        opt_name.readonly = true

    local opt_address = Paired:option("address")
        opt_address.readonly = true

    local opt_rssi = Paired:option("rssi")
        opt_rssi.readonly = true
        function opt_rssi:get()
            self:update_all_rssi()
            local address = self:table_get(self.config, self.sid, "address")
            return self.rssi and self.rssi[address] or "N/A"
        end

    local opt_device_data = Paired:option("data")
        opt_device_data.readonly = true
        function opt_device_data:get()
            local address = self:table_get(self.config, self.sid, "address")
            return self:get_device_info(address)
        end

return Bluetooth
