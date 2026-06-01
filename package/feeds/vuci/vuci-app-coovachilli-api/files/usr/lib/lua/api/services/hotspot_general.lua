local ConfigService = require("api/ConfigService")
local mdm = require("vuci.modem")
local fs = require("nixio.fs")
local util = require("vuci.util")
local board = require("vuci.board")
local ntm, ip

local HotspotGeneral = ConfigService:new({ increment_name = true })

HotspotGeneral.DEFAULT_DB_PATH = "/var/run/chilli/hotspot.db"
HotspotGeneral.DEFAULT_DB_PATH_FLASH = "/etc/chilli/hotspot.db"

HotspotGeneral.ERROR_CODES = {
	SUBNET_EXISTS = 1,
	INCORRECT_FILE = 2,
	NOT_EXISTS_FILE = 4,
	MAXIMUM_REACHED = 5
}

HotspotGeneral.user_rights = {
	read = false,
	write = false
}
function HotspotGeneral:initialize_hook()
	if self.user.group == "root" then
		self.user_rights.read = true
		self.user_rights.write = true
	else
		local rights = util.load_rights(self.user.group)
		if (rights["target_write"] == "allow" and
				(rights["write"]["*"] or
				rights["write"]["services/hotspot/general/userscripts*"] or
				rights["write"]["services/hotspot/general*"] or
				rights["write"]["services/hotspot*"] or
				rights["write"]["services*"])) or
				(rights["target_write"] == "deny" and
				not rights["write"]["core"] and
				not rights["write"]["!services/hotspot/general/userscripts*"] and
				not rights["write"]["!services/hotspot/general*"] and
				not rights["write"]["!services/hotspot*"] and
				not rights["write"]["!services*"]) then
			self.user_rights.write = true
		end
		if (rights["target_read"] == "allow" and
				(rights["read"]["*"] or
				rights["read"]["services/hotspot/general/userscripts*"] or
				rights["read"]["services/hotspot/general*"] or
				rights["read"]["services/hotspot*"] or
				rights["read"]["services*"])) or
				(rights["target_read"] == "deny" and
				not rights["read"]["core"] and
				not rights["read"]["!services/hotspot/general/userscripts*"] and
				not rights["read"]["!services/hotspot/general*"] and
				not rights["read"]["!services/hotspot*"] and
				not rights["read"]["!services*"]) then
			self.user_rights.read = true
		end
	end
end

local s = HotspotGeneral:section("chilli", "chilli")
function s:create_defaults()
	local used_net = {}
	self:table_foreach(self.config, "chilli", function (s)
		if s.net then
			used_net[s.net] = true
		end
	end)

	local ip = board:get_default_lan_ip() or "192.168.1.1"
	local o1, o2, o3, _ = string.match(ip, "^(%d+).(%d+).(%d+).(%d+)$")
	o3 = tonumber(o3+1)

	while used_net[string.format("%s.%s.%s.0/24", o1, o2, o3)] do
		o3 = tonumber(o3+1)
	end

	local data = {
		enabled = "0",
		net = string.format("%s.%s.%s.0/24", o1, o2, o3),
		uamlisten = string.format("%s.%s.%s.254", o1, o2, o3),
		dns1 = "8.8.8.8",
		dns2 = "8.8.4.4",
		uamlogoutip = "1.0.0.0",
		radiusauthport = "1812",
		radiusacctport = "1813",
		uamport = "3990",
		_mode = "local",
		_landingpage = "int",
		_success = "uam",
		_protocol = "http",
		ipup = "/etc/chilli/up.sh",
		ipdown = "/etc/chilli/down.sh",
		dbpath = self.DEFAULT_DB_PATH,
		usersdbpath = "/etc/chilli/users.db",
		noc2c = "1",
		radiusrequiremessageauth = "1"
	}

	local mode = self.current_data_block.mode or data._mode
	local registerusers = self.current_data_block.registerusers
	if mode == "sms_otp" or mode == "mac_auth" or mode == "sso" or (mode == "local" and registerusers == "1") then
		data._dyn_users_group = "default"
	end
	return data
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local profile = s:option("profile")
		function profile:validate(value)
			local config_profiles = {}
			for conf in fs.dir("/etc/chilli/configs") do table.insert(config_profiles, conf) end
			return self.dt:check_array(value, config_profiles)
		end
		function profile:set(value)
			self:table_set(self.config, self.sid, "_profile", value)
		end
		function profile:get()
			return self:table_get(self.config, self.sid, "_profile")
		end

