local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local flags = {
	create = false,
	delete = false,
	global_settings = true,
	general_section = "ldp"
}

local ldp_general = ConfigService:new(flags)
ldp_general.bridged_devices = {}
ldp_general.ifaces = {}

function ldp_general:PUT_section_init_hook()
	self:table_foreach("network", "device", function (s)
		if s.type ~= "bridge" then return end
		for _, dev in ipairs(s.ports or {}) do
			self.bridged_devices[dev] = s.description or s.name or s[".name"]
		end
	end)

	local devices_status = require("vuci.devices_status_lib"):new(self.uci)
	local devices = devices_status:get_device_status()

	for _, device in ipairs(devices) do
		if util.contains({ "8021ad", "8021q", "VLAN", "ethernet", "bridge" }, device.type) then
			table.insert(self.ifaces, device.name)
		end
	end
end

local ldp = ldp_general:section("mpls", "ldp_general")

	local enabled = ldp:option("enabled")
	enabled.require = { ["1"] = { "router_id", "transport_address", "ifname" } }

		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function enabled:get(value)
			return value or "0"
		end

	local enabled_vty = ldp:option("enabled_vty")
		function enabled_vty:validate(value)
			return self.dt:is_bool(value)
		end

	local router_id = ldp:option("router_id")
		function router_id:validate(value)
			return self.dt:ip4addr(value)
		end

		function router_id:set(value)
			self:table_set(self.config, self.sid, "id", value)
		end

		function router_id:get()
			return self:table_get(self.config, self.sid, "id")
		end

	local ifname = ldp:option("ifname", { list = true })
	ifname.minlength = 1
	ifname.maxlength = 15
		function ifname:validate(value)
			if self.bridged_devices[value] then
				self:add_error(STD_CODES.INVALID_OPT,
					"Physical interface '" .. value .. "' is used in '" .. self.bridged_devices[value] .. "' bridge, you need to remove it first",
					"Validation")
			end
			return self.dt:check_array(value, self.ifaces)
		end

	local transport_address = ldp:option("transport_address")
		function transport_address:validate(value)
			return self.dt:ip4addr(value)
		end

return ldp_general
