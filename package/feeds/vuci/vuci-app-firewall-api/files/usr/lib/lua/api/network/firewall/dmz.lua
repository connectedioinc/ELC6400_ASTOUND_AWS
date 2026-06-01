local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local ac = require("vuci.access")
local network_lib = require("vuci.network_lib")

local dmz = ConfigService:new({ create = false, delete = false, general_section = function (self)
	return self.uci:get_all("firewall", "@defaults[0]")[".name"]
end })
dmz.update_redirect = false

-- Temporarily make "has_switch" always false until 7.4
-- Original bug: https://git.teltonika.lt/teltonika/rutx_open/-/issues/7459#note_656061
-- local has_switch = dmz.uci:get("network", "@switch[0]")
local has_switch = false

local _topo, _ports, _port_names
function dmz:get_switch_info()
	if _topo then return _topo end
	local ntm = require "vuci.network".init(self.uci)
	_topo = ntm:get_topologies()
	_topo.t_port = network_lib:get_cpu_port_num() .. "t"
	return _topo
end

function dmz:get_switch_lan_ports()
	if _ports then
		return _ports, _port_names
	end
	local sw = self:get_switch_info()
	_ports = {}
	_port_names = {}
	for _, p in ipairs(sw.topology.ports) do
		local label = p.label:lower()
		if label:match("lan") then
			local key = label:gsub("%s", "")
			_port_names[#_port_names+1] = key
			_ports[key] = tostring(p.num)
		end
	end
	return _ports, _port_names
end

function dmz:get_max_vlan_id()
	local max_vid = 0
	local max_vlan = 0
	self:table_foreach("network", "switch_vlan", function(s)
		local vid = tonumber(s.vid)
		local vlan = tonumber(s.vlan)
		if vid and vid > max_vid then
			max_vid = vid
		end
		if vlan and vlan > max_vlan then
			max_vlan = vlan
		end
	end)

	local max = max_vid > max_vlan and max_vid or max_vlan
	return max
end

function dmz:get_vlan_section(iface)
	iface = iface or "dmz"
	local ifname = self:table_get("network", iface, "ifname")
	if ifname then
		local vlan_id = ifname:match("^.+%.(%d+)")

		local sec
		if vlan_id then
			self:table_foreach("network", "switch_vlan", function(s)
				if s.vid == vlan_id or s.vlan == vlan_id then
					sec = s
					return false
				end
			end)
		end
		return sec
	end
end

function dmz:update_lan_vlan_ports(dmz_vlan)
	local first_vlan
	self:table_foreach("network", "switch_vlan", function (s_vlan)
		if s_vlan.vlan == "1" or s_vlan.vid == "1" then
			first_vlan = s_vlan
		end
	end)
	if first_vlan and first_vlan.ports and dmz_vlan.ports then
		local ports_merged = {} -- Used for non duplicate ports
		-- Joins all ports
		for p in first_vlan.ports:gmatch("[^%s]+") do
			ports_merged[p] = true
		end
		for p in dmz_vlan.ports:gmatch("[^%s]+") do
			local tagged_port = p:match("^(.+)t$")
			if tagged_port then -- Some devices has 0 tagged some don't, this ensures to return correct values.
				if not ports_merged[tagged_port] then
					ports_merged[p] = true
				end
			else
				ports_merged[p] = true
			end
		end
		-- Converts port map to array
		local all_ports = {}
		for p in pairs(ports_merged) do
			table.insert(all_ports, p)
		end
		-- Moves ports from DMZ to LAN
		self:table_set("network", first_vlan[".name"], "ports", table.concat(all_ports, " "))
	end
end

function dmz:setup_cfg()
	local fw = require "vuci.firewall".init(self.uci)

	local dmz_zone = fw:get_zone("dmz")

	if not dmz_zone then
		dmz_zone = fw:add_zone("dmz")
		if has_switch then
			dmz_zone:set("network", "dmz")
		end
	end

	dmz_zone:add_forwarding_to("wan")
	dmz_zone:add_forwarding_from("lan")

	self:table_foreach("firewall", "redirect", function(s)
		if s.name == "dmz_fw" then
			self.dmz_redir_sname = s[".name"]
			return false --break
		end
	end)
	if not self.dmz_redir_sname then
		self.dmz_redir_sname = self.uci:section("firewall", "redirect", fw:next_id(), {
			name = "dmz_fw",
			target = "DNAT",
			proto = {"tcp", "udp"},
			src = "wan",
			dest = "dmz",
			mode = "host",
			enabled = "0"
		})
	end

	if has_switch then
		local dmz_iface = self:table_get("network", "dmz")

		if not dmz_iface then
			local max = self:get_max_vlan_id()
			self:table_section("network", "interface", "dmz", {
				proto = "static",
				ifname = "eth0." .. tostring(max + 1),
				area_type = "lan",
				disabled = "1"
			})
		end
	end

	-- reload cfgs to get changes from vuci.firewall lib
	self.t_func:_get_config("firewall")
	self.t_func:_get_config("network")
end

function dmz:set_dmz_section_id()
	self:table_foreach("firewall", "redirect", function(s)
		if s.name == "dmz_fw" then
			self.dmz_redir_sname = s[".name"]
			return false --break
		end
	end)
end

function dmz:PUT_init_hook()
	self:setup_cfg()
end

function dmz:GET_init_hook()
	self:set_dmz_section_id()
end

function dmz:PUT_before_commit_hook()
	if dmz.update_redirect then
		ac.setup_dmz_redirects(self)
		self:set_dmz_section_id()
	end
end

local s = dmz:section("firewall", "defaults")

local enabled = s:option("enabled")
	enabled.require = has_switch and
		{ ["1"] = {"host_ip", "proto", "router_ip", "netmask", "switch"} } or
		{ ["1"] = {"host_ip", "proto"} }
	function enabled:validate(value) return self.dt:is_bool(value) end
	function enabled:get(value)
		if has_switch then
			local disabled = self:table_get("network", "dmz", "disabled")
			if disabled == "1" then return "0" end

			local vlan_s = self:get_vlan_section()
			if not vlan_s then return "0" end
		end

		-- If redirect doesn't exist, its disabled. Otherwise if it doesn't have enabled option, it's enabled by default.
		local redirect = self:table_get("firewall", self.dmz_redir_sname)
		return redirect and (redirect.enabled or "1") or "0"
	end
	function enabled:set(value)
		local cfg_value = self:table_get("firewall", self.dmz_redir_sname, "enabled") or ""
		self:table_set("firewall", self.dmz_redir_sname, "enabled", value == "1" and "1" or "0")
		if cfg_value ~= value then
			dmz.update_redirect = true
		end
		if has_switch then
			self:table_set("network", "dmz", "disabled", value == "1" and "" or "1")

			if value ~= "1" then
				local vlan_s = self:get_vlan_section()
				if vlan_s then
					self:update_lan_vlan_ports(vlan_s)
					self:table_delete("network", vlan_s[".name"])
				end
			end
		end
	end

local host_ip = s:option("host_ip")
	function host_ip:validate(value) return self.dt:ip4addr(value) end
	function host_ip:get(value)
		return self:table_get("firewall", self.dmz_redir_sname, "dest_ip")
	end
	function host_ip:set(value)
		self:table_set("firewall", self.dmz_redir_sname, "dest_ip", value)
	end

local port_range = s:option("port_range")
	function port_range:validate(value)
		local err
		value, err = self.dt:neg(value)
		if not value then return false, err end
		return self.dt:portrange(value)
	end
	function port_range:get(value)
		return self:table_get("firewall", self.dmz_redir_sname, "src_dport")
	end
	function port_range:set(value)
		self:table_set("firewall", self.dmz_redir_sname, "src_dport", value)
	end

local proto = s:option("proto", { list = true })
	function proto:validate(value)
		return self.dt:check_array(value, {"tcp", "udp", "icmp", "all"})
	end
	function proto:get(value)
		value = self:table_get("firewall", self.dmz_redir_sname, "proto")
		if value and type(value) == "string" then
			value = util.split(value, " ")
		end
		return value
	end
	function proto:set(value)
		self:table_set("firewall", self.dmz_redir_sname, "proto", value)
	end

if has_switch then
	local router_ip = s:option("router_ip")
		function router_ip:validate(value) return self.dt:ip4addr(value) end
		function router_ip:get(value)
			return self:table_get("network", "dmz", "ipaddr")
		end
		function router_ip:set(value)
			return self:table_set("network", "dmz", "ipaddr", value)
		end

	local netmask = s:option("netmask")
		function netmask:validate(value) return self.dt:netmask(value) end
		function netmask:get(value)
			return self:table_get("network", "dmz", "netmask")
		end
		function netmask:set(value)
			return self:table_set("network", "dmz", "netmask", value)
		end

	local switch = s:option("switch")
		function switch:validate(value)
			local _, port_names = self:get_switch_lan_ports()
			return self.dt:check_array(value, port_names)
		end
		function switch:get(value)
			local vlan_s = self:get_vlan_section()
			if not vlan_s then return end

			local ports_arr = util.split(vlan_s.ports, "%s+", nil, true)
			local val = ports_arr and ports_arr[#ports_arr] or nil
			local ports = self:get_switch_lan_ports()
			for p_name, p_num in pairs(ports) do
				if p_num == val then
					return p_name
				end
			end
			return val
		end
		function switch:set(value)
			local ifname = self:table_get("network", "dmz", "ifname")
			local vlan_id = ifname and ifname:match("^.+%.(%d+)") or nil
			if not vlan_id then return end

			local enb = self:get_abs_value(self.config, self.sid, "enabled")
			local ports = self:get_switch_lan_ports()
			local port_value = ports[value]

			local vlan_s = self:get_vlan_section()
			local sw = self:get_switch_info()

			if enb == "1" then
				self:table_foreach("network", "switch_vlan", function (vlan)
					if vlan.ports then
						local filtered = {}
						local did_filter = false
						for port in vlan.ports:gmatch("[^%s]+") do
							if port ~= port_value then
								table.insert(filtered, port)
							else
								did_filter = true
							end
						end
						if did_filter then
							self:table_set("network", vlan[".name"], "ports", table.concat(filtered, " "))
						end
					end
				end)
			end

			if vlan_s then
				local needs_update = true
				for p in vlan_s.ports:gmatch("[^%s]+") do
					if p == port_value then
						needs_update = false break
					end
				end
				if needs_update then
					self:update_lan_vlan_ports(vlan_s)
				end
				self:table_set("network", vlan_s[".name"], "ports", sw.t_port .. " " .. port_value)
			else
				-- create new section if not found
				if enb == "1" then
					self:table_section("network", "switch_vlan", nil, {
						device = sw.switch_name,
						vlan = vlan_id,
						vid = vlan_id,
						ports = sw.t_port .. " " .. port_value
					})
				end
			end
		end
end

return dmz