HotspotGeneral.iface_options = nil
function HotspotGeneral:fetch_iface_options()
	if self.iface_options then return self.iface_options end
	self.iface_options = {}

	ntm = ntm or require("vuci.network").init(self.uci)
	local network_pretty = util.get_network_map(self, true)

	local used_iface = {}
	self:table_foreach(self.config, "chilli", function (s)
		if s[".name"] == self.sid then return true end
		if s.network then
			used_iface[network_pretty[s.network] or s.network] = true
		end
		for _, value in ipairs(s.moreif or {}) do
			used_iface[network_pretty[value] or value] = true
		end
	end)

	for _, iface in ipairs(ntm:get_networks()) do
		local name = iface:name()
		if name and name ~= "loopback" and iface:get("area_type") == "lan" and not used_iface[network_pretty[name] or name] then
			table.insert(self.iface_options, network_pretty[name] or name)
		end
	end

	self:table_foreach("wireless", "wifi-iface", function(s)
		if s.wifi_id and not used_iface[network_pretty[s.wifi_id] or s.wifi_id] then
			table.insert(self.iface_options, network_pretty[s.wifi_id] or s.wifi_id)
		end
	end)

	return self.iface_options
end

	local network = s:option("network")
	network.cfg_require = true
		function network:validate(value)
			return self.dt:check_array(value, self:fetch_iface_options())
		end
		function network:get(value) return util.network_mapper_get(self, value) end
		function network:set(value) util.network_mapper_set(self, value) end

	local net = s:option("net")
		function net:validate(value)
			local valid, err = self.dt:cidr4(value)
			if not valid then return valid, err end

			local mask = value:match("^[^/]+/([^/]+)$")
			if tonumber(mask) < 16 or tonumber(mask) > 30 then
				return false, "Netmask must be from 16 to 30"
			end
			return true
		end
		function net:get(value)
			-- Coovachilli uses this as default value if not set
			if not value or value == "" then return "192.168.182.0/24" end
			return value
		end

	local ip_address = s:option("uamlisten")
		function ip_address:validate(value)
			local valid, err = self.dt:ip4addr(value)
			if not valid then return valid, err end
			ip = ip or require("luci.ip")

			local network_ip = self:getter_wrapped_abs_value(self.config, self.sid, "net")
			if type(network_ip) ~= "string" then return true end

			local range = ip.new(network_ip)
			if not range or not range:contains(value) then return false, "IP Address should be in the range of Hotspot network" end
			return true
		end
		function ip_address:get(value)
			if value and value ~= "" then return value end

			local network_ip = self:getter_wrapped_abs_value(self.config, self.sid, "net")
			if type(network_ip) ~= "string" then return value end

			ip = ip or require("luci.ip")
			local range = ip.new(network_ip)
			-- Coovachilli uses min host of net as default value
			return range:minhost():string()
		end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			if value ~= "1" then
				return self.dt:is_bool(value)
			end

			local mode = self:getter_wrapped_abs_value(self.config, self.sid, "mode")
			if mode == "local" then
				local sqlite = require("vuci.sqlite").init()
				local db = sqlite.database({ path = "/etc/chilli/users.db" })
				local users
				if db:get_db() then
					users = db:select("SELECT COUNT(id) as count FROM local_users")
					db:close()
				end
				if not users or #users == 0 or users[1]["count"] == 0 then
					return false, "To enable the hotspot please create at least one user when authentication is set to local users."
				end
			end

			ip = ip or require("luci.ip")
			local network_ip = self:getter_wrapped_abs_value(self.config, self.sid, "net")
			if type(network_ip) ~= "string" then return true end

			self:table_foreach(self.config, "chilli", function (s)
				if s[".name"] == self.sid or not s.net then return true end
				local range = ip.new(s.net)
				if range and range:contains(network_ip) then
					self:add_critical_error(
						self.ERROR_CODES.SUBNET_EXISTS,
						"Hotspot network subnet is already being used by " .. s[".name"] .. " hotspot instance.",
						s[".name"]
					)
				end
			end)

			self:table_foreach("network", "interface", function (s)
				if not s.ipaddr or not s.netmask then return true end
				local range = ip.new("%s/%s" % { s.ipaddr, s.netmask })
				if range and range:contains(network_ip) then
					self:add_critical_error(
						self.ERROR_CODES.SUBNET_EXISTS,
						"Hotspot network subnet is already being used by " .. s[".name"] .. " interface.",
						s[".name"]
					)
				end
			end)
			return true
		end

	local mode = s:option("mode")
	mode.cfg_require = true
		function mode:validate(value)
			local mode_options = { "local", "radius", "mac_auth", "sso" }
			if mdm:modem_count() > 0 then table.insert(mode_options, "sms_otp") end
			return self.dt:check_array(value, mode_options)
		end
		function mode:set(value)
			self:table_set(self.config, self.sid, "_mode", value)
		end
		function mode:get()
			return self:table_get(self.config, self.sid, "_mode")
		end

	local macauth = s:option("macauth")
		function macauth:validate(value)
			return self.dt:is_bool(value)
		end

	local mac_case = s:option("mac_case")
		function mac_case:validate(value)
			return self.dt:check_array(value, { "upper", "lower" })
		end

	local mac_delimiter = s:option("mac_delimiter")
		function mac_delimiter:validate(value)
			return self.dt:check_array(value, { "dash", "colon", "none" })
		end

	local duplicate_users = s:option("duplicateusers")
		function duplicate_users:validate(value)
			return self.dt:is_bool(value)
		end
		function duplicate_users:set(value)
			if value == "1" then
				self:table_set(self.config, self.sid, self.api_key, "0")
			elseif value == "0" then
				self:table_set(self.config, self.sid, self.api_key, "1")
			end
		end
		function duplicate_users:get(value)
			if value == "0" then return "1"
			elseif value == "1" then return "0"
			end
		end

	local register_users = s:option("registerusers")
		function register_users:validate(value)
			return self.dt:is_bool(value)
		end

	local enable_mac_pass = s:option("enable_macpass")
	enable_mac_pass.require = { ["1"] = { "macpass" }}
		function enable_mac_pass:validate(value)
			return self.dt:is_bool(value)
		end
		function enable_mac_pass:set(value)
			self:table_set(self.config, self.sid, "_enable_macpass", value)
		end
		function enable_mac_pass:get()
			return self:table_get(self.config, self.sid, "_enable_macpass")
		end

	local mac_pass = s:option("macpass", { sensitive = true })
		mac_pass.maxlength = 512
		function mac_pass:validate(value)
			return self.dt:credentials_validate(value)
		end

	local mac_blocking = s:option("mac_blocking")
		function mac_blocking:validate(value)
			if value == "1" and self:getter_wrapped_abs_value(self.config, self.sid, "mode") == "radius" then
				return false, "Mac blocking for Radius can not be enabled"
			end
			return self.dt:is_bool(value)
		end
		function mac_blocking:set(value)
			self:table_set("ip_blockd", "ip_blockd", "enable_mac_filter", value)
			if value == "1" then
				self:table_set("ip_blockd", "ip_blockd", "enabled", "1")
			end
		end
		function mac_blocking:get()
			local enabled_service = self:table_get("ip_blockd", "ip_blockd", "enabled") == "1"
			local enabled_mac_filter = self:table_get("ip_blockd", "ip_blockd", "enable_mac_filter") == "1"
			return enabled_service and enabled_mac_filter and "1" or "0"
		end

	local expiration_time = s:option("dynexpirationtime")
	expiration_time.maxlength = 16
		function expiration_time:validate(value)
			return self.dt:uinteger(value)
		end

	local users_group = s:option("dyn_users_group")
		function users_group:validate(value)
			local users_group_options = {}
			self:table_foreach(self.config, "group", function(s)
				table.insert(users_group_options, s.name)
			end)
			return self.dt:check_array(value, users_group_options)
		end
		function users_group:set(value)
			self:table_set(self.config, self.sid, "_dyn_users_group", value)
		end
		function users_group:get()
			return self:table_get(self.config, self.sid, "_dyn_users_group")
		end

	local modem_id = s:option("modemid")
		function modem_id:validate(value)
			local modem_options = {}
			local modems = mdm:get_all_modems()
			for _ ,modem in ipairs(modems) do
				if modem.id then table.insert(modem_options, modem.id) end
			end
			return self.dt:check_array(value, modem_options)
		end

	local landing_page = s:option("landingpage")
		function landing_page:validate(value)
			local landing_page_options = {"int", "ext"}
			return self.dt:check_array(value, landing_page_options)
		end
		function landing_page:set(value)
			self:table_set(self.config, self.sid, "_landingpage", value)
		end
		function landing_page:get()
			return self:table_get(self.config, self.sid, "_landingpage")
		end

	local password_encoding = s:option("withchallenge")
		function password_encoding:validate(value)
			return self.dt:is_bool(value)
		end
		function password_encoding:set(value)
			if value == "" then
				self:table_delete(self.config, self.sid, "nochallenge")
			else
				self:table_set(self.config, self.sid, "nochallenge", value == "1" and "0" or "1")
			end
		end
		function password_encoding:get(value)
			return self:table_get(self.config, self.sid, "nochallenge") == "1" and "0" or "1"
		end

	local landing_page_address = s:option("uamserver")
		function landing_page_address:validate(value)
			return self.dt:protourl(value)
		end

	local landing_page_port = s:option("uamport")
		function landing_page_port:validate(value)
			return self.dt:port(value)
		end
		function landing_page_port:get(value)
			-- Coovachilli uses this as default value if not set
			return value or "3990"
		end

	local landing_page_secret = s:option("uamsecret", { sensitive = true })
		landing_page_secret.maxlength = 512
		function landing_page_secret:validate(value)
			return self.dt:credentials_validate(value)
		end

	local success = s:option("success")
		function success:validate(value)
			local success_options = { "uam", "original", "custom" }
			return self.dt:check_array(value, success_options)
		end
		function success:set(value)
			self:table_set(self.config, self.sid, "_success", value)
		end
		function success:get()
			return self:table_get(self.config, self.sid, "_success")
		end

	local success_url = s:option("success_url")
		function success_url:validate(value)
			return self.dt:protourl(value)
		end
		function success_url:set(value)
			self:table_set(self.config, self.sid, "_success_url", value)
		end
		function success_url:get()
			return self:table_get(self.config, self.sid, "_success_url")
		end

	local more_ifaces = s:option("moreif", { list = true })
		function more_ifaces:validate(value)
			return self.dt:check_array(value, self:fetch_iface_options())
		end
		function more_ifaces:get(value) return util.network_mapper_get(self, value) end
		function more_ifaces:set(value) util.network_mapper_set(self, value) end

	local logout_address = s:option("uamlogoutip")
		function logout_address:validate(value)
			return self.dt:ip4addr(value)
		end

	local protocol = s:option("protocol")
		function protocol:validate(value)
			local protocol_options = { "http", "https" }
			return self.dt:check_array(value, protocol_options)
		end
		function protocol:set(value)
			self:table_set(self.config, self.sid, "_protocol", value)
		end
		function protocol:get()
			return self:table_get(self.config, self.sid, "_protocol")
		end

	local tos = s:option("tos")
		function tos:validate(value)
			return self.dt:is_bool(value)
		end

	local trial_users = s:option("trialusers")
		function trial_users:validate(value)
			return self.dt:is_bool(value)
		end

	local trial_users_group = s:option("trial_users_group")
		function trial_users_group:validate(value)
			local trial_users_group_options = {}
			self:table_foreach(self.config, "group", function(s)
				table.insert(trial_users_group_options, s.name)
			end)
			return self.dt:check_array(value, trial_users_group_options)
		end
		function trial_users_group:set(value)
			self:table_set(self.config, self.sid, "_trial_users_group", value)
		end
		function trial_users_group:get()
			return self:table_get(self.config, self.sid, "_trial_users_group")
		end

	local https = s:option("https_redirect")
		function https:validate(value)
			return self.dt:is_bool(value)
		end
		function https:set(value)
			self:table_set(self.config, self.sid, "_https", value)
		end
		function https:get()
			return self:table_get(self.config, self.sid, "_https")
		end

	local subdomain = s:option("subdomain")
		subdomain.maxlength = 63
		subdomain.require = {"domain"}
		function subdomain:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]$", 0)
		end

	local domain = s:option("domain")
		domain.require = {"subdomain"}
		function domain:validate(value)
			return self.dt:hostname(value)
		end

	local device_files = s:option("device_files")
		function device_files:validate(value)
			return self.dt:is_bool(value)
		end
		function device_files:set(value)
			self:table_set(self.config, self.sid, "_device_files", value)
		end
		function device_files:get()
			return self:table_get(self.config, self.sid, "_device_files")
		end

	local ssl_ca_file = s:option("sslcafile", { certificate = {
			type = "certificates",
			cert_types = { "ca" },
			failsafe = true
		}})
	local device_ssl_ca_file = s:option("device_sslcafile", {certificate = {
			type = "certificates",
			cert_types = { "ca" },
			device_only = true,
			failsafe = true
	}})
		function device_ssl_ca_file:set(value)
			require("vuci.certificates").remove_service_from_config(self.current_uci_section["_device_sslcafile"],  self.config, self.sid)
			self:table_set(self.config, self.sid, "_device_sslcafile", value)
		end
		function device_ssl_ca_file:get()
			return self:table_get(self.config, self.sid, "_device_sslcafile")
		end

	local ssl_key_file = s:option("sslkeyfile", { certificate = {
			type = "keys",
			cert_types = { "ca", "client", "server" },
			failsafe = true
		}})

	local device_ssl_key_file = s:option("device_sslkeyfile", {certificate = {
			type = "keys",
			cert_types = { "ca", "client", "server" },
			device_only = true,
			failsafe = true
		}})
		function device_ssl_key_file:set(value)
			require("vuci.certificates").remove_service_from_config(self.current_uci_section["_device_sslkeyfile"],  self.config, self.sid)
			self:table_set(self.config, self.sid, "_device_sslkeyfile", value)
		end
		function device_ssl_key_file:get()
			return self:table_get(self.config, self.sid, "_device_sslkeyfile")
		end

	local ssl_cert_file = s:option("sslcertfile", { certificate = {
			type = "certificates",
			cert_types = { "client", "server" }
		}})

