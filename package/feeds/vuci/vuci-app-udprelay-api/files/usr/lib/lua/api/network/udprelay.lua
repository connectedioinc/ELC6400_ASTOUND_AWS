local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local udprelay = ConfigService:new({ anonymous = true })

function udprelay:get_interfaces()
	if self.interfaces then return self.interfaces end
	self.interfaces = {}
	self:table_foreach("network", "interface", function(s)
		if s[".name"] == "loopback" or s[".name"]:match("_static$") or s.invisible == "1" then
			return
		end
		if s.proto == "static" or s.proto == "dhcp" then
			self.interfaces[#self.interfaces+1] = s.name or s[".name"]
		end
	end)
	return self.interfaces
end

local s = udprelay:section("udprelay", "general")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"port", "interfaces", "interface_mark"} }
		function enabled:validate(value) return self.dt:is_bool(value) end

	local port = s:option("port")
		function port:validate(value) return self.dt:port(value) end

	local interfaces = s:option("interfaces", { list = true })
		function interfaces:validate(value) return self.dt:check_array(value, self:get_interfaces()) end
		function interfaces:get(value) return util.network_mapper_get(self, value) end
		function interfaces:set(value) util.network_mapper_set(self, value) end

	local interface_mark = s:option("interface_mark")
		function interface_mark:validate(value) return self.dt:check_array(value, self:get_interfaces()) end
		function interface_mark:get(value) return util.network_mapper_get(self, value) end
		function interface_mark:set(value) util.network_mapper_set(self, value) end

return udprelay
