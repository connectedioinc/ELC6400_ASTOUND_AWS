local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local dsa_support = board:has_dsa()
local vlan0 = board:get_vlan0()
local ntm = require "vuci.network".init()
local util = require("vuci.util")
local pac = require("vuci.package_checker")
local port_security_utils

if board:is_X86() then return nil end

local has_dot1x_server, port_security_utils = pcall(require, "api/network/port_security_utils")

local flags = {
	anonymous = true
}

local function get_cpu_port_num()
	local ports = board:get_switch_ports()

	for _, port in pairs(ports) do
		if port.device and port.num then
			return port.num
		end
	end

	return -1
end

local port_based = ConfigService:new(flags)

function port_based:get_default_device()
	return self.vlan_device.device or "br-lan"
end

port_based.vrf_map = {}

if dsa_support then
	port_based.ports = board:get_default_lan_ifname()
	local wan_port = board:get_default_wan_ifname()
	if wan_port then
		table.insert(port_based.ports, wan_port)
	end
	port_based.read_only = board:get_readonly_vlans()

	-- Table contains merged info about VLAN ID
	-- from config and request for validation
	port_based.vlans = {}

	-- Table contains merged info about ports
	-- from config and request for validation
	port_based.vlans_ports = {}
	port_based.bridge_ports = {}
	port_based.network_map_name = util.get_network_map(port_based, false, false, "device", "name")
	port_based.vlan_device = {}

	port_based.uci:foreach("network", "bridge-vlan", function(s)
		if s.device == "vlan" then
			port_based.vlan_device = s
			return false
		end
	end)

	local vlans = port_based:section("network", "bridge-vlan")
	vlans.create_defaults = function(self)
		local defaults = {}
		local used_ids = {1}

		defaults.device = self.network_map_name[self:getter_wrapped_abs_value(self.config, self.sid, "device")] or self:get_default_device()

		self:table_foreach(self.main_config, "bridge-vlan", function(s)
			if defaults.device == s.device then
				table.insert(used_ids, tonumber(s.vlan))
			end
		end)

		defaults.vlan = util.find_first_missing(used_ids)

		return defaults
	end

		local device = vlans:option("device")
			function device:get(value)
				return util.network_mapper_get(self, value, false, "device", nil, "name")
			end
			function device:set(value)
				util.network_mapper_set(self, value, false, "device", "name")
			end

		local device_name = vlans:option("device_name")
			device_name.read_only = true
			function device_name:get()
				local device
				local vlan_device = self:table_get(self.config, self.sid, "device")
				self:table_foreach(self.config, "device", function (s)
					if s.name == vlan_device then
						device = s[".name"]
						return false
					end
				end)
				return device
			end

		local vlan_id = vlans:option("vid")
		--FIXME: Disabled till WebUI fixes i'ts issues.
		-- vlan_id.cfg_require = true
			function vlan_id:validate(value)
				local id = self:get()
				local device = self:get_abs_value(self.config, self.sid, "device")
				if id and id ~= value and tonumber(id) <= self.read_only then
					return false, "This section's ('".. self.sid .."') '".. self.api_key .. "' is read-only"
				end
				return self.dt:irange(value, 1, 4094)
			end
			function vlan_id:set(value)
				--FIXME: WORKAROUND till WebUI fixes its issues.
				if value ~= "" then
					self:table_set(self.config, self.sid, "vlan", value)
				else
					self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", self.api_key)
				end
			end
			function vlan_id:get(value)
				return self:table_get(self.config, self.sid, "vlan")
			end

		for _, p in pairs(port_based.ports) do
			local port = vlans:option(p)
				function port:validate(value)
					local options = {"", "u", "t"}
					return self.dt:check_array(value, options)
				end
				function port:get()
					local ports = self:table_get(self.config, self.sid, "ports") or {}
					for _, pt in pairs(ports) do
						local pc, tu
						if pt:match("^lan") then
							pc, tu = pt:match("^(lan%d*):([tu]*)")
						else
							pc, tu = pt:match("^(wan):([tu]*)")
						end
						if pc == p then return tu end
					end
					return ""
				end
				function port:set()
					-- Save to config is done in before_commit_hook
				end
		end
