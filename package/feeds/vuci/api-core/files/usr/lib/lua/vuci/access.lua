local fw = require "vuci.firewall".init()
local ntm = require "vuci.network".init()
local uci = require "vuci.uci".cursor()
local pac = require("vuci.package_checker")
local util = require("vuci.util")

local pairs, table, tonumber, math, type = pairs, table, tonumber, math, type

module "vuci.access"

local _wanZone = fw:get_zone("wan")
local _lan_net = ntm:get_network("lan")
local _pbridge = false
local _ppp_net = ntm:get_network("ppp")
local method = _ppp_net and _ppp_net.get("method")

if method and method == "pbridge" then
    local ppp_enable = _ppp_net.get("method")
    if not ppp_enable or ppp_enable ~= "0" then
        _pbridge = true
    end
end

function add_wan_redirect(uci, wan_port, lan_port, value, redirect_name, proto, lan_ip, wan_ip)
	local redirect_sid
	local name = "Redirect_" .. redirect_name .. "_WAN"

	uci:foreach("firewall", "redirect", function(s)
		if s.name == name then
			redirect_sid = s[".name"]
			return false
		end
	end)

	if not redirect_sid then
		local options = {
			target 		= "DNAT",
			proto 		= proto or {"tcp", "udp"},
			dest_ip 	= lan_ip,
			dest_port 	= lan_port,
			src_dip 	= wan_ip,
			src_dport   = wan_port,
			name 		= name,
			enabled		= value
		}
		if _wanZone then
			_wanZone:add_redirect(options)
		end
	else
		uci:set("firewall", redirect_sid, "dest_ip", lan_ip)
		uci:set("firewall", redirect_sid, "dest_port", lan_port)
		uci:set("firewall", redirect_sid, "src_dip", wan_ip)
		uci:set("firewall", redirect_sid, "src_dport", wan_port)
		uci:set("firewall", redirect_sid, "enabled", value)
	end
end

function add_wan_rule(uci, port, value, rule_name, proto)
	local rule_sid
	local name = "Enable_" .. rule_name .. "_WAN"

	uci:foreach("firewall", "rule", function(s)
		if s.name == name then
			rule_sid = s[".name"]
			return false
		end
	end)

	if not rule_sid then
		local options = {
			target 		= "ACCEPT",
			proto 		= proto or {"tcp", "udp"},
			dest_port 	= port,
			name 		= name,
			enabled		= value
		}
		if _wanZone then
			_wanZone:add_rule(options)
		end
	else
		uci:set("firewall", rule_sid, "dest_port", port)
		uci:set("firewall", rule_sid, "enabled", value)
	end
end

function _cliWanAccess(enabled, port)
    enabled = (enabled == "1" or enabled == true) and "" or "0"
    add_wan_rule(uci, port, enabled, "CLI", "tcp")
end

function _telnetWanAccess(enabled, port)
    enabled = (enabled == "1" or enabled == true) and "" or "0"
    add_wan_rule(uci, port, enabled, "TELNET")
end

function update_redirect_ports(service, http_port, https_port, ssh_port)
	service:table_foreach("firewall", "redirect", function(s)
		local new_port = nil
		if s.name == "dmz_http" then
			new_port = http_port
		elseif s.name == "dmz_https" then
			new_port = https_port
		elseif s.name == "dmz_ssh" then
			new_port = ssh_port
		end

		if new_port then
			service:table_set("firewall", s[".name"], "src_dport", new_port)
		end
	end)
end

function check_missing_redirects(service, redirects)
	local missing_redirects, rdr_array = {}, {}

	for k, v in pairs(redirects) do
		missing_redirects[k] = v
	end

	service:table_foreach("firewall", "redirect", function(s)
		if missing_redirects[s.name] then
			missing_redirects[s.name] = nil
		end
	end)

	for k in pairs(missing_redirects) do
		table.insert(rdr_array, k)
	end

	return rdr_array
end

