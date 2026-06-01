local fw = require "vuci.firewall".init()

local FunctionService = require("api/FunctionService")
local iptables = FunctionService:new()

function iptables:GET_TYPE_status()
	local data = {}
	for _, name in ipairs(fw:get_iptables_names(true)) do
		table.insert(data, fw:get_iptables_status(name, true))
	end
	self:ResponseOK(data)
end

function iptables:reset_counters()
	local res, message = fw:reset_iptables_counters(true)
	if not res then return self:add_critical_error(STD_CODES.CODE_ERROR, message) end
	self:ResponseOK()
end
iptables:action("reset", iptables.reset_counters)

return iptables
