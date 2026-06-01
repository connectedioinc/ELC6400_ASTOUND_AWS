local util = require("vuci.util")
local fs = require("nixio.fs")
local pac = require("vuci.package_checker")
local uci = require("vuci.uci"):cursor()

local ulog_utils = {}

local function parse_ifname(value)
	return type(value) == "table" and value or {value}
end

local function check_available_ifname(ifname, lan_ifname)
	local interfaces = parse_ifname(ifname)
	for _, interface in ipairs(interfaces) do
		if (lan_ifname and interface == lan_ifname) or
			(lan_ifname and type(lan_ifname) == "table" and util.contains(lan_ifname, interface)) or
			interface == "eth0" or
			interface == "rndis0" or
			interface == "ecm0" or
			interface == "br-lan" or
			string.match(interface, "wlan")
		then
			return true
		end
	end
	return false
end

local function check_is_not_self(interfaces1, interfaces2)
	local interfaces_parse1 = parse_ifname(interfaces1)
	local interfaces_parse2 = parse_ifname(interfaces2)
	for _, value in ipairs(interfaces_parse1) do
		if util.contains(interfaces_parse2, value) then
			return true
		end
	end
	return false
end

local function check_interface(interface)
	if not interface then return false end

	if interface and check_available_ifname(interface) then
		return true
	end
	for _, value in ipairs(interface) do
		if value ~= "br-lan" and value:match("^br%-") then
			local interface_name = string.match(value, "%-(.*)")
			local interface_section = uci:get("network", "br_" .. interface_name)
			if interface_section and check_is_not_self(value, interface_section.ports) then
				return false
			end
			if interface_section and check_interface(interface_section.ports) then
				return true
			end
		end
	end
	return false
end


-- Gets networks that ulog requires
---@return table networks Ulog networks.
function ulog_utils:networks()
	if self.network_list then
		return self.network_list
	end
	self.network_list = {}
	local lan_ifname = require("vuci.board"):get_default_lan_ifname()
	uci:foreach("network", "interface", function(interface)
		if interface.device and check_available_ifname(interface.device, lan_ifname) then
			table.insert(self.network_list, interface.name or interface[".name"])
		elseif interface.device and interface.device ~= "br-lan" and interface.device:match("^br%-") then
			local interface_name = string.match(interface.device, "%-(.*)")
			local interface_section = uci:get("network", "br_" .. interface_name)
			if interface_section and check_interface(interface_section.ports) then
				table.insert(self.network_list, interface.name or interface[".name"])
			end
		end
	end)
	if pac.is_installed("coova-chilli") then
		table.insert(self.network_list, "hotspot")
	end
	return self.network_list
end

return ulog_utils
