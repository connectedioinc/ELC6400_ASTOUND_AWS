local ConfigService = require("api/ConfigService")
local pac = require("vuci.package_checker")
local port_security_utils = require("api/network/port_security_utils")
local PortSecurity = ConfigService:new({create = false, delete = false})
local board = require("vuci.board")
local router_name = board:get_family_name()
if not board:has_ethernet() then return end
local util = require("vuci.util")
local is_tsw = board:is_switch()

local server_support = pac.is_installed("dot1x-server") or pac.is_installed("dsa-dot1x-server")
local port_security_options = board:get_port_security() or {}
local need_isolation_vlans = port_security_options.isolation_method == "vlan"

local client_support = pac.is_installed("dot1x-client")

local Port = PortSecurity:section("dot1x", "port")

local enabled = Port:option("enabled")
function enabled:validate(value)
	local cfg = is_tsw and "tswconfig" or "network"
	local opt = is_tsw and "enable" or "enabled"
	if value == "1" and self:table_get(cfg, self.sid, opt) == "0" then
		return false, "port needs to be enabled in network configuration for 802.1X feature"
	end
	return self.dt:is_bool(value)
end

if is_tsw then
	local eap_retrans_count = Port:option("eap_retrans_count")
	function eap_retrans_count:validate(value)
		return self.dt:irange(value, 1, 10)
	end

	local eap_retrans_timeout = Port:option("eap_retrans_timeout")
	function eap_retrans_timeout:validate(value)
		return self.dt:irange(value, 1, 300)
	end
end

