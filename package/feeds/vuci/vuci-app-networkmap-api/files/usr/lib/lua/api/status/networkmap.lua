local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local uci = require "vuci.uci".cursor()
local json = require("luci.jsonc")
local sqlite = require("vuci.sqlite").init()
local ip = require("luci.ip")
local nixio = require("nixio")
local fs = require("nixio.fs")
local board = require("vuci.board")
local pac = require("vuci.package_checker")
local network_lib = require("vuci.network_lib")
local ntm

local MAC_LOOKUP_DOMAIN = "https://api.maclookup.app"
local MAC_LOOKUP_URL = MAC_LOOKUP_DOMAIN .. "/v2/macs/"
local DB_PATH = "/var/run/networkmap/network_scan.db"
local PID_PATH = "/var/run/networkmap/networkmap.pid"
local MAC_PID_PATH = "/var/run/networkmap/networkmap_mac.pid"

local DB_PATH_OLD = "/tmp/network_scan.db"
local PID_PATH_OLD = "/tmp/run/networkmap.pid"
local MAC_PID_PATH_OLD = "/tmp/run/networkmap_mac.pid"

if fs.access(DB_PATH_OLD) then DB_PATH = DB_PATH_OLD end

local devices, interfaces, arp, leases, mac_api_access

local Networkmap = FunctionService:new()

local function get_arp_table()
	arp = {}
	local r, lines = pcall(io.lines, "/proc/net/arp")
	if r then
		for line in lines do
			local ipaddr, macaddr = line:match("(%S+) +%S+ +%S+ +(%S+) +%S+ +%S+")

			if ipaddr ~= "IP" then
				table.insert(arp, {
					ipaddr = ipaddr,
					macaddr = ip.checkmac(macaddr)
				})
			end
		end
	end
end

local function get_dhcpv4_leases()
	leases = {}
	local ipv4leases = util.ubus("dnsmasq", "ipv4leases") or {}
	for _, lease in ipairs(ipv4leases.leases or {}) do
		table.insert(leases, {
			macaddr  = ip.checkmac(lease.mac),
			ipaddr   = lease.address,
		})
	end
end

local function get_ipaddr(mac)
	mac = string.upper(mac)

	for _, l in ipairs(leases) do
		if l.macaddr == mac then
			return l.ipaddr
		end
	end

	for _, a in ipairs(arp) do
		if a.macaddr == mac then
			return a.ipaddr
		end
	end
end

local function get_interfaces()
	ntm = ntm or require("vuci.network").init(uci)
	interfaces = {}

	local protos = { "static", "dhcp", "dhcpv6" }

	for _, iface in ipairs(ntm:get_networks()) do
		local device = iface:ifname()
		local proto = iface:proto()
		local name = iface:is_4_6() and string.sub(iface:name(), 1, -3) or iface:name()
		if device and name ~= "loopback" and util.contains(protos, proto) and network_lib:get_network_type(name, uci) ~= "mobile" then
			local addrs = iface:ipaddrs()
			local addrs_ipv6 = iface:ip6addrs()
			local entry = {
				name = util.network_mapper_get(uci, name),
				proto = proto,
				disabled = uci:get("network", name, "disabled") == "1",
				ip = addrs and #addrs > 0 and addrs[1] or nil,
				ipv6 = addrs_ipv6 and #addrs_ipv6 > 0 and addrs_ipv6[1] or nil,
				status = iface:is_up(),
				device = device,
				type = uci:get("network", name, "area_type"),
				interface = name
			}
			table.insert(interfaces, entry)
		end
	end

	if board:has_wifi() then
		local status = util.ubus("network.wireless", "status") or {}
		uci:foreach("wireless", "wifi-iface", function(s)
			local info = status[s.device] or {}

			local network
			for _, val in ipairs(info.interfaces or {}) do
				if val.section == s[".name"] then
					network = val.ifname
					break
				end
			end

			local entry = {
				name = util.network_mapper_get(uci, s.ssid),
				type = "wifi",
				disabled = s.disabled == "1",
				network = s.network,
				status = network ~= nil,
				device = network,
				interface = s.ssid
			}
			table.insert(interfaces, entry)
		end)
	end

	return interfaces
