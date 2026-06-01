local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local util = require("vuci.util")
local board = require("vuci.board")
local firewall_lib = require("api.network.firewall.firewall_lib")

local PROTOCOL_TCP = "0"
local PROTOCOL_UDP = "1"

local OverIP = ConfigService:new({ increment_name = true })

local MEGABYTE = 1000 * 1000

if not serial:check_device_serial() then
	return nil
end

local MSG_CODES = {
	DEPRECATED_TLS = 1,
}

function OverIP:after_data_hook()
	local version = self:get_abs_value(self.config, self.sid, "tls_version")
	if version == "tlsv1.1" or version == "tlsv1.0" or version == "dtlsv1.0" then
		self:add_message(MSG_CODES.DEPRECATED_TLS, "TLS 1.0 and TLS 1.1 are deprecated and considered insecure. Please upgrade to a newer TLS version.", "tls_version")
	end
end
OverIP.PUT_after_data_hook = OverIP.after_data_hook
OverIP.GET_after_data_hook = OverIP.after_data_hook
OverIP.POST_after_data_hook = OverIP.after_data_hook

local s = OverIP:section("rs_overip", "overip")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local device = s:option("device")
	device.cfg_require = true
		function device:validate(value)
			if value:find("usb") then
				if self:table_get(self.config, self.sid, "device") == value then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "device", "baudrate", "databits", "stopbits", "parity", "flowcontrol", "mode", "protocol" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 200

	local baudrate = s:option("baudrate")
		function baudrate:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_baudrates(serial_device))
		end

	local databits = s:option("databits")
		function databits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_databits(serial_device))
		end

	local stopbits = s:option("stopbits")
		function stopbits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_stopbits(serial_device))
		end

	local parity = s:option("parity")
		function parity:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_parity(serial_device))
		end

	local flow_control = s:option("flowcontrol")
		function flow_control:validate(value)
			local validated_opts = serial:validate_flowcontrol(self)
			return self.dt:check_array(value, validated_opts)
		end

	serial.append_duplex_option(s)

	local protocol = s:option("protocol")
		function protocol:validate(value)
			return self.dt:is_bool(value) -- 0 is TCP, 1 is UDP
		end

	local raw = s:option("raw")
		function raw:validate(value)
			return self.dt:is_bool(value)
		end

	local mode = s:option("mode")
		mode.require = {
			["bidirect"] = { "address_connect", "port_listen" },
			["client_server"] = { "address_connect", "port_listen" },
			["client"] = { "address_connect" },
			["server"] = { "port_listen" }
		}
		function mode:validate(value)
			local mode_options = { "server", "client", "bidirect", "client_server" }
			return self.dt:check_array(value, mode_options)
		end

	local no_zeros = s:option("remove_all_zeros")
		function no_zeros:validate(value)
			return self.dt:is_bool(value)
		end

	local server_address = s:option("address_connect", { list = true })
	server_address.list_length = 16
		function server_address:validate(value)
			return self:host_with_port(value)
		end

	local timeout = s:option("timeout")
		function timeout:validate(value)
			if self:get_abs_value(self.config, self.sid, "mode") == "server" and self:get_abs_value(self.config, self.sid, "protocol") ~= "0" then
				return false, "Timeout is not available on server instance with TCP protocol."
			end
			return self.dt:irange(value, 0, 36000)
		end

	local read_duration = s:option("read_duration")
		function read_duration:validate(value)
			return self.dt:irange(value, 0, 1000)
		end

	local echo = s:option("echo_enabled")
		function echo:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			local duplex_value = self:get_abs_value(self.config, self.sid, "full_duplex_enabled")
			if value == "1" and not serial_device:find("rs232") and not (serial_device:find("rs485") and duplex_value == "1") then
				return false, "Echo is only available on RS232 device or RS485 with full_duplex_enabled option enabled."
			end
			return self.dt:is_bool(value)
		end

	local max_clients = s:option("max_clients")
		function max_clients:validate(value)
			return self.dt:irange(value, 1, 32)
		end

	local close_connections = s:option("close_connections")
		function close_connections:validate(value)
			return self.dt:is_bool(value)
		end
		function close_connections:set(value)
			self:table_set(self.config, self.sid, "always_reconnect", value)
		end
		function close_connections:get(value)
			return self:table_get(self.config, self.sid, "always_reconnect", value)
		end

	local connect_on_data = s:option("connect_on_data")
		function connect_on_data:validate(value)
			return self.dt:is_bool(value)
		end

	local max_connection_attempts = s:option("max_connection_attempts")
		function max_connection_attempts:validate(value)
			return self.dt:irange(value, 1, 24)
		end

	local reconnect_interval = s:option("recon_interval")
		function reconnect_interval:validate(value)
			return self.dt:uinteger(value)
		end

	local keep_alive_enabled = s:option("keepalive_enabled")
		keep_alive_enabled.require = {
			["1"] = { "keepalive_time", "keepalive_interval", "keepalive_probes" }
		}
		function keep_alive_enabled:validate(value)
			if self:get_abs_value(self.config, self.sid, "protocol") ~= PROTOCOL_TCP then
				return false, "Option is only available with TCP protocol."
			end
			return self.dt:is_bool(value)
		end

	local keep_alive_time = s:option("keepalive_time")
		function keep_alive_time:validate(value)
			if self:get_abs_value(self.config, self.sid, "protocol") ~= PROTOCOL_TCP then
				return false, "Option is only available with TCP protocol."
			end
			local min_value = 0
			if self.current_data_block.keepalive_enabled then
				min_value = 1
			end
			-- REMOVE_WITH_VERSION_UPGRADE: Make the minimum allowed value 1
			return self.dt:irange(value, min_value, 32000)
		end

	local keep_alive_interval = s:option("keepalive_interval")
		function keep_alive_interval:validate(value)
			if self:get_abs_value(self.config, self.sid, "protocol") ~= PROTOCOL_TCP then
				return false, "Option is only available with TCP protocol."
			end
			local min_value = 0
			if self.current_data_block.keepalive_enabled then
				min_value = 1
			end
			-- REMOVE_WITH_VERSION_UPGRADE: Make the minimum allowed value 1
			return self.dt:irange(value, min_value, 32000)
		end

	local keep_alive_probes = s:option("keepalive_probes")
		function keep_alive_probes:validate(value)
			if self:get_abs_value(self.config, self.sid, "protocol") ~= PROTOCOL_TCP then
				return false, "Option is only available with TCP protocol."
			end
			local min_value = 0
			if self.current_data_block.keepalive_enabled then
				min_value = 1
			end
			-- REMOVE_WITH_VERSION_UPGRADE: Make the minimum allowed value 1
			return self.dt:irange(value, min_value, 32000)
		end

	local port_listen = s:option("port_listen")
		function port_listen:validate(value)
			return self.dt:port(value)
		end

	local tcp_echo = s:option("tcp_echo_enabled")
		function tcp_echo:validate(value)
			return self.dt:is_bool(value)
		end

	local cd_enable = s:option("cd_enable")
		function cd_enable:validate(value)
			if board:has_rs232_control() then
				return self.dt:is_bool(value)
			else
				return false, "Option is only available on RS232 devices."
			end
		end

	local dsr_enable = s:option("dsr_enable")
		function dsr_enable:validate(value)
			if board:has_rs232_control() then
				return self.dt:is_bool(value)
			else
				return false, "Option is only available on RS232 devices."
			end
		end

	local cd_invert = s:option("cd_invert")
		function cd_invert:validate(value)
			if board:has_rs232_control() then
				return self.dt:is_bool(value)
			else
				return false, "Option is only available on RS232 devices."
			end
		end

	local dsr_invert = s:option("dsr_invert")
		function dsr_invert:validate(value)
			if board:has_rs232_control() then
				return self.dt:is_bool(value)
			else
				return false, "Option is only available on RS232 devices."
			end
		end

	local predefined_address = s:option('predefined_address', { list = true })
		predefined_address.list_length = 16
		function predefined_address:validate(value)
			return self:host_with_port(value)
		end