local file_changes_made = false
function HotspotGeneral:update_file(file, value)
	if value == "" then
		os.remove(file)
		self:table_delete(self.config, self.sid, self.api_key)
		return
	end
	local data = fs.readfile(file) or ""
	if data ~= value then
		fs.writefile(file, value)
		self:table_set(self.config, self.sid, self.api_key, file)
		util.set_file_permissions(file, "chilli")
		file_changes_made = true
	end
end
function HotspotGeneral:validate_file(value)
	if not value:match("^#!/bin/sh\n") then
		return false, "File content must start with #!/bin/sh"
	end
	return true
end

	local device_ssl_cert_file = s:option("device_sslcertfile", {certificate = {
		type = "certificates",
		cert_types = { "client", "server" },
		device_only = true,
	}})
		function device_ssl_cert_file:set(value)
			require("vuci.certificates").remove_service_from_config(self.current_uci_section["_device_sslcertfile"],  self.config, self.sid)
			self:table_set(self.config, self.sid, "_device_sslcertfile", value)
		end
		function device_ssl_cert_file:get()
			return self:table_get(self.config, self.sid, "_device_sslcertfile")
		end

	local dns1 = s:option("dns1")
		function dns1:validate(value)
			return self.dt:ipaddr(value)
		end

	local dns2 = s:option("dns2")
		function dns2:validate(value)
			return self.dt:ipaddr(value)
		end

	local oidcdiscoveryurl = s:option("oidcdiscoveryurl")
		function oidcdiscoveryurl:validate(value)
			return self.dt:protourl(value)
		end

	local oidcclientid = s:option("oidcclientid")
	oidcclientid.maxlength = 256
		function oidcclientid:validate(value)
			return self.dt:string(value)
		end

	local oidcclientsecret = s:option("oidcclientsecret", { sensitive = true })
	oidcclientsecret.maxlength = 1024
		function oidcclientsecret:validate(value)
			return self.dt:string(value)
		end

	local radius_server1 = s:option("radiusserver1")
		function radius_server1:validate(value)
			return self.dt:host(value)
		end

	local radius_server2 = s:option("radiusserver2")
		function radius_server2:validate(value)
			return self.dt:host(value)
		end

	local radius_auth_port = s:option("radiusauthport")
		function radius_auth_port:validate(value)
			return self.dt:port(value)
		end

	local radius_acc_port = s:option("radiusacctport")
		function radius_acc_port:validate(value)
			return self.dt:port(value)
		end

	local radius_nas_id = s:option("radiusnasid")
		radius_nas_id.maxlength = 512
		function radius_nas_id:validate(value)
			return self.dt:credentials_validate(value)
		end

	local radius_secret = s:option("radiussecret", { sensitive = true })
		radius_secret.maxlength = 512
		function radius_secret:validate(value)
			return self.dt:credentials_validate(value)
		end

	local radius_require_message_auth = s:option("radiusrequiremessageauth")
		function radius_require_message_auth:validate(value)
			return self.dt:is_bool(value)
		end

	local swap_octets = s:option("swapoctets")
		function swap_octets:validate(value)
			return self.dt:is_bool(value)
		end

	local location_name = s:option("locationname")
		function location_name:validate(value)
			return self.dt:default_validation(value)
		end

	local radius_location_id = s:option("radiuslocationid")
		function radius_location_id:validate(value)
			return self.dt:default_validation(value)
		end

	local uamblocklist = s:option("uamblocklist")
		function uamblocklist:validate(value)
			return self.dt:is_bool(value)
		end

	local address_list = s:option("uamdomainfile")
		function address_list:validate(value)
			local split_value = util.split(value, "\n")
			if split_value then
				for _, single_line in ipairs(split_value) do
					if single_line ~= "" then
						local valid, err = self.dt:hostname(single_line)
						if not valid then return false, err end
					end
				end
				return true
			else
				return self.dt:hostname(value)
			end
		end
		function address_list:set(value)
			local address_file = "/etc/chilli/uamdomainfile_" .. self.sid
			self:update_file(address_file, value)
		end
		function address_list:get(_)
			local address_file = "/etc/chilli/uamdomainfile_" .. self.sid
			local file_data = fs.readfile(address_file) or ""
			if file_data == "" then return else return file_data end
		end

	local param_uam_ip = s:option("paramuamip")
		function param_uam_ip:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param_uam_port = s:option("paramuamport")
		function param_uam_port:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param_called = s:option("paramcalled")
		function param_called:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param_mac = s:option("parammac")
		function param_mac:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param_ip = s:option("paramip")
		function param_ip:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param_nas_id = s:option("paramnasid")
		function param_nas_id:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param_sessios_id = s:option("paramsessionid")
		function param_sessios_id:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param_user_url = s:option("paramuserurl")
		function param_user_url:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param_challenge = s:option("paramchallenge")
		function param_challenge:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param1 = s:option("param1")
		function param1:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param1_value = s:option("param1value")
		param1_value.maxlength = 512
		function param1_value:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local param2 = s:option("param2")
		function param2:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-_!]+$", 0)
		end

	local param2_value = s:option("param2value")
		param2_value.maxlength = 512
		function param2_value:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local session_up = s:option("conup")
	session_up.allow_duplicates = true
		function session_up:validate(value)
			if self.user.group ~= "root" then
				self:add_critical_error(STD_CODES.UNAUTHORIZED, "Current user is unauthorized to edit scripts.", "Authorization", 401)
			end
			return self:validate_file(value)
		end
		function session_up:set(value)
			if not self.user_rights.write then return end
			local up_file = "/etc/chilli/conup_" .. self.sid .. ".sh"
			self:update_file(up_file, value)
		end
		function session_up:get(_)
			if not self.user_rights.read then return nil end
			local up_file   = "/etc/chilli/conup_" .. self.sid .. ".sh"
			local file_data = fs.readfile(up_file) or ""
			if file_data == "" then return else return file_data end
		end

	local session_down = s:option("condown")
	session_down.allow_duplicates = true
		function session_down:validate(value)
			if self.user.group ~= "root" then
				self:add_critical_error(STD_CODES.UNAUTHORIZED, "Current user is unauthorized to edit scripts.", "Authorization", 401)
			end
			return self:validate_file(value)
		end
		function session_down:set(value)
			if not self.user_rights.write then return end
			local down_file = "/etc/chilli/condown_" .. self.sid .. ".sh"
			self:update_file(down_file, value)
		end
		function session_down:get(_)
			if not self.user_rights.read then return nil end
			local down_file = "/etc/chilli/condown_" .. self.sid .. ".sh"
			local file_data = fs.readfile(down_file) or ""
			if file_data == "" then return else return file_data end
		end

	local user_signup = s:option("usersignup")
	user_signup.allow_duplicates = true
		function user_signup:validate(value)
			if self.user.group ~= "root" then
				self:add_critical_error(STD_CODES.UNAUTHORIZED, "Current user is unauthorized to edit scripts.", "Authorization", 401)
			end
			return self:validate_file(value)
		end
		function user_signup:set(value)
			if not self.user_rights.write then return end
			local signup_file = "/etc/chilli/usersignup_" .. self.sid .. ".sh"
			self:update_file(signup_file, value)
		end
		function user_signup:get(_)
			if not self.user_rights.read then return nil end
			local signup_file = "/etc/chilli/usersignup_" .. self.sid .. ".sh"
			local file_data = fs.readfile(signup_file) or ""
			if file_data == "" then return else return file_data end
		end

	local noc2c = s:option("noc2c")
		function noc2c:validate(value)
			return self.dt:is_bool(value)
		end


