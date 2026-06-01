local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local board = require("vuci.board")

local is_ap = board:is_ap()

local psk_groups = ConfigService:new()

local wireless_lib = require("api.network.wireless_lib"):new(psk_groups)

function psk_groups:POST_init_hook()
	if not self.arguments.data then return end
	local description = self.arguments.data.description
	self.arguments.data.id = util.generate_name(self, self.config, "psk-group", "group")
	self.arguments.data.description = description or self.arguments.data.id
end

function psk_groups:DELETE_before_section_delete_hook()
	self:table_foreach(self.config, "wifi-iface", function(s)
		if s.psk_group == self.sid then
			self:table_delete(self.config, s[".name"], "psk_group")
		end
	end)

	self:table_foreach(self.config, "wifi-station", function(s)
		if s.psk_group == self.sid then
			self:table_delete(self.config, s[".name"])
		end
	end)

	self:table_foreach(self.config, "wifi-vlan", function(s)
		if s.psk_group == self.sid then
			self:table_delete(self.config, s[".name"])
			if is_ap and s.network then
				wireless_lib:remove_unused_interface(s.network)
			end
		end
	end)
end

local s = psk_groups:section("wireless", "psk-group")

	local description = s:option("description")
		description.cfg_require = true
		function description:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "psk-group", function(s)
				if self.sid ~= s[".name"] and s.description == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate descriptions are not allowed" end
			return self.dt:uciname(value)
		end


return psk_groups
