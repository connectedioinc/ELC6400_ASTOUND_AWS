local ConfigService = require("api/ConfigService")
local ac = require("vuci.access")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local pac = require("vuci.package_checker")
local fs = require("nixio.fs")
local ac_util = require("api.system.access_control_utils")
local api_utils = require("api/api_utils")
local ntm

local WEBUI = ConfigService:new({
	create = false,
	delete = false,
	general_section = "main"
})

local ERROR_CODES = {
	INCORRECT_FILE = 2,
	WEAK_CERT_RSA = 3,
	WEAK_CERT_ECC = 4,
	CERT_KEY_MISSMATCH = 5,
}

function WEBUI:set_protocol(protocol, enabled, wan_access)
	local port, wan_port = {}, {}
	ac_util.parse_webui_ports(port, self:getter_wrapped_abs_value(self.config, self.sid, "listen_" .. protocol), true)
	ac_util.parse_webui_ports(wan_port, self:getter_wrapped_abs_value(self.config, self.sid, "wan_listen_" .. protocol), true)

	local value = enabled and "1" or "0"
	if ac_util.has_wan then
		if enabled or wan_access then
			value = "1"
		end
		if enabled then
			local rule_ports = {}
			if wan_access then
				for _, v in ipairs(wan_port) do
					if not util.contains(port, v) then
						table.insert(rule_ports, v)
					end
				end
			end
			if #rule_ports > 0 then
				ac_util.add_firewall_rule(self, string.upper(protocol), rule_ports)
			else
				ac_util.delete_rule_by_name(self, string.upper(protocol))
			end
		elseif wan_access then
			for _, v in ipairs(wan_port) do
				if not util.contains(port, v) then
					table.insert(port, v)
				end
			end
			ac_util.add_firewall_rule(self, string.upper(protocol), port)
		else
			ac_util.delete_rule_by_name(self, string.upper(protocol))
		end
	end
	self:table_set(self.config, self.sid, "enable_" .. protocol, value)
end

function WEBUI:find_duplicate_ports(bindings)
	local seen_ports = {}
	local seen_ip_ports = {}
	local duplicates = {}

	for _, binding in ipairs(bindings) do
		local ip, port = binding:match("^([^:]+):?(%d*)$")
		if ip and port == "" then
			port = ip
			if seen_ports[port] or seen_ip_ports[port] then
				duplicates[port] = true
			end
			seen_ports[port] = true
		elseif ip and port then
			if seen_ip_ports[port] == ip or seen_ports[port] then
				duplicates[port] = true
			end
			seen_ip_ports[port] = ip
		end
	end

	return duplicates
end

function WEBUI:validate_duplicate_ports(http_opt, https_opt)
	local used_listen = {}
	ac_util.parse_webui_ports(used_listen, self:getter_wrapped_abs_value(self.config, self.sid, http_opt))
	ac_util.parse_webui_ports(used_listen, self:getter_wrapped_abs_value(self.config, self.sid, https_opt))

	local duplicates = self:find_duplicate_ports(used_listen)
	for port in pairs(duplicates) do
		self:add_error(STD_CODES.INVALID_SECTION, "Port " .. port .. " is already in use", "Validation")
	end
	self:return_if_error()

	for _, value in ipairs(used_listen) do
		local port = value:match(":(.*)") or value
		if not ac_util.check_port_availability(self, port) then
			self:add_critical_error(STD_CODES.INVALID_SECTION, "Port " .. port .. " is already used in another service", "Validation")
		end
	end
end

local function is_table_empty_values(t)
	if type(t) ~= "table" then return false end
	if type(next(t)) == "nil" then return true end
	for _, v in ipairs(t) do
		if v ~= "" and v ~= nil then
			return false
		end
	end
	return true
end