-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function HotspotGeneral:OPTIONS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_options()
end

function HotspotGeneral:GET_TYPE_options()
	local function get_profile(name)
		local config_options = {}
		local filename = "/etc/chilli/configs/" .. name
		local curr_profile = fs.readfile(filename)
		local profile_split = curr_profile and curr_profile:split("\n")
		for _, line in pairs(profile_split) do
			if string.match(line, 'option') then
				local split = line:split("'")
				local name = split[1]:split(" ")[2]
				local value = split[2]
				if name == "_https" then name = "https_redirect" end
				local converted = string.match(name, "^_(.*)")
				if converted then name = converted end
				config_options[name] = value
			end
		end
		if config_options["uamdomainfile"] and fs.access(config_options["uamdomainfile"]) then
			config_options["uamdomainfile"] = fs.readfile(config_options["uamdomainfile"])
		end
		local data = {
			id = name,
			options = config_options
		}
		return data
	end
	local config_profiles = {}
	for conf in fs.dir("/etc/chilli/configs") do table.insert(config_profiles, conf) end
	if not self.sid then
		local data = {}
		for _, name in ipairs(config_profiles) do
			table.insert(data, get_profile(name))
		end
		self:ResponseOK(data)
	end
	local valid, err = self.dt:check_array(self.sid, config_profiles)
	if not valid then self:add_critical_error(STD_CODES.INVALID_SECTION, "Section: " .. err, "Validation", HTTP_STATUS_CODES.NOT_FOUND) end
	if string.match(self.sid, "%.%.") then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Profile does not exist.", "Validation", HTTP_STATUS_CODES.NOT_FOUND)
	end
	return self:ResponseOK(get_profile(self.sid))
