local FunctionService = require("api/FunctionService")
local fs = require "nixio.fs"
local util = require "vuci.util"
local pac = require("vuci.package_checker")
local board_lib = require("vuci.board")

local Services = FunctionService:new()

local service_states = {"S", "R", "Z", "D", "I"} -- means that process is alive

local function datalist()
	local service_data = util.ubus("service", "list", {})
	local mdm = require("vuci.modem")
	local modem_list = mdm:get_all_modems()
	local uci = require "vuci.uci".cursor()
	local data = {}

	local function has_running_instance(object)
		if not object or not object.instances then return false end
		for _, instance in pairs(object.instances) do
			if instance.running then return true end
		end
		return false
	end

	local function call_utilities_support(mdm, modem_list)
		for _, modem in ipairs(modem_list) do
			if modem.id and not mdm:call_functionality_supported(modem.id) then
				return false
			end
		end
		return true
	end

	local function get_service_state(service, subservice)
		local pid

		for service_name, service_info in pairs(service_data) do
			if service_name == service then
				if service_info.instances then
					for name, instance_info in pairs(service_info.instances) do
						if instance_info.running and (not subservice or name == subservice) then
							pid = instance_info.pid
							break
						end
					end
				end
				break
			end
		end

		if not pid then
			return "Down"
		end

		local status_file = "/proc/" .. pid .. "/status"
		local handle = fs.readfile(status_file)
		local state = handle:match("State:%s+(%w+)")

		if state and util.contains(service_states, state) then
			return "Running"
		end

		return "Down"
	end

	local function get_enabled_status(config, section_type, field_name)
		local enabled = "0"
		local fields = type(field_name) == "table" and field_name or {field_name}
		local section = type(section_type) == "table" and section_type or {section_type}

		for _, sec in ipairs(section) do
			for _, name in ipairs(fields) do
				if uci:get(config, sec, name) == "1" then
					return "1"
				end
			end
			uci:foreach(config, sec, function(s)
				for _, name in ipairs(fields) do
					if s[name] == "1" then
						enabled = "1"
						return false
					elseif s[name] == "2" then
						enabled = "2"
						return false
					end
				end
			end)
		end
		return enabled
	end

	local function add_service(service_name, config, section_type, field_name, path, check_installed, board_check, proc, enabled_fn)
		if board_check then
			local found = false
			for _, func in pairs(board_check) do
				if board_lib[func](board_lib) then
					found = true
					break
				end
			end
			if not found then
				return
			end
		end
		if not check_installed or pac.is_installed(check_installed) then
			if fs.access(config) then
				config = config:gsub("^/etc/config/", "")
				local enabled = enabled_fn and enabled_fn() or get_enabled_status(config, section_type, field_name)
				local status = "Disabled"
				if enabled == "1" then
					status = proc == true and "Running" or get_service_state(proc or config)
				elseif enabled == "2" then
					status = "Standby"
				end
				table.insert(data, { service = service_name, enabled = enabled, path = path, status = status })
			end
		end
	end

	local function add_service_network(service_name, proto, path, check_installed, proc_name, no_check)
		if not check_installed or pac.is_installed(check_installed) then
			local enabled = "0"
			uci:foreach("network", "interface", function(s)
				if s.proto == proto and (not s.disabled or s.disabled == "0") and (not s.auto or s.auto == "1") then
					enabled = "1"
					return
				end
			end)

			local status = "Disabled"
			if enabled == "1" then
				status = no_check and "Running" or get_service_state(proc_name or proto)
			end
			table.insert(data, { service = service_name, enabled = enabled, path = path, status = status })
		end
	end

	local function add_sms_gateway_services()
		if fs.access("/etc/config/sms_gateway") then
			local gateway_configs = {
				{ "Auto Reply", "reply", "enabled", "/services/mobile_utilities/sms_gateway/auto_reply" },
				{ "SMS Forwarding to HTTP", "to_http", "enabled", "/services/mobile_utilities/sms_gateway/sms_forwarding" },
				{ "SMS Forwarding to SMS", "to_sms", "enabled", "/services/mobile_utilities/sms_gateway/sms_forwarding" },
				{ "SMS Forwarding to Email", "to_smtp", "enabled", "/services/mobile_utilities/sms_gateway/sms_forwarding" },
			}
			for _, config in ipairs(gateway_configs) do
				local service_name, section, field, path = unpack(config)
				local enabled = uci:get("sms_gateway", section, field) or "0"
				local status = enabled == "1" and "Running" or "Disabled"
				table.insert(data, { service = service_name, enabled = enabled, status = status, path = path })
			end
		end
	end

	local services_to_check = {
		{ "RMS", "/etc/config/rms_mqtt", "rms_connect_mqtt", "enable", "/services/cloud_solutions/rms" },
		{ "AWS", "/etc/config/aws_jobs", "aws_jobs", "enabled", "/services/cloud_solutions/aws", "aws" },
		{ "Cloud of Things", "/etc/config/iot", "cloudofthings", "enabled", "/services/cloud_solutions/cot", "cmStreamApp" },
		{ "Azure IoT Hub", "/etc/config/azure_iothub", "azure_iothub", "enabled", "/services/cloud_solutions/azure_iothub", "azure_iothub" },
		{ "ThingWorx", "/etc/config/iottw", "thingworx", "enabled", "/services/cloud_solutions/thingworx" },
		{ "Cumulocity", "/etc/config/iot", "cumulocity", "enabled", "/services/cloud_solutions/cumulocity", "cmStreamApp" },
		{ "Modbus TCP Server", "/etc/config/modbus_server", "modbus", "enabled", "/services/modbus/modbus_server" },
		{ "M-Bus", "/etc/config/mbus_client", "main", "enabled", "/services/mbus", _, {"has_mbus"} },
		{ "Modbus TCP over Serial Gateway", "/etc/config/rs_modbus", "modbus", "enabled", "/services/modbus/tcp_over_serial", _, {"has_usb", "has_rs232", "has_rs485", "has_console"} },
		{ "MQTT Modbus Gateway", "/etc/config/modbusgateway", "gateway", "enabled", "/services/modbus/modbus_gateway" },
		{ "Modbus Serial Server", "/etc/config/modbus_server", "rtu_device", "enabled", "/services/modbus/modbus_serial_server", _, {"has_usb", "has_rs232", "has_rs485", "has_console"} },
		{ "MQTT Broker", "/etc/config/mosquitto", "mqtt", "enabled", "/services/mqtt/broker" },
		{ "MQTT Publisher", "/etc/config/mqtt_pub", "mqtt_pub", "enabled", "/services/mqtt/publisher" },
		{ "DNP3 Outstation", "/etc/config/dnp3_outstation", "dnp3_outstation", "enabled", "/services/dnp3/dnp_outstation" },
		{ "DNP3 TCP Client", "/etc/config/dnp3_client", "tcp_client", "enabled", "/services/dnp3/tcp_client" },
		{ "DNP3 Serial Client", "/etc/config/dnp3_client", "serial_client", "enabled", "/services/dnp3/serial_client", _, {"has_usb", "has_rs232", "has_rs485", "has_console"}},
		{ "DNP3 Serial Outstation", "/etc/config/dnp3_outstation", "dnp3_serial_outstation", "enabled", "/services/dnp3/dnp_serial_outstation", _ , {"has_usb", "has_rs232", "has_rs485", "has_console"} },
		{ "OpenVPN", "/etc/config/openvpn", "openvpn", "enable", "/services/vpn/openvpn" },
		{ "Stunnel", "/etc/config/stunnel", "globals", "enabled", "/services/vpn/stunnel" },
		{ "IPsec", "/etc/config/ipsec", "remote", "enabled", "/services/vpn/ipsec", _, _, "swanctl" },
		{ "ZeroTier", "/etc/config/zerotier", "instance", "enabled", "/services/vpn/zerotier" },
		{ "BACnet configuration", "/etc/config/bacnet_router", "general", "enabled", "/services/bacnet", "bacnet-router" },
		{ "Email Relay", "/etc/config/emailrelay", "emailrelay", "enabled", "/services/email_relay", "emailrelay" },
		{ "SMPP", "/etc/config/smpp", "smpp", "enabled", "/services/mobile_utilities/smpp", "smpp" },
		{ "Ping/Wget Reboot", "/etc/config/ping_reboot", "ping_reboot", "enable", "/system/maintenance/auto_reboot/ping_reboot", _, _, true },
		{ "Reboot Scheduler", "/etc/config/periodic_reboot", "reboot_instance", "enable", "/system/maintenance/auto_reboot/reboot_scheduler", _, _, true },
		{ "Wireless Reboot", "/etc/config/wireless_reboot", "wireless_reboot", "enabled", "/system/maintenance/auto_reboot/wireless_reboot", "reboot_utils-wireless", _, true },
		{ "Wake on LAN", "/etc/config/etherwake", "target", "wakeonboot", "/services/wol", _, {"has_ethernet"} },
		{ "UPnP", "/etc/config/upnpd", "config", "enable_upnp", "/services/upnp", _, _, "miniupnpd"},
		{ "OPC UA Client", "/etc/config/opcua_client", "main", "enabled", "/services/opcua/opcua_client" },
		{ "OPC UA Server", "/etc/config/opcua_server", "opcua_server", "enabled", "/services/opcua/opcua_server" },
		{ "Impulse counter", "/etc/config/impulse_counter", "general", "enabled", "/services/io/impulse_counter/configuration", _, {"has_ios"} },
		{ "IGMP Proxy", "/etc/config/igmpproxy", "igmpproxy", "enabled", "/network/igmp_proxy" },
		{ "Network Shares", "/etc/config/samba", "@samba[0]", "enabled", "/services/sd_usb_tools/samba/general" },
		{ "DLNA", "/etc/config/minidlna", "config", "enabled", "/services/sd_usb_tools/minidlna" },
		{ "Printer Server", "/etc/config/p910nd", "@p910nd[0]", "enabled", "/services/sd_usb_tools/p910nd", _, {"has_usb"} },
		{ "SNMP Trap", "/etc/config/snmptrap", "@server[0]", "enabled", "/services/snmp/traps" },
		{ "SNMP", "/etc/config/snmpd", "general", "enabled", "/services/snmp/snmp_settings" },
		{ "SSHFS", "/etc/config/sshfs", "sshfs", "enabled", "/system/admin/memory_expansion/sshfs" },
		{ "VRRP", "/etc/config/vrrpd", "vrrpd", "enabled", "/network/failover/vrrp" },
		{ "Events Reporting", "/etc/config/event_juggler", _, _, "/services/events_reporting", _, _, _, function ()
			local enabled = "0"
			uci:foreach("event_juggler", "event", function(s)
				if s.events_reporting == "1" and s.enabled == "1" then
					enabled = "1"
					return false
				end
			end)
			return enabled
		end },
		{ "Event Juggler", "/etc/config/event_juggler", _, _, "/services/event_juggler", _, _, _, function ()
			local enabled = "0"
			uci:foreach("event_juggler", "event", function(s)
				if s.events_reporting ~= "1" and s.io_juggler ~= "1" and s.enabled == "1" then
					enabled = "1"
					return false
				end
			end)
			return enabled
		end },
		{ "TR-069", "/etc/config/easycwmp", "@acs[0]", "enabled", "/services/tr069", _, _, "easycwmpd" },
		{ "Hotspot 2.0", "/etc/config/wireless", "wifi-iface", "interworking", "/services/hotspot/hotspot2", "hotspot_2_0", _, true },
		{ "Data To Server", "/etc/config/data_sender", "collection", "enabled", "/services/data_sender" },
		{ "Hotspot", "/etc/config/chilli", "@chilli[0]", "enabled", "/services/hotspot/general" },
		{ "GPS", "/etc/config/gps", "gpsd", "enabled", "/services/gps/general", _, {"has_gps"}, "gpsd" },
		{ "Tinc", "/etc/config/tinc", "tinc-net", "enabled", "/services/vpn/tinc", "tinc" },
		{ "Bluetooth", "/etc/config/blesem", "general", "enabled", "/services/bluetooth", _, {"has_bluetooth"} },
		{ "Input/Output Juggler", "/etc/config/event_juggler", _, _, "/services/io/juggler/input", _, {"has_ios"}, _, function ()
			if uci:get("event_juggler", "general", "io_juggler_enabled") ~= "1" then
				return "0"
			end
			local enabled = "0"
			uci:foreach("event_juggler", "event", function(s)
				if s.io_juggler == "1" and s.enabled == "1" then
					enabled = "1"
					return false
				end
			end)
			return enabled
		end },
		{ "Input/Output Scheduler", "/etc/config/io_scheduler", "general", "enabled", "/services/io/scheduler", "io_scheduler", _, "ioman_scheduler" },
		{ "PAM", "/etc/config/pam", "pam", "enabled", "/system/admin/access_control/pam" },
		{ "Telnet", "/etc/config/telnetd", "@telnetd[0]", "enable", "/system/admin/access_control/general" },
		{ "SSH", "/etc/config/dropbear", "@dropbear[0]", "enable", "/system/admin/access_control/general" },
		{ "Wifi Scanner", "/etc/config/wifi_scanner", "wifi_scan", {"two_g_enabled", "five_g_enabled"}, "/services/wifi_scanner", _, {"has_wifi"} },
		{ "NTRIP", "/etc/config/rs_ntrip", "1", "enabled", "/services/ntrip", "ntrip_client_v2", {"has_usb", "has_rs232", "has_rs485", "has_console"}},
		{ "Traffic Logging", "/etc/config/ulogd", "global", "enabled", "/services/logging"},
		{ "DLMS", "/etc/config/dlms_client", "main", "enabled", "/services/dlms"},
		{ "Tailscale", "/etc/config/tailscale", "settings", "enabled", "/services/vpn/tailscale" },
		{ "EoIP", "/etc/config/eoip", "eoip", "enabled", "/services/vpn/eoip" }
	}

	if fs.access("/etc/config/dmvpn") and (pac.is_installed("dmvpn") or pac.is_installed("dmvpn_frr5")) then
		local dmvpn_enabled = "0"
		uci:foreach("dmvpn", "dmvpn", function(s)
			if s.enabled == "1" then
				dmvpn_enabled = "1"
				return false
			end
		end)
		local status = "Disabled"
		if dmvpn_enabled == "1" then
			status = get_service_state("frr", "nhrpd")
		end
		table.insert(data, { service = "DMVPN", enabled = dmvpn_enabled, path = "/services/vpn/dmvpn", status = status })
	end

	if fs.access("/etc/config/pptpd") then
		local enabled = "0"
		local server_enabled = get_enabled_status("pptpd", "service", "enabled") or "0"
		local client_enabled = "0"
		local status = "Disabled"
		if server_enabled == "0" then
			uci:foreach("network", "interface", function(s)
				if s.proto == "pptp" and (not s.disabled or s.disabled == "0") and (not s.auto or s.auto == "1") then
					client_enabled = "1"
					return
				end
			end)
		end
		if server_enabled == "1" or client_enabled == "1" then
			enabled = "1"
		end

		if server_enabled == "1" then
			status = get_service_state("pptpd")
		elseif client_enabled == "1" then
			status = "Running"
		end

		table.insert(data, { service = "PPTP", enabled = enabled, path = "/services/vpn/pptp", status = status })
	end

	if fs.access("/etc/config/xl2tpd") then
		local l2tp_enabled = "0"
		local l2tp_status

		uci:foreach("network", "interface", function(s)
			if s.proto == "l2tp" and (not s.disabled or s.disabled == "0") and (not s.auto or s.auto == "1") then
				l2tp_enabled = "1"
				return false
			end
		end)
		if l2tp_enabled == "0" then
			l2tp_enabled = get_enabled_status("xl2tpd", "service", "enabled")
		end
		l2tp_status = l2tp_enabled == "1" and get_service_state("xl2tpd") or "Disabled"
		table.insert(data, { service = "L2TP", enabled = l2tp_enabled, path = "/services/vpn/l2tp", status = l2tp_status })
	end

	local network_services = {
		{ "GRE", "gre", "/services/vpn/gre", _, _, true },
		{ "L2TPv3", "l2tpv3", "/services/vpn/l2tpv3", _, _, true },
		{ "SSTP", "sstp", "/services/vpn/sstp", "sstp-client", _, true },
		{ "Wireguard", "wireguard", "/services/vpn/wireguard", _, _, true },
		{ "OpenConnect", "openconnect", "/services/vpn/openconnect", "openconnect", _, true },
	}

	if fs.access("/etc/config/modbus_client") and pac.is_installed("modbus_client") then
		local running = util.ubus("service", "list", {name="modbus_client"}).modbus_client
		local modbus = has_running_instance(running)
		local status = "Disabled"
		if modbus then
			status = get_service_state("modbus_client")
		end
		local tcp_section_enabled = "0"
		uci:foreach("modbus_client", "tcp_server", function(s)
			if s.enabled == "1" then
				tcp_section_enabled = "1"
				return false
			end
		end)
		table.insert(data, {
			service = "Modbus TCP Client",
			enabled = modbus and tcp_section_enabled or "0",
			path = "/services/modbus/modbus_client",
			status = status
		})
		if board_lib:has_usb() or board_lib:has_rs232() or board_lib:has_rs485() or board_lib:has_console() then
			local status = "Disabled"
			local rtu_section_enabled = "0"
			uci:foreach("modbus_client", "rtu_server", function(s)
				if s.enabled == "1" then
					rtu_section_enabled = "1"
					return false
				end
			end)
			if rtu_section_enabled == "1" then
				status = get_service_state("modbus_client")
			end

			table.insert(data, {
				service = "Modbus Serial Client",
				enabled = modbus and rtu_section_enabled or "0",
				path = "/services/modbus/modbus_serial_client",
				status = status
			})
		end
	end

	if fs.access("/etc/config/ddns") then
		local running = "Disabled"
		local enabled = "0"
		local rdir = uci:get("ddns", "global", "ddns_rundir") or "/var/run/ddns"

		uci:foreach("ddns", "service", function (s)
			if tonumber(s.enabled) then
				enabled = "1"
				local pid = tonumber(fs.readfile(string.format("%s/%s.pid", rdir, s[".name"])) or "")
				running = pid and "Running" or "Down"
			end
		end)

		table.insert(data, { service = "DDNS", enabled = enabled, path = "/services/ddns", status = running })
	end

	if fs.access("/etc/config/hostblock") or fs.access("/etc/config/privoxy") and pac.is_installed("web_filter") then
		local webfilter_enabled = "0"
		local status = "Disabled"
		local webfilter_enabled_host = uci:get("hostblock", "config", "enabled") or "0"
		local webfilter_enabled_proxy = uci:get("privoxy", "privoxy", "enabled") or "0"
		if webfilter_enabled_host == "1" or webfilter_enabled_proxy == "1" then
			webfilter_enabled = "1"
		end
		if webfilter_enabled_proxy == "1" then
			status = get_service_state("privoxy")
		end
		if webfilter_enabled_host == "1" then
			status = "Running"
		end

		table.insert(data, { service = "Web Filter", enabled = webfilter_enabled, path = "/services/webfilter/site", status = status })
	end

	if #modem_list > 0 then
		table.insert(services_to_check, { "Email To SMS", "/etc/config/email_to_sms", "pop3", "enabled", "/services/mobile_utilities/sms_gateway/email_to_sms", _, _, true })
		table.insert(services_to_check, { "SMS Utilities", "/etc/config/sms_utils", "rule", "enabled", "/services/mobile_utilities/sms_utilities", _, _, true })
		if call_utilities_support(mdm, modem_list) then
			table.insert(services_to_check, { "Call Utilities", "/etc/config/call_utils", "rule", "enabled", "/services/mobile_utilities/call_utilities", _, _, true })
		end
		add_sms_gateway_services()
	end

	if board_lib:has_usb() and fs.access("/bin/sme.sh") then
		local sme_enabled = util.trim(
			util.ubus("file", "exec", { command = "/bin/sme.sh", params = { "-t" } }).stdout
		) == "expanded" and "1" or "0"
		local status = "Disabled"
		if sme_enabled == "1" then
			status = "Running"
		end
		table.insert(data, {
			service = "Storage Memory Expansion",
			enabled = sme_enabled,
			path = "/system/admin/memory_expansion/usb",
			status = status
		})
	end

	for _, service in ipairs(network_services) do
		add_service_network(unpack(service))
	end
	for _, service in ipairs(services_to_check) do
		add_service(unpack(service))
	end

	return data
end

function Services:GET_TYPE_status()
	return self:ResponseOK(datalist())
end

return Services