function WEBUI:PUT_after_data_hook()
	local function abs_value(cfg_name, opt_name)
		local data = self.current_data_block or {}
		return data[opt_name] or self:table_get(self.config, self.sid, cfg_name)
	end

	local http_enabled = abs_value("enable_local_http", "enable_http") or self:table_get(self.config, self.sid, "enable_http")
	local https_enabled = abs_value("enable_local_https", "enable_https") or self:table_get(self.config, self.sid, "enable_https")

	local wan_listen_http = self:getter_wrapped_abs_value(self.config, self.sid, "wan_listen_http")
	if is_table_empty_values(wan_listen_http) then
		self:table_delete(self.config, self.sid, "wan_listen_http")
	end
	local wan_listen_https = self:getter_wrapped_abs_value(self.config, self.sid, "wan_listen_https")
	if is_table_empty_values(wan_listen_https) then
		self:table_delete(self.config, self.sid, "wan_listen_https")
	end

	self:validate_duplicate_ports("listen_http", "listen_https")
	if ac_util.has_wan then
		self:validate_duplicate_ports("wan_listen_http", "wan_listen_https")

		local http_port = {}
		local https_port = {}
		ac_util.parse_webui_ports(http_port, self:getter_wrapped_abs_value(self.config, self.sid, "wan_listen_http") or self:getter_wrapped_abs_value(self.config, self.sid, "listen_http"), true)
		ac_util.parse_webui_ports(https_port, self:getter_wrapped_abs_value(self.config, self.sid, "wan_listen_https") or self:getter_wrapped_abs_value(self.config, self.sid, "listen_https"), true)
		local http_wan_access = abs_value("_httpWanAccess", "http_wan_access") == "1"
		local http_enable_rule = http_wan_access and #http_port > 0
		ac.add_wan_rule(self.uci, http_port, http_enable_rule and "" or "0", "HTTP")
		local https_wan_access = abs_value("_httpsWanAccess", "https_wan_access") == "1"
		local https_enable_rule = https_wan_access and #https_port > 0
		ac.add_wan_rule(self.uci, https_port, https_enable_rule and "" or "0", "HTTPS")

		self:set_protocol("http", http_enabled=="1", http_wan_access)
		self:set_protocol("https", https_enabled=="1", https_wan_access)
	else
		self:table_set(self.config, self.sid, "enable_http", http_enabled)
		self:table_set(self.config, self.sid, "enable_https", https_enabled)
	end
end
if ac_util.has_wan then
	function WEBUI:update_dmz_redirect(redirect_name, value)
		self:table_foreach("firewall", "redirect", function(s)
			if s.name == redirect_name then
				self:table_set("firewall", s[".name"], "enabled", value == "1" and "" or "0")
				return false
			end
		end)
	end

	function WEBUI:PUT_section_init_hook()
		self:table_foreach("firewall", "redirect", function(s)
			if s.name == "dmz_fw" and (not s.enabled or s.enabled == "1") then
				self.DMZ_enabled = true
				return false
			end
		end)
	end

	function WEBUI:PUT_before_commit_hook()
		ac.setup_dmz_redirects(self)
	end

	function WEBUI:PUT_after_commit_hook()
		local no_key_change = self.current_data_block.key == self:table_get(self.config, self.sid, "key")
		local no_cert_change = self.current_data_block.cert == self:table_get(self.config, self.sid, "cert")
		-- When certificates are different but names
		-- are the same manual uhttpd reload is needed
		-- for correct certificates to be used.
		-- uhttpd init file is comparing the contents
		if no_key_change or no_cert_change then
			util.ubus("service", "event", { type = "config.change", data = { package = self.config } })
		end
	end
end

function WEBUI:listen_validation(value)
	local hint = "Port with/without IP address is required E.g 80 or 192.168.1.1:80."
	local split = util.split(value, ":")
	if #split == 1 then return self.dt:port(split[1]), hint end
	if #split ~= 2 then return false, hint end

	local ip_addr, port = split[1], split[2]

	local valid = self.dt:ip4addr(ip_addr)
	if not valid then return valid, hint end

	valid = self.dt:port(port)
	if not valid then return valid, hint end

	local valid_ips = {}
	ntm = ntm or require("vuci.network").init(self.uci)
	for _, iface in ipairs(ntm:get_networks()) do
		local name = iface:name()
		if name and name ~= "loopback" then
			for _, ip in ipairs(iface:ipaddrs()) do
				table.insert(valid_ips, util.split(ip, "/")[1])
			end
		end
	end

	if ip_addr ~= "0.0.0.0" and not util.contains(valid_ips, ip_addr) then
		return false, "Can not bind to specified IP address"
	end

	return true
