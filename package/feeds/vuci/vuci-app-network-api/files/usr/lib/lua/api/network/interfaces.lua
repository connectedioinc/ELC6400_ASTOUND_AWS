local ConfigService = require("api/ConfigService")
local pac = require("vuci.package_checker")
local fs = require "nixio.fs"
local util = require "vuci.util"
local api_utils = require("api/api_utils")
local network_lib = require("vuci.network_lib")
local mwan, ntm, fw
local has_ipv6 = not not fs.access("/proc/net/ipv6_route")
local board = require("vuci.board")
local default_lan_device = board:get_default_lan_ifname()
local default_wan_device = board:get_default_wan_ifname()
local has_wifi = board:has_wifi()
local ifname

local RES_CODES = {
	LAN_TO_WAN_ALREADY_EXISTS = 3,
	WAN_TO_LAN_DOESNT_EXIST = 4,
	IFACE_HIDDEN = 5
}
local MAX_METRIC = 4294967295

local interfaces = ConfigService:new()
interfaces.sort_response_by = "metric"

interfaces.vrf_map = {}

-- Default sort function is overriden to sort by 2 options because
-- `lan` type interfaces don't contain `metric` option anymore and
-- thus the returned section sequence gets distorted from the
-- actual one in the configuration file
function interfaces:sort_response()
	local fallback_order = ".index"
	table.sort(self.response_table, function(a, b)
		if not a or not b then return false end
		if (a.area_type == "wan" or b.area_type == "wan") and a[self.sort_response_by] and b[self.sort_response_by] then
			return tonumber(a[self.sort_response_by]) < tonumber(b[self.sort_response_by])
		end
		return a[fallback_order] and b[fallback_order] and tonumber(a[fallback_order]) < tonumber(b[fallback_order])
	end)
end

local has_mwan = fs.access("/etc/config/mwan3")

interfaces.POST_after_data_hooks = {}
interfaces.PUT_after_data_hooks = {}

function interfaces:initialize_hook()
	self:table_foreach("network", "device", function(s)
		if s.type == "vrf" then self.vrf_map[s.name] = true end
	end)
end

function interfaces:POST_init_hook()
	if not self.arguments.data then return end

	local area_type = self.arguments.data.area_type or "lan"
	local name = self.arguments.data.name
	local generated_name = util.get_interface_id(self, { area_type = area_type })
	self.arguments.data.id = generated_name
	self.arguments.data.name = name or generated_name
end

function interfaces:after_data_hook()
	local fiber = self.current_data_block["fiber_priority"]
	if board:has_sfp_port() and self.request_method == "PUT" and fiber and #fiber == 0 then
		ntm = ntm or require "vuci.network".init(self.uci)
		local switch_section = ntm:physical_port_switch_section(default_wan_device)
		local current_fiber = self.uci:get("network", switch_section, "fiber_priority")
		if current_fiber then
			self:table_set("network", switch_section, "fiber_priority", current_fiber)
		end
	end

	local proto = self:get_abs_value("network", self.sid, "proto")
	local phy_dev = self:table_get("network", self.sid, "device")
	if proto == "dhcp" or proto == "dhcpv6" then
		local dhcp_count = proto == "dhcp" and 1 or 0
		local dhcpv6_count = proto == "dhcpv6" and 1 or 0
		self:table_foreach(self.config, "interface", function(sec)
			if sec[".name"] ~= self.sid and
				sec.device and sec.device == phy_dev and
				sec.proto and sec.proto == "dhcp" then
				dhcp_count = dhcp_count + 1
			elseif sec[".name"] ~= self.sid and
				sec.device and sec.device == phy_dev and
				sec.proto and sec.proto == "dhcpv6" then
				dhcpv6_count = dhcpv6_count + 1
			end
		end)

		if dhcp_count > 1 then
			return self:add_critical_error(
					STD_CODES.INVALID_OPT,
					"Only a single DHCP interface can exist on '" .. phy_dev .. "' device",
					"ifname"
				)
		end
		if dhcpv6_count > 1 then
			return self:add_critical_error(
					STD_CODES.INVALID_OPT,
					"Only a single DHCPv6 interface can exist on '" .. phy_dev .. "' device",
					"ifname"
				)
		end
	end