end

function HotspotGeneral:GET_TYPE_status()
	local uci = self.uci
	local stats_path = "/sys/class/net/tun0/statistics"
	local rv = {}
	local db_path = self.DEFAULT_DB_PATH
	if not fs.access(db_path) then
		db_path = self.DEFAULT_DB_PATH_FLASH
	end
	if fs.access(db_path) then
		local sqlite = require "vuci.sqlite".init()
		local db = sqlite.database({ path = db_path })
		local data = db:select("SELECT SUM(input_octets) AS rx_bytes, SUM(output_octets) AS tx_bytes from statistics")
		db:close()
		rv = data and data[1] or {}
	end
	uci:foreach("chilli", "chilli", function(s)
		if s.enabled == "1" then
			rv.enabled = s.enabled
			rv.tx_bytes = rv.tx_bytes or tonumber(fs.readfile(stats_path .. "/tx_bytes") or "0")
			rv.rx_bytes = rv.rx_bytes or tonumber(fs.readfile(stats_path .. "/rx_bytes") or "0")
			return false
		end
	end)
	rv.enabled = rv.enabled == "1" and "1" or "0"
	return self:ResponseOK(rv)
end

function HotspotGeneral:enable_mac_filter()
	local count = self:table_count(self.main_config, "chilli")
	if self.request_method == "DELETE" and count == 1 then
		self:table_set("ip_blockd", "ip_blockd", "enable_mac_filter", "0")
	end
	if not board:has_wifi() then return end

	if self.request_method ~= "POST" then
		local old_interfaces = {}
		for _, iface in ipairs(self.uci:get(self.config, self.sid, "moreif") or {}) do
			table.insert(old_interfaces, iface)
		end
		table.insert(old_interfaces, self.uci:get(self.config, self.sid, "network"))

		self:table_foreach("wireless", "wifi-iface", function (s)
			if not util.contains(old_interfaces, s.wifi_id) then return true end
			if s.macfilter and not s.delete_from_whitelist then
				self:table_delete("wireless", s[".name"], "macfilter")
			elseif s.macfilter == "allow" and s.delete_from_whitelist == "1" then
				self:table_set("wireless", s[".name"], "delete_from_whitelist", "0")
			end
		end)
	end

	if mac_blocking:get() ~= "1" then return end
	if self.request_method == "DELETE" then return end

	local interfaces = {}
	for _, iface in ipairs(self:getter_wrapped_abs_value(self.config, self.sid, "moreif") or {}) do
		table.insert(interfaces, iface)
	end
	table.insert(interfaces, self:getter_wrapped_abs_value(self.config, self.sid, "network"))

	self:table_foreach("wireless", "wifi-iface", function (s)
		if not util.contains(interfaces, s.wifi_id) then return true end
		if s.macfilter == "allow" and s.delete_from_whitelist ~= "1" then
			self:table_set("wireless", s[".name"], "delete_from_whitelist", "1")
		elseif not s.macfilter or s.macfilter == "" then
			self:table_set("wireless", s[".name"], "macfilter", "deny")
		end
	end)