end

function WEBUI:set_ports(value)
	local ports = {}
	local is_array = api_utils:is_array(value)
	if not is_array and type(value) == "table" then
		if #value ~= 0 then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Invalid option format, object is not allowed.", self.api_key)
		end
	elseif not is_array then
		table.insert(ports, value and value:match(":(.*)") or value)
		self:table_set(self.config, self.sid, self.api_key, value)
	else
		value = value or {}
		if #value > 64 then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Maximum number of 64 values are allowed", self.api_key)
		end
		for _, val in ipairs(value) do
			if val == "" then
				self:add_critical_error(STD_CODES.INVALID_OPT, "Option can not have empty values", self.api_key)
			end
			table.insert(ports, val and val:match(":(.*)") or val)
		end
		self:table_set(self.config, self.sid, self.api_key, value)
	end
end

local WEBUIGeneral = WEBUI:section("uhttpd", "uhttpd")

function WEBUIGeneral:filter(options)
	return options[".name"] == "main"
end

	local opt_enable_http = WEBUIGeneral:option("enable_http")
		function opt_enable_http:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enable_http:set(value) self:table_set(self.config, self.sid, "enable_local_http", value) end
		function opt_enable_http:get()
			return self:table_get(self.config, self.sid, "enable_local_http") or self:table_get(self.config, self.sid, "enable_http")
		end
	local opt_enable_https = WEBUIGeneral:option("enable_https")
		function opt_enable_https:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enable_https:set(value)
			self:table_set(self.config, self.sid, "enable_local_https", value)
			if value ~= "1" then -- Disable https redirect and basic auth on https disable
				self:table_set(self.config, self.sid, "redirect_https", "0")
				self:table_set(self.config, self.sid, "enable_basic_auth", "0")
			end
		end
		function opt_enable_https:get()
			return self:table_get(self.config, self.sid, "enable_local_https") or self:table_get(self.config, self.sid, "enable_https")
		end

	local opt_redirect_https = WEBUIGeneral:option("redirect_https")
		function opt_redirect_https:validate(value)
			if value == "1" and (self.current_data_block.enable_https == "0" or self.current_data_block.enable_https == "") then
				return false, "HTTPS redirect can not be enabled when HTTPS is disabled"
			end
			return self.dt:is_bool(value)
		end
		function opt_redirect_https:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if value == "1" then -- Enable https on https redirect enable
				self:table_set(self.config, self.sid, "enable_local_https", "1")
			else
				self:table_set(self.config, self.sid, "enable_basic_auth", "0")
			end
		end

	local opt_listen_http = WEBUIGeneral:option("listen_http", { skip_validation = true })
		opt_listen_http.cfg_require = true
		function opt_listen_http:validate(value)
			return self:listen_validation(value)
		end
		function opt_listen_http:set(value)
			self:set_ports(value)
		end
	-- webui_access option is used by site_manager
	local opt_webui_access = WEBUIGeneral:option("webui_access")
		function opt_webui_access:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_webui_access:get()
			return self:table_get(self.config, self.sid, "home") and "1" or "0"
		end
		function opt_webui_access:set(value)
			self:table_set(self.config, self.sid, "home", value == "1" and "/www" or "")
		end

	local opt_enable_http = WEBUIGeneral:option("enable_basic_auth")
		function opt_enable_http:validate(value)
			if (self:getter_wrapped_abs_value(self.config, self.sid, "enable_https") ~= "1"
				or self:getter_wrapped_abs_value(self.config, self.sid, "redirect_https") ~= "1")
				and value == "1" then
				return false, "Basic auth can not be enabled when HTTPS and HTTPS redirect are disabled"
			end
			return self.dt:is_bool(value)
		end