function setup_dmz_redirects(service)
	local is_snmp = pac.is_installed("snmp")
	local snmp_redirect

	local http_ports = service:table_get("uhttpd", "main", "wan_listen_http") or service:table_get("uhttpd", "main", "listen_http")
	local https_ports = service:table_get("uhttpd", "main", "wan_listen_https") or service:table_get("uhttpd", "main", "listen_https")

	if type(http_ports) == "table" and http_ports[1] then
		http_ports = http_ports[1]:match(":(.*)") or http_ports[1]
	end

	if type(https_ports) == "table" and https_ports[1] then
		https_ports = https_ports[1]:match(":(.*)") or https_ports[1]
	end

	local ssh_port = service:table_get("dropbear", "@dropbear[0]", "wan_port") or service:table_get("dropbear", "@dropbear[0]", "Port")

	update_redirect_ports(service, http_ports, https_ports, ssh_port)

	local default_dmz = {
		name = "dmz_fw",
		target = "DNAT",
		proto = "tcp udp",
		src = "wan",
		dest = "dmz",
		mode = "host",
		enabled = "0"
	}
	local http_redirect = {
		target = "DNAT",
		name = "dmz_http",
		proto = "tcp",
		src = "wan",
		src_dport = http_ports,
		enabled = service:table_get("uhttpd", "main", "_httpWanAccess") == "1" and "" or "0"
	}
	local https_redirect = {
		target = "DNAT",
		name = "dmz_https",
		proto = "tcp",
		src = "wan",
		src_dport = https_ports,
		enabled = service:table_get("uhttpd", "main", "_httpsWanAccess") == "1" and "" or "0"
	}
	local ssh_redirect = {
		target = "DNAT",
		name = "dmz_ssh",
		proto = "tcp",
		src = "wan",
		src_dport = ssh_port,
		enabled = service:table_get("dropbear", "@dropbear[0]", "_sshWanAccess") == "1" and "" or "0"
	}
	local dhcp_redirect = {
		name = "dmz_dhcp",
		target = "DNAT",
		proto = "udp",
		src = "wan",
		src_dport = "68",
		enabled = "1"
	}
	local redirect_names = {
		["dmz_fw"] = default_dmz,
		["dmz_http"] = http_redirect,
		["dmz_https"] = https_redirect,
		["dmz_ssh"] = ssh_redirect,
		["dmz_dhcp"] = dhcp_redirect
	}
	if is_snmp then
		local snmp_enabled = service:table_get("snmpd", "general", "enabled")
		local allow_ra = service:table_get("snmpd", "general", "allow_ra")
		snmp_redirect = {
			target = "DNAT",
			name = "dmz_snmp",
			proto = "udp",
			src = "wan",
			src_dport = service:table_get("snmpd", "general", "port"),
			enabled = snmp_enabled == "1" and allow_ra == "1" and "" or "0"
		}
		redirect_names["dmz_snmp"] = snmp_redirect
	end

	local missing_redirects = check_missing_redirects(service, redirect_names)

	local dmz_section
	service:table_foreach("firewall", "redirect", function(s)
		if s.name and s.name == "dmz_fw" then
			dmz_section = s[".name"]
			return false
		end
	end)

	if dmz_section then
		for k, v in pairs(service:table_get("firewall", dmz_section) or {}) do
			if not k:match("^%.") then
				default_dmz[k] = v
			end
		end

		local dmz_src = service:table_get("firewall", dmz_section, "src") or "wan"
		http_redirect.src = dmz_src
		https_redirect.src = dmz_src
		ssh_redirect.src = dmz_src
		if is_snmp then
			snmp_redirect.src = dmz_src
		end
	end

	if (not default_dmz["enabled"] or default_dmz["enabled"] == "1") and #missing_redirects > 0 then
		-- table_delete doesn't work properly, so the lines below are needed
		if service.config_set_table["firewall"] and service.config_set_table["firewall"][dmz_section] then
			service.config_set_table["firewall"][dmz_section] = nil
		end
		service.uci:delete("firewall", dmz_section)
		service.t_func:_get_config("firewall")
		for _, v in pairs(missing_redirects) do
			service:table_section("firewall", "redirect", service:next_id("firewall"), redirect_names[v])
		end
		service:table_section("firewall", "redirect", service:next_id("firewall"), default_dmz)
	elseif default_dmz["enabled"] == "0" then
		service:table_foreach("firewall", "redirect", function(s)
			if redirect_names[s.name] and s.name ~= "dmz_fw" then
				service:table_delete("firewall", s[".name"])
			end
		end)
	end
end
