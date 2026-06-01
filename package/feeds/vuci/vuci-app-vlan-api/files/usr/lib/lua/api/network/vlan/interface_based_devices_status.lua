local FunctionService = require("api/FunctionService")
local devices = FunctionService:new()

function devices:GET_TYPE_status()
	local uci = require("vuci.uci").cursor()
	local devs = {}
	local filtered_devices = {}
	uci:foreach("network", "device", function(s)
		if s.macaddr or not s[".name"]:match("^%d+$") then return end
		table.insert(filtered_devices, s)
	end)
	for _, dev1 in ipairs(filtered_devices) do
		for _, dev2 in ipairs(filtered_devices) do
			if dev1.name == dev2.ifname then
				table.insert(devs, dev2)
			end
		end
	end
	self:ResponseOK(devs)
end

return devices
