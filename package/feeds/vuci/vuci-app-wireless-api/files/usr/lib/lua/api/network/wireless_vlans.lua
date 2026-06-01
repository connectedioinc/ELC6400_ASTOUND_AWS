local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local board = require("vuci.board")

local is_ap = board:is_ap()

local wifi_vlans = ConfigService:new()
local wireless_lib = require("api.network.wireless_lib"):new(wifi_vlans)

function wifi_vlans:POST_init_hook()
	if not self.arguments.data then return end

	local description = self.arguments.data.description
	local generated_name = util.generate_name(self, self.config, "wifi-vlan", "wifi_vlan")
	self.arguments.data.id = generated_name
	self.arguments.data.description = description or generated_name
	self:table_set(self.config, self.arguments.data.id, "name", util.generate_name(self, self.config, "wifi-vlan", "v", { "name" }))
end

function wifi_vlans:DELETE_before_section_delete_hook()
	if not is_ap then return end

	local network = self:table_get(self.config, self.sid, "network")
	wireless_lib:remove_unused_interface(network)
end

local s = wifi_vlans:section("wireless", "wifi-vlan")

	local description = s:option("description")
		function description:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "wifi-vlan", function(s)
				if self.sid ~= s[".name"] and s.description == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return self.dt:uciname(value)
		end

	if not is_ap then
		local network = s:option("network")
			network.require = { "vid"}
			function network:validate(value)
				local exists = false
				local network_pretty = util.get_network_map(self, true)
				self:table_foreach("network", "interface", function(s)
					if network_pretty[s[".name"]] == value then
						exists = true
						return false
					end
				end)
				return exists, "Referenced network does not exist"
			end
			function network:get(value)
				return util.network_mapper_get(self, value)
			end
			function network:set(value)
				util.network_mapper_set(self, value)
			end
	end

	local vid = s:option("vid")
		function vid:validate(value)
			return self.dt:irange(value, 1, 4094)
		end
		function vid:set(value)
			self:table_set(self.config, self.sid, "vid", value)
			if not is_ap or not value or value == "" then return end
			local old_vlan = self:table_get(self.config, self.sid, "network")
			local vlan = wireless_lib:create_vlan(value)
			if old_vlan and old_vlan ~= vlan then
				wireless_lib:remove_unused_interface(old_vlan)
			end

			self:table_set(self.config, self.sid, "network", vlan)
		end

	local iface = s:option("iface")
		iface.cfg_require = true
		function iface:validate(value)
			if self:get_abs_value(self.config, self.sid, "psk_group") then
				return false, "Cannot assign interface when 'psk_group' is set"
			end
			local exists = false
			self:table_foreach(self.config, "wifi-iface", function(s)
				if s[".name"] == value then
					exists = true
					return false
				end
			end)
			return exists, "Referenced interface does not exist"
		end

	local psk_group = s:option("psk_group")
		function psk_group:validate(value)
			if self:get_abs_value(self.config, self.sid, "iface") then
				return false, "Cannot assign 'psk_group' when 'iface' is set"
			end
			local exists = false
			local available_groups = {}
			self:table_foreach(self.config, "psk-group", function(s)
				exists = exists or s[".name"] == value
				available_groups[#available_groups + 1] = s[".name"]
			end)
			return exists, "Referenced PPSK group does not exist. Available groups [%s]" % table.concat(available_groups, ", ")
		end

return wifi_vlans
