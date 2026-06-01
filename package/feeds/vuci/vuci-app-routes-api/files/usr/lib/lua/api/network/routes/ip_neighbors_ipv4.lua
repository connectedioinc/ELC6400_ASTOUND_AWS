local FunctionService = require("api/FunctionService")

local ip_neighbors_ipv4 = FunctionService:new()

function ip_neighbors_ipv4:GET_TYPE_status()
	local utils = require("api.network.routes.utils")
	self:ResponseOK(utils.get_arp(ip_neighbors_ipv4))
end

return ip_neighbors_ipv4