if pac.is_installed("uhttpd-mod-ubus") then
	local opt_enable_json_rpc = WEBUIGeneral:option("enable_json_rpc")
		function opt_enable_json_rpc:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enable_json_rpc:set(value)
			if value == "1" then
				self:table_set(self.config, self.sid, "ubus_prefix", "/ubus")
			else
				self:table_delete(self.config, self.sid, "ubus_prefix")
			end
		end
		function opt_enable_json_rpc:get()
			if self:table_get(self.config, self.sid, "ubus_prefix") == "/ubus" then
				return "1"
			end
			return "0"
		end
end

if ac_util.has_wan then
	local opt_http_wan_access = WEBUIGeneral:option("http_wan_access")
		function opt_http_wan_access:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_http_wan_access:set(value)
			self:table_set(self.config, self.sid, "_httpWanAccess", value)
			if not self.DMZ_enabled then return end

			self:update_dmz_redirect("dmz_http", value)
		end
		function opt_http_wan_access:get()
			return self:table_get(self.config, self.sid, "_httpWanAccess")
		end

	local opt_wan_listen_http = WEBUIGeneral:option("wan_listen_http", { skip_validation = true })
		function opt_wan_listen_http:validate(value)
			return self:listen_validation(value)
		end
		function opt_wan_listen_http:get(value)
			if value then return value end
			local listen_http = self:get_abs_value(self.config, self.sid, "listen_http")
			if type(listen_http) == "table" then
				return util.clone(listen_http, true)
			end
			return listen_http
		end

	local opt_https_wan_access = WEBUIGeneral:option("https_wan_access")
		function opt_https_wan_access:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_https_wan_access:set(value)
			self:table_set(self.config, self.sid, "_httpsWanAccess", value)
			if not self.DMZ_enabled then return end

			self:update_dmz_redirect("dmz_https", value)
		end
		function opt_https_wan_access:get()
			return self:table_get(self.config, self.sid, "_httpsWanAccess")
		end

	local opt_wan_listen_https = WEBUIGeneral:option("wan_listen_https", { skip_validation = true })
		function opt_wan_listen_https:validate(value)
			return self:listen_validation(value)
		end
		function opt_wan_listen_https:get(value)
			if value then return value end
			local listen_https = self:get_abs_value(self.config, self.sid, "listen_https")
			if type(listen_https) == "table" then
				return util.clone(listen_https, true)
			end
			return listen_https
		end
end

	local opt_listen_https = WEBUIGeneral:option("listen_https", { skip_validation = true })
		opt_listen_https.cfg_require = true
		function opt_listen_https:validate(value)
			return self:listen_validation(value)
		end
		function opt_listen_https:set(value)
			self:set_ports(value)
		end

if pac.is_installed("vuci-app-certificates-api") then
	local opt_cert = WEBUIGeneral:option("cert", {certificate = {
		cert_types = { "certificates" },
		length_warnings = true,
		default_values = {ac_util.DEFAULT_CERT},
	}})
	opt_cert.cfg_require = true

	local opt_key = WEBUIGeneral:option("key", {certificate = {
		cert_types = {"keys"},
		length_warnings = true,
		default_values = {ac_util.DEFAULT_KEY},
	}})
	opt_key.cfg_require = true


	local opt_device_files = WEBUIGeneral:option("device_files")
	function opt_device_files:validate(value)
		return self.dt:is_bool(value)
	end
	function opt_device_files:set(value)
		self:table_set(self.config, self.sid, self.api_key, value == "1" and "" or value)
	end
	function opt_device_files:get()
		return self:table_get(self.config, self.sid, self.api_key) or "1"
	end

end

if ac_util.has_wan then
	local opt_rfc1918_filter_http = WEBUIGeneral:option("rfc1918_filter_http")
		function opt_rfc1918_filter_http:validate(value)
			local data = self.current_data_block or {}
			if data.rfc1918_filter then
				return false, "'rfc1918_filter_http' can not be set together with 'rfc1918_filter'"
			end
			return self.dt:is_bool(value)
		end

	local opt_rfc1918_filter_https = WEBUIGeneral:option("rfc1918_filter_https")
		function opt_rfc1918_filter_https:validate(value)
			local data = self.arguments.data or {}
			if data.rfc1918_filter then
				return false, "'rfc1918_filter_https' can not be set together with 'rfc1918_filter'"
			end
			return self.dt:is_bool(value)
		end

	-- DEPRECATED
	local opt_rfc1918_filter = WEBUIGeneral:option("rfc1918_filter")
		function opt_rfc1918_filter:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_rfc1918_filter:set(value)
			self:table_set(self.config, self.sid, "rfc1918_filter_http", value)
			self:table_set(self.config, self.sid, "rfc1918_filter_https", value)
		end
		function opt_rfc1918_filter:get()
			local http = self:table_get(self.config, self.sid, "rfc1918_filter_http")
			local https = self:table_get(self.config, self.sid, "rfc1918_filter_https")
			return http == "1" and https == "1" and "1" or "0"
		end