end

function HotspotGeneral:enable_firewall()
	local count_enabled = self:table_count(self.main_config, "chilli", { enabled = "1" })

	self:table_set("uhttpd", "hotspot", "disabled", count_enabled > 0 and "0" or "1")

	local rule
	self:table_foreach("firewall", "rule", function(s)
		if s.name == "Hotspot_input" then
			rule = s
			return false
		end
	end)

	if count_enabled > 0 then
		local zone
		self:table_foreach("firewall", "zone", function(s)
			if s.name == "hotspot" then
				zone = s
				return false
			end
		end)
		if not zone then
			self:table_section("firewall", "zone", "hotspot", {
				name = "hotspot",
				input = "REJECT",
				output = "ACCEPT",
				forward = "REJECT",
				device = "tun0 tun1 tun2 tun3 tun4"
			})
		end

		local forwarding
		self:table_foreach("firewall", "forwarding", function(s)
			if s.src == "hotspot" and s.dest == "wan" then
				forwarding = s
				return false
			end
		end)
		if not forwarding then
			self:table_section("firewall", "forwarding", self:next_id("firewall"), {
				src = "hotspot",
				dest = "wan"
			})
		end

		local dest_ports = { "53","67","68" }

		table.insert(dest_ports, self:table_get("uhttpd", "hotspot", "listen_http") or "81")
		table.insert(dest_ports, self:table_get("uhttpd", "hotspot", "listen_https") or "444")

		local port_defaults = {
			radiusauthport = "1812",
			radiusacctport = "1813",
			uamport = "3990",
			uamuiport = "3991"
		}

		local port_set = {}
		self:table_foreach(self.main_config, "chilli", function(s)
			for key in pairs(port_defaults) do
				if s[key] and not util.contains(dest_ports, s[key]) then
					table.insert(dest_ports, s[key])
					port_set[key] = true
				end
			end
		end)

		for key, default in pairs(port_defaults) do
			if not port_set[key] then
				table.insert(dest_ports, default)
			end
		end

		if not rule then
			self:table_section("firewall", "rule", self:next_id("firewall"), {
				name = "Hotspot_input",
				target = "ACCEPT",
				src = "hotspot",
				proto = {"tcp", "udp"},
				dest_port = dest_ports,
				enabled = "1"
			})
		else
			self:table_set("firewall", rule[".name"], "dest_port", dest_ports)
			self:table_set("firewall", rule[".name"], "enabled", "1")
		end
	else
		if rule then
			self:table_set("firewall", rule[".name"], "enabled", "0")
		end
	end
