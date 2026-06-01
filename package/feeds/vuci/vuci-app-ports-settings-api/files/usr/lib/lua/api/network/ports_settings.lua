local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local board = require("vuci.board")

if not board:has_port_link() then
	return nil
end

local dsa = board:has_dsa()
local is_x86 = board:is_X86()

local ConfigService = require("api/ConfigService")

local PortSettings = ConfigService:new({
	create = false,
	delete = false
})

local port_speeds_map = {
	["10baseT-H"]   = "10mh",
	["10baseT-F"]   = "10mf",
	["100baseT-H"]  = "100mh",
	["100baseT-F"]  = "100mf",
	["1000baseT-F"] = "1000mf",
	["2500baseT-F"] = "2500mf"
}
local driver_capabilities = {
	["Airoha EN8811H"] = { force_autoneg = true },
}

local _port_capabilities = {}
local function get_port_capabilities(port)
	local function parse_port_capabilities(p)
		if _port_capabilities[p] then return _port_capabilities[p] end
		local dev_status = util.ubus("network.device", "status", { name = p })
		local phy_status = util.ubus("rpc-sys-ext", "ethtool", { args = { "--show-phys", p } }) or {}
		local driver = phy_status.output and phy_status.output[1] and phy_status.output[1].drvname
		local driver_cap = driver and driver_capabilities[driver] or {}
		local link_supported = dev_status and dev_status["link-supported"] or {}
		local supported_speeds = {}
		for _, speed in pairs(link_supported) do
			table.insert(supported_speeds, port_speeds_map[speed] or speed)
		end
		_port_capabilities[p] = {
			speeds = supported_speeds,
			force_autoneg = driver_cap.force_autoneg
		}
		return _port_capabilities[p]
	end

	local physical_ports = board:get_all_physical_ifnames()
	if port then
		if not util.contains(physical_ports, port) then	return {} end
		return parse_port_capabilities(port)
	end
	if next(_port_capabilities) then return _port_capabilities end
	for _, p in pairs(physical_ports) do
		parse_port_capabilities(p)
	end
	return _port_capabilities
end

function PortSettings:check_autoneg_enforcement(port)
	local port_features = get_port_capabilities(port:sub(2))
	return not port_features.force_autoneg, string.format("Autonegotiation is enforced on '%s' port and option cannot be changed", self.sid)
end

function PortSettings:section_init_hook()
	self.advertisements = { "10mh", "10mf", "100mh", "100mf" }
	if dsa and not is_x86 then
		local port_capabilities = get_port_capabilities(self.sid:sub(2))
		self.advertisements = port_capabilities and port_capabilities.speeds or self.advertisements
		return
	end

	if board:has_gigabit_port() then
		table.insert(self.advertisements, "1000mf")
	end
	if board:has_2_5_gigabit_port() then
		table.insert(self.advertisements, "2500mf")
	end
end

PortSettings.GET_section_init_hook = PortSettings.section_init_hook
PortSettings.PUT_section_init_hook = PortSettings.section_init_hook