end

function WEBUI:file_validation(val, path, seen)
	if val:match("%.%./") then return false, "File path can not contain ../" end

	local ok = false
	for _, p in ipairs(path[1] and path or {path}) do
		local start = val:find(p, 1, true)
		if start == 1 then
			ok = true
			break
		end
	end
	if not ok then return false, "File path can only start with: " .. table.concat(path, " or ") .. " or default certificates: " .. ac_util.DEFAULT_KEY .. ", " .. ac_util.DEFAULT_CERT end

	local s = fs.stat(val)
	seen = seen or { }
	if s and not seen[s.ino] then
		seen[s.ino] = true
		if s.type == "reg" then
			return true
		elseif s.type == "lnk" then
			return self:file_validation(fs.readlink(val), path, seen)
		end
	end

	return false, "Provided file does not exist in the device"
end

local function reset_ca(force)
	if not fs.access(ac_util.DEFAULT_CA_CERT) then return end
	local expire_date = ac_util.get_cert_expire_date(ac_util.DEFAULT_CA_CERT)
	if force or not expire_date or (tonumber(expire_date) and tonumber(expire_date) < os.time()) then
		-- apparently removing a file requires write permissions on the dir only
		-- uhttpd does not have write on /etc, but luckily the init checks the files with -s
		-- so we can just make them 0 bytes and it will regenerate them
		fs.writefile(ac_util.DEFAULT_CA_CERT, "")
		fs.writefile(ac_util.DEFAULT_CA_KEY, "")
	end
end

local generate = WEBUI:action("generate", function (self)
	local certificates = require("vuci.certificates")
	local force = self.arguments.data and self.arguments.data.force == "1"
	local replace = self.arguments.data and self.arguments.data.replace == "1"

	reset_ca(force)

	local crt = self.uci:get(self.config, "main", "cert")
	local key = self.uci:get(self.config, "main", "key")
	fs.writefile(ac_util.DEFAULT_CERT, "")
	fs.writefile(ac_util.DEFAULT_KEY, "")
	if (crt ~= ac_util.DEFAULT_CERT or key ~= ac_util.DEFAULT_KEY) and replace then
		certificates.remove_service_from_config(crt, self.config, "main")
		certificates.remove_service_from_config(key, self.config, "main")
		self.uci:commit("certificates")
	end

	util.file_exec("/usr/sbin/generate_uhttpd_certificates", {})

	if replace then
		self.uci:set(self.config, "main", "device_files", "1")
		self.uci:set(self.config, "main", "cert", ac_util.DEFAULT_CERT)
		self.uci:set(self.config, "main", "key", ac_util.DEFAULT_KEY)
		self:commit(self.config)
	else
		certificates.remove_service_from_config(ac_util.DEFAULT_CERT, self.config, "main")
		certificates.remove_service_from_config(ac_util.DEFAULT_KEY, self.config, "main")
		self.uci:commit("certificates")
	end

	return self:ResponseOK()
end)
	local force = generate:option("force")
	function force:validate(value)
		return self.dt:is_bool(value)
	end
	local replace = generate:option("replace")
	function replace:validate(value)
		return self.dt:is_bool(value)
	end

WEBUI:action("download", function (self)
	if fs.access(ac_util.DEFAULT_CA_CERT) then
		return self:File(ac_util.DEFAULT_CA_CERT, "uhttpd-ca.crt")
	end
	self:ResponseNotFound(ac_util.DEFAULT_CA_CERT .. " does not exist")
end)

return WEBUI