--------- TLS options

	local opt_use_tls_ssl = s:option("use_tls")
	opt_use_tls_ssl.require = { ["1"] = { "tls_version", "tls_type" } }
		function opt_use_tls_ssl:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_tls_version = s:option("tls_version")
		function opt_tls_version:validate(value)
			local options
			if self:get_abs_value(self.config, self.sid, "protocol") == "1" then
				options = { "dtlsv1.0", "dtlsv1.2", "all" }
			else
				options = { "tlsv1.0", "tlsv1.1", "tlsv1.2", "tlsv1.3", "all" }
			end
			return self.dt:check_array(value, options)
		end

	local opt_tls_type = s:option("tls_type")
	opt_tls_type.require = { ["psk"] = { "psk", "identity" } }
		function opt_tls_type:validate(value)
			return self.dt:check_array(value, { "cert", "psk" })
		end

	local opt_require_certificate = s:option("require_certificate")
	opt_require_certificate.require = { ["1"] = { "ca_file" } }
		function opt_require_certificate:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_verify_host = s:option("verify_host")
		function opt_verify_host:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_identity = s:option("identity")
		function opt_identity:validate(value)
			return self.dt:uciname(value)
		end

	local opt_psk = s:option("psk", { sensitive = true })
		opt_psk.maxlength = 128
		function opt_psk:validate(value)
			local ok, err = self.dt:no_prefix("0x", value)
			if not ok then return ok, err end
			return self.dt:hexstring(value)
		end

	local device_sec_files = s:option("device_sec_files")
		function device_sec_files:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_cert_file = s:option("cert_file", {file = true})
	opt_cert_file.file_size = 16 * MEGABYTE

	local opt_key_file = s:option("key_file", {file = true})
	opt_key_file.file_size = 16 * MEGABYTE

	local opt_ca_file = s:option("ca_file", {file = true})
	opt_ca_file.file_size = 16 * MEGABYTE

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function OverIP:GET_TYPE_status()
	local res = {}

	local overip_service = util.ubus("service", "list", { name = "rs_overip" })
	if overip_service and overip_service.rs_overip and overip_service.rs_overip.instances then
		local instances_by_sid = {}
		for _, instance in pairs(overip_service.rs_overip.instances) do
			instance.exit_code = instance.exit_code ~= 0 and instance.exit_code or nil
			instances_by_sid[instance.command[3]] = instance
		end
		self:table_foreach(self.main_config, "overip", function(s)
			if s.enabled == "1" then
				local sid = s[".name"]
				local dev = s.device:match(".*/dev/(.*)")
				local data = util.ubus("overip." .. dev, "status") or {}
				data.error_code = instances_by_sid[sid] and instances_by_sid[sid].exit_code
				data.section = sid
				table.insert(res, data)
			end
		end)
	end

	return self:ResponseOK(res)