local s = PortSettings:section("network", "port")

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

		function enabled:set(value)
			if value == "0" and self:table_get("dot1x", self.sid, "enabled") == "1" then
				self:table_set("dot1x", self.sid, "enabled", "0")
				self:add_message(1, "802.1X authentication has been disabled for port '" .. self.sid .. "'")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end


	if dsa then
		local mtu = s:option("mtu")
			function mtu:validate(value)
				local max_mtu = board:get_max_mtu() or 1500
				return self.dt:irange(value, 68, max_mtu)
			end
			function mtu:get()
				return self:table_get(self.config, self.sid.."_mtu", self.api_key)
			end
			function mtu:set(value)
				return self:table_set(self.config, self.sid.."_mtu", self.api_key, value)
			end
	end

	local autoneg = s:option("autoneg")
		autoneg.require = { ["on"] = {"advert"} }
		function autoneg:validate(value)
			local valid, msg = self:check_autoneg_enforcement(self.sid)
			if not valid then return valid, msg end
			return self.dt:check_array(value, { "on", "off" })
		end

	local advert = s:option("advert", { list = true })
		function advert:validate(value)
			return self.dt:check_array(value, self.advertisements)
		end
		function advert:get(value)
			if not value then
				return util.clone(self.advertisements)
			end

			local rv, tmp_val = {}, ""
			local adverts = {
				{ adv_hex = "1", adv_name = "10mh" },
				{ adv_hex = "2", adv_name = "10mf" },
				{ adv_hex = "4", adv_name = "100mh" },
				{ adv_hex = "8", adv_name = "100mf" },
				{ adv_hex = "20", adv_name = "1000mf" },
				{ adv_hex = "800000000000", adv_name = "2500mf" },
			}

			table.sort(adverts, function(a, b)
				return util_tlt.hex_gte(a.adv_hex, b.adv_hex)
			end)

			for _, v in ipairs(adverts) do
				if util_tlt.hex_gte(value, v.adv_hex) then
					tmp_val = util_tlt.hex_sub(value, v.adv_hex)
					table.insert(rv, v.adv_name)
					value = tmp_val
				end
			end
			return rv
		end
		function advert:set(value)
			local adverts_in_hex = {
				["10mh"] = "1",
				["10mf"] = "2",
				["100mh"] = "4",
				["100mf"] = "8",
				["1000mf"] = "20",
				["2500mf"] = "800000000000"
			}
			local adv = "0"
			for _, val in ipairs(value) do
				adv = util_tlt.hex_add(adv, adverts_in_hex[val])
			end
			self:table_set(self.config, self.sid, self.api_key, ("0x%s"):format(#adv == 1 and "0" .. adv or adv))
		end

	local speed = s:option("speed")
		function speed:validate(value)
			local valid, msg = self:check_autoneg_enforcement(self.sid)
			if not valid then return valid, msg end
			return self.dt:check_array(value, { "10", "100" })
		end

	local duplex = s:option("duplex")
		function duplex:validate(value)
			local valid, msg = self:check_autoneg_enforcement(self.sid)
			if not valid then return valid, msg end
			return self.dt:check_array(value, { "full", "half" })
		end

	local poe_enable = s:option("poe_enable")
		function poe_enable:validate(value)
			local msg = string.format("PoE is not supported on '%s' port", self.sid)
			local poe = board:has_poe()
			if poe then
				local poe_data = board:poe()
				local ports = poe_data and poe_data.ports or {}
				for _, port in ipairs(ports) do
					if port.name == self.sid then return self.dt:is_bool(value) end
				end
			end
			return false, msg
		end
		function poe_enable:get()
			local enable
			self:table_foreach("poe", "port", function (s)
				if s.name == self.sid then
					enable = self:table_get("poe", s[".name"], "poe_enable")
					return false
				end
			end)
			return enable
		end
		function poe_enable:set(value)
			self:table_foreach("poe", "port", function (s)
				if s.name == self.sid then
					self:table_set("poe", s[".name"], "poe_enable", value)
					return false
				end
			end)
		end

function PortSettings:PUT_validate_section_hook()
	local autoneg = self:get_abs_value(self.config, self.sid, "autoneg")
	local advert = self:getter_wrapped_abs_value(self.config, self.sid, "advert")
	if autoneg == "on" and (not advert or advert == "0x00" or #advert == 0) then
		self:add_critical_error(STD_CODES.INVALID_OPT, "'autoneg' cannot be enabled without 'advert'", "Validation")
	end
end

function PortSettings:map_port_status_to_id(ports)

	local switch_ports = board:get_switch_ports()
	local default_lan = board:get_default_lan_ifname()
	local default_wan = board:get_default_wan_ifname()

	if board:has_dsa() then
		for _, port in ipairs(ports) do
			if port.name == "WAN" then
				port.id = "_" .. default_wan
			elseif port.name == "LAN" then
				port.id = "_" .. (default_lan[port.position] or default_lan)
			end
		end
	elseif switch_ports and #switch_ports > 0 then
		for _, port in ipairs(ports) do
			if port.name == "WAN" then
				port.id = "_wan" .. port.num
			elseif port.name == "LAN" then
				port.id = "_lan" .. port.num
			end
		end
	else
		local i = 1
		for _, port in ipairs(ports) do
			if port.name == "LAN" then
				port.id = "_lan" .. i
				i = i + 1
			end
		end
	end
end

function PortSettings:GET_TYPE_status()
	local has_poe = board:has_poe()
	local data = util.ubus("port_events", "show")
	local formatted_ports, poe_port_name_map = {}, {}
	local num_key = dsa and "position" or "num"
	if has_poe then
		self:table_foreach("poe", "port", function (s)
			poe_port_name_map[s.name] = s
		end)
	end
	for _, port in ipairs(data and data.ports or {}) do
		if port.name == "LAN" or port.name == "WAN" then
			if has_poe then
				local port_name
				if port.name == "LAN" then
					port_name = "_lan"..port[num_key]
				else
					port_name = "_wan"..port[num_key]
				end
				local poe_data = util.ubus("poeman", "get", {port = port_name})
				if poe_data and not poe_data.error then
					local poe_config = poe_port_name_map[port_name]
					port.poe_enable = poe_config and poe_config.poe_enable or nil
					port.power = tostring(poe_data.port_state or 0)
					port.budget = port.power == "1" and tostring((tonumber(poe_data.current) or 0) * ((tonumber(poe_data.voltage) or 0))) or "0"
				end
			end
			table.insert(formatted_ports, port)
		end
	end

	self:map_port_status_to_id(formatted_ports)

	if dsa then
		local port_capabilities = get_port_capabilities()
		for _, port in ipairs(formatted_ports) do
			local port_cap = port_capabilities and port_capabilities[port.id:sub(2)]
			port.link_supported = port_cap and port_cap.speeds
			port.force_autoneg = port_cap and port_cap.force_autoneg
		end
	end

	local has_dot1x, port_security_utils = pcall(require, "api/network/port_security_utils")
	for _, port in ipairs(formatted_ports) do
		port.enabled = self:table_get(self.config, port.id, "enabled") or "1"
		if has_dot1x then
			port.dot1x = port_security_utils.get_port_authorized(self, port.id)
		end
	end
	return self:ResponseOK(formatted_ports)
end

return PortSettings
