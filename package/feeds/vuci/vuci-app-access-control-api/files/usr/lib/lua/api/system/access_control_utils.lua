local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local api_utils = require("api/api_utils")
local ac = require("vuci.access")
local board = require("vuci.board")

local ac_util = {}

ac_util.has_wan = board:get_default_wan_ifname() or board:has_mobile() or board:is_industrial_ap()

ac_util.DEFAULT_CA_CERT = "/etc/uhttpd-ca.crt"
ac_util.DEFAULT_CA_KEY = "/etc/uhttpd-ca.key"
ac_util.DEFAULT_CERT = "/etc/uhttpd.crt"
ac_util.DEFAULT_KEY = "/etc/uhttpd.key"

function ac_util.parse_webui_ports(array, ports, only_port)
	if not ports or ports == "" then return end

	if api_utils:is_array(ports) then
		for _, value in ipairs(ports) do
			if only_port then
				table.insert(array, value:match(":(.*)") or value)
			else
				table.insert(array, value:match("^0%.0%.0%.0:(.*)") or value)
			end
		end
	elseif type(ports) == "string" then
		if only_port then
			table.insert(array, ports:match(":(.*)") or ports)
		else
			table.insert(array, ports:match("^0%.0%.0%.0:(.*)") or ports)
		end
	end
end

function ac_util.after_data_hook(self, enabled_opt, local_enabled_opt, cfg_enabled_opt, wan_enabled_opt, wan_port_opt, port_opt, name, proto)
	local function abs_value(cfg_name, opt_name)
		local data = self.current_data_block or {}
		return data[opt_name] or self:table_get(self.config, self.sid, cfg_name)
	end

	local enable_value = abs_value(cfg_enabled_opt, enabled_opt)
	local local_access = (abs_value(local_enabled_opt, enabled_opt) or self:table_get(self.config, self.sid, cfg_enabled_opt)) == "1"
	local port = self:getter_wrapped_abs_value(self.config, self.sid, port_opt)
	if port and port ~= "" and not ac_util.check_port_availability(self, port) then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Port is already in use", "Validation")
	end
	if ac_util.has_wan then
		local wan_port = self:getter_wrapped_abs_value(self.config, self.sid, wan_port_opt) or port
		if wan_port and wan_port ~= "" and not ac_util.check_port_availability(self, wan_port) then
			self:add_critical_error(STD_CODES.INVALID_SECTION, "WAN port is already in use", "Validation")
		end

		local wan_access = self:getter_wrapped_abs_value(self.config, self.sid, wan_enabled_opt) == "1"
		local enable_wan_rule = wan_access and (port and port ~= "")
		ac.add_wan_rule(self.uci, wan_port, enable_wan_rule and "" or "0", name, proto)
		enable_value = (local_access or wan_access) and "1" or "0"
		if local_access then
			if wan_access and wan_port and wan_port ~= "" and port ~= wan_port then
				ac_util.add_firewall_rule(self, name, wan_port)
			else
				ac_util.delete_rule_by_name(self, name)
			end
		elseif wan_access then
			local rule_ports = { port }
			if wan_port and wan_port ~= "" and port ~= wan_port then
				table.insert(rule_ports, wan_port)
			end
			ac_util.add_firewall_rule(self, name, rule_ports)
		else
			ac_util.delete_rule_by_name(self, name)
		end
	end
	self:table_set(self.config, self.sid, cfg_enabled_opt, enable_value)
end

function ac_util.check_port_availability(self, value)
	local unavailable_ports = {}

	if self.config ~= "dropbear" then
		local dropbear_lan = self.uci:get("dropbear", "@dropbear[0]", "Port")
		if dropbear_lan then
			table.insert(unavailable_ports, dropbear_lan)
		end
		if ac_util.has_wan then
			local dropbear_wan = self.uci:get("dropbear", "@dropbear[0]", "wan_port")
			if dropbear_wan then
				table.insert(unavailable_ports, dropbear_wan)
			end
		end
	end

	if self.config ~= "telnetd" then
		local telnetd = self.uci:get("telnetd", "@telnetd[0]", "port")
		if telnetd then
			table.insert(unavailable_ports, telnetd)
		end
		if ac_util.has_wan then
			local telnetd_wan = self.uci:get("telnetd", "@telnetd[0]", "wan_port")
			if telnetd_wan then
				table.insert(unavailable_ports, telnetd_wan)
			end
		end
	end

	if self.config ~= "uhttpd" then
		ac_util.parse_webui_ports(unavailable_ports, self.uci:get("uhttpd", "main", "listen_http"), true)  -- HTTP PORTS
		ac_util.parse_webui_ports(unavailable_ports, self.uci:get("uhttpd", "main", "listen_https"), true) -- HTTPS PORTS
		if ac_util.has_wan then
			ac_util.parse_webui_ports(unavailable_ports, self.uci:get("uhttpd", "main", "wan_listen_http"), true)  -- WAN HTTP PORTS
			ac_util.parse_webui_ports(unavailable_ports, self.uci:get("uhttpd", "main", "wan_listen_https"), true) -- WAN HTTPS PORTS
		end
	end

	if self.config ~= "cli" then
		local function is_cli_port_available(cli)
			local cli_start, cli_stop = string.match(cli, "(%d+)-(%d+)")
			if cli_start == nil or cli_stop == nil then
				return false
			end
			cli_start, cli_stop = tonumber(cli_start), tonumber(cli_stop)
			local numeric_value = tonumber(value)
			if numeric_value and numeric_value >= cli_start and numeric_value <= cli_stop then
				return false
			end
			return true
		end

		local cli_port = self.uci:get("cli", "status", "port")
		if cli_port then
			if not is_cli_port_available(cli_port) then return false end
		end
		if ac_util.has_wan then
			local cli_wan_port = self.uci:get("cli", "status", "wan_port")
			if cli_wan_port then
				if not is_cli_port_available(cli_wan_port) then return false end
			end
		end
	end

	-- Validate range
	local range_start, range_stop = string.match(value, "(%d+)-(%d+)")
	if range_start and range_stop then
		range_start, range_stop = tonumber(range_start), tonumber(range_stop)
		for _, port in pairs(unavailable_ports) do
			if tonumber(port) and tonumber(port) >= range_start and tonumber(port) <= range_stop then
				return false
			end
		end
	end

	return not util.contains(unavailable_ports, value)
end

function ac_util.add_firewall_rule(self, rule_name, port)
	local rule_sid
	local name = "Reject-".. rule_name .."-lan"

	self.uci:foreach("firewall", "rule", function(s)
		if s.name == name then
			rule_sid = s[".name"]
			return false
		end
	end)

	if not rule_sid then
		local opts = {
			name = name,
			enabled = 1,
			target = "REJECT",
			src = "lan",
			dest_port = port,
			proto = "tcp"
		}
		util_tlt.add_rule(opts)
	else
		self.uci:set("firewall", rule_sid, "dest_port", port)
		self.uci:set("firewall", rule_sid, "enabled", 1)
	end
end

function ac_util.delete_rule_by_name(self, rule_name)
	local name = "Reject-".. rule_name .."-lan"
	self.uci:foreach("firewall", "rule", function(s)
		if s.name == name then
			self.uci:delete("firewall", s[".name"])
			return false
		end
	end)
end

function ac_util.get_cert_expire_date(cert_path)
	local cert = require("vuci.certificates")
	for _, der in ipairs({ false, true }) do
		local info = cert:openssl_response("x509", cert_path, der, { "-dates", "-noout" })
		if info.code == 0 then
			return cert:parse_date(info.stdout)
		end
	end
end

return ac_util
