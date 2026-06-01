local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local board = require("vuci.board")

local is_ap = board:is_ap()

local wifi_stations = ConfigService:new()

local wireless_lib = require("api.network.wireless_lib"):new(wifi_stations)
function wifi_stations:POST_init_hook()
	if not self.arguments.data then return end
	local username = self.arguments.data.username
	self.arguments.data.id = util.generate_name(self, self.config, "wifi-station", "wifi_station")
	self.arguments.data.username = username or self.arguments.data.id
end

function wifi_stations:create_network_vlan(psk_group, vid, network_name)
	local vid_num = tonumber(vid)
	if vid_num and vid_num > 4094 then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"VLAN ID cannot be greater than 4094",
			self.api_key
		)
	end

	local name = util.generate_name(self, self.config, "wifi-vlan", "wifi_vlan")
	self:table_section(self.config, "wifi-vlan", name, {
		name = util.generate_name(self, self.config, "wifi-vlan", "v", { "name" }),
		description = name,
		psk_group = psk_group,
		vid = vid,
		network = network_name,
	})
end

function wifi_stations:DELETE_before_section_delete_hook()
	local vid = self:get_abs_value(self.config, self.sid, "vid")
	local psk_group = self:get_abs_value(self.config, self.sid, "psk_group")
	self:table_foreach("wireless", "wifi-vlan", function(s)
		if s.psk_group == psk_group and s.vid == vid then
			self:table_delete("wireless", s[".name"])
			return false
		end
	end)

	if not is_ap then return end

	local vlan = "vlan"..vid
	wireless_lib:remove_unused_interface(vlan)
end

local s = wifi_stations:section("wireless", "wifi-station")

	function s:create_defaults()
		if is_ap then return {} end
		local vids = {}
		self:table_foreach(self.config, "wifi-station", function(s)
			if s.vid then
				table.insert(vids, tonumber(s.vid))
			end
		end)
		return {
			vid = util.find_first_missing(vids)
		}
	end

	local username = s:option("username")
		username.cfg_require = true
		function username:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "wifi-station", function(s)
				if self.sid ~= s[".name"] and s.username == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate usernames are not allowed" end
			return self.dt:uciname(value)
		end

	local mac = s:option("mac")
		function mac:validate(value)
			return self.dt:macaddr(value)
		end

	local key = s:option("key", { sensitive = true })
		function key:validate(value)
			local duplicates = false
			local psk_group = self:get_abs_value(self.config, self.sid, "psk_group")
			self:table_foreach(self.config, "wifi-station", function(s)
				if self.sid ~= s[".name"] and psk_group == s.psk_group and s.key == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate keys are not allowed" end
			return self.dt:wpakey(value)
		end

	if is_ap then
		local vid = s:option("vid")
		function vid:validate(value)
			return self.dt:irange(value, 1, 4094)
		end
		function vid:set(value)
			local psk_group = self:get_abs_value(self.config, self.sid, "psk_group")
			local old_vid = self:table_get(self.config, self.sid, "vid")
			local network_vlan_exists, old_vlan
			self:table_foreach("wireless", "wifi-vlan", function(s)
				if old_vid and s.psk_group == psk_group and s.vid == old_vid then
					network_vlan_exists = s
					old_vlan = s.network
					return false
				end
			end)
			if not value or value == "" then
				if old_vlan then wireless_lib:remove_unused_interface(old_vlan, network_vlan_exists[".name"]) end
				if network_vlan_exists then self:table_delete(self.config, network_vlan_exists[".name"]) end
				self:table_delete(self.config, self.sid, "vid")
				return
			end

			local vlan = wireless_lib:create_vlan(value)
			if network_vlan_exists then
				self:table_set(self.config, network_vlan_exists[".name"], "vid", value)
				self:table_set(self.config, network_vlan_exists[".name"], "network", vlan)
			else
				self:create_network_vlan(psk_group, value, vlan)
			end

			if old_vlan and old_vlan ~= vlan then
				wireless_lib:remove_unused_interface(old_vlan, network_vlan_exists[".name"])
			end
			self:table_set(self.config, self.sid, "vid", value)
		end
	else
		local network = s:option("network")
			function network:validate(value)
				local network_internal = util.get_network_map(self)
				local net = network_internal[value] or value
				return not not self:table_find("network", "interface", { [".name"] = net }), "Referenced network does not exist"
			end
			function network:get()
				local net
				local vid = self:table_get(self.config, self.sid, "vid")
				local psk_group = self:get_abs_value(self.config, self.sid, "psk_group")
				self:table_foreach("wireless", "wifi-vlan", function(s)
					if s.psk_group == psk_group and s.vid == vid then
						net = s.network
						return false
					end
				end)
				return util.network_mapper_get(self, net)
			end
			function network:set(value)
				local psk_group = self:get_abs_value(self.config, self.sid, "psk_group")
				local vid = self:table_get(self.config, self.sid, "vid")
				local vlan
				self:table_foreach("wireless", "wifi-vlan", function(s)
					if s.psk_group == psk_group and s.vid == vid then
						vlan = s
						return false
					end
				end)

				if not value or value == "" then
					if vlan then self:table_delete(self.config, vlan[".name"]) end
					return
				end

				local network_internal = util.get_network_map(self)
				local network_name = network_internal[value] or value
				if vlan and vlan.network ~= network_name then
					self:table_set(self.config, vlan[".name"], "network", network_name)
				elseif not vlan then
					self:create_network_vlan(psk_group, vid, network_name)
				end
			end
	end

	local psk_group = s:option("psk_group")
		function psk_group:validate(value)
			local exists = false
			local available_groups = {}
			self:table_foreach(self.config, "psk-group", function(s)
				if s[".name"] == value then
					exists = true
				end
				available_groups[#available_groups + 1] = s[".name"]
			end)
			return exists, "Referenced PPSK group does not exist. Available groups [%s]" % table.concat(available_groups, ", ")
		end

return wifi_stations
