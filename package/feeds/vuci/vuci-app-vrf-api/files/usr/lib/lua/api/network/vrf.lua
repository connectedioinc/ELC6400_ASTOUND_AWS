local ConfigService = require("api/ConfigService")
local pac = require("vuci.package_checker")
local board = require("vuci.board")
local util = require("vuci.util")
local VRF = ConfigService:new()
local devices_status = require("vuci.devices_status_lib"):new(VRF.uci)
local firewall_lib = require("api.network.firewall.firewall_lib")

VRF.vrf_map = {}

function VRF:initialize_hook()
	self:table_foreach("network", "device", function(s)
		if s.type == "vrf" then self.vrf_map[s.name] = s[".name"] end
	end)
end

function VRF:get_vrf_sid()
	return self.vrf_map[self:table_get("network", self.sid, "device")]
end


function VRF:POST_init_hook()
	if not self.arguments.data then return end

	local name = self.arguments.data.name
	local generated_name = util.generate_name(self, self.config, "interface", "vrf", { ".name", "name" })
	self.arguments.data.id = generated_name
	self.arguments.data.name = name or generated_name
end

function VRF:get_network_devices()
	if self.valid_devices then return self.valid_devices end
	self.valid_devices = {}
	local devices = devices_status:get_device_status()
	local physical_ifnames = board:get_all_physical_ifnames()
	local unavailable_devs, used_bridges = {}, {}
	for _, dev in pairs(devices) do
		if dev.type == "bridge" then
			for _, port in pairs(dev["bridge-members"]) do
				unavailable_devs[port] = true
			end
		elseif dev.type == "VLAN" then
			local bridge = dev.name:match("^(.+)%.%d+$")
			used_bridges[bridge] = true
		end
	end
	for _, dev in pairs(devices) do
		if (util.contains(physical_ifnames, dev.name) or (dev.type == "bridge" and not used_bridges[dev.name]) or dev.type == "VLAN" or dev.type == "VPN") and not unavailable_devs[dev.name] then
			table.insert(self.valid_devices, dev.name)
		end
	end
	return self.valid_devices
end

local s = VRF:section("network", "interface")
s:make_primary()
s.default_options.id.maxlength = 15

function s:filter(s)
	return s.device and self.vrf_map[s.device]
end

function s:create_defaults()
	local dev_name = util.generate_name(self, "network", "device", "vrfdev")
	self:table_section("network", "device", dev_name, {
		type = "vrf",
		ipv6 = "1",
		name = self.sid,
		enabled = "0"
	})

	self.vrf_map[self.sid] = dev_name
	return {
		proto = "none",
		disabled = "1",
		device = self.sid
	}
end

	local name = s:option("name")
		name.cfg_require = true
		function name:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "interface", function(s)
				if self.sid ~= s[".name"] and (s.name or s[".name"]) == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return self.dt:uciname(value)
		end
		function name:get(value)
			return value or self.sid
		end

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = { "table" } }
		function enabled:validate(val)
			return self.dt:is_bool(val)
		end
		function enabled:get(val)
			local disabled = self:table_get(self.config, self.sid, "disabled")
			if not disabled or disabled == "0" then
				return "1"
			end
			return "0"
		end
		function enabled:set(val)
			--Set value for VRF device
			self:table_set("network", self:get_vrf_sid(), "enabled", val)
			if val == "1" then
				return self:table_delete("network", self.sid, "disabled")
			end
			self:table_set("network", self.sid, "disabled", "1")
		end

	local table = s:option("table")
		function table:validate(value)
			local num = tonumber(value)
			if num and num >= 253 and num <= 255 then return false, "253-255 range is reserved for the default routing tables" end
			return self.dt:irange(value, 1, 4294967295)
		end

		function table:get()
			return self:table_get("network", self:get_vrf_sid(), "table")
		end

		function table:set(value)
			self:table_set("network", self:get_vrf_sid(), "table", value)
		end

	local link = s:option("link", { list = true })
		function link:validate(value)
			return self.dt:check_array(value, self:get_network_devices())
		end

		function link:get()
			return self:table_get("network", self:get_vrf_sid(), "ports")
		end

		function link:set(value)
			self:table_set("network", self:get_vrf_sid(), "ports", value)
		end

function VRF:POST_before_commit_hook()
	firewall_lib:add_net_to_zone(self, "lan", self.sid)
end

function VRF:DELETE_before_section_delete_hook()
	if pac.is_installed("frr-bgpd") then
		self:table_foreach("bgp", "bgp_instance", function(s)
			if s.vrf == self.sid then
				self:add_critical_error(STD_CODES.INVALID_OPT, "This VRF is used by a BGP instance")
			end
		end)
	end

	firewall_lib:del_net_from_zones(self, self.sid)
	self:table_delete("network", self:get_vrf_sid())
end

return VRF
