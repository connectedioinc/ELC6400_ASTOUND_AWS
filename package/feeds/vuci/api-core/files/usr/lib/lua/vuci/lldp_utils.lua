local uci = require("vuci.uci")

local utils = {}

function utils.is_interface_in_use(interface)
	local lldp_enabled = uci:get("lldp", "lldp", "enabled") == "1"
	local used_by_lldp = uci:get("lldp", "lldp", "mgmt_interface") == interface
	return lldp_enabled and used_by_lldp
end

return utils