end

-- End of status

function OverIP:list_overip_rules()
	return firewall_lib:list_rules(self, "overip", self.sid)
end

function OverIP:is_mode_client(mode)
	return mode == "bidirect" or mode == "client" or mode == "client_server"
end

function OverIP:is_mode_server(mode)
	return mode == "bidirect" or mode == "server" or mode == "client_server"
end

function OverIP:set_section_opt(opt, value)
	return self:table_set(self.main_config, self.sid, opt, value)
end

function OverIP:delete_section_opt(opt)
	return self:table_delete(self.main_config, self.sid, opt)
end

function OverIP:get_section_abs_opt(opt)
	return self:get_abs_value(self.main_config, self.sid, opt)
end

function OverIP:validate_tls_options()
	local use_tls = self:get_section_abs_opt("use_tls")
	if use_tls ~= "1" then
		self:delete_section_opt("tls_type")
		self:delete_section_opt("tls_version")
	end

	local tls_type = self:get_section_abs_opt("tls_type")
	if not (tls_type == "psk" and use_tls == "1") then
		self:delete_section_opt("psk")
		self:delete_section_opt("identity")
	end
	if not (tls_type == "cert" and use_tls == "1") then
		self:delete_section_opt("key_file")
		self:delete_section_opt("cert_file")
		self:delete_section_opt("ca_file")
		self:delete_section_opt("require_certificate")
		self:delete_section_opt("verify_host")
		self:delete_section_opt("device_sec_files")
	end

	if use_tls == "1" then
		local mode = self:get_section_abs_opt("mode")
		if self:is_mode_server(mode) and tls_type == "cert" then
			opt_cert_file.cfg_require = true
			opt_key_file.cfg_require = true
		end
	end
end

function OverIP:validate_device()
	local device = self:get_section_abs_opt("device")
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
	if self.request_method == "PUT" then
		if string.find(device or "", "usb") then
			serial:assert_device_is_connected(self, device)
		elseif not board:has_rs232_control() then
			self:delete_section_opt("cd_enable")
			self:delete_section_opt("cd_invert")
			self:delete_section_opt("dsr_enable")
			self:delete_section_opt("dsr_invert")
		end

		if not device:find("rs232") and not (device:find("rs485") and self:get_section_abs_opt("full_duplex_enabled") == "1") then
			self:delete_section_opt("echo_enabled")
		end

		if self:get_section_abs_opt("protocol") ~= PROTOCOL_TCP then
			self:delete_section_opt("keepalive_enabled")
		end

		-- REMOVE_WITH_VERSION_UPGRADE: Uncomment code
		-- if self:get_section_abs_opt("keepalive_enabled") ~= "1" then
		-- 	self:delete_section_opt("keepalive_time")
		-- 	self:delete_section_opt("keepalive_interval")
		-- 	self:delete_section_opt("keepalive_probes")
		-- end
	end

	local mode = self:get_section_abs_opt("mode")
	local destination_address = self:get_section_abs_opt("address_connect")
	local connect_on_data = self:get_section_abs_opt("connect_on_data")
	local close_connections = self:get_section_abs_opt("close_connections") or self:get_section_abs_opt("always_reconnect")
	if close_connections == "1" and connect_on_data == "1" then
		return self:add_critical_error(STD_CODES.INVALID_OPT, "Connect on data and Close connections cannot be enabled at the same time")
	end
	if mode then
		if mode == "bidirect" and #destination_address > 1 then
			return self:add_critical_error(STD_CODES.INVALID_OPT, "Only one destination address is allowed with Bidirect mode")
		end
		if mode ~= "server" and connect_on_data == "1" and #destination_address > 1 then
			return self:add_critical_error(STD_CODES.INVALID_OPT, "Only one destination address is allowed with connect on data enabled")
		end
	end