end
interfaces.POST_after_data_hooks[#interfaces.POST_after_data_hooks+1] = interfaces.after_data_hook
interfaces.PUT_after_data_hooks[#interfaces.PUT_after_data_hooks+1] = interfaces.after_data_hook

function interfaces:POST_after_data_hook(s)
	for _, h in ipairs(self.POST_after_data_hooks) do
		h(self, s)
	end
end
function interfaces:PUT_after_data_hook(s)
	for _, h in ipairs(self.PUT_after_data_hooks) do
		h(self, s)
	end
end

function interfaces:get_dhcp_relay_section(ip)
	local relay_id = self.sid .. "_relay"
	local relay_section = self:table_get("dhcp", relay_id)
	if relay_section then
		relay_section = relay_section[".name"]
	else
		self:table_foreach(self.config, "relay", function(s)
			if s.local_addr == ip then
				relay_section = s[".name"]
				return false
			end
		end)
	end
	return relay_section
end

-- Deletes related sections
function interfaces:DELETE_before_section_delete_hook(sec)
	if has_wifi then
		local wifi_network
		self:table_foreach("wireless", "wifi-iface", function (s)
			if s.network == self.sid then
				wifi_network = s
				return false
			end
		end)
		if wifi_network then
			return self:add_critical_error(
				STD_CODES.NO_DELETE,
				string.format(
					"Interface \"%s\" is associated with the following WiFi network: %s. Please disassociate the WiFi network before removing this interface.",
					wifi_network.network, wifi_network.ssid or wifi_network.mesh_id or ""
				),
				self.sid,
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
	end
	if pac.is_installed("coova-chilli") then
		local hotspot_network
		self:table_foreach("chilli", "chilli", function (s)
			if s.network == self.sid or (s.moreif and util.contains(s.moreif, self.sid)) then
				hotspot_network = true
				return false
			end
		end)
		if hotspot_network then
			return self:add_critical_error(
				STD_CODES.NO_DELETE,
				string.format(
					"Interface \"%s\" is associated with the Hotspot instance. Please delete hotspot instance before removing this interface.",
					self.sid
				),
				self.sid,
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
	end

	if self:table_get("dhcp", self.sid) then
		local relay_section = self:get_dhcp_relay_section(self:table_get("network", self.sid, "ipaddr"))
		if relay_section then
			self:table_delete("dhcp", relay_section)
		end
		self:table_delete("dhcp", self.sid)
	end

	if self:table_get("network", "br_"..self.sid) then
		local bridge_name = "br-"..self.sid

		self:table_foreach("network", "interface", function (s)
			if s[".name"] ~= self.sid and s.device then
				if self:table_get("network", "br_"..s[".name"]) then
					local new_devs = {}
					for _, dev in pairs(self:table_get("network", "br_"..s[".name"], "ports") or {}) do
						if dev ~= bridge_name then
							table.insert(new_devs, dev)
						end
					end
					-- table_set doesn't work here when multiple interfaces are deleted with the same request
					-- because section deletion happens earlier then option set
					self.uci:set("network", "br_"..s[".name"], "ports", new_devs)
					self.t_func:_get_config("network")
				elseif s.device == bridge_name then
					-- table_delete doesn't work here when multiple interfaces are deleted with the same request
					-- because section deletion happens earlier then option deletion
					self.uci:delete("network", s[".name"], "device")
					self.t_func:_get_config("network")
				end
			end
		end)

		self:table_delete("network", "br_"..self.sid)
	end

	fw = fw or require "vuci.firewall".init(self.uci)
	local zone = fw:get_zone_by_network(self.sid)
	if zone then
		zone:del_network(self.sid)
		if not self.config_set_table["firewall"] then
			self.config_set_table["firewall"] = {} -- FIXME: implement config commit chaining?
		end
	end

	if has_mwan then
		mwan = mwan or require "vuci.mwan".init(self.uci)
		mwan:del_interface(self.sid)
		if not self.config_set_table["mwan3"] then
			self.config_set_table["mwan3"] = {}
		end
	end

	if pac.is_installed("tlt-ulogd") then
		local ulog_networks = {}
		local opt_network = self:table_get("ulogd", "global", "network") or {}
		for _, network in ipairs(opt_network) do
			if (self.sid ~= network) then
				table.insert(ulog_networks, network)
			end
		end
		if #ulog_networks > 0 then
			self:table_set("ulogd", "global", "network", ulog_networks)
		end
	end
end

function interfaces:get_bridge_val()
	local bridge = self.current_data_block.bridge
	local dev = self:table_get(self.config, self.sid, "device")
	local dev_type = self:table_get(self.config, "br_"..self.sid, "type")
	if bridge == "1" then return true end
	if bridge == "0" or bridge == "" then return false end
	return dev_type == "bridge" and dev == "br-"..self.sid
end

function interfaces:remove_old_value(option)
	local device_found
	local device = self:table_get(self.config, self.sid, "device")
	if device then
		self:table_foreach(self.config, "device", function(s)
			if s.name == device then
				self:table_delete(self.config, s[".name"], option)
				device_found = true
				return false
			end
		end)
	end

	if not device_found then
		self:table_delete(self.config, self.sid, option)
	end
end

function interfaces:set_device_option(option, value, keep_old)
	if not keep_old then
		self:remove_old_value(option)
	end

	if not value then
		return
	end

	local set_to_dev = false
	local device = self.current_data_block.ifname
	if not device then
		device = self:table_get(self.config, self.sid, "device")
	else
		device = api_utils:is_array(self.current_data_block.ifname) and
			self.current_data_block.ifname[1] or self.current_data_block.ifname
	end

	if self:get_bridge_val() then
		device = "br-"..self.sid
	end

	self:table_foreach(self.config, "device", function(s)
		if s.name == device then
			self:table_set(self.config, s[".name"], option, value)
			set_to_dev = true
		end
	end)

	if not set_to_dev then
		self:table_set(self.config, self.sid, option, value)
	end
end

function interfaces:get_device_option(option)
	local value, device_found
	local device = self:table_get(self.config, self.sid, "device")
	if device then
		self:table_foreach(self.config, "device", function(s)
			if s.name == device then
				value = s[option]
				device_found = true
				return false
			end
		end)
	end

	if not device_found then
		value = self:table_get(self.config, self.sid, option)
	end

	return value
end

function interfaces:set_firewall_zone(fwzone)
	fw = fw or require "vuci.firewall".init(self.uci)
	if fwzone == "" then
		fw:del_network(self.sid)
	else
		local zone = fw:get_zone(fwzone)
		if not zone then
			zone = fw:add_zone(fwzone)
		end
		zone:add_network(self.sid)
	end
	-- Need to reload config to tables
	self.t_func:_get_config("firewall")

	-- trigger firewall commit
	if not self.config_set_table["firewall"] then
		self.config_set_table["firewall"] = {}
	end
end

local s = interfaces:section("network", "interface")
function s:filter(s)
	local exclude_protos = {"relay", "sstp", "pptp", "gre", "l2tp", "l2tpv3", "wireguard", "mirror", "openconnect", "xfrm"}
	if s[".type"] ~= "interface" or s[".name"] == "loopback" or s[".name"]:match("_static$") or self.vrf_map[s.device] then
		return false
	end
	for _, p in ipairs(exclude_protos) do
		if s.proto == p then
			return false
		end
	end
	return s.invisible ~= "1"
end
function s:create_defaults()
	local area_type = self:get_abs_value(self.config, self.sid, "area_type") or ""
	local new_networks
	local is_assigned = false

	-- Add new interface to LAN or WAN firewall zone

	local network_internal = util.get_network_map(self)
	self:table_foreach("firewall", "zone", function(sec)
		local value_table = {}
		if sec.network and type(sec.network) == "string" then
			sec.network:gsub("([^ ]+)", function(val) table.insert(value_table, val) end)
		else
			for _, v in pairs(sec.network or {}) do
				table.insert(value_table, v)
			end
		end
		if util.contains(value_table, network_internal[self.sid] or self.sid) then
			is_assigned = true
		end
	end)

	if not self.current_data_block["fwzone"] and not is_assigned then
		self:table_foreach("firewall", "zone", function(s)
			if s.name and s.name == area_type then
				local networks = self:table_get("firewall", s[".name"], "network") or ""
				if type(networks) == "table" then
					table.insert(networks, self.sid)
					new_networks = table.concat(networks, " ")
				else
					new_networks = #networks > 0 and networks .. " " .. self.sid or self.sid
				end
				self:table_set("firewall", s[".name"], "network", new_networks)
				return false
			end
		end)
	end

	-- LAN
	if area_type == "lan" then
		local ip_match = "^192%.168%.(%d+)%.%d+$"
		local new_ip
		local used_subnet = {}
		local intf_dump = util.ubus("network.interface", "dump")
		intf_dump = intf_dump and intf_dump.interface or {}
		for _, v in pairs(intf_dump) do
			for _, vv in pairs(v["ipv4-address"] or {}) do
				local ip = vv.address or ""
				local subnet = ip:match(ip_match)
				if subnet then
					used_subnet[tonumber(subnet)] = true
				end
			end
		end
		self:table_foreach("network", "interface", function(s)
			if s.ipaddr then
				local subnet = s.ipaddr:match(ip_match)
				if subnet then
					used_subnet[tonumber(subnet)] = true
				end
			end
		end)
		for i = 1, 255 do
			if not used_subnet[i] then
				new_ip = "192.168.%d.1" % {i}
				break
			end
		end
		if new_ip then
			return {
				ipaddr = new_ip,
				netmask = "255.255.255.0",
				disabled = "1",
				proto = "static"
			}
		end
		return {
			disabled = "1",
			proto = "static"
		}
	end
	-- WAN
	return {
		disabled = "" -- TODO: if this is removed option getters are not being called on empty POST request
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
			return value or self:table_get(self.config, self.sid, ".name")
		end

	local enabled = s:option("enabled")
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
			if val == "1" then
				self:table_delete("network", self.sid, "disabled")
			else
				self:table_set("network", self.sid, "disabled", "1")
			end
		end

	local area_type = s:option("area_type")
	area_type.cfg_require = true
	function area_type:validate(value)
		if self.request_method ~= "POST" then
			return false, "'area_type' can not be changed."
		end

		return self.dt:check_array(value, {"lan", "wan"})
	end

	local proto = s:option("proto")
		function proto:validate(value, data)
			local values = {
				"none", "static",
				unpack(proto.extension_values or {}) -- Additional values from extensions
			}
			if self:get_abs_value("network", self.sid, "area_type") == "wan" then
				table.insert(values, "dhcp")
				table.insert(values, "dhcpv6")
				table.insert(values, "pppoe")
			end
			local ipaddr = self:get_abs_value(self.config, self.sid, "ipaddr")
			local ip6addr = self:get_abs_value(self.config, self.sid, "ip6addr")
			local no_ipv4_address = ipaddr == "" or ipaddr == nil
			local no_ipv6_address = ip6addr == "" or ip6addr == nil
			local proto = self:get_abs_value(self.config, self.sid, "proto")
			if proto == "static" and no_ipv4_address and no_ipv6_address then
				return false, "one of the ipaddr or ip6addr options must be defined"
			end
			return self.dt:check_array(value, values)
		end

		function s:update_mwan(interface, track_ip, family)
			local condition = interface:get_conditions()[1].sid
			if condition then
				self:table_set("mwan3", condition, "track_ip", track_ip)
			end
			self:table_set("mwan3", interface.sid, "family", family)
		end

		function proto:set(value)
			local old_val = self:table_get("network", self.sid, "proto")
			self:table_set(self.config, self.sid, self.api_key, network_lib:set_proto(value))
			if value == "dhcpv6" then
				self:table_delete(self.config, self.sid, "ip4table")
			else
				self:table_delete(self.config, self.sid, "ip6table")
			end
			if value == "dhcp" and value ~= old_val then
				self:table_set("network", self.sid, "broadcast", self.current_data_block.broadcast_dhcp or "")
			end
			if self:get_abs_value("network", self.sid, "area_type") == "wan" then
				if pac.is_installed("qos-scripts") and self:table_get("qos", self.sid) then
					if value == "wwan" or value == "connm" then
						self:table_set("qos", self.sid, "is_mobile", "1")
					else
						self:table_delete("qos", self.sid, "is_mobile")
					end
				end
				mwan = mwan or require "vuci.mwan".init(self.uci)
				local mwan_interface = mwan:get_interface(self.sid)
				if not mwan_interface then return end
				local mwan_old_family = self:table_get("mwan3", mwan_interface.sid, "family")
				if value == "dhcpv6" and mwan_old_family ~= "ipv6" then
					self:update_mwan(mwan_interface, {"2001:4860:4860::8888", "2001:4860:4860::8844"}, "ipv6")
				elseif mwan_old_family ~= "ipv4" then
					self:update_mwan(mwan_interface, {"1.1.1.1", "8.8.8.8"}, "ipv4")
				end
			end
		end
		function proto:get()
			return network_lib:get_proto(self:table_get(self.config, self.sid, "proto")) or "none"
		end

	local ipaddr = s:option("ipaddr")
	ipaddr.require = { "netmask" }
		function ipaddr:validate(value)
			return self.dt:ip4addr(value)
		end
		function ipaddr:set(value)
			local old_value = self:table_get(self.config, self.sid, self.api_key)
			self:table_set(self.config, self.sid, self.api_key, value)

			-- Check for DHCP relay section to update 'local_addr'
			local relay_id = self.sid .. "_relay"
			local relay_section = self:table_get("dhcp", relay_id)
			if relay_section then
				relay_section = relay_section[".name"]
			else
				self:table_foreach(self.config, "relay", function(s)
					if s.local_addr == old_value then
						relay_section = s[".name"]
						return false
					end
				end)
			end

			if relay_section then
				self:table_set("dhcp", relay_section, "local_addr", value)
			end
		end

	local netmask = s:option("netmask")
		function netmask:validate(value)
			return self.dt:netmask(value)
		end

	local gateway = s:option("gateway")
		function gateway:validate(value)
			if (self:get_abs_value(self.config, self.sid, "proto") == "static" and
				self:get_abs_value(self.config, self.sid, "area_type") == "wan") or #value == 0 then
				return self.dt:ip4addr(value)
			else
				return false, "Option can be configured only for wan interface with static protocol"
			end
		end
		function gateway:get(value)
			if self:get_abs_value(self.config, self.sid, "proto") == "static" and
				self:get_abs_value(self.config, self.sid, "area_type") == "wan" then
				return value
			end
		end
		function gateway:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local broadcast = s:option("broadcast")
		function broadcast:validate(value)
			if (self:get_abs_value(self.config, self.sid, "proto") == "static" and
				self:get_abs_value(self.config, self.sid, "area_type") == "wan") or #value == 0 then
				return self.dt:ip4addr(value)
			else
				return false, "Option can be configured only for wan interface with static protocol"
			end
		end
		function broadcast:get(value)
			if self:get_abs_value(self.config, self.sid, "proto") == "static" and
				self:get_abs_value(self.config, self.sid, "area_type") == "wan" then
				return value
			end
		end
		function broadcast:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local broadcast_dhcp = s:option("broadcast_dhcp")
		function broadcast_dhcp:validate(value)
			return self.dt:is_bool(value)
		end
		function broadcast_dhcp:get(value)
			if self:get_abs_value(self.config, self.sid, "proto") == "dhcp" then
				return self:table_get(self.config, self.sid, "broadcast")
			end
		end
		function broadcast_dhcp:set(val)
			if self:get_abs_value(self.config, self.sid, "proto") == "static" then
				return
			end
			if val == "1" then
				self:table_set("network", self.sid, "broadcast", "1")
			else
				self:table_delete("network", self.sid, "broadcast")
			end
		end

	local ac = s:option("ac")
		function ac:validate(value)
			return self.dt:string(value)
		end

	local service = s:option("service")
		function service:validate(value)
			return self.dt:string(value)
		end

	local reqaddress = s:option("reqaddress")
		function reqaddress:validate(value)
			return self.dt:check_array(value, {"try", "force", "none"})
		end

	local reqprefix = s:option("reqprefix")
		function reqprefix:validate(value)
			return self.dt:string(value)
		end

	local hostname = s:option("hostname")
		function hostname:validate(value)
			return self.dt:hostname(value)
		end

	local leasetime = s:option("leasetime")
		function leasetime:validate(value)
			local ok = value:match("^%d+[shm]$")
			if not ok then return false, "Allowed characters: positive number followed by 'h', 'm' or 's' symbol." end

			local time, letter = value:match("(%d+)(%a)")
			local valid, err
			if letter == "s" then valid, err = self.dt:irange(time, 120, 999999)
			elseif letter == "m" then valid, err = self.dt:irange(time, 2, 999999)
			elseif letter == "h" then valid, err = self.dt:irange(time, 1, 99999)
			end
			if (letter == 's' and not valid) or
					(letter == 'm' and not valid) or
					(letter == 'h' and not valid) then
				return false, err
			end
			return true
		end

	local mac = s:option("mac")
		function mac:validate(value)
			return self.dt:macaddr(value)
		end

	local dns = s:option("dns", { list = true})
		function dns:validate(value)
			return self.dt:ipaddr(value)
		end
		function dns:get(value)
			if self:get_abs_value(self.config, self.sid, "area_type") == "wan" then
				return value
			end
		end
		function dns:set(value)
			if (self:get_abs_value(self.config, self.sid, "area_type") == "wan" and
				self:getter_wrapped_abs_value(self.config, self.sid, "proto") ~= "none") or #value == 0  then
				self:table_set(self.config, self.sid, self.api_key, value)
				if #value > 0 then
					self:table_set("network", self.sid, "peerdns", "0")
				else
					self:table_delete("network", self.sid, "peerdns")
				end
			else
				self:add_error(STD_CODES.INVALID_OPT, "Option can be configured only for wan interface with not none protocol", self.api_key)
			end
		end

	local delegate = s:option("delegate")
		function delegate:validate(value)
			return self.dt:is_bool(value)
		end
		function delegate:get(value)
			return value or "1"
		end

	local force_link = s:option("force_link")
		function force_link:validate(value)
			return self.dt:is_bool(value)
		end
		function force_link:get(value)
			if value then
				return value
			else
				return self:table_get(self.config, self.sid, "proto") == "static" and "1" or "0"
			end
		end

	local defaultroute = s:option("defaultroute")
		function defaultroute:validate(value)
			return self.dt:is_bool(value)
		end
		function defaultroute:get(value)
			return value or "1"
		end

	local metric = s:option("metric")
		function metric:validate(value)
			return self.dt:irange(value, 0, MAX_METRIC)
		end
		function metric:set(value)
			if self:get_abs_value(self.config, self.sid, "area_type") == "wan" then
				local old_value = self:table_get(self.config, self.sid, self.api_key) or "0"
				self:table_set(self.config, self.sid, self.api_key, value)
				interfaces.needs_mwan_reorder = true
				return self:update_network_metrics(value, old_value)
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end
		function metric:get(value)
			return value or "0"
		end

	local clientid = s:option("clientid")
		function clientid:validate(value)
			return self.dt:string(value)
		end

	local vendorid = s:option("vendorid")
		function vendorid:validate(value)
			return self.dt:string(value)
		end

	local keepalive_failure = s:option("keepalive_failure")
		function keepalive_failure:validate(value)
			return self.dt:uinteger(value)
		end
		function keepalive_failure:get()
			local keepalive = self:table_get(self.config, self.sid, "keepalive")
			return keepalive and keepalive:match("^(%d+)[ ,]+%d+") or "5"
		end
		function keepalive_failure:set(value)
			value = value == "" and "5" or value
			local keepalive_interval_cfg = self:table_get(self.config, self.sid, "keepalive")
			keepalive_interval_cfg = keepalive_interval_cfg and keepalive_interval_cfg:match("^%d+[ ,]+(%d+)") or "1"
			local keepalive_interval_val = self.current_data_block.keepalive_interval or keepalive_interval_cfg
			keepalive_interval_val = keepalive_interval_val == "" and "1" or keepalive_interval_val
			self:table_set(self.config, self.sid, "keepalive", value.." "..keepalive_interval_val)
		end

	local keepalive_interval = s:option("keepalive_interval")
		function keepalive_interval:validate(value)
			return self.dt:min(value, 1)
		end
		function keepalive_interval:get()
			local keepalive = self:table_get(self.config, self.sid, "keepalive")
			return keepalive and keepalive:match("^%d+[ ,]+(%d+)") or "1"
		end
		function keepalive_interval:set(value)
			value = value == "" and "1" or value
			local keepalive_failure_cfg = self:table_get(self.config, self.sid, "keepalive")
			keepalive_failure_cfg = keepalive_failure_cfg and keepalive_failure_cfg:match("^(%d+)[ ,]+%d+") or "5"
			local keepalive_failure_val = self.current_data_block.keepalive_failure or keepalive_failure_cfg
			keepalive_failure_val = keepalive_failure_val == "" and "5" or keepalive_failure_val
			self:table_set(self.config, self.sid, "keepalive", keepalive_failure_val.." "..value)
		end

	local host_uniq = s:option("host_uniq")
		function host_uniq:validate(value)
			return self.dt:hexstring(value)
		end

	local username = s:option("username")
		username.maxlength = 64
		username.require = {"password"}
		function username:validate(value)
			return self.dt:string(value)
		end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 64
		password.require = {"username"}
		function password:validate(value)
			return self.dt:string(value)
		end

	local demand = s:option("demand")
		function demand:validate(value)
			return self.dt:uinteger(value)
		end

	local ip4table = s:option("ip4table")
		function ip4table:validate(value)
			local proto = self:get_abs_value(self.config, self.sid, "proto")
			if proto == "dhcpv6" or proto == "none" then
				return false, "'ip4table' configuration option is not available for 'none' and 'dhcpv6' protocols."
			end
			return self.dt:uinteger(value)
		end

	local ip6table = s:option("ip6table")
		function ip6table:validate(value)
			local proto = self:get_abs_value(self.config, self.sid, "proto")
			if proto ~= "dhcpv6" then
				return false, "'ip6table' configuration option is available for 'dhcpv6' protocol."
			end
			return self.dt:uinteger(value)
		end

	local bridge = s:option("bridge")
		function bridge:validate(value)
			return self.dt:is_bool(value)
		end
		function bridge:get()
			if self:table_get(self.config, "br_"..self.sid, "type") == "bridge" and
				self:table_get(self.config, self.sid, "device") == "br-"..self.sid then
				return "1"
			end
			return "0"
		end
		function bridge:set(value)
			local mtu_cfg = self:get_device_option("mtu")
			local macaddr_cfg = self:get_device_option("macaddr")

			if value == "1" then
				self:remove_old_value("mtu")
				self:remove_old_value("macaddr")
				self:table_section(self.config, "device", "br_"..self.sid, {
					name = "br-"..self.sid,
					type = "bridge"
				})
				local device = self:table_get(self.config, self.sid, "device")
				if device ~= "br-"..self.sid then
					self:table_set(self.config, "br_"..self.sid, "ports", {device})
				end

				self:table_set(self.config, self.sid, "device", "br-"..self.sid)
			else
				local ports = self:table_get(self.config, "br_"..self.sid, "ports")
				if ports and ports[1] then
					self:table_set(self.config, self.sid, "device", ports[1])
				end
				if self:table_get(self.config, "br_"..self.sid) then
					self:table_delete(self.config, "br_"..self.sid)
				end
			end

			self:set_device_option("mtu", mtu_cfg, true)
			self:set_device_option("macaddr", macaddr_cfg, true)
		end

	local macaddr = s:option("macaddr")
		function macaddr:validate(value)
			if self.dt:macaddr(value) and tonumber(value:match("^(%x%x):"), 16) % 2 == 0 then
				return true
			end
			return false, "Unicast MAC address is allowed. E.g. 00:23:45:67:89:AB."
		end
		function macaddr:get(value)
			return self:get_device_option(self.api_key)
		end
		function macaddr:set(value)
			self:set_device_option(self.api_key, value)
		end

	local mtu = s:option("mtu")
		function mtu:validate(value)
			if self:get_bridge_val() then
				return self.dt:irange(value, 68, 65535)
			end
			return self.dt:irange(value, 68, board:get_max_mtu())
		end
		function mtu:get(value)
			return self:get_device_option(self.api_key)
		end
		function mtu:set(value)
			self:set_device_option(self.api_key, value)
		end

	local stp = s:option("stp")
		function stp:validate(value)
			if not self:get_bridge_val() and value == "1" then
				return false, "STP cannot be turned on if bridge is disabled"
			end
			return self.dt:is_bool(value)
		end
		function stp:get()
			if self:get_bridge_val() then
				return self:table_get(self.config, "br_"..self.sid, "stp") or "0"
			end
		end
		function stp:set(value)
			if self:get_bridge_val() then
				self:table_set(self.config, "br_"..self.sid, "stp", value)
			end
		end

	local igmp_snooping = s:option("igmp_snooping")
		function igmp_snooping:validate(value)
			if not self:get_bridge_val() and value == "1" then
				return false, "Turn on 'bridge' option before enabling 'igmp_snooping'."
			end
			return self.dt:is_bool(value)
		end
		function igmp_snooping:get()
			if self:get_bridge_val() then
				return self:table_get(self.config, "br_"..self.sid, "igmp_snooping") or "0"
			end
		end
		function igmp_snooping:set(value)
			if self:get_bridge_val() then
				self:table_set(self.config, "br_"..self.sid, "igmp_snooping", value)
			end
		end

	local device = s:option("device")
		device.readonly = true
		function device:get(value)
			return util.network_mapper_get(self, value, false, "device", "name", ".name")
		end

ifname = s:option("ifname", { list = true })
ifname.minlength = 1
ifname.maxlength = 15
function ifname:validate(value)
	local bridge = self:get_bridge_val()
	if not bridge then
		if type(self.current_data_block.ifname) == "table" and #self.current_data_block.ifname > 1 then
			return false, "Turn on 'bridge' option to allow multiple ifnames."
		end
	end

	self:table_foreach("network", "device", function(d)
		if d.type == "bridge" and d.name ~= self:table_get(self.config, self.sid, "device") then
			local is_used, ports = false, {}
			ports = self:table_get("network", d[".name"], "ports") or {}
			for _, p in pairs(ports) do
				if p == value then
					is_used = true
					break
				end
			end
			if is_used then
				local dev_name = d.description or d.name
				self:add_error(STD_CODES.INVALID_OPT,
					"Physical interface '" .. value .. "' is used in '" .. dev_name .. "' bridge, you need to remove it first",
					"Validation")
			end
		end
		if bridge and d.type == "bridge" and d.name == value then
			self:add_error(STD_CODES.INVALID_OPT,
				"'" .. value .. "' is bridge and it cannot be bridged",
				"Validation")
		end
	end)
	if bridge then
		self:table_foreach("network", "interface", function(intf)
			if intf[".name"] ~= self.sid and intf.device and intf.device == value and (not intf.invisible or intf.invisible ~= "1") then
				self:add_error(STD_CODES.INVALID_OPT,
				"Physical interface '" .. value .. "' is used in interface '" .. intf[".name"].. "', you need to remove it first",
				"Validation")
			end
		end)
	end
	return self.dt:fieldvalidation(value, "^[A-Za-z0-9._@-]+$")
end
function ifname:get(value)
	local bridge = self:get_bridge_val()
	if bridge then
		return self:table_get(self.config, "br_"..self.sid, "ports") or {}
	end
	return self:table_get(self.config, self.sid, "device") or {}
end
function ifname:set(value)
	local bridge = self:get_bridge_val()
	if bridge then
		self:table_set(self.config, "br_"..self.sid, "ports", value)
		self:table_set(self.config, self.sid, "device", "br-"..self.sid)
	else
		self:table_set(self.config, self.sid, "device", #value > 0 and value[1] or "")
	end
end

	local tag = s:option("tag")
	tag.require = {"priority"}
		function tag:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end

			return self.dt:irange(value, 0, 15)
		end

	local priority = s:option("priority")
	priority.require = {"tag"}
		function priority:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end

			return self.dt:irange(value, 0, 7)
		end

if board:has_sfp_port() then
	local fiber_priority = s:option("fiber_priority")
		function fiber_priority:validate(value)
			return self.dt:is_bool(value)
		end
		function fiber_priority:get(value)
			local device
			if self:table_get(self.config, "br_"..self.sid) then
				device = self:table_get(self.config, "br_"..self.sid, "ports")
			else
				device = self:table_get(self.config, self.sid, "device")
			end
			for _, dev in ipairs(type(device) == "table" and device or {device}) do
				if dev and dev:match(default_wan_device) then
					ntm = ntm or require "vuci.network".init(self.uci)
					local switch_section = ntm:physical_port_switch_section(default_wan_device)
					return self:table_get("network", switch_section, "fiber_priority") or "1"
				end
			end
		end
		function fiber_priority:set(value)
			-- Validation is moved to set method because first ifname option needs to be set
			local device
			if #value > 0 then
				if self:table_get(self.config, "br_"..self.sid) then
					device = self:table_get(self.config, "br_"..self.sid, "ports")
				else
					device = self:table_get(self.config, self.sid, "device")
				end
				local valid = false
				if device then
					for _, dev in ipairs(type(device) == "table" and device or {device}) do
						if dev:match(default_wan_device) then
							valid = true
							break
						end
					end
				end
				if not valid then
					return self:add_error(STD_CODES.INVALID_OPT,
								"fiber_priority option is available only for devices with device='%s'" % default_wan_device,
								self.api_key, self.sid, value)
				end
			end

			ntm = ntm or require "vuci.network".init(self.uci)
			local switch_section = ntm:physical_port_switch_section(default_wan_device)
			self:table_set("network", switch_section, "fiber_priority", value)
		end
end

if has_ipv6 then
	local ipv6 = s:option("ipv6")
		function ipv6:validate(value)
			return self.dt:check_array(value, {"auto", "0", "1"})
		end

	local ip6prefix = s:option("ip6prefix")
		function ip6prefix:validate(value)
			return self.dt:cidr6(value)
		end

	local ip6assign = s:option("ip6assign")
		function ip6assign:validate(value)
			return self.dt:irange(value, 0, 64)
		end

	local ip6hint = s:option("ip6hint")
		function ip6hint:validate(value)
			local ip6assign = tonumber(self:get_abs_value(self.config, self.sid, "ip6assign"))
			if ip6assign and ip6assign >= 33 and ip6assign <= 64 then
				return self.dt:hexstring(value)
			end
			return false, "ip6assign must be from 33 to 64 in order to set ip6hint"
		end

	local ip6addr = s:option("ip6addr")
		function ip6addr:validate(value)
			return self.dt:ipmask6(value)
		end

	local ip6gw = s:option("ip6gw")
		function ip6gw:validate(value)
			return self.dt:ip6addr(value)
		end
		function ip6gw:get(value)
			if self:get_abs_value(self.config, self.sid, "area_type") == "wan" then
				return value
			end
		end
		function ip6gw:set(value)
			if self:get_abs_value(self.config, self.sid, "area_type") == "wan" or #value == 0 then
				self:table_set(self.config, self.sid, self.api_key, value)
			else
				self:add_error(STD_CODES.INVALID_OPT, "Option can be configured only for wan interface", self.api_key)
			end
		end

	local ip6ifaceid = s:option("ip6ifaceid")
		function ip6ifaceid:validate(value)
			if value == "eui64" or value == "random" then
				return true
			end
			return self.dt:ip6addr(value)
		end
end

	local fwzone = s:option("fwzone")
	fwzone.maxlength = 11
		function fwzone:validate(value)
			return self.dt:uciname(value)
		end
		function fwzone:get()
			local z
			self:table_foreach("firewall", "zone", function(s)
				if s.name then
					for n in util.imatch(s.network or s.name) do
						if n == self.sid then
							z = s.name
							return false
						end
					end
				end
			end)
			return z
		end
		function fwzone:set(value)
			if self.request_method == "PUT" then
				self:set_firewall_zone(value)
			end
		end

if default_wan_device then -- only for devices with a wan eth1 port
	local wan_as_lan = s:option("wan_as_lan")
		function wan_as_lan:validate(value)
			if self.sid ~= "lan" then return false, "'wan_as_lan' option can only be set for the 'lan' interface" end
			return self.dt:is_bool(value)
		end
		function wan_as_lan:get()
			if self.sid ~= "lan" then return end
			if self:table_get("network", "br_lan") then
				local ports = self:table_get("network", "br_lan", "ports") or {}
				for _, p in pairs(ports) do
					if p == default_wan_device then
						return "1"
					end
				end
				return "0"
			end
			local device = self:table_get("network", "lan", "device")
			return device and device == default_wan_device and "1" or nil
		end
		function wan_as_lan:set(value)
			if value == "1" then
				if self:table_get("network", "br_wan") then
					self:table_delete("network", "br_wan")
				end
				if self:table_get("network", "wan") then
					self:table_delete("network", "wan", "device")
				end
				if self:table_get("network", "br_wan6") then
					self:table_delete("network", "br_wan6")
				end
				if self:table_get("network", "wan6") then
					self:table_delete("network", "wan6", "device")
				end
				local lan_devices
				if self:table_get("network", "br_lan") then
					lan_devices = self:table_get("network", "br_lan", "ports")
					for _, v in pairs(lan_devices) do
						if v == default_wan_device then
							return
						end
					end
					table.insert(lan_devices, default_wan_device)
					self:table_set("network", "br_lan", "ports", lan_devices)
				else
					lan_devices = self:table_get("network", "lan", "device") or default_lan_device
					if type(lan_devices) == "table" then
						table.insert(lan_devices, default_wan_device)
					else
						lan_devices = {lan_devices, default_wan_device}
					end
					self:table_section(self.config, "device", "br_lan", {
						name = "br-lan",
						type = "bridge",
						ports = lan_devices
					})
					self:table_set("network", "lan", "device", "br-lan")
				end
			else
				local new_lan_devices
				if self:table_get("network", "br_lan") then
					new_lan_devices = self:table_get("network", "br_lan", "ports") or default_lan_device
					if type(new_lan_devices) ~= "table" then
						new_lan_devices = {new_lan_devices}
					end
					for i, v in pairs(new_lan_devices) do
						if v == default_wan_device then
							table.remove(new_lan_devices, i)
							break
						end
					end
					self:table_set("network", "br_lan", "ports", new_lan_devices)
				elseif self:table_get("network", "lan", "device") == default_wan_device then
					self:table_section(self.config, "device", "br_lan", {
						name = "br-lan",
						type = "bridge",
						ports = type(default_lan_device) == "table" and default_lan_device or {default_lan_device}
					})
					self:table_set("network", "lan", "device", "br-lan")
				end
				if self:table_get("network", "wan6") then
					self:table_set("network", "wan6", "device", default_wan_device)
				end
				if self:table_get("network", "wan") then
					self:table_set("network", "wan", "device", default_wan_device)
					self:table_delete("network", "wan", "disabled")
					self:table_delete("network", "wan", "auto")
				end
			end
		end
end

function interfaces:update_network_metrics(value, old_value)
	local section
	local sections = {}
	-- Checks whether given metric is in use
	self:table_foreach(self.config, "interface", function (s)
		if s.area_type == "wan" and s.metric and #s.metric > 0 then
			if s.metric == value and tonumber(s.metric) ~= MAX_METRIC and s[".name"] ~= self.sid then
				section = s
			end
			table.insert(sections, s)
		end
	end)
	-- If section with provided metric is present
	if not section then return end
	-- Sorts metrics in ascending order
	table.sort(sections, function(a, b)
		if a and b then
			if a.metric == b.metric then
				if a[".name"] == self.sid then
					return tonumber(a.metric) < tonumber(old_value)
				end
				if b[".name"] == self.sid then
					return tonumber(b.metric) > tonumber(old_value)
				end
			end
			return tonumber(a.metric) < tonumber(b.metric)
		end
	end)
	value = tonumber(value)
	old_value = tonumber(old_value)
	for i = 1, #sections do
		local current = tonumber(sections[i].metric)
		if sections[i][".name"] ~= self.sid and ((current >= value and current < old_value) or (current <= value and current > old_value)) then
			local new_value = value > old_value and -1 or 1
			sections[i].metric = tostring(current + new_value)
		end
	end
	-- Sets unique metric values
	for _, sec in ipairs(sections) do
		self:table_set(self.config, sec[".name"], "metric", tostring(sec.metric))
	end
end

function interfaces:update_mwan_metrics()
	if not has_mwan                then return end
	if not self.needs_mwan_reorder then return end

	local rule = {}
	self:table_foreach("mwan3", "rule", function (s)
		rule = s
		return false
	end)
	local default_policy = rule.use_policy or self:table_get("mwan3", "default_rule", "use_policy") or "mwan_default"
	if default_policy == "balance_default" then return end
	local policy_members = self:table_get("mwan3", default_policy, "use_member") or {}
	local member_lookup = {}
	for _, m in pairs(policy_members) do
		local member = self:table_get("mwan3", m)
		member_lookup[member.interface] = member
	end

	local ifaces = {}
	self:table_foreach("network", "interface", function (iface)
		local sid = iface[".name"]
		if member_lookup[sid] then
			table.insert(ifaces, iface)
		end
	end)

	table.sort(ifaces, function(a, b)
		if a[interfaces.sort_response_by] and b[interfaces.sort_response_by] then
			return a[interfaces.sort_response_by] < b[interfaces.sort_response_by]
		end
	end)

	for i, iface in ipairs(ifaces) do
		local sid = iface[".name"]
		local member = member_lookup[sid]
		self:table_set("mwan3", member[".name"], "metric", tostring(i))
	end

	self.needs_mwan_reorder = nil
end

function interfaces:before_commit_hook()
	self:update_mwan_metrics()

	network_lib:update_mobile_ipv4_conn_setup(interfaces)
end
interfaces.PUT_before_commit_hook = interfaces.before_commit_hook
interfaces.DELETE_before_commit_hook = interfaces.before_commit_hook

function interfaces:POST_before_commit_hook()
	local value =  self.current_data_block["fwzone"]
	if value and #value > 0 then
		self:set_firewall_zone(value)
	end

	self:before_commit_hook()
end

function interfaces:find_highest_metric()
	local metric = 1
	self.uci:foreach("network", "interface", function(s)
		if s.area_type == "wan" and s.metric then
			metric = math.max(metric, tonumber(s.metric))
		end
	end)
	local new_metric = metric + 1
	return new_metric > MAX_METRIC and MAX_METRIC or new_metric
end

interfaces.POST_after_data_hooks[#interfaces.POST_after_data_hooks+1] = function (self, s)
	if self:get_abs_value("network", self.sid, "area_type") == "wan" then
		if not self:table_get("network", self.sid, "metric") then
			local metric = self:find_highest_metric()
			self:table_set("network", self.sid, "metric", tostring(metric))
		end
		mwan = mwan or require "vuci.mwan".init(self.uci)
		mwan:add_mwan(self.sid)
		self.config_set_table["mwan3"] = self.config_set_table["mwan3"] or {}
	end
end

function interfaces:copy_options(action)
	action.sections = self.sections
	for _, s in ipairs(self.sections) do
		for name, o in pairs(s.options) do
			local optname, opt = next(o)
			action.options[optname] = opt
		end
	end
end

local function lan_to_wan_supported()
	local switch_ports = board:get_switch_ports()
	local switch_lan_ports = {}
	local network_ports = {}
	for _, port in pairs(switch_ports) do
		if port.role == "lan" then
			table.insert(switch_lan_ports, port)
		end
	end

	for _, port in pairs(util.to_table(default_lan_device)) do
		if port:match("^lan") or port:match("^eth") then
			table.insert(network_ports, port)
		end
	end

	local has_single_ethernet_lan = (#switch_lan_ports == 0 or #switch_lan_ports == 1) and #network_ports == 1
	return has_single_ethernet_lan and not default_wan_device
end

if lan_to_wan_supported() then
	function interfaces:lan_to_wan()
		local sid = "lan"
		local uci = self.uci

		if self.uci:get("network", "lan_to_wan") then
			self:add_critical_error(RES_CODES.LAN_TO_WAN_ALREADY_EXISTS,
				"lan_to_wan was already enabled. wan_to_lan action can be used to revert it.",
				"lan_to_wan")
		end

		fw = fw or require "vuci.firewall".init(self.uci)
		local ac = require "vuci.access"
		mwan = mwan or require "vuci.mwan".init(uci)
		local lan_device = type(default_lan_device) == "table" and default_lan_device or {default_lan_device}
		local iface_device = lan_device[1]
		if board:get_micro_usb_support() then
			-- remove eth0 from LAN bridge
			local lan_devices = {}
			for _, v in pairs(lan_device) do
				if not v:match("eth%d+") then
					table.insert(lan_devices, v)
				end
			end
			uci:set("network", "br_" .. sid, "ports", lan_devices)

			-- add eth0 to WAN bridge
			local wan_devices = {}
			for _, v in pairs(lan_device) do
				if v:match("eth%d+") then
					table.insert(wan_devices, v)
				end
			end

			local bridge_iface = "br_" .. sid .. "_to_wan"
			if self:table_get("network", bridge_iface) then
				uci:set("network", bridge_iface, "ports", wan_devices)
			else
				uci:section("network", "device", bridge_iface, {
					name = bridge_iface,
					type = "bridge",
					ports = wan_devices
				})
			end
			iface_device = bridge_iface
		else
			-- remove all devices from lan config
			uci:delete("network", sid, "device")
			uci:delete("network", "br_"..sid)
		end

		-- create new section (for devices with only one eth port)
		uci:section("network", "interface", sid .. "_to_wan", {})
		local metric = self:find_highest_metric()

		mwan:add_mwan(sid .. "_to_wan")
		uci:commit("mwan3")

		local zone = fw:get_zone("wan")
		zone:add_network(sid .. "_to_wan")
		ac.add_wan_rule(uci, 80, "", "HTTP")
		ac.add_wan_rule(uci, 443, "", "HTTPS")
		uci:commit("firewall")

		uci:set("uhttpd", "main", "_httpWanAccess", "1")
		uci:set("uhttpd", "main", "_httpsWanAccess", "1")
		uci:commit("uhttpd")

		uci:set("network", sid .. "_to_wan", "device", iface_device)
		uci:set("network", sid .. "_to_wan", "proto", "dhcp")
		uci:set("network", sid .. "_to_wan", "area_type", "wan")
		uci:set("network", sid .. "_to_wan", "was_lan", "1")
		uci:set("network", sid .. "_to_wan", "metric", tostring(metric))
		uci:commit("network")

		return self:ResponseOK()
	end
	interfaces:action("lan_to_wan", interfaces.lan_to_wan)

	function interfaces:wan_to_lan()
		if not self.uci:get("network", "lan_to_wan") and not self.uci:get("network", "br_lan_to_wan") then
			self:add_critical_error(RES_CODES.WAN_TO_LAN_DOESNT_EXIST,
				"Can not execute wan_to_lan - lan_to_wan is currently not enabled. wan_to_lan action can only be used if lan_to_wan was previously used.",
				"wan_to_lan")
		end

		local uci = self.uci
		local sid = "lan_to_wan"

		fw = fw or require "vuci.firewall".init(uci)
		mwan = mwan or require "vuci.mwan".init(uci)

		-- reset lan_to_wan
		uci:delete("network", sid)
		uci:delete("network", "br_" .. sid)

		fw:del_network(sid)
		uci:commit("firewall")
		mwan:del_interface(sid)
		uci:commit("mwan3")

		local devices = type(default_lan_device) == "table" and default_lan_device or {default_lan_device}
		if uci:get("network", "br_lan") then
			uci:set("network", "br_lan", "ports", devices)
		else
			uci:section("network", "device", "br_lan", {
				name = "br-lan",
				type = "bridge",
				ports = devices
			})
		end

		uci:set("network", "lan", "device", "br-lan")
		uci:set("network", "lan", "disabled", "0")
		uci:delete("network", "lan", "auto")
		uci:commit("network")

		return self:ResponseOK()
	end
	interfaces:action("wan_to_lan", interfaces.wan_to_lan)
end

-- Temporary workaround for multiple wifi device parsing
-- until network.lua is refactored to support multiple devices
function interfaces:get_multiple_wireless_device_status(sname, mwan_iface)
	local wireless_config
	self:table_foreach("wireless", "wifi-iface", function (s)
		if s.network == sname then
			wireless_config = s
			return false
		end
	end)
	if not wireless_config or type(wireless_config.device) ~= "table" then return nil end
	local wireless_data = util.ubus("network.wireless", "status")
	local iface_data = util.ubus("network.interface."..sname, "status")
	if not wireless_data or not iface_data then return nil end
	local wireless_device_names, ipaddrs = {}, {}
	local rx_bytes, tx_bytes, rx_packets, tx_packets, macaddr, net_type, dev_up = 0, 0, 0, 0, nil, nil, false
	for _, dev in ipairs(wireless_config.device) do
		for _, wifi_iface in ipairs(wireless_data[dev].interfaces) do
			if wifi_iface.section == wireless_config[".name"] then
				table.insert(wireless_device_names, wifi_iface.ifname)
			end
		end
	end
	for _, dev in ipairs(wireless_device_names) do
		local data = util.ubus("network.device", "status", { name = dev })
		if data then
			if data.statistics then
				rx_bytes = rx_bytes + (data.statistics.rx_bytes or 0)
				tx_bytes = tx_bytes + (data.statistics.tx_bytes or 0)
				tx_packets = tx_packets + (data.statistics.tx_packets or 0)
				rx_packets = rx_packets + (data.statistics.rx_packets or 0)
			end
			macaddr = data.macaddr and string.upper(data.macaddr) or nil
			net_type = data.type
			dev_up = dev_up or data.up
		end
	end
	for _, addr in ipairs(iface_data["ipv4-address"] or {}) do
		table.insert(ipaddrs, addr.address.."/"..addr.mask)
	end
	return {
		id         = sname,
		area_type  = self:table_get("network", sname, "area_type"),
		proto      = self:table_get("network", sname, "proto"),
		uptime     = iface_data.uptime,
		ipaddrs    = ipaddrs,
		ip6addrs   = iface_data["ipv6-address"],
		dnsaddrs   = iface_data["dns-server"],
		ip6prefix  = iface_data["ipv6-prefix"],
		errors     = iface_data.errors,
		macaddr    = macaddr,
		is_up      = iface_data.up and dev_up,
		is_dynamic = iface_data.dynamic,
		rx_bytes   = rx_bytes,
		tx_bytes   = tx_bytes,
		rx_packets = rx_packets,
		tx_packets = tx_packets,
		type       = net_type,
		ifname     = wireless_device_names,
		metric		= iface_data.metric,
		mwan_enabled = mwan_iface and mwan_iface:get("enabled") or 0,
		network_type = network_lib:get_network_type(sname, self.uci),
		typename   = "Wireless Adapter"
	}
end

function interfaces:get_status(sname)
	if self:table_get("network", sname, "invisible") == "1" then
		return nil -- Return if iface is invisible
	end

	mwan = mwan or require "vuci.mwan".init(self.uci)
	ntm = ntm or require "vuci.network".init()

	local ip_addr,ip_addr_6,ip_prefix_6
	local net = ntm:get_network(sname)
	local device = net and net:get_interface()
	local mwan_iface = mwan:get_interface(sname)
	if not ip_addr or ip_addr == "-" then
		ip_addr = net and net:ipaddrs() or nil
	end
	if not ip_addr_6 or ip_addr_6 == "-" then
		ip_addr_6 = net and net:ip6addrs() or nil
	end
	if not ip_prefix_6 then
		ip_prefix_6 = net and net:ip6prefix() or nil
	end

	if not device or device.wif then
		local wifi_data = self:get_multiple_wireless_device_status(sname, mwan_iface)
		if wifi_data then return wifi_data end
	end

	if device then
		local data = {
			id         = sname,
			desc       = net and net:get_i18n() or nil,
			proto      = net and network_lib:get_proto(net:proto()) or nil,
			uptime     = net and net:uptime() or nil,
			gwaddr     = net and net:gwaddr() or nil,
			ipaddrs    = ip_addr,
			ip6addrs   = ip_addr_6,
			dnsaddrs   = net and net:dnsaddrs() or nil,
			ip6prefix  = ip_prefix_6,
			errors     = net and net:errors() or nil,
			name       = device:shortname(),
			type       = device:type(),
			typename   = device:get_type_i18n(),
			ifname     = device:name(),
			macaddr    = device:mac(),
			is_up      = net and net:is_up() and device:is_up() or nil,
			is_alias   = net and net:is_alias() or nil,
			is_dynamic = net and net:is_dynamic() or nil,
			rx_bytes   = device:rx_bytes(),
			tx_bytes   = device:tx_bytes(),
			rx_packets = device:rx_packets(),
			tx_packets = device:tx_packets(),
			metric		= net and net:metric() or nil,
			mwan_enabled = mwan_iface and mwan_iface:get("enabled") or 0,
			subdevices = {},
			network_type = network_lib:get_network_type(sname, self.uci)
		}

		for _, device in ipairs(net and net:get_interfaces() or {}) do
			data.subdevices[#data.subdevices+1] = {
				name       = device:shortname(),
				type       = device:type(),
				typename   = device:get_type_i18n(),
				ifname     = device:name(),
				macaddr    = device:mac(),
				is_up      = device:is_up(),
				rx_bytes   = device:rx_bytes(),
				tx_bytes   = device:tx_bytes(),
				rx_packets = device:rx_packets(),
				tx_packets = device:tx_packets(),
			}

		end

		return data
	else
		return nil
	end
end

local _iface_dump
function interfaces:get_status_ubus(sname)
	if self:table_get("network", sname, "invisible") == "1" then
		return nil -- Return if iface is invisible
	end
	if not _iface_dump then
		_iface_dump = (util.ubus("network.interface", "dump") or {}).interface
	end
	for _, iface in ipairs(_iface_dump or {}) do
		if iface.interface == sname then
			iface.proto = network_lib:get_proto(iface.proto)
			return iface
		end
	end
end

local function get_active_ifname(uci)
	ntm = ntm or require "vuci.network".init()
	mwan = mwan or require "vuci.mwan".init(uci)

	local wan, wan_ifname, wan_ifname_type
	local active_iface = mwan:get_active()

	if active_iface then
		if ntm:get_type(active_iface) == "mobile" then
			wan = ntm:get_network(active_iface .. "_4") or ntm:get_network(active_iface .. "_6")
		else
			wan = ntm:get_network(active_iface)
		end
	else
		wan =  ntm:get_wannet()
	end

	if wan and wan:name() then
		wan_ifname = wan:name()
		wan_ifname_type = ntm:get_type(wan:name())
	end

	if not wan_ifname_type and wan and wan:name() and wan:name():len() >= 3 then
		local mobile_ifname = wan:name():sub(1, wan:name():len() - 2)
		if mobile_ifname then
			wan_ifname_type = ntm:get_type(mobile_ifname)
		end
		if wan_ifname_type then
			wan_ifname = mobile_ifname
		end
	end

	return wan_ifname
end

function interfaces:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function interfaces:GET_TYPE_status()
	local active_ifname = get_active_ifname(self.uci)
	local network_pretty = util.get_network_map(self, true)
	if self.sid then
		if self:table_get("network", self.sid, "invisible") == "1" then return self:ResponseOK({}) end
		local status = self:get_status(self.sid)
		local status_ubus = self:get_status_ubus(self.sid)
		if not status and not status_ubus and not self:table_get("network", self.sid) then
			return self:ResponseNotFound("Interface '%s' does not exist." % self.sid)
		end
		status = status or {}
		status_ubus = status_ubus or {}
		if status_ubus.interface == active_ifname then
			status["main"] = "1"
		end
		util.update(status, status_ubus)
		status.interface = status.interface or self.sid
		status.id = status.interface or self.sid
		status.area_type = self:table_get("network", self.sid, "area_type")
		status.name = network_pretty[status.id] or status.id
		return self:ResponseOK(status or {})
	else
		ntm = ntm or require "vuci.network".init()
		local nets = ntm:get_networks()
		local res = {}
		for _, net in ipairs(nets) do
			local status = self:get_status(net.sid)
			if status or self:table_get("network", net.sid) then
				if self:table_get("network", net.sid, "invisible") ~= "1" then
					status = status or {}
					local status_ubus = self:get_status_ubus(net.sid) or {}
					if status_ubus.interface == active_ifname then
						status["main"] = "1"
					end
					util.update(status, status_ubus)
					status.interface = status.interface or net.sid
					status.id = status.interface or net.sid
					status.area_type = self:table_get("network", net.sid, "area_type")
					status.name = network_pretty[status.id] or status.id
					res[#res+1] = status
				end
			end
		end
		return self:ResponseOK(res)
	end
end

return board:has_mobile() and require("api.network.mobile_extension")(interfaces) or interfaces
