return function ()
	local util = require("vuci.util")
	local network_lib = require("vuci.network_lib")

	return {
		options = {
			{
				name = "ports",
				params = { list = true },
				validate = function (self, value)
					local valid, msg = self.dt:fieldvalidation(value, "^[A-Za-z0-9._@-]*$")
					if not valid then return valid, msg end
					local bridges = {}
					self:table_foreach(self.config, "device", function (s)
						if s.type ~= "bridge" then return end
						bridges[s.name] = true
					end)
					return not bridges[value], "Device of type bridge cannot be bridged."
				end,
				set = function (self, value)
					self:set_ports(value)
				end
			},
			{
				name = "igmp_snooping",
				get = function (self, value)
					return value or "0"
				end,
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "stp",
				get = function (self, value)
					return value or "0"
				end,
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			},
			{
				name = "priority",
				validate = function (self, value)
					return self.dt:irange(value, 0, 65535)
				end
			},
			{
				name = "ageing_time",
				validate = function (self, value)
					return self.dt:irange(value, 10, 1000000)
				end
			},
			{
				name = "hello_time",
				validate = function (self, value)
					return self.dt:irange(value, 1, 10)
				end
			},
			{
				name = "forward_delay",
				validate = function (self, value)
					return self.dt:irange(value, 2, 30)
				end
			},
			{
				name = "max_age",
				validate = function (self, value)
					return self.dt:irange(value, 6, 40)
				end
			}
		},
		hooks = {
			set_ports = function (self, value)
				self:update_used_ports_device(value)
				self:table_set(self.config, self.sid, "ports", value)
			end,
			update_used_ports_device = function (self, bridged_ports)
				self:table_foreach(self.config, "device", function (s)
					if s[".name"] == self.sid then return end
					local unused_ports = {}
					for _, port in ipairs(self:table_get(self.config, s[".name"], "ports") or {}) do
						if not util.contains(bridged_ports or {}, port) then
							table.insert(unused_ports, port)
						end
					end
					self:table_set(self.config, s[".name"], "ports", unused_ports)
				end)

				self:table_foreach(self.config, "interface", function (s)
					if util.contains(bridged_ports or {}, s.device) then
						self:table_delete(self.config, s[".name"], "device")
					end
				end)

				self:table_foreach(self.config, "bridge-vlan", function (s)
					local unused_ports = {}
					for _, port in ipairs(self:table_get(self.config, s[".name"], "ports") or {}) do
						if not util.contains(bridged_ports or {}, port:match("^(.+):.*$") or port) then
							table.insert(unused_ports, port)
						end
					end
					self:table_set(self.config, s[".name"], "ports", unused_ports)
				end)
			end,
			DELETE_before_section_delete_hook = function (self)
				local iface
				local name = self:table_get(self.config, self.sid, "name")
				self:table_foreach(self.config, "interface", function (s)
					if s.device and (s.device == name or (s.device:sub(1, #name) == name and s.device:match("%."))) then
						iface = s
					end
				end)
				if iface then
					self:add_critical_error(
						STD_CODES.NO_DELETE,
						string.format("This bridge is assigned to a '%s' interface. The device can only be deleted when the interface is removed", util.network_mapper_get(self, iface[".name"])),
						"Validation",
						HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
					)
				end

				local device_name = self:table_get(self.config, self.sid, "name")
				self:table_foreach(self.config, "bridge-vlan", function (s)
					if s.device == device_name then
						self:table_delete(self.config, s[".name"])
					end
				end)
			end
		}
	}
end
