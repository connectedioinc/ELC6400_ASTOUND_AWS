local FunctionService = require("api/FunctionService")
local internet = FunctionService:new()
local util = require("vuci.util")

function internet:GET_TYPE_status()
	local conn_status = util.ubus("connchecker", "status") or {}
	return self:ResponseOK({
		ipv4_status = conn_status["IPv4 status"] or "Untracked",
		ipv6_status = conn_status["IPv6 status"] or "Untracked",
		dns_status = conn_status["DNS status"] or "Untracked"
	})
end

return internet