end

function HotspotGeneral:modify_interfaces()
	if self:get_abs_value(self.main_config, self.sid, "enabled") ~= "1" then return end

	local ifaces = {}
	for _, iface in ipairs(self:getter_wrapped_abs_value(self.config, self.sid, "moreif") or {}) do
		table.insert(ifaces, iface)
	end
	table.insert(ifaces, self:getter_wrapped_abs_value(self.config, self.sid, "network"))

	local network_internal = util.get_network_map(self, false)
	local ifaces_internal = {}
	for _, iface in ipairs(ifaces) do
		ifaces_internal[network_internal[iface] or iface] = true
	end

	self:table_foreach("dhcp", "dhcp", function (s)
		if s.ignore == "1" and s.ignore_ipv6 == "1" then return true end
		if not ifaces_internal[s.interface] then return true end

		self:table_set("dhcp", s[".name"], "ignore", "1")
		self:table_set("dhcp", s[".name"], "ignore_ipv6", "1")
	end)

	self:table_foreach("wireless", "wifi-iface", function (s)
		if not s.network or not ifaces_internal[s.wifi_id] then return true end
		self:table_delete("wireless", s[".name"], "network")
	end)
end

function HotspotGeneral:PUT_before_commit_hook()
	self:enable_mac_filter()
	self:enable_firewall()
	self:modify_interfaces()
