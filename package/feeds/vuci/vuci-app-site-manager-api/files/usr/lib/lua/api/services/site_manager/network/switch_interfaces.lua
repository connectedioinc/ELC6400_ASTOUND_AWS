local ConfigService = require("api/ConfigService")
local siteman_utils = require("api/services/site_manager/siteman_utils")

local interfaces = ConfigService:new({ increment_name = true })

function interfaces:require_ipaddr_and_validate_external_services()
	local protocol = self:get_abs_value(self.config, self.sid, "proto")
	local ipaddr = self:get_abs_value(self.config, self.sid, "ipaddr")
	local ip6addr = self:get_abs_value(self.config, self.sid, "ip6addr")
	local netmask = self:get_abs_value(self.config, self.sid, "netmask")
	local vlan_id = self:get_abs_value(self.config, self.sid, "vlan_id")
	local no_ipv4_address = not ipaddr or ipaddr == ""
	local no_ipv6_address = not ip6addr or ip6addr == ""
	local no_netmask = ipaddr and ipaddr ~= "" and (not netmask or netmask == "")
	if protocol == "static" then
		if (no_ipv4_address and no_ipv6_address) or no_netmask then
			self:add_critical_error(
				STD_CODES.INVALID_OPT,
				"ipaddr and netmask or ip6addr options must be defined",
				"Validation"
			)
		end
		if not vlan_id or vlan_id == "" then return end
		-- local device_name = self:table_get("siteman_network", "bridge", "name")
		self:table_foreach(self.config, "interface", function(s)
			if s.device then
				-- local s_vlan_id = s.device:match("^" .. device_name .. ".(%d+)$")
				if s[".name"] ~= self.sid and s.ipaddr == ipaddr and s_vlan_id == vlan_id then
					self:add_critical_error(
						STD_CODES.INVALID_OPT,
						"Same vlan_id cannot be used on static interface with identical ipaddr",
						"Validation"
					)
					return false
				end
			end
		end)
	end
end

interfaces.PUT_validate_section_hook = interfaces.require_ipaddr_and_validate_external_services
interfaces.POST_validate_section_hook = interfaces.require_ipaddr_and_validate_external_services

function interfaces:DELETE_before_section_delete_hook()
	if self:table_get("dhcp", self.sid) then
		self:table_delete("dhcp", self.sid)
	end
end

local s = interfaces:section("siteman_network", "interface")
s:make_primary()
function s:filter(s)
	if s[".type"] ~= "interface" or s[".name"] == "loopback" then
		return false
	end
	if (s._platform) then
		local platform = string.lower(s._platform)
		if string.find(platform, "tsw") or string.find(platform, "swm") then return true end
	end
	return false
end
function s:create_defaults()
	local metric = 0
	self:table_foreach("siteman_network", "interface", function (s)
		local current_metric = tonumber(s.metric)
		if current_metric and current_metric > metric then
			metric = current_metric
		end
	end)
	return {
		_platform = "tsw",
		dm_device_id = self.arguments.data.dm_device_id,
		metric = tostring(metric + 1)
	}
end
	local dm_device_id = s:option("dm_device_id")

s.default_options.id.maxlength = 15

	local enabled = s:option("enabled")
		function enabled:validate(val)
			local valid, err = self.dt:is_bool(val)
			if not valid then return false, err end
			local proto = self:get_abs_value(self.config, self.sid, "proto")
			local ipaddr = self:get_abs_value(self.config, self.sid, "ipaddr")
			if val == "1" and not proto and not ipaddr then
				return false, "Interface with missing protocol and IP address cannot be enabled"
			end
			return true

		end

	local vlan_id = s:option("vlan_id")
		function vlan_id:validate(value)
			if not value or value == "" then return true end
			local vlans = {}
			self:table_foreach("siteman_network", "bridge-vlan", function (sec)
				table.insert(vlans, sec.vlan)
			end)
			if #vlans == 0 then
				-- No bridge-vlans configured, accept any valid vlan id
				return self.dt:irange(value, 1, 4094)
			end
			return self.dt:check_array(value, vlans)
		end

	local proto = s:option("proto")
		function proto:validate(value)
			local dhcp_count, dhcpv6_count = 0, 0
			local values = {"static", "dhcp", "dhcpv6"}
			local valid, err = self.dt:check_array(value, values)
			if not valid then
				return false, err
			end

			if value == "dhcp" or value == "dhcpv6" then
				if self:table_get("dhcp", self.sid) then
					return false, "Interface has DHCP server, delete it first to change protocol to 'dhcp' or 'dhcpv6'"
				end
				dhcp_count = value == "dhcp" and 1 or 0
				dhcpv6_count = value == "dhcpv6" and 1 or 0
				   local current_device = self:get_abs_value(self.config, self.sid, "dm_device_id")
				   self:table_foreach(self.config, "interface", function(sec)
					   if sec[".name"] ~= self.sid and sec.dm_device_id == current_device then
						   if sec.proto and sec.proto == "dhcp" then
							   dhcp_count = dhcp_count + 1
						   elseif sec.proto and sec.proto == "dhcpv6" then
							   dhcpv6_count = dhcpv6_count + 1
						   end
					   end
				   end)

				   if dhcp_count > 1 then
					   return false, "Only a single DHCP interface can exist per device"
				   end
				   if dhcpv6_count > 1 then
					   return false, "Only a single DHCPv6 interface can exist per device"
				   end
			end
			return true
		end

	local ipaddr = s:option("ipaddr")
		function ipaddr:validate(value)
			return self.dt:ip4addr(value)
		end

	local netmask = s:option("netmask")
		function netmask:validate(value)
			return self.dt:netmask(value)
		end

	local gateway = s:option("gateway")
		function gateway:validate(value)
			return self.dt:ip4addr(value)
		end

	local ip6addr = s:option("ip6addr")
		function ip6addr:validate(value)
			return self.dt:ipmask6(value)
		end

	local ip6gw = s:option("ip6gw")
		function ip6gw:validate(value)
			return self.dt:ip6addr(value)
		end

	local dns = s:option("dns", { list = true})
		function dns:validate(value)
			return self.dt:ipaddr(value)
		end
		function dns:set(value)
			self:table_set("siteman_network", self.sid, "dns", value)
			if #value > 0 then
				self:table_set("siteman_network", self.sid, "peerdns", "0")
			else
				self:table_delete("siteman_network", self.sid, "peerdns")
			end
		end
	local metric = s:option("metric")
		function metric:validate(value)
			local res, err = self.dt:irange(value, 1, 10000)
			if not res then return res, err end

			return self.dt:uinteger(value)
		end
siteman_utils:wrap_endpoint_sync_logic(interfaces)
return interfaces