end

function OverIP:validate_firewall_rules()
	local firewall_rules = self:list_overip_rules()

	local mode = self:get_section_abs_opt("mode")
	if mode then
		local is_enabled = self.current_data_block["enabled"] and self.current_data_block["enabled"] or "0"
		if is_enabled and mode ~= "client" then
			for _, rule in ipairs(firewall_rules) do
				self:table_set("firewall", rule, "enabled", is_enabled)
			end
		elseif mode == "client" then
			for _, rule in ipairs(firewall_rules) do
				self:table_set("firewall", rule, "enabled", "0")
			end
		end
	end

	local proto = self:get_section_abs_opt("protocol") == PROTOCOL_TCP and "tcp" or "udp"
	local dest_port = self:get_section_abs_opt("port_listen")
	for _, rule in ipairs(firewall_rules) do
		self:table_set("firewall", rule, "proto", proto)

		if dest_port then
			self:table_set("firewall", rule, "dest_port", dest_port)
		end
	end
end

-- REMOVE_WITH_VERSION_UPGRADE: Remove function ':keepalive_enable_workaround()'
function OverIP:keepalive_enable_workaround()
	if not self.current_data_block.keepalive_enabled then
		local keepalive_time     = self:get_section_abs_opt("keepalive_time")
		local keepalive_interval = self:get_section_abs_opt("keepalive_interval")
		local keepalive_probes   = self:get_section_abs_opt("keepalive_probes")

		local is_time_non_zero     = keepalive_time     and keepalive_time     ~= "0"
		local is_interval_non_zero = keepalive_interval and keepalive_interval ~= "0"
		local is_probes_non_zero   = keepalive_probes   and keepalive_probes   ~= "0"

		if is_time_non_zero or is_interval_non_zero or is_probes_non_zero then
			self:set_section_opt("keepalive_enabled", "1")
		else
			self:set_section_opt("keepalive_enabled", "0")
		end
	end

end

function OverIP:UPDATE_validate_section_hook()
	if self.current_data_block.device == "/dev/mbus" then
		local duplicate_mbus = false
		self:table_foreach(self.config, "overip", function(section)
			if section.device == "/dev/mbus" and section[".name"] ~= self.sid then
				duplicate_mbus = true
				return false
			end
		end)

		if duplicate_mbus then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Only a single configuration can use '/dev/mbus' device", "device")
		end
	end

	self:validate_device()
	self:validate_firewall_rules()
	self:validate_tls_options()
	self:keepalive_enable_workaround()
end
OverIP.PUT_after_validate_section_hook = OverIP.UPDATE_validate_section_hook
OverIP.POST_after_validate_section_hook = OverIP.UPDATE_validate_section_hook

function OverIP:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	local v_table = upload_request.parameters

	if v_table.option == "ca_file" or v_table.option == "cert_file" or v_table.option == "key_file" then
		local certs = require("vuci.certificates")
		local valid = certs:validate_cert(path)
		if valid ~= 0 then os.remove(path) end
		if valid == 1 then self:add_critical_error(2, "Incorrect file uploaded.", "Upload") end
		if valid == 2 then self:add_critical_error(4, "File does not exist.", "Upload") end
	end
	util.set_file_permissions(path, "sodog")
	return { path = path }
end


function OverIP:DELETE_before_section_delete_hook()
	for _, rule in ipairs(self:list_overip_rules()) do
		self:table_delete("firewall", rule)
	end
end

function OverIP:host_with_port(value)
	local errmsg = "Domain names or IP addresses accepted. E.g. 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com."

	local lastIndex = string.find(value:reverse(), ":", 1, true)
	if lastIndex == nil then return false, errmsg end

	local port = string.sub(value, -lastIndex + 1)
	local addr = string.sub(value, 1, -lastIndex -1)
	local ok, err = self.dt:port(port)
	if not ok then return ok, err end
	return self.dt:host(addr)
end

return OverIP
