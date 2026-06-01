local util = require("vuci.util")

local FunctionService = require("api/FunctionService")
local ldp_status = FunctionService:new()

function ldp_status:GET()
	local socket = require("socket")
	local c = socket.tcp()
	local password = "admin01" -- default password for vty
	local neighbor_cmd = "show mpls ldp neighbor json"
	local interface_cmd = "show mpls ldp interface json"
	local uci = require("vuci.uci").cursor()

	c:settimeout(5)
	c:connect("127.0.0.1", 2612)
	c:send(password.."\n")
	c:send(neighbor_cmd.."\n")
	c:send(interface_cmd.."\n")
	c:send("exit\n")
	local response = c:receive("*a")
	c:close()

	local status = {}
	status.interfaces = {}
	status.neighbors = {}
	local neigbor_data = util.parse_vtysh_json(response, neighbor_cmd, "{}")

	for _, neigh in ipairs(neigbor_data.neighbors or {}) do
		table.insert(status.neighbors, {
			state = neigh.state,
			uptime = neigh.upTime,
			transport_address = neigh.transportAddress,
			family = neigh.addressFamily,
			neighbor_id = neigh.neighborId
		})
	end

	local interface_data = util.parse_vtysh_json(response, interface_cmd, "{}")

	for iface, data in pairs(interface_data) do
		local ifname = iface:match("[%a%d-_]*")
		table.insert(status.interfaces, {
			name = ifname,
			state = data.state,
			uptime = data.upTime,
			adjacencies = tostring(data.adjacencyCount or ""),
			family = data.addressFamily
		})
	end

	status.enabled = uci:get("mpls", "ldp", "enabled") or "0"
	self:ResponseOK(status)
end
return ldp_status