end

local function get_devices()
	devices = {}
	for _, iface in ipairs(interfaces or get_interfaces()) do
		if iface.device and not util.contains(devices, iface.device) then
			table.insert(devices, iface.device)
		end
	end
	return devices
end

local function fork_wait_execute(params, max_wait_ms, wait_ms)
	local found_pid = false
	util.fork_ubus("networkmap", "scan", { interfaces = params }, 300)
	while not found_pid and max_wait_ms > 0 do
		nixio.nanosleep(0, wait_ms * 1000000)
		found_pid = fs.access(PID_PATH) or fs.access(PID_PATH_OLD) or false
		max_wait_ms = max_wait_ms - wait_ms
	end
	return found_pid
end

local function check_mac_vendor_access()
	mac_api_access = (util.file_exec("/usr/bin/curl", { "-s", "-m", "3", MAC_LOOKUP_DOMAIN }) or {}).code == 0
	return mac_api_access
end

function Networkmap:get_mac_vendor(mac_address)
	if mac_api_access == nil then check_mac_vendor_access() end
	if not mac_api_access then return nil end
	local res = util.file_exec("/usr/bin/curl", { "-s", "-m", "3", MAC_LOOKUP_URL .. mac_address }) or {}
	if res.code ~= 0 then return nil end

	local results = json.parse(res.stdout or "") or {}
	return results.company
end

function Networkmap:load_db()
	local success, db = pcall(sqlite.database, { path = DB_PATH })
	if not success or not db:get_db() then
		return false
	end
	db:busy_timeout(5000)
	return db
end

function Networkmap:start_mac_vendor_lookup()
	if fs.access(MAC_PID_PATH_OLD) then MAC_PID_PATH = MAC_PID_PATH_OLD end
	if fs.access(MAC_PID_PATH) then
		local pid = tonumber(fs.readfile(MAC_PID_PATH))
		if pid and nixio.kill(pid, 0) then
			return false
		else
			fs.remove(MAC_PID_PATH)
		end
	end

	local pid = nixio.fork()
	if pid == 0 then
		local db, rows
		local vendors = {}
		local macs = {}

		if not fs.writefile(MAC_PID_PATH, nixio.getpid()) then
			MAC_PID_PATH = MAC_PID_PATH_OLD
			fs.writefile(MAC_PID_PATH, nixio.getpid())
		end

		-- patch stdin, out, err to /dev/null
		local null = nixio.open("/dev/null", "w+")
		if null then
			nixio.dup(null, nixio.stderr)
			nixio.dup(null, nixio.stdout)
			nixio.dup(null, nixio.stdin)
			if null:fileno() > 2 then
				null:close()
			end
		end

		db = self:load_db()
		if not db then
			fs.remove(MAC_PID_PATH)
			os.exit()
		end

		rows = db:select("SELECT mac_address, MAX(vendor) AS vendor FROM arp_entries GROUP BY mac_address")
		for _, row in ipairs(rows) do
			if row.mac_address and row.vendor then
				vendors[row.mac_address] = row.vendor
			elseif row.mac_address then
				table.insert(macs, row.mac_address)
			end
		end
		db:close()

		for _, mac in ipairs(macs) do
			vendors[mac] = self:get_mac_vendor(mac)
		end

		if self:is_scan_running(120 * 1000, 500) then
			fs.remove(MAC_PID_PATH)
			os.exit()
		end

		db = self:load_db()
		if not db then
			fs.remove(MAC_PID_PATH)
			os.exit()
		end

		rows = db:select("SELECT DISTINCT mac_address FROM arp_entries WHERE vendor IS NULL")
		for _, row in ipairs(rows) do
			local vendor = vendors[row.mac_address]
			if vendor then
				db:insert("UPDATE arp_entries SET vendor = :vendor WHERE mac_address = :mac_address", {
					vendor = vendor,
					mac_address = row.mac_address
				})
			end
		end
		db:close()
		fs.remove(MAC_PID_PATH)
		os.exit()
	elseif pid > 0 then
		return true
	end
	return false