local role = Port:option("role")
function role:validate(value)
	local allowed_values = { }
	if server_support then allowed_values[#allowed_values+1] = "server" end
	if client_support then allowed_values[#allowed_values+1] = "client" end
	return self.dt:check_array(value, allowed_values)
end

if client_support then
	local auth_type = Port:option("auth_type")
	auth_type.require = {
		md5 = {"identity", "password"},
		tls = {"identity", "client_cert", "private_key"},
		pwd = {"identity", "password"},
		ttls = {"anonymous_identity", "inner_authentication", "identity", "password"},
		peap = {"anonymous_identity", "peap_version", "inner_authentication", "identity", "password"}
	}
	function auth_type:validate(value)
		return self.dt:check_array(value, {"md5", "tls", "pwd", "ttls", "peap"})
	end

	Port:option("identity").maxlength = 253
	Port:option("anonymous_identity").maxlength = 253
	Port:option("password", { sensitive = true }).maxlength = 112

	local inner_authentication = Port:option("inner_authentication")
	function inner_authentication:validate(value)
		local list = {"mschapv2", "md5", "gtc"}
		if self:get_abs_value(self.main_config, self.sid, "auth_type") == "ttls" then
			list = {"pap", "mschap", "mschapv2", "mschapv2noeap", "chap", "md5", "gtc"}
		end
		return self.dt:check_array(value, list)
	end
	function inner_authentication:set(value)
		self:table_set(self.config, self.sid, self.api_key, string.upper(value))
	end
	function inner_authentication:get(value)
		return value and string.lower(value) or nil
	end

	local peap_version = Port:option("peap_version")
	function peap_version:validate(value)
		return self.dt:check_array(value, {"auto", "0", "1"})
	end

	local private_key_pass = Port:option("private_key_pass", { sensitive = true })
	private_key_pass.maxlength = 512
	function private_key_pass:validate(value)
		return self.dt:credentials_validate(value)
	end

	Port:option("ca_cert", {certificate = {
		upload_only = true,
		failsafe = true
	}})
	Port:option("client_cert", {certificate = {
		upload_only = true,
		failsafe = true
	}})
	Port:option("private_key", {certificate = {
		upload_only = true,
		failsafe = true
	}})
	Port:option("pac_file", {file = true})
end

if server_support then
	local vlan_support = (board:has_dsa() and not board:is_X86()) or board:has_switch() or is_tsw
	local radius_servers = {}
	PortSecurity:table_foreach("dot1x", "radius", function(s)
		table.insert(radius_servers, s[".name"])
	end)
	local radius = Port:option("radius")
	function radius:validate(value)
		return self.dt:check_array(value, radius_servers)
	end

	local vlan_requires = {}
	local vlan_list = {}
	local vlan_map = {}
	local vlan_map_rev = {}
	local vlan_section = (board:has_dsa() or is_tsw) and "bridge-vlan" or "switch_vlan"
	PortSecurity:table_foreach("network", vlan_section, function(s)
		if s.isolation == "1" then return end
		vlan_map[tostring(s.vlan)] = s[".name"]
		vlan_map_rev[s[".name"]] = tostring(s.vlan)
		table.insert(vlan_list, s.vlan)
	end)
	if vlan_support then
		local function add_vlan(name, extra_options)
			local valid_options = {}
			for _, v in ipairs(extra_options) do table.insert(valid_options, v) end
			for _, v in ipairs(vlan_list) do table.insert(valid_options, v) end
			local vlan_option = Port:option(name)
			function vlan_option:validate(value)
				return self.dt:check_array(value, valid_options)
			end
			function vlan_option:set(value)
				self:table_set(self.config, self.sid, self.api_key, vlan_map[value] or value)
			end
			function vlan_option:get(value)
				return vlan_map_rev[value] or value
			end
			table.insert(vlan_requires, name)
			return vlan_option
		end
		if port_security_options.fallback_vlan then
			add_vlan("fallback_vlan", {"disabled"})
		end
		if port_security_options.guest_vlan then
			add_vlan("guest_vlan", {"disabled"})
		end
		add_vlan("reject_vlan", {"disabled"})
		add_vlan("accept_vlan", {"radius_assigned"})
	end

	table.insert(vlan_requires, "use_vlans")
	local use_vlans = Port:option("use_vlans")
	if vlan_support then
		-- options don't exist on devices with no vlan support
		use_vlans.require = {["1"] = {"reject_vlan", "accept_vlan"}}
	end
	function use_vlans:validate(value)
		if value == "1" then
			if not vlan_support then
				return false, "VLANs not supported on this device"
			end
			if #vlan_list < 1 then
				return false, "VLANs not enabled"
			end
			if self.sid == "_wan" then
				-- rutm WAN port doesn't support vlans, but can be used in lan bridge
				return false, "unsupported on this interface"
			end
		elseif port_security_options.isolation_method == "vlan" then
			return false, "VLANs are required for this device"
		end
		return self.dt:is_bool(value)
	end
	function use_vlans:set(value)
		self:table_set(self.config, self.sid, "no_vlans", value == "1" and "0" or "1")
	end
	function use_vlans:get()
		return self:table_get(self.config, self.sid, "no_vlans") == "1" and "0" or "1"
	end
end

function PortSecurity:PUT_validate_section_hook()
	self:table_foreach("network", "device", function(_s)
		if _s[".name"] and _s[".name"]:find("bond") and _s["ports"] then
			self:add_critical_error(STD_CODES.CONF_ERROR, "802.1X configuration cannot be modified because link aggregation is enabled.", "Validation")
		end
	end)
	local is_client = self:get_abs_value("dot1x", self.sid, "role") == "client"
	local is_server = self:get_abs_value("dot1x", self.sid, "role") == "server"
	local is_enabled = self:get_abs_value("dot1x", self.sid, "enabled") == "1"
	if not is_enabled then return end
	if is_client then
		local auth_type = self:get_abs_value("dot1x", self.sid, "auth_type") or ""
		if auth_type == "" then
			self:add_error(STD_CODES.INVALID_OPT, "Missing required option: auth_type", "enabled")
		end
	end
	if is_server then
		if self.current_data_block.use_vlans == "" then
			self:add_error(STD_CODES.INVALID_OPT, "Missing required option: use_vlans", "enabled")
		end
	end
end


function PortSecurity:PUT_after_validate_section_hook()
	local use_vlans_cfg = self.uci:get(self.config, self.sid, "no_vlans") == "1" and "0" or "1"
	local enabled_cfg = self.uci:get(self.config, self.sid, "enabled") or "0"
	local role_cfg = self.uci:get(self.config, self.sid, "role") or "client"
	if enabled_cfg ~= "1" or use_vlans_cfg ~= "1" or role_cfg ~= "server" then
		-- if 802.1X were already disabled or VLANs were not used, we don't need to check further
		return
	end
	local role_req = self:getter_wrapped_abs_value(self.config, self.sid, "role") or "client"
	local use_vlans_req = self:getter_wrapped_abs_value(self.config, self.sid, "use_vlans") or "0"
	local enabled_req = self:getter_wrapped_abs_value(self.config, self.sid, "enabled") or "0"
	if use_vlans_req ~= "1" or enabled_req ~= "1" or role_req ~= "server" then
		self:add_message( 1, "802.1X will no longer be modifying the VLANs on this port. Please manually review the VLAN configuration for this port.", self.sid)
	end
end

if need_isolation_vlans then
	function PortSecurity:PUT_before_commit_hook()
		local used_vlans = 0
		self:table_foreach("network", "switch_vlan", function(s)
			if s.isolation == "1" then return end
			used_vlans = used_vlans + 1
		end)
		local dot1x_enabled_instances = #self:table_find_many("dot1x", "port", {enabled = "1", role = "server"})
		local max_vlans = board:get_max_vlans()
		local remaining_vlans = max_vlans - dot1x_enabled_instances - used_vlans
		if remaining_vlans < 0 then
			self:add_critical_error(STD_CODES.INVALID_OPT, string.format(
				"Too many VLANs are used to enable 802.1X server on these ports. Please remove %i VLAN(s) to use this feature",
					math.abs(remaining_vlans))
			)
		end

		local isolation_vlans = self:table_find_many("network", "switch_vlan", {isolation = "1"}) or {}
		local diff_count = #isolation_vlans - dot1x_enabled_instances

		if diff_count > 0 then
			for i = 1, diff_count, 1 do
				self:table_delete("network", isolation_vlans[i][".name"])
			end
		elseif diff_count < 0 then
			local free_vlans = port_security_utils.get_isolation_vids(self, false)
			local isolation_count = 1
			for _ = 1, -diff_count, 1 do
				self:table_section("network", "switch_vlan", nil, {
					device = "switch0",
					isolation = "1",
					ports = "6t",
					vlan = free_vlans[isolation_count]
				})
				isolation_count = isolation_count + 1
			end
		end
	end
end

local STATUS_CODES = {
	DISABLED = 1,
	PORT_DOWN = 2,
	AUTH_FAILED = 3,
	AUTHORIZED = 4,
	AUTHENTICATING = 5,
	INVALID_CONFIG = 6,
	NO_DEVICE = 7,
	DEVICE_USED = 8,
	UNAUTHORIZED = 9
}

function PortSecurity:GET_TYPE_status()
	if self.sid then
		if not self:table_get(self.main_config, self.sid, "iface") then
			return self:ResponseNotFound("Section not found")
		end
	end
	local statuses = {}
	local client_status = util.ubus("dot1x_client", "status") or {}

	local tsw_port_stats = {}
	if is_tsw then
		tsw_port_stats = util.ubus("tswconfig.stats", "get_stats")
	end

	self:table_foreach(self.main_config, "port", function (s)
		local status = {}
		local port_name = s[".name"]
		statuses[port_name] = status

		if s.enabled ~= "1" then
			status.code = STATUS_CODES.DISABLED
			return
		end

		if is_tsw then
			local stats = tsw_port_stats[port_name] or {}
			if not stats.link then
				status.code = STATUS_CODES.PORT_DOWN
				return
			end
		end

		if s.role == "server" then
			local st = port_security_utils.get_port_authorized(self, port_name)
			status.code = st == "AUTHORIZED" and STATUS_CODES.AUTHORIZED or STATUS_CODES.UNAUTHORIZED
			return
		end

		local port_status = client_status[port_name]
		if not port_status then
			status.code = STATUS_CODES.DISABLED
			return
		end
		if port_status.code == 1 then
			status.code = STATUS_CODES.NO_DEVICE
			return
		elseif port_status.code == 2 then
			status.code = STATUS_CODES.DEVICE_USED
			return
		elseif port_status.code == 3 then
			if statuses[port_status.owner] then
				status.code = statuses[port_status.owner].code
			end
			return
		end
		local port_iface
		if is_tsw then
			port_iface = port_name
		else
			port_iface = port_status.phy
		end
		local logs = util.exec(string.format([[logread -e "wpa_supplicant\[.*\]: %s: "]], port_iface)) or ""
		local split_logs = util.split(logs, "\n")
		logs = split_logs[#split_logs-1] or ""

		if string.match(logs, "authentication failed") then
			status.code = STATUS_CODES.AUTH_FAILED
			return
		end
		if string.match(logs, "completed") then
			status.code = STATUS_CODES.AUTHORIZED
			return
		end

		status.code = STATUS_CODES.AUTHENTICATING
	end)

	if not is_tsw then
		local default_lan = board:get_default_lan_ifname()
		local default_wan = board:get_default_wan_ifname()
		for _, port in ipairs(util.ubus("port_events", "show").ports or {}) do
			if port.state == "down" then
				local port_num
				local port_name = string.lower(port.name)
				if board:has_dsa() then
					port_num = port.position or port.num
					if port_name == "lan" then
						port_name = string.format("_%s", type(default_lan) == "string" and default_lan or default_lan[port_num] or port_name)
					elseif port_name == "wan" then
						port_name = string.format("_%s", default_wan)
					else
						port_name = string.format("_%s", port_name)
					end
				else
					port_name = string.format("_%s", port_name)
					port_num = port.num or port.position
				end
				if router_name:match("^TRB2") then port_num = "" end
				if not board:has_dsa() then
					port_name = port_name..tostring(port_num)
				end
				local status = statuses[port_name]
				if status and status.code ~= STATUS_CODES.DISABLED then
					statuses[port_name].code = STATUS_CODES.PORT_DOWN
				end
			end
		end
	end
	if self.sid then
		local status = statuses[self.sid]
		status.port = self.sid
		self:ResponseOK(status)
	end
	local status_result = {}
	for k, v in pairs(statuses) do
		v.port = k
		status_result[#status_result+1] = v
	end
	self:ResponseOK(status_result)
end

function PortSecurity:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

return PortSecurity
