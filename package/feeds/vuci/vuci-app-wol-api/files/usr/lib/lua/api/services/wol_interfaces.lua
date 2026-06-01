local board = require("vuci.board")
local uci = require "uci".cursor()
local util = require("vuci.util")
local ntm

return function()
	local interfaces = {}
	ntm = ntm or require "vuci.network".init()
	for _, iface in ipairs(ntm:get_networks()) do
		local ifname = iface:ifname()
		if ifname and ifname ~= "lo" and not iface:is_virtual() and not util.contains(interfaces, ifname) then
			if board:is_switch() or uci:get("network", iface.sid, "area_type") == "lan" then
				table.insert(interfaces, ifname)
			end
		end
	end
	return interfaces
end