end

function Networkmap:update_latest_scan()
	if fs.access(PID_PATH) or fs.access(PID_PATH_OLD) then
		return
	end

	local db = self:load_db()
	if not db then return end

	local latest_scan = (db:select("SELECT * FROM scan_history ORDER BY id DESC LIMIT 1") or {})[1]
	db:close()
	if latest_scan and latest_scan.stop_time ~= 0 then
		-- Update active devices if 5 minutes have passed from last check
		if latest_scan.update_time + (5 * 60) < os.time() then
			util.ubus("networkmap", "update")
		end
	end
end

function Networkmap:get_scan_results(limit)
	local res = {}
	if not fs.access(DB_PATH) then return res end

	local ifaces = interfaces or get_interfaces()

	local wireless_macs = {}
	local ipv4_leases = {}
	if board:has_wifi() then
		wireless_macs = self:get_wifi_macs()
		for _, lease in ipairs((util.ubus("dnsmasq", "ipv4leases") or {}).leases or {}) do
			ipv4_leases[lease.mac] = lease.address
		end
	end

	self:update_latest_scan()

	local db = self:load_db()
	if not db then return res end

	local scan_query = "SELECT * FROM scan_history ORDER BY id DESC"
	if limit then
		scan_query = scan_query .. " LIMIT " .. tostring(limit)
	end

	local scans = db:select(scan_query)
	for _, scan in ipairs(scans) do
		local data = { results = {} }
		data.start = scan.start_time
		data.stop = scan.stop_time
		data.update = scan.update_time
		data.devices = util.split(scan.iface or "", ",")
		data.ip_ranges = {}
		for _, val in ipairs(util.split(scan.ip_ranges or "", ";") or {}) do
			val = util.split(val or "", ",")
			table.insert(data.ip_ranges, val)
		end

		local entries = db:select("SELECT * FROM arp_entries WHERE scan_id = :id ORDER BY timestamp DESC", {
			id = scan.id
		})
		for _, entry in ipairs(entries) do
			local type = "wired"
			if entry.iface and (entry.iface:match("^wwan") or entry.iface:match("^rmnet") or entry.iface:match("^qmimux")) then
				type = "mobile"
			elseif wireless_macs[entry.mac_address] then
				type = "wifi"
				for _, iface in ipairs(ifaces) do
					if iface.device == wireless_macs[entry.mac_address] then
						entry.iface = iface.interface
						entry.active = ipv4_leases[entry.mac_address] == entry.ip_address and data.update + 1 or entry.active
						break
					end
				end
			else
				for _, iface in ipairs(ifaces) do
					if entry.iface == iface.device and entry.ip_address and ip.new(entry.ip_address) then
						local ipv4_range, ipv6_range
						if iface.ip then
							ipv4_range = ip.new(iface.ip)
						end
						if iface.ipv6 then
							ipv6_range = ip.new(iface.ipv6:gsub("/128$", "/60"))
						end
						if (ipv4_range and ipv4_range:contains(entry.ip_address)) or (ipv6_range and ipv6_range:contains(entry.ip_address)) then
							entry.iface = iface.interface
							break
						end
					end
				end
			end

			local resp_entry = {
				name = util.network_mapper_get(uci, entry.iface),
				ip = entry.ip_address,
				mac = entry.mac_address,
				interface = entry.iface,
				vendor = entry.vendor,
				type = type,
				hostname = entry.hostname,
				port = (entry.port == nil or entry.port == "") and "-" or entry.port,
				active = entry.active >= data.update and "1" or "0"
			}

			if #res > 0 then
				resp_entry.active = nil
			end

			table.insert(data.results, resp_entry)
		end
		table.insert(res, data)
	end
	db:close()
	return res
end

