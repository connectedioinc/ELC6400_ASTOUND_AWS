local util = require("vuci.util")
local pac = require("vuci.package_checker")
local uci = require("vuci.uci")

local p = {}

function p.validate_profinet_status()
	if not p.is_enabled() then
		return false
	end
	local data = util.ubus("profinet", "get_connection_status")
	return data and data.error == 0
end

function p.is_enabled()
	return pac.is_installed("profinet-io-device") and uci:get("profinet", "profinet", "enabled") == "1"
end

return p
