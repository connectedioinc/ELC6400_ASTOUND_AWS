local sys = require("vuci.sys")
local util = require("vuci.util")
local FunctionService = require("api/FunctionService")

local connections = FunctionService:new()

function connections:GET_TYPE_status()
	local conns = sys.net.conntrack() or {}
	local lookup = {}

	for i = #conns, 1, -1 do
		local c = conns[i]
		if (c.src == "127.0.0.1" and c.dst == "127.0.0.1") or (c.src == "::1" and c.dst == "::1") then
			table.remove(conns, i)
		else
			lookup[c.dst] = true
			lookup[c.src] = true
		end
	end

	local lookup_arr = {}
	for addr in pairs(lookup) do lookup_arr[#lookup_arr+1] = addr end

	local rrdns = util.ubus("network.rrdns", "lookup", { addrs = lookup_arr, timeout = 5000, limit = 1000 }) or {}

	for _, c in ipairs(conns) do
		for addr, hostname in pairs(rrdns) do
			if c.src == addr then c.src_hostname = hostname end
			if c.dst == addr then c.dst_hostname = hostname end
		end
	end

	table.sort(conns, function (a, b)
		return a.bytes > b.bytes
	end)

	return self:ResponseOK(conns)
end

return connections
