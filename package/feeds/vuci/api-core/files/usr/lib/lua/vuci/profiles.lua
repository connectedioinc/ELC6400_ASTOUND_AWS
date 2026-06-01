local util = require "vuci.util"

module "vuci.profiles"

function update()
	local ret = util.ubus("rpc-profile", "update") or {}
	if ret.status ~= 0 then return false, res end
	return true
end