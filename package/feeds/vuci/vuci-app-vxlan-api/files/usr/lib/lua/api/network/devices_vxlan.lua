return function ()
	local devices_utils = require("api.network.devices_utils")

	local RULE_NAME_TEMPLATE = "Allow VXLAN on port"

	return {
		options = {
			{
				name = "vni",
				cfg_require = true,
				validate = function (self, value)
					return self.dt:irange(value, 1, 16777215)
				end,
				get = function (self)
					return self:table_get(self.config, self.sid, "id")
				end,
				set = function (self, value)
					self:table_set(self.config, self.sid, "id", value)
				end
			},
			{
				name = "port",
				cfg_require = true,
				validate = function (self, value)
					return self.dt:irange(value, 1, 65535)
				end,
				set = function (self, value)
					local old_value = self:table_get(self.config, self.sid, self.api_key)
					self:table_set(self.config, self.sid, self.api_key, value)

					local rule_sid
					local old_rule_sid
					self:table_foreach("firewall", "rule", function(s)
						if s.name and not s.name:match("^" .. RULE_NAME_TEMPLATE .. "%s%d+$") then return end

						if s.dest_port == value then
							rule_sid = s[".name"]
							return
						elseif s.dest_port == old_value then
							old_rule_sid = s[".name"]
							return
						end
					end)

					if not rule_sid and value and value ~= "" then
						self:table_section("firewall", "rule", self:next_id("firewall"), {
							src = "wan",
							proto = "udp",
							target = "ACCEPT",
							dest_port = value,
							enabled = "1",
							name = RULE_NAME_TEMPLATE .. " " .. value
						})
					end
					if old_rule_sid then
						local is_referenced
						self:table_foreach("network", "device", function(s)
							if s.type == "vxlan" and s.port == old_value then is_referenced = true end
						end)

						if not is_referenced then
							self:table_delete("firewall", old_rule_sid)
						end
					end
				end
			},
			{
				name = "local",
				validate = function (self, value)
					return self.dt:ipaddr(value)
				end
			},
			{
				name = "remote",
				validate = function (self, value)
					return self.dt:ipaddr(value)
				end
			},
			{
				name = "ageing",
				validate = function (self, value)
					return self.dt:irange(value, 1, 4294967295)
				end
			},
			{
				name = "maxaddress",
				validate = function (self, value)
					return self.dt:irange(value, 1, 4294967295)
				end
			},
			{
				name = "udpcsum",
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "learning",
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "proxy",
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "rsc",
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "l2miss",
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "l3miss",
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "udp6zerocsumtx",
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "udp6zerocsumrx",
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			}
		},
		hooks = {
			remove_firewall_rule = function (self)
				local value = self:table_get(self.config, self.sid, "port")
				local rule_sid
				self:table_foreach("firewall", "rule", function(s)
					if s.name == (RULE_NAME_TEMPLATE .. " " .. value) and s.dest_port == value then rule_sid = s[".name"] end
				end)

				if not rule_sid then return end
					local is_referenced
					self:table_foreach("network", "device", function(s)
						if s[".name"] ~= self.sid and s.type == "vxlan" and s.port == value then is_referenced = true end
					end)

					if not is_referenced then
						self:table_delete("firewall", rule_sid)
					end
			end,
			remove_assigned_device = function (self)
				self:table_foreach(self.config, "interface", function (s)
					if s.device == self.sid then
						self:table_delete(self.config, s[".name"], "device")
					end
				end)

				devices_utils.remove_from_bridge(self)
			end,
			DELETE_before_section_delete_hook = function (self)
				self:remove_firewall_rule()
				self:remove_assigned_device()
			end
		}
	}
end
