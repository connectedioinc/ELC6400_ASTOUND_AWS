local has_wifi = require("vuci.board"):has_wifi()

if not has_wifi then
	return nil
end

local FunctionService = require("api/FunctionService")
local uci = require "vuci.uci"

local wdevs_basic = FunctionService:new()

function wdevs_basic:get_device_status_basic(devname)
	local wireless = require "vuci.wireless"
	local device = wireless:device_status_basic(devname, uci)
	device.id = devname
	return device
end

function wdevs_basic:get_status_basic()
	if self.sid then
		if uci:get("wireless", self.sid) ~= "wifi-device" then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "Device doesn't exist.", "device", "404")
		end
		return self:ResponseOK(self:get_device_status_basic(self.sid))
	else
		local res = {}
		uci:foreach("wireless", "wifi-device", function(s)
			res[#res+1] = self:get_device_status_basic(s[".name"])
		end)
		return self:ResponseOK(res)
	end
end

function wdevs_basic:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function wdevs_basic:GET_TYPE_status()
	return self:get_status_basic()
end

return wdevs_basic