function Networkmap:start_scan(device_ips)
	local iface_params = {}

	if pac.is_installed("vuci-app-network-usage-api") then
		local nlbwmon = uci:get_all("nlbwmon", "@nlbwmon[0]")
		if nlbwmon and nlbwmon.enabled_nmap ~= "1" and nlbwmon.enabled == "0" then
			uci:set("nlbwmon", nlbwmon[".name"], "enabled", "1")
			uci:set("nlbwmon", nlbwmon[".name"], "enabled_nmap", "1")
			uci:commit("nlbwmon")
		end
	end

	for device, ips in pairs(device_ips) do
		local ip_list = {}
		for ip, _ in pairs(ips) do
			table.insert(ip_list, ip)
		end
		table.insert(iface_params, device .. ":" .. table.concat(ip_list, ","))
	end

	if #iface_params > 0 then
		return fork_wait_execute(iface_params, 500, 100)
	end
	return false
end

function Networkmap:get_device_mac()
	local mnf = util.ubus("mnfinfo", "get")
	if mnf and mnf.mnfinfo and mnf.mnfinfo.mac then
		return mnf.mnfinfo.mac:gsub("..", "%1:"):sub(1, -2)
	end
	return nil
end

function Networkmap:get_switch_ports_connections()
	local fs = require("nixio.fs")

	local formatted_connections = {}
	local ports = board:get_tsw_ports()
	local connections = util.ubus("tswconfig.l2", "get_addr")

	for _, port in pairs(ports) do
		local port_connections = {}
		local port_mac = util.trim(fs.readfile("/sys/class/net/"..port.."/address")) or ""
		local port_stat = util.ubus("tswconfig.stats", "get_stats", {port = port}) or {}
		if port_stat and port_stat.link then
			for _, v in pairs(connections and connections.ucast or {}) do
				if v.port_name and v.port_name == port then
					table.insert(port_connections, {
						mac = string.upper(v.mac),
						ipaddr = get_ipaddr(v.mac)
					})
				end
			end
		end
		table.insert(formatted_connections, {
			name = string.upper(port),
			port_mac = string.upper(port_mac),
			topology = #port_connections > 0 and port_connections or nil
		})
	end

	return formatted_connections
end

function Networkmap:get_ports_connections(mac)
	local formatted_connections = {}
	local connections = util.ubus("port_events", "show")

	for _, port in ipairs(connections and connections.ports or {}) do
		local port_connections = {}
		if port.name and port.name:find("LAN") then
			if port.state and port.state == "up" then
				for _, v in pairs(port.topology or {}) do
					if v.MAC then
						table.insert(port_connections, {
							mac = string.upper(v.MAC),
							ipaddr = get_ipaddr(v.MAC)
						})
					end
				end
			end
			table.insert(formatted_connections, {
				name = port.name .. " " .. port.position,
				port_mac = mac,
				topology = #port_connections > 0 and port_connections or nil
			})
		end
	end

	return formatted_connections
end

function Networkmap:get_wifi_macs()
	local macs = {}
	local wifi_devs = util.ubus("iwinfo", "devices")

	for _, dev in ipairs(wifi_devs and wifi_devs.devices or {}) do
		local dev_clients = util.ubus("iwinfo", "assoclist", {device = dev})
		for _, client in pairs(dev_clients and dev_clients.results or {}) do
			if client.mac then
				macs[string.lower(client.mac)] = dev
			end
		end
	end

	return macs
end

function Networkmap:get_wifi_clients()
	local clients = {}
	local wifi_devs = util.ubus("iwinfo", "devices")

	for _, dev in ipairs(wifi_devs and wifi_devs.devices or {}) do
		local dev_clients = util.ubus("iwinfo", "assoclist", {device = dev})
		for _, client in pairs(dev_clients and dev_clients.results or {}) do
			if client.mac then
				table.insert(clients, {
					mac = client.mac,
					ipaddr = get_ipaddr(client.mac)
				})
			end
		end
	end

	return clients
end

function Networkmap:STATUS_sid_exists()
	return true
end

function Networkmap:GET_TYPE_status()
	if self.sid then
		self:ResponseNotFound("Endpoint not implemented")
	end
	self:ResponseOK({ interfaces = interfaces or get_interfaces() })
end

