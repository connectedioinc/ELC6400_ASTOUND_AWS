local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local vpn = require("vuci.vpn")

local zerotier = ConfigService:new({increment_name = true})
local s = zerotier:section("zerotier", function(self) return "network_"..self.binding end)
function s:create_defaults()
	local largest_port = 9992
	self:table_foreach(self.main_config, "network_" .. self.binding, function(c)
		if c.port and tonumber(c.port) > tonumber(largest_port) then
			largest_port = c.port
		end
	end)
	return {
		port = tostring(tonumber(largest_port) + 1)
	}
end

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "network_id" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 32
	name.cfg_require = true
		function name:validate(value)
			local exists = false
			local instances = {}
			self:table_foreach(self.config, "instance", function(c) table.insert(instances, c[".name"]) end)
			if #instances > 0 then
				for _, single_instance in ipairs(instances) do
					self:table_foreach(self.config, "network_" .. single_instance, function(c)
						if c.name == value and c[".name"] ~= self.sid then
							exists = true
						end
					end)
				end
			end
			if exists then
				return false, string.format("Name: '%s' is already used. Please choose a different name", value)
			end
			return self.dt:uciname(value)
		end

	local allow_default = s:option("allow_default")
		function allow_default:validate(value)
			return self.dt:is_bool(value)
		end

	local allow_global = s:option("allow_global")
		function allow_global:validate(value)
			return self.dt:is_bool(value)
		end

	local allow_managed = s:option("allow_managed")
		function allow_managed:validate(value)
			return self.dt:is_bool(value)
		end

	local allow_dns = s:option("allow_dns")
		function allow_dns:validate(value)
			return self.dt:is_bool(value)
		end

	local port = s:option("port")
	port.cfg_require = true
		function port:validate(value)
			local found = false
			self:table_foreach(self.config, "instance", function(instance)
				self:table_foreach(self.config, "network_" .. instance[".name"], function(c)
					if c.port == value and c[".name"] ~= self.sid then
						found = true
						return false
					end
				end)
			end)
			if found then return false, "Port is used in another network configuration." end
			return self.dt:port(value)
		end

	local network_id = s:option("network_id")
	network_id.minlength = 16
	network_id.maxlength = 16
		function network_id:validate(value)
			local found = false
			self:table_foreach(self.config, "network_" .. self.binding, function(c)
				if value == c.network_id and c[".name"] ~= self.sid then found = true end
			end)
			if found then return false, string.format("Name: '%s' is already used. Please choose a different configuration name.", value) end
			return self.dt:hexstring(value)
		end
		function network_id:set(value)
			local device_name = util.trim(util.file_exec("/bin/sh", { "-c", "/etc/init.d/zerotier get_ifname " .. value }).stdout)
			self:table_set(self.config, self.sid, "device_name", device_name)
			self:table_set(self.config, self.sid, "network_id", value)
		end

	local opt_bridge_to = s:option("bridge_to")
		function opt_bridge_to:validate(value)
			local bridge_options = { "none" }
			self:table_foreach("network", "interface", function (iface)
				if iface.device and iface.device:match("^br") then
					local device = self:table_get("network", "br_" .. iface[".name"])
					if device and device.type and device.type == "bridge" then
						table.insert(bridge_options, iface.name or iface[".name"])
					end
				end
			end)
			return self.dt:check_array(value, bridge_options)
		end
		function opt_bridge_to:get(value) return util.network_mapper_get(self, value) end
		function opt_bridge_to:set(value)
			value = util.get_network_map(self)[value] or value
			self:table_set(self.config, self.sid, self.api_key, value)
			if value ~= "none" then
				self:remove_bridges()
				local bridge_iface = self:table_get("network", value)
				local zt_iface_name = self:table_get(self.config, self.sid, "device_name")
				if bridge_iface then
					local exist = false
					local ifaces = {}
					if bridge_iface.device then
						ifaces = self:table_get("network", string.gsub(bridge_iface.device, "-", "_"), "ports") or {}
					end
					for _, v in pairs(ifaces) do
						if v == zt_iface_name then
							exist = true
						end
					end
					if not exist then
						table.insert(ifaces, zt_iface_name)
					end
					self:table_set("network", "br_"..value, "ports", ifaces)
				end
			else
				self:table_set(self.config, self.sid, "bridge_to", "")
				self:remove_bridges()
			end
		end

		function s:remove_interface(ifaces)
			local zt_iface_name = self:table_get(self.config, self.sid, "device_name")
			for i, v in ipairs(ifaces) do
				if v == zt_iface_name then
					table.remove(ifaces, i)
				end
			end
			return ifaces
		end
		function s:remove_bridges()
			self:table_foreach("network", "device", function(iface)
				if string.match(iface[".name"], "^br_") then
					if iface.ports then
						local ifaces = self:remove_interface(iface.ports)
						self:table_set("network", iface[".name"], "ports", ifaces)
					end
				end
			end)
		end

		s:option("custom_planet_file", { file = true })

		function zerotier:DELETE_before_section_delete_hook()
			local net = self:table_get("zerotier", s.sid, "bridge_to")
			if net then
				local ifname = self:table_get(self.config, s.sid, "device_name")
				local curr_ports_list = self:table_get("network", "br_" .. net, "ports")

				for i, v in ipairs(curr_ports_list) do
				if v == ifname then
						table.remove(curr_ports_list, i)
					end
				end
				self:table_set("network", "br_" .. net, "ports", curr_ports_list)
			end
		end

		function zerotier:UPLOAD_after_upload_hook(upload_request)
			local path = upload_request.files[1].location
			util.set_file_permissions(path, "zerotier", 0660)
			return { path = path }
		end

return zerotier
