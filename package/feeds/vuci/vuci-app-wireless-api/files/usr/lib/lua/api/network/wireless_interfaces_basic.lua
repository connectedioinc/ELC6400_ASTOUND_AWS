local has_wifi = require("vuci.board"):has_wifi()

if not has_wifi then
	return nil
end

local FunctionService = require("api/FunctionService")
local uci = require "vuci.uci"

local wifi_ifaces_basic = FunctionService:new()

function wifi_ifaces_basic:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function wifi_ifaces_basic:GET_TYPE_status()
	local wireless = require "vuci.wireless"
	
	if self.sid then
		if uci:get("wireless", self.sid) ~= "wifi-iface" then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "Interface doesn't exist.", "URL", "404")
		end

		return self:ResponseOK(wireless:interface_status_basic(self.sid, uci))
	end

	local res = {}
	uci:foreach("wireless", "wifi-iface", function(s)
		res[#res+1] = wireless:interface_status_basic(s[".name"], uci)
	end)
	
	return self:ResponseOK(res)
end

return wifi_ifaces_basic