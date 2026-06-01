local ConfigService = require("api/ConfigService")
local siteman_utils = require("api/services/site_manager/siteman_utils")

local flags = {
	delete = false,
	create = false
}

local interfaces = ConfigService:new(flags)

local s = interfaces:section("siteman_network", "interface")

function s:filter(s)
	if (s._platform) then
		local platform = string.lower(s._platform)
		if not string.find(platform, "tsw") then return true end
	end
	return false
end

	local dm_device_id = s:option("dm_device_id")
		dm_device_id.readonly = true

	local interface_id = s:option("interface_id")
		interface_id.readonly = true

	local mode = s:option("mode")
		function mode:validate(value)
			return self.dt:check_array(value, {"static", "dhcp", "static+dhcp"})
		end

	local ipaddr = s:option("ipaddr")
		function ipaddr:validate(value)
			if not value or value == "" then
				local ip6addr = self:get_abs_value(self.config, self.sid, "ip6addr")
				if not ip6addr or ip6addr == "" then
					return false, "Either IPv4 address or IPv6 address must be provided"
				end
				return true
			end
			return self.dt:ip4addr(value)
		end

	local netmask = s:option("netmask")
		function netmask:validate(value)
			local ipaddr = self:get_abs_value(self.config, self.sid, "ipaddr")
			if ipaddr and ipaddr ~= "" then
				if not value or value == "" then
					return false, "Netmask is required when IPv4 address is provided"
				end
			end
			if not value or value == "" then return true end
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
			return self.dt:ipmask6(value)
		end

	local dns = s:option("dns", { list = true })
		function dns:validate(value)
			return self.dt:ipaddr(value)
		end

	local man_vlan = s:option("man_vlan")
		function man_vlan:validate(value)
			local platform = self:table_get("siteman_devices", self:table_get(self.config, self.sid, "dm_device_id"), "platform")
			local lan_dev = "eth1"
			if platform:match("TAP100") then
				lan_dev = "eth0"
			end
			if value == lan_dev then
				return true
			end
			return self.dt:irange(value, 1, 4094)
		end

siteman_utils:wrap_endpoint_sync_logic(interfaces)
return interfaces