else
	local function get_section_count(self)
		local counter = 0
		self:table_foreach("network", "switch", function(s)
			counter = counter + 1
		end)
		return counter
	end

	local switch_exists = get_section_count(port_based)

	if switch_exists == 0 then
		return nil
	end

	local topologies = ntm:get_topologies()
	port_based.topology = topologies.topology
	port_based.num_vlans = topologies.num_vlans
	port_based.min_vid = vlan0 and 0 or topologies.min_vid or 0
	port_based.enable_vlan4k = topologies.enable_vlan4k
	port_based.has_vlan4k = topologies.has_vlan4k
	port_based.switch_name = topologies.switch_name
	port_based.read_only = board:get_readonly_vlans()
	port_based.ports = {}
	port_based.cpu_port = get_cpu_port_num()

	-- Table contains merged info about VLAN ID
	-- from config and request for validation
	port_based.vlans = {}

	-- Table contains merged info about ports
	-- from config and request for validation
	port_based.vlans_ports = {}

	for _, port in pairs(port_based.topology.ports) do
		if not port.device then
			table.insert(port_based.ports, port)
		end
	end

	local vlans = port_based:section("network", "switch_vlan")
	function vlans:filter(options)
		return options.isolation ~= "1"
	end

	vlans.create_defaults = function(self)
		local defaults = {}
		local used_ids = {}
		local used_vlans = {}

		self:table_foreach(self.main_config, "switch_vlan", function(s)
			if s.device == self.switch_name then
				if s.vlan then
					table.insert(used_vlans, tonumber(s.vlan))
				end
				if self.has_vlan4k then
					table.insert(used_ids, tonumber(s[self.has_vlan4k]) or tonumber(s.vlan))
				end
			end
		end)

		defaults.device = self.switch_name
		defaults.vlan = util.find_first_missing(used_vlans)
		defaults.ports = port_based.cpu_port .. "t"

		if self.has_vlan4k then
			-- defaults[self.has_vlan4k] = util.find_first_missing(used_ids)
			-- Need to set it in here because otherwise it won't be set
			self:table_set(self.main_config, self.sid, self.has_vlan4k, util.find_first_missing(used_ids))
		end
		return defaults
	end

		local vlan_id = vlans:option("vid")
		--FIXME: Disabled till WebUI fixes its issues.
		-- vlan_id.cfg_require = true
			function vlan_id:validate(value)
				local id = self:get()
				if id and id ~= value and tonumber(id) <= self.read_only and tonumber(id) > 0 then
					return false, "This section's ('".. self.sid .."') '".. self.api_key .. "' is read-only"
				end
				return self.dt:irange(value, self.min_vid, self.has_vlan4k and 4094 or self.num_vlans - 2)
			end
			function vlan_id:get()
				-- Fallback to "vlan" option if "vid" option is supported but unset.
				return self:table_get(self.config, self.sid, port_based.has_vlan4k or "vlan") or
						self:table_get(self.config, self.sid, "vlan")
			end
			function vlan_id:set(value)
				--FIXME: WORKAROUND till WebUI fixes its issues.
				if value ~= "" then
					local old_value = self:table_get(self.config, self.sid, port_based.has_vlan4k or "vlan")
					self:table_set(self.config, self.sid, port_based.has_vlan4k or "vlan", value)
				else
					self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", self.api_key)
				end
			end


		for _, p in pairs(port_based.ports) do
			local port_num = tostring(p.num)
			p.label = p.label:lower():gsub(" ", "")

			local port = vlans:option(p.label)
				function port:validate(value)
					local options = {"", "u", "t"}
					if p.tagged == false then
						options = {"", "t"}
					elseif vlan0 and self:getter_wrapped_abs_value(self.config, self.sid, "vid") == "0" then
						options = {"", "u"}
					end
					return self.dt:check_array(value, options)
				end
				function port:get(value)
					local ports = self:table_get(self.config, self.sid, "ports") or ""
					for pt in ports:gmatch("%w+") do
						local pc, tu = pt:match("^(%d+)([tu]*)")
						if pc == port_num then return (#tu > 0) and tu or "u" end
					end
					return ""
				end
				function port:set(value)
					-- Save to config is done in before_commit_hook
				end
		end
end

function port_based:get_physical_device(port_num, section_name)
	if dsa_support then
		return self.network_map_name[self:get_abs_value(self.config, section_name, "device")] or self:get_default_device()
	end

	for _, role in pairs(board:get_switch_roles()) do
		if role.ports and role.ports:find(port_num) and role.device then
			return role.device:find(".") and role.device:match("(%w+)%.") or role.device
		end
	end
end

function port_based:get_vlan_ports(section_name, from_config)
	local ports
	local default_ports_type = ""
	if dsa_support then
		default_ports_type = {}
	end
	if from_config then
		ports = self.uci:get(self.main_config, section_name, "ports") or default_ports_type
	else
		ports = self:table_get(self.main_config, section_name, "ports") or default_ports_type
	end
	local ports_table = {}
	for _, p in pairs(self.ports) do
		if dsa_support then
			for _, pt in pairs(ports) do
				local pc, tu
				if pt:match("^lan") then
					pc, tu = pt:match("^(lan%d*):([tu]*)")
				else
					pc, tu = pt:match("^(wan):([tu]*)")
				end
				if pc == p then
					ports_table[p] = tu
				end
			end
		else
			for pt in ports:gmatch("%w+") do
				local pc, tu = pt:match("^(%d+)([tu]*)")
				if pc == tostring(p.num) then
					ports_table[p.num] = #tu > 0 and tu or "u"
				end
			end
		end
	end
	return ports_table
end

function port_based:update_interfaces(old_device, new_device)
	self:table_foreach(self.main_config, "interface", function(s)
		local changed = false
		if s.device then
			local new_devices, old_devices, type = {}, nil, ""
			if self:table_get(self.main_config, "br_"..s[".name"]) then
				old_devices = self:table_get(self.main_config, "br_"..s[".name"], "ports")
				type = self:table_get(self.main_config, "br_"..s[".name"], "type")
			elseif self.vrf_map[s.device] then
				old_devices = self:table_get(self.main_config, self.vrf_map[s.device], "ports")
				type = "vrf"
			else
				old_devices = {s.device}
			end
			for _, cur_device in pairs(old_devices or {}) do
				if cur_device == old_device then
					table.insert(new_devices, new_device)
					changed = true
				else
					table.insert(new_devices, cur_device)
				end
			end

			if changed then
				if type == "vrf" then
					self:table_set(self.main_config, self.vrf_map[s.device], "ports", new_devices)
				elseif #new_devices > 1 or type == "bridge" then
					if self:table_get(self.main_config, "br_"..s[".name"]) then
						self:table_set(self.main_config, "br_"..s[".name"], "ports", new_devices)
					else
						self:table_section(self.main_config, "device", "br_"..s[".name"], {
							name = "br-"..s[".name"],
							type = "bridge",
							ports = new_devices
						})
						self:table_set(self.main_config, s[".name"], "device", "br-"..s[".name"])
					end
				else
					self:table_set(self.main_config, s[".name"], "device", #new_devices == 1 and new_devices[1] or "")
					if self:table_get(self.main_config, "br_"..s[".name"]) then
						self:table_delete(self.main_config, "br_"..s[".name"])
					end
				end

				self:add_message(
					STD_CODES.OK,
					"Interface "..s[".name"].." device auto-migrated from "..old_device.." to "..new_device,
					"UCI"
				)
			end
		end
	end)
end

function port_based:load_ports_from_config()
	local section_type = "switch_vlan"
	if dsa_support then
		section_type = "bridge-vlan"
	end
	self:table_foreach(self.main_config, section_type, function(s)
		-- Load VLAN ID
		if dsa_support then
			self.vlans[s[".name"]] = s.vlan
		elseif s.isolation ~= "1" then
			self.vlans[s[".name"]] = s[self.has_vlan4k or "vlan"] or s.vlan
		end
		-- Load ports from config
		self.vlans_ports[s[".name"]] = self:get_vlan_ports(s[".name"], nil)
	end)
end

function port_based:load_bridge_ports(device)
	self.bridge_ports = {}
	local network_map = util.get_network_map(self, false, false, "device", ".name")
	for _, port in ipairs(self:table_get(self.config, network_map[device], "ports") or {}) do
		for _, p in ipairs(self.ports) do
			if port == p then
				table.insert(self.bridge_ports, p)
			end
		end
	end
end

function port_based:merge_ports_from_config_with_request()
	-- Update VLAN ID with from request
	self.vlans[self.sid] = self.current_data_block["vid"]


	-- Merge data from config with data from request
	local ports_table = {}
	if self.vlans_ports[self.sid] then
		ports_table = self.vlans_ports[self.sid]
	end

	for _, p in pairs(self.ports) do
		if dsa_support then
			local new_tag = self.current_data_block[p]
			local d1x_enabled = false
			if has_dot1x_server then
				local d1x_section = self:table_get("dot1x", "_"..p) or {}
				d1x_enabled = d1x_section.enabled == "1" and d1x_section.no_vlans ~= "1" and d1x_section.role == "server"
			end
			if new_tag and not d1x_enabled then
				ports_table[p] = new_tag
			end
		else
			local d1x_enabled = false
			if has_dot1x_server and p.label and p.num then
				local d1x_cfg = "_"..(string.match(p.label, "^%a*"))..p.num
				d1x_enabled = self:table_get("dot1x", d1x_cfg, "enabled") == "1" and self:table_get("dot1x", d1x_cfg, "role") == "server"
			end
			local new_tag = self.current_data_block[p.label]
			if new_tag and not d1x_enabled then
				ports_table[p.num] = new_tag
			end
		end
	end
	self.vlans_ports[self.sid] = ports_table
end

function port_based:untag_old()
	-- Untag old VLAN's ID from interfaces device option

	local old_vlan = self:table_get(self.main_config, self.sid, self.has_vlan4k or "vlan") or
					self:table_get(self.main_config, self.sid, "vlan")
	if dsa_support then
		old_vlan = self:table_get(self.main_config, self.sid, "vlan")
	end
	self:table_foreach(self.main_config, "interface", function(s)
		if s.device then
			local devices, old_devices, type = {}, nil, ""
			if self:table_get(self.main_config, "br_"..s[".name"]) then
				old_devices = self:table_get(self.main_config, "br_"..s[".name"], "ports")
				type = self:table_get(self.main_config, "br_"..s[".name"], "type")
			elseif self.vrf_map[s.device] then
				old_devices = self:table_get(self.main_config, self.vrf_map[s.device], "ports")
				type = "vrf"
			else
				old_devices = {s.device}
			end
			for _, device in pairs(old_devices or {}) do
				if device ~= "eth0."..old_vlan and device ~= "eth1."..old_vlan and device ~= "vlan."..old_vlan then
					table.insert(devices, device)
				end
			end
			if type == "vrf" then
				self:table_set(self.main_config, self.vrf_map[s.device], "ports", devices)
			elseif #devices > 1 or type == "bridge" then
				if self:table_get(self.main_config, "br_"..s[".name"]) then
					self:table_set(self.main_config, "br_"..s[".name"], "ports", devices)
				else
					self:table_section(self.main_config, "device", "br_"..s[".name"], {
						name = "br-"..s[".name"],
						type = "bridge",
						ports = devices
					})
					self:table_set(self.main_config, s[".name"], "device", "br-"..s[".name"])
				end
			else
				self:table_set(self.main_config, s[".name"], "device", #devices == 1 and devices[1] or "")
				if self:table_get(self.main_config, "br_"..s[".name"]) then
					self:table_delete(self.main_config, "br_"..s[".name"])
				end
			end
		elseif s.proto == "vrf" and s.link then
			local devices = {}
			for _, device in pairs(s.link or {}) do
				if device ~= "eth0."..old_vlan and device ~= "eth1."..old_vlan and device ~= "vlan."..old_vlan then
					table.insert(devices, device)
				end
			end
			self:table_set(self.main_config, s[".name"], "link", devices)
		end
	end)
end

function port_based:validate_vlan_id()
	-- Validate VLAN IDs
	local vlan_used, validated = {}, nil
	self:table_foreach(self.config, dsa_support and "bridge-vlan" or "switch_vlan", function (s)
		if s.device then
			vlan_used[s.device] = {}
		end
	end)
	for section, v in pairs(self.vlans) do
		local device = self:get_abs_value(self.config, section, "device")
		if vlan_used[device][v] and not validated then
			self:add_error(STD_CODES.INVALID_OPT, "Invalid VLAN ID given! Only unique IDs are allowed", "Validation")
			validated = true
		end
		vlan_used[device][v] = true
	end
end

function port_based:validate_port_mirroring()
	local function get_current_port(vid)
		local vlan = self:table_find("network", "switch_vlan", { vlan = vid })
		if not vlan or not vlan.ports then return nil end

		return util.trim(string.gsub(vlan.ports, self.cpu_port .. "t", ""))
	end

	local function get_port_label(pnum)
		for _, p in pairs(self.ports) do
			if p.num and pnum and p.num == tonumber(pnum) then
				return p.label
			end
		end
		return nil
	end

	if not pac.is_installed("software_port_mirror") then return end
	if dsa_support then return end

	local mirror = self:table_get("port_mirroring", "config")
	if not mirror.mirror_monitor_port or not mirror.mirror_source_port then return end

	local lan_port_prefix = string.gsub(board:get_default_lan_ifname(), "(.*)%..*$", "%1")
	local monitor_vid = string.gsub(mirror.mirror_monitor_port, "^" .. lan_port_prefix .. "%.", "")
	local source_vid = string.gsub(mirror.mirror_source_port, "^" .. lan_port_prefix .. "%.", "")

	local monitor_port = get_current_port(monitor_vid)
	local source_port = get_current_port(source_vid)

	if self.request_method == "DELETE" then
		local vid = self:table_get(self.main_config, self.sid, "vlan")
		if vid == monitor_vid then
			self:add_error(STD_CODES.INVALID_OPT, "Port (".. (get_port_label(monitor_port) or "-") .."): Port mirroring is enabled VLAN " .. monitor_vid .. " can not be deleted", "Validation")
		elseif vid == source_vid then
			self:add_error(STD_CODES.INVALID_OPT, "Port (".. (get_port_label(source_port) or "-") .."): Port mirroring is enabled VLAN " .. source_vid .. " can not be deleted", "Validation")
		end
		return
	end

	for cfg, vlan in pairs(self.vlans_ports) do
		local vid = self.vlans[cfg]
		local count = 0
		local enabled_monitor_port = true
		local enabled_source_port = true
		for port, vlan_port in pairs(vlan) do
			if tonumber(port) == tonumber(monitor_port) and vlan_port ~= "u" then
				enabled_monitor_port = false
			end
			if tonumber(port) == tonumber(source_port) and vlan_port ~= "u" then
				enabled_source_port = false
			end
			if vlan_port == "t" or vlan_port == "u" then
				count = count + 1
			end
		end

		if (count > 1 or not enabled_monitor_port) and vid == monitor_vid then
			self:add_error(STD_CODES.INVALID_OPT, "Port (".. (get_port_label(monitor_port) or "-") .."): Port mirroring is enabled VLAN " .. monitor_vid .. " can not be changed", "Validation")
		elseif (count > 1 or not enabled_source_port) and vid == source_vid then
			self:add_error(STD_CODES.INVALID_OPT, "Port (".. (get_port_label(source_port) or "-") .."): Port mirroring is enabled VLAN " .. source_vid .. " can not be changed", "Validation")
		end
	end
end

function port_based:validate_ports()
	-- Validate ports
	local multi_tag = board:get_multi_tag_support()
	for _, p in pairs(self.ports) do
		local tagged_count, untagged_count = 0, 0
		for _, vlan in pairs(self.vlans_ports) do
			local vlan_port = vlan[p.num]
			if dsa_support then
				vlan_port = vlan[p]
			end
			if not dsa_support and vlan_port and vlan_port == "t" then
				tagged_count = tagged_count + 1
			elseif vlan_port and vlan_port == "u" then
				untagged_count = untagged_count + 1
			end
		end
		if not multi_tag and tagged_count > 0 and untagged_count > 0 then
			self:add_error(STD_CODES.INVALID_OPT, "Port (".. p.label .."): tagged port can not be used together with untagged'", "Validation")
		end

		if untagged_count > 1 then
			local label
			if dsa_support then
				label = p
			else
				label = p.label
			end
			self:add_error(STD_CODES.INVALID_OPT, "Port (" .. label .. ") is untagged in multiple VLANs", "Validation")
		end
	end
end

function port_based:migrate_vlan(device, old_ports)
	if device ~= "vlan" then return end

	self:table_foreach("network", "device", function(s)
		if s.name and s.name == "vlan" then
			self:table_delete("network", s[".name"])
			return false
		end
	end)
	for _, port in ipairs(self:table_get("network", "br_lan", "ports") or {}) do
		if port ~= "vlan.1" then
			old_ports[port] = true
		end
	end
	local ports_to_set = {}
	for p in pairs(old_ports) do
		table.insert(ports_to_set, p:match("^(lan%d*):[tu]*") or p)
	end
	if self:table_get("network", "br_lan") then
		self:table_set("network", "br_lan", "ports", ports_to_set)
	end
end

function port_based:update_lan(to_vlan, device)
	local ports, old_ports, used_ifaces = {}, {}, {}
	device = device or self:get_default_device()

	for _, p in pairs(self.bridge_ports) do
		ports[p] = true
	end

	self:table_foreach(self.config, "interface", function (s)
		if (s.device and s.device:match("(.+)%.%d+") or s.device) == device then
			table.insert(used_ifaces, s[".name"])
		end
	end)

	if to_vlan then
		local used_ports, untagged_ports = {}, {}

		self:table_foreach("network", "device", function(s)
			if s.type == "8021q" or s.type == "8021ad" then
				used_ports[s.ifname] = true
				ports[s.ifname] = nil
			end
		end)

		if self.arguments.data and type(self.arguments.data) == "table" then
			for _, p in pairs(port_based.ports) do
				if self.arguments.data[p] == "u" then
					ports[p] = nil
				end
			end
		end

		if device == "br-lan" and not self:table_get(self.config, "br_lan") then
			self:table_section(self.config, "device", "br_lan", {
				name = device,
				type = "bridge"
			})
			local lan_device = self:table_get(self.config, "lan", "device")
			if lan_device and util.contains(self.ports, lan_device) then
				if not used_ports[lan_device] then
					ports[lan_device] = true
					self:table_set(self.config, "br_lan", "ports", { lan_device })
				end
				self:table_set(self.config, "lan", "device", used_ports[lan_device] and lan_device or device..".1")
			end
		else
			for _, iface in ipairs(used_ifaces) do
				self:table_set("network", iface, "device", device..".1")
			end
		end

		for port in pairs(ports) do
			table.insert(untagged_ports, port .. ":u")
		end
		-- Sections need to be created before a new section with POST is created in the config file
		self.uci:section("network", "bridge-vlan", nil, {
			device = device,
			vlan = "1",
			ports = untagged_ports
		})
		self.t_func:_get_config("network")
	else
		self:table_foreach("network", "bridge-vlan", function(s)
			if s.vlan and s.vlan == "1" and s.device == device then
				for _, p in ipairs(self:table_get("network", s[".name"], "ports") or {}) do
					old_ports[p] = true
				end
				self:table_delete("network", s[".name"])
				return false
			end
		end)
		if device ~= "vlan" then
			for _, iface in ipairs(used_ifaces) do
				self:table_set("network", iface, "device", device)
			end
		end
		self:migrate_vlan(device, old_ports)
	end

	local msg_code, msg = 1, "LAN interface was auto migrated to VLAN 1"
	if not to_vlan then
		msg_code = 2
		msg = "LAN interface was auto migrated from VLAN 1"
	end

	self:add_message(msg_code, msg)
end

function port_based:set_new_ports(update)
	for _, data in pairs(self.arguments.data or {}) do
		local new_ports, section_name, data_block = {}, nil, {}
		if type(data) == "table" then
			section_name = data.id
			data_block = data
		else
			section_name = self.sid
			data_block = self.arguments.data
		end

		local vlan = self.vlans_ports[section_name]
		local old_vlan = self:get_vlan_ports(section_name, true)
		for _, p in pairs(self.ports) do
			-- Construct new ports
			local port
			if dsa_support then
				port = vlan[p]
				if port and port == "t" then
					table.insert(new_ports, p .. ":t")
				elseif port and port == "u" then
					table.insert(new_ports, p .. ":u")
				end
			else
				port = vlan[p.num]
				if port and port == "t" then
					table.insert(new_ports, p.num .. "t")
				elseif port and port == "u" then
					table.insert(new_ports, p.num)
				end
			end

			-----------------------------------------------
			if update then
				local old_tag = old_vlan[p.num]
				local new_tag = port

				local phy_dev = self:get_physical_device(p.num, section_name)
				if phy_dev then
					local old_vid = self.uci:get(self.main_config, section_name, self.has_vlan4k or "vlan") or
									self.uci:get(self.main_config, section_name, "vlan")
					local new_vid = self:table_get(self.main_config, section_name, self.has_vlan4k or "vlan") or old_vid
					if old_tag ~= new_tag or old_vid ~= new_vid then
						local old_ifname = "%s.%s" %{ phy_dev, old_vid }

						local new_ifname = "%s.%s" %{ phy_dev, new_vid }

						if old_ifname ~= new_ifname then
							self:update_interfaces(old_ifname, new_ifname)
						end
					end
				end
			end
			-----------------------------------------------
		end

		-- Set new ports
		if dsa_support then
			self:table_set(self.main_config, section_name, "ports", new_ports)
		else
			self:table_set(self.main_config, section_name, "ports", port_based.cpu_port .. "t " .. table.concat(new_ports, " "))
		end

		if type(data) ~= "table" then break end
	end
end

function port_based:update_bridge()
	local used_ports, bridge_ports = {}, {}
	local bridge_vlan_count = 0
	local device = self.network_map_name[self:get_abs_value(self.config, self.sid, "device")] or self:get_default_device()
	self:table_foreach("network", "bridge-vlan", function(s)
		if s.device == device then
			bridge_vlan_count = bridge_vlan_count + 1
			local ports = self:table_get("network", s[".name"], "ports") or {}
			for _, p in pairs(ports) do
				local port = p:match("^(lan%d*):[tu]*")
				if port then
					used_ports[port] = true
				end
			end
		end
	end)

	self:table_foreach("network", "device", function(s)
		if s.name ~= device and s.type == "bridge" then
			local ports = self:table_get("network", s[".name"], "ports") or {}
			for _, port in pairs(ports) do
				if used_ports[port] then
					local intf_name = s[".name"]:match("^br_(.+)")
					if intf_name then
						self:add_error(STD_CODES.INVALID_OPT,
										"Port (".. port ..") is used in '" ..intf_name.. "' interface's bridge, you need to remove it first",
										"Validation")
					else
						self:add_error(STD_CODES.INVALID_OPT, "Port (".. port ..") is used in bridge, you need to remove it first", "Validation")
					end
				end
			end
		end
	end)

	self:table_foreach("network", "interface", function(intf)
		if intf.device and used_ports[intf.device] then
			self:add_error(STD_CODES.INVALID_OPT,
			"Port (" .. intf.device .. ") is used in interface (" .. intf[".name"].. "), you need to remove it first",
			"Validation")
		end
	end)

	if bridge_vlan_count == 0 then return end

	local bridge_device = self:table_find("network", "device", { name = device }) or {}
	for _, port in pairs(bridge_device.ports or {}) do
		used_ports[port] = true
	end

	for p, _ in pairs(used_ports) do
		table.insert(bridge_ports, p)
	end

	self:table_foreach("network", "device", function(s)
		if s.name and s.name == device then
			self:table_set("network", s[".name"], "ports", bridge_ports)
			return false
		end
	end)
end

function port_based:update_vrf_map()
	self:table_foreach("network", "device", function(s)
		if s.type == "vrf" then self.vrf_map[s.name] = s[".name"] end
	end)
end

function port_based:PUT_init_hook()
	self:load_ports_from_config()
	if not dsa_support then return end
	local id = self.arguments.data and (self.arguments.data.id or (self.arguments.data[1] and self.arguments.data[1].id))
	local device = self:get_data_from_arguments(id, "device") or self:get_default_device()
	self:load_bridge_ports(device)
end

function port_based:PUT_section_init_hook()
	self:merge_ports_from_config_with_request()
end

function port_based:PUT_before_commit_hook()
	if has_dot1x_server and not dsa_support then -- mt76x8
		port_security_utils.update_isolation_vlans(self)
	end

	self:validate_vlan_id()

	self:validate_ports()

	self:validate_port_mirroring()

	self:return_if_error()

	self:update_vrf_map()

	self:set_new_ports(true)

	if dsa_support then
		self:update_bridge()

		self:return_if_error()
	end
end

function port_based:POST_validate_hook()
	local function get_vlan_section_count()
		local counter = 0
		self:table_foreach("network", dsa_support and "bridge-vlan" or "switch_vlan", function(c)
			counter = counter + 1
		end)
		return counter
	end

	local max_vlans = board:get_max_vlans()
	if get_vlan_section_count() == tonumber(max_vlans) then
		return self:add_critical_error(STD_CODES.INVALID_QUERY, "Maximum amount of configurations reached.", "Validation", HTTP_STATUS_CODES.BAD_REQUEST)
	end

end

function port_based:POST_init_hook()
	self:load_ports_from_config()

 	if not dsa_support then return end
	local section_count = 0
	local device = self.arguments.data and self.arguments.data.device or self:get_default_device()
	self:load_bridge_ports(device)
	device = self.network_map_name[device] or device
	self:table_foreach(self.main_config, "bridge-vlan", function(s)
		if s.device == device then
			section_count = section_count + 1
		end
	end)
	if section_count == 0 then
		self:update_lan(true, device)
	end
end


function port_based:POST_before_commit_hook()
	if has_dot1x_server and not dsa_support then -- mt76x8
		port_security_utils.update_isolation_vlans(self)
	end

	self:merge_ports_from_config_with_request()

	self:validate_vlan_id()

	self:validate_ports()

	self:validate_port_mirroring()

	self:return_if_error()

	self:set_new_ports()

	if dsa_support then
		self:update_bridge()

		self:return_if_error()
	end
end

function port_based:DELETE_before_section_delete_hook()
	local vid, section_count = nil, 0
	local device = self:get_abs_value(self.config, self.sid, "device")

	self:table_foreach(self.main_config, "bridge-vlan", function(s)
		if s.device == device then
			section_count = section_count + 1
		end
	end)

	if dsa_support then
		vid = self:table_get(self.main_config, self.sid, "vlan")
	else
		vid = self:table_get(self.main_config, self.sid, self.has_vlan4k or "vlan") or
			self:table_get(self.main_config, self.sid, "vlan")
	end
	if tonumber(vid) and tonumber(vid) <= self.read_only and tonumber(vid) > 0 then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Section: %s is read-only", self.sid),
			"UCI"
		)
	end

	self:validate_port_mirroring()

	self:return_if_error()

	if dsa_support and section_count == 2 then
		self:load_bridge_ports(device)
		self:update_lan(false, device)
	end

	self:update_vrf_map()

	self:untag_old()
end


if has_dot1x_server then
	port_based.DELETE_validate_section_hook = port_security_utils.validate_vlan_deletion
end

return port_based
