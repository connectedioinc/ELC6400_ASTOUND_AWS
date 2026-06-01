local FunctionService = require("api/FunctionService")

local ip_neighbors_ipv6 = FunctionService:new()

function ip_neighbors_ipv6:GET_TYPE_status()
	local utils = require("api.network.routes.utils")
	self:ResponseOK(utils.get_routes6_neighbors(ip_neighbors_ipv6))
end

return ip_neighbors_ipv6
