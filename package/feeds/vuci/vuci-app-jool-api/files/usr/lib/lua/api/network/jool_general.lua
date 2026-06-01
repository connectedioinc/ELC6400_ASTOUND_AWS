local ConfigService = require("api/ConfigService")
local jool_common = require("api/network/jool_common")
local util = require("vuci.util")

local jool = ConfigService:new({
	create = false,
	delete = false,
	general_section = "general",
	global_settings = true
})

function jool:initialize_hook()
	self.ifaces = {}
end

function jool:get_interfaces()
	if #self.ifaces > 0 then return self.ifaces end
	local valid_protos = {
		static = true,
		dhcp = true,
		dhcpv6 = true,
		wwan = true
	}
	self:table_foreach("network", "interface", function (s)
		if s[".name"] ~= "loopback" and valid_protos[s.proto] then
			table.insert(self.ifaces, s.name or s[".name"])
		end
	end)
	return self.ifaces
end

local s = jool:section("jool", "jool")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = { "interface" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local interface = s:option("interface")
		function interface:validate(value)
			return self.dt:check_array(value, self:get_interfaces())
		end
		function interface:get(value) return util.network_mapper_get(self, value) end
		function interface:set(value)
			local network_internal = util.get_network_map(self, false, false)
			local iface = network_internal[value] or value
			self:table_set(self.config, self.sid, self.api_key, iface)
			local iface_zone = jool_common.get_iface_zone(self, iface)
			if not iface_zone then return end
			self:table_foreach("firewall", "jool", function (s)
				if s.family == "ipv4" then return end
				self:table_set("firewall", s[".name"], "src", iface_zone)
			end)
		end

return jool
