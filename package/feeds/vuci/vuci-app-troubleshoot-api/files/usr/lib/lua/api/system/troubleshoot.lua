local util = require "vuci.util"
local fs = require("nixio.fs")
local pac = require("vuci.package_checker")
local ConfigService = require("api/ConfigService")
local usb = require("vuci/usb")

local function get_interfaces(self)
	local ntm = require("vuci.network").init(self.uci)
	local board = require("vuci.board")
	local exclude_cpu_iface = board:has_dsa() or board:is_switch()

	local interfaces = {}
	local ifaces = ntm:get_interfaces()
	for _, iface in ipairs(ifaces) do
		if iface:is_up() and not interfaces[iface:name()] and (iface:name() ~= "eth0" or not exclude_cpu_iface) then
			table.insert(interfaces, iface:name())
		end
	end

	return interfaces
end

local flags = {
	create = false,
	delete = false,
	general_section = "system"
}

local troubleshoot = ConfigService:new(flags)

	local system = troubleshoot:section("system", "system")
if pac.is_installed("tcpdump") then
		local tcp_dump = system:option("tcp_dump")
		tcp_dump.require = { ["1"] = { "tcp_dump_interface", "tcp_inout", "tcp_mount" } }
			function tcp_dump:validate(value)
				return self.dt:is_bool(value)
			end
			function tcp_dump:get(value)
				return value or "0"
			end

		local tcp_dump_interface = system:option("tcp_dump_interface")
			function tcp_dump_interface:validate(value)
				local interfaces = get_interfaces(self)
				table.insert(interfaces, "any")
				return self.dt:check_array(value, interfaces)
			end

		local tcp_dump_filter = system:option("tcp_dump_filter")
			function tcp_dump_filter:validate(value)
				return self.dt:check_array(value, { "icmp", "tcp", "udp", "arp" })
			end

		local tcp_inout = system:option("tcp_inout")
			function tcp_inout:validate(value)
				return self.dt:check_array(value, { "inout", "in", "out" })
			end

		local tcp_host = system:option("tcp_host")
			function tcp_host:validate(value)
				return self.dt:host(value)
			end

		local tcp_port = system:option('tcp_port')
			function tcp_port:validate(value)
				return self.dt:port(value)
			end

		local tcp_mount = system:option("tcp_mount")
			function tcp_mount:validate(value)
				local available_mount_points = usb:mount_points()
				table.insert(available_mount_points, "/tmp")
				return self.dt:check_array(value, available_mount_points)
			end
end

function troubleshoot:GET_TYPE_system()
	if self.sid ~= "status" then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end
	return self:ResponseOK(util.exec("logread"))
end

function troubleshoot:GET_TYPE_kernel()
	if self.sid ~= "status" then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end
	local resp = util.ubus("rpc-sys-ext", "dmesg")
	self:ResponseOK(resp and resp.exit_code == "0" and resp.output or "")
end

function troubleshoot:generate_troubleshoot()
	local hostname = self:table_get("system", "system", "hostname")
	hostname = hostname and "-" .. hostname or ""
	local encrypt = self.arguments.data and self.arguments.data.encrypt == "1"
	local password = self.arguments.data and self.arguments.data.password
	util.ubus("rpc-sys-ext", "troubleshoot", { pass = encrypt and password or nil }, 600)
	return self:ResponseOK()
end

local down = troubleshoot:action("download", function (self)
	local hostname = self:table_get("system", "system", "hostname")
	hostname = hostname and "-" .. hostname or ""

	if self.arguments.data.type == "troubleshoot" then
		local path = "/tmp/troubleshoot.tar.gz"
		if fs.access(path, "rw") then
			return self:File(path, "troubleshoot%s-%s.tar.gz" % { hostname, os.date("%Y-%m-%d") }, nil, true)
		end
		local encrypted_path = "/tmp/troubleshoot.tar.zip"
		if fs.access(encrypted_path, "rw") then
			return self:File(encrypted_path, "troubleshoot%s-%s.tar.zip" % { hostname, os.date("%Y-%m-%d") }, nil, true)
		end
		self:ResponseNotFound("Troubleshoot not found.")
	end
	if self.arguments.data.type == "tcpdump" then
		local tcp_tar = "/tmp/tcpdebug.tar.gz"
		util.ubus("rc", "init", { action = "stop", name = "tcpdebug" })

		local tcpdump_enabled = self:table_get("system", "system", "tcp_dump") or "0"
		if tcpdump_enabled == "0" then
			self:add_critical_error("1", "TCP dump is not enabled", "Validation")
		end

		local output = self:table_get("system", "system", "tcp_mount")
		if not output then
			self:add_critical_error("2", "No TCP dump file location specified", "Validation")
		end

		local location = util.shellquote(output .. "/tcpdebug.pcap")

		os.execute("/bin/tar -zcf %s %s" % { tcp_tar, location })

		util.ubus("rc", "init", { action = "start", name = "tcpdebug" })
		return self:File(tcp_tar, "tcpdebug%s-%s.tar.gz" % { hostname, os.date("%Y-%m-%d") }, nil, true)
	end
end)
	local opt_type = down:option("type")
	function opt_type:validate(value)
		local values = { "troubleshoot" }
		if pac.is_installed("tcpdump") then
			table.insert(values, "tcpdump")
		end
		return self.dt:check_array(value, values)
	end

local files = troubleshoot:action("generate", troubleshoot.generate_troubleshoot)
	local password = files:option("password")
	function password:validate(value)
		local valid, err = self.dt:root_password(value)
		if not valid then return valid, err end
		return self.dt:default_validation(value)
	end
	local opt_files_encrypt = files:option("encrypt")
	function opt_files_encrypt:validate(value)
		local valid, msg = self.dt:is_bool(value)
		if not valid then return false, msg end
		if value ~= "1" then return true end
		if not self.arguments.data.password or #self.arguments.data.password < 1 then
			return false,"Missing required field: password"
		end
		return valid, msg
	end

return troubleshoot