end

function HotspotGeneral:PUT_after_commit_hook()
	if file_changes_made then
		util.ubus("rc", "init", { name = "chilli", action = "reload" })
	end
end

function HotspotGeneral:validate_radius_options()
	local data = self.current_data_block
	local opt_radiusnasid = data.radiusnasid or self:table_get(self.config, self.sid, "radiusnasid")
	local opt_mode = data.mode or self:table_get(self.config, self.sid, "_mode")
	local opt_profile = data.profile or self:table_get(self.config, self.sid, "_profile")
	local mac_auth = data.macauth or self:table_get(self.config, self.sid, "macauth")
	local mac_case = data.mac_case or self:table_get(self.config, self.sid, "mac_case")
	local mac_delimiter = data.mac_delimiter or self:table_get(self.config, self.sid, "mac_delimiter")

	if opt_mode == "radius" and opt_profile == "hotspotsystems" and opt_radiusnasid == nil then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required option: radiusnasid", "radiusnasid")
	end
	if opt_mode ~= "radius" and opt_mode ~= "sms_otp" and mac_auth == "1" then
		self:add_error(STD_CODES.INVALID_OPT, "Option 'macauth' can be enabled when 'mode' is set to 'radius' or 'sms_otp", "macauth")
	end
	if opt_mode ~= "radius" and mac_auth ~= "1" and not (mac_case == nil or mac_case == "") then
		self:add_error(STD_CODES.INVALID_OPT, "Option 'mac_case' can be set when 'mode' is set to 'radius' and 'macauth' is enabled", "mac_case")
	end
	if opt_mode ~= "radius" and mac_auth ~= "1" and not (mac_delimiter == nil or mac_delimiter == "") then
		self:add_error(STD_CODES.INVALID_OPT, "Option 'mac_delimiter' can be set when 'mode' is set to 'radius' and 'macauth' is enabled", "mac_delimiter")
	end
end

function HotspotGeneral:validate_ssl_options()
	local data = self.current_data_block or {}
	local opt_files = data.device_files or self:table_get(self.config, self.sid, "_device_files")

	if opt_files == "1" then
		https.require = { ["1"] = {"device_sslkeyfile", "device_sslcertfile"} }
	else
		https.require = { ["1"] = {"sslkeyfile", "sslcertfile"} }
	end
end

function HotspotGeneral:get_instance_limit()
	local limit_file = "/etc/chilli/limit"
	local limit = 1
	if fs.access(limit_file) then
		limit = tonumber(fs.readfile(limit_file)) or 1
	end
	return limit
end

function HotspotGeneral:POST_validate_section_hook()
	local count = self:table_count(self.main_config, "chilli")
	local limit = self:get_instance_limit()
	if count >= limit then
		self:add_critical_error(self.ERROR_CODES.MAXIMUM_REACHED, string.format("Only %d %s can be created.", limit, limit > 1 and "instances" or "instance"), "Validation")
	end
	self:validate_radius_options()
	self:validate_ssl_options()
end

function HotspotGeneral:PUT_validate_section_hook()
	self:validate_radius_options()
	self:validate_ssl_options()
end

function HotspotGeneral:POST_before_commit_hook()
	self:enable_mac_filter()
	self:enable_firewall()
	self:modify_interfaces()
end

function HotspotGeneral:DELETE_before_section_delete_hook()
	local files = {"/etc/chilli/conup_" .. self.sid .. ".sh", "/etc/chilli/condown_" .. self.sid .. ".sh",
	               "/etc/chilli/usersignup_" .. self.sid .. ".sh", "/etc/chilli/uamdomainfile_" .. self.sid}
	for i = 1, #files do
		if fs.access(files[i]) then
			fs.remove(files[i])
		end
	end
	local count = self:table_count(self.main_config, "chilli")
	if count == 1 then
		self:table_foreach("firewall", "rule", function(s)
			if s.name == "Hotspot_input" then
				self:table_delete("firewall", s[".name"])
			end
		end)
		self:table_foreach("firewall", "zone", function(d)
			if d[".name"] == "hotspot" and d.name == "hotspot" then
				self:table_delete("firewall", d[".name"])
			end
		end)
		self:table_foreach("firewall", "forwarding", function(d)
			if d.src and d.src == "hotspot" then
				self:table_delete("firewall", d[".name"])
			end
		end)
	end
	self:enable_mac_filter()
end

return HotspotGeneral