function Networkmap:GET_TYPE_scan()
	if self.sid ~= "status" then
		self:ResponseNotFound("Endpoint not implemented")
	end

	local limit = self.query_parameters.limit
	if limit then
		local valid, err = self.dt:irange(limit, 1, 5)
		if not valid then
			self:add_critical_error(STD_CODES.INVALID_QUERY, err, "Query")
		end
	end
	local results = self:get_scan_results(limit)
	self:start_mac_vendor_lookup()
	self:ResponseOK(results)
end

function Networkmap:GET_TYPE_active()
	if self.sid ~= "status" then
		self:ResponseNotFound("Endpoint not implemented")
	end

	local topology = {}

	topology["device_mac"] = self:get_device_mac()

	get_arp_table()
	get_dhcpv4_leases()

	if board:is_switch() then
		topology["ports"] = self:get_switch_ports_connections()
	else
		topology["ports"] = self:get_ports_connections(topology["device_mac"])
	end

	if board:has_wifi() then
		topology["wifi_clients"] = self:get_wifi_clients()
	end

	self:ResponseOK(topology)
end

function Networkmap:is_scan_running(max_wait_ms, wait_ms)
	max_wait_ms = max_wait_ms or (15 * 1000) -- 15s
	wait_ms = wait_ms or 500

	local found_pid = fs.access(PID_PATH) or fs.access(PID_PATH_OLD) or false
	while found_pid and max_wait_ms > 0 do
		nixio.nanosleep(0, wait_ms * 1000000)
		found_pid = fs.access(PID_PATH) or fs.access(PID_PATH_OLD) or false
		max_wait_ms = max_wait_ms - wait_ms
	end
	return found_pid
end

local start_scan = Networkmap:action("start_scan", function (self)
	local data = self.arguments.data
	local data_devices = data.device

	if self:is_scan_running() then
		self:add_critical_error(1, "Scan is already running")
	end

	local device_ips = {}
	for _, device in ipairs(data_devices) do
		local ip_device, ip_cidr = device:match("([^:]+):(.+)")
		device_ips[ip_device] = device_ips[ip_device] or {}
		device_ips[ip_device][ip_cidr] = true
	end

	local status = self:start_scan(device_ips)
	return self:ResponseOK({ started = status })
end)
	local device = start_scan:option("device", { list = true })
	device.require = true
	function device:validate(value)
		local device, cidr = value:match("([^:]+):(.+)")
		if not device then
			return false, "Device name with IPv4 address and netmask is accepted. E.g. br-lan:192.168.1.0/24"
		end

		local valid, err = self.dt:check_array(device, devices or get_devices())
		if not valid then return valid, err end

		valid, err = self.dt:cidr4(cidr)
		if not valid then
			valid, err = self.dt:cidr6(cidr)
			if not valid then
				return false, "IPv4 and IPv6 addresses with netmask are accepted. E.g 192.168.1.0/24."
			end
		end

		return true
	end

-- DEPRECATED
local nscan = Networkmap:action("devices_scan", function (self)
	local data = self.arguments.data
	local scan_type = data.scan_type ~= "all" and data.scan_type or nil

	if self:is_scan_running() then
		self:add_critical_error(1, "Scan is already running")
	end

	local ifaces = interfaces or get_interfaces()
	local device_ips = {}
	for _, iface in ipairs(ifaces) do
		if iface.device and iface.ip and ((scan_type and iface.type == scan_type) or not scan_type) then
			device_ips[iface.device] = device_ips[iface.device] or {}
			device_ips[iface.device][iface.ip] = true
			if iface.ipv6 then
				device_ips[iface.device][iface.ipv6] = true
			end
		end
	end
	local started = self:start_scan(device_ips)
	local data_devices = {}
	if started then
		if self:is_scan_running(300 * 1000, 500) then
			self:add_critical_error(2, "Timeout occured getting scan results.")
		end

		local results = self:get_scan_results(1)
		data_devices = #results > 0 and results[1].results or {}
		self:start_mac_vendor_lookup()
	end
	return self:ResponseOK({ devices = data_devices })
end)
	local scan_type = nscan:option("scan_type")
	scan_type.require = true
	function scan_type:validate(value)
		local types = { "wan", "lan", "all" }
		return self.dt:check_array(value, types)
	end

return Networkmap
