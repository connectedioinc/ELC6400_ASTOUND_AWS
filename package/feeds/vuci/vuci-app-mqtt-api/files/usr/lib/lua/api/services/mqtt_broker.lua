local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local Mqtt = ConfigService:new({
	create = false,
	delete = false
})

local MSG_CODES = {
	DEPRECATED_TLS = 1,
	TLS_1_1_NOT_ENABLED = 2,
}

local MqttBroker = Mqtt:section("mosquitto", "mqtt")
function MqttBroker:filter(s)
	return s[".name"] == "mqtt"
end

local opt_enabled

function Mqtt:after_data_hook()
	local tls_version = self:get_abs_value(self.config, self.sid, "tls_version")
	if tls_version == "tlsv1.1" then
		self:add_message(MSG_CODES.DEPRECATED_TLS, "TLS 1.1 is deprecated and considered insecure. Please upgrade to a newer TLS version.", "tls_version")
	elseif tls_version == "all" then
		self:add_message(MSG_CODES.TLS_1_1_NOT_ENABLED, "TLS 1.1 will not be enabled because it is deprecated and considered insecure. If you need TLS 1.1, please select it explicitly.", "tls_version")
	end
end
Mqtt.PUT_after_data_hook = Mqtt.after_data_hook
Mqtt.GET_after_data_hook = Mqtt.after_data_hook

function Mqtt:PUT_before_commit_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local allow_ra = self:get_abs_value(self.config, self.sid, "allow_ra")
	local port = self:get_abs_value(self.config, self.sid, "local_port")
	local rule_enable = enabled == "1" and allow_ra == "1" and "1" or "0"
	local mqtt_rule = false
	local dest_port = {}
	if type(port) == "table" then
		for _, value in ipairs(port or {}) do
			if value and value ~= "" then
				table.insert(dest_port, value)
			end
		end
	end
	self:table_foreach("firewall", "rule", function (rule)
		if rule.name == "Enable_MQTT_WAN" then
			mqtt_rule = true
			local port_need_update = false
			local ports1 = {}
			local ports2 = {}
			if rule.dest_port and dest_port and #rule.dest_port > #dest_port then
				ports1 = rule.dest_port or {}
				ports2 = dest_port or {}
			else
				ports1 = dest_port or {}
				ports2 = rule.dest_port or {}
			end
			for _, value in ipairs(ports1 or {}) do
				if not util.contains(ports2, value) then
					port_need_update = true
				end
			end
			if port_need_update then
				self:table_set("firewall", rule[".name"], "dest_port", dest_port)
			end
			if rule_enable ~= rule.enabled then
				self:table_set("firewall", rule[".name"], "enabled", rule_enable)
			end
		end
	end)
	if not mqtt_rule then
		local wan_zone = false
		self:table_foreach("firewall", "zone", function (zone)
			if zone.name == "wan" then wan_zone = true end
		end)
		if not wan_zone then
			self:add_critical_error(STD_CODES.UCI_SET_ERROR, "Could not add firewall rule")
		end
		if port then
			self:table_section("firewall", "rule", self:next_id("firewall"), {
				name = "Enable_MQTT_WAN",
				target = "ACCEPT",
				proto = "tcp",
				dest_port = dest_port,
				enabled = rule_enable,
				src = "wan"
			})
		end
	end
end

function Mqtt:PUT_validate_section_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if enabled and enabled == "1" then
		local required_options = {}
		local custom_enabled = self:get_abs_value(self.config, self.sid, "custom_enabled")
		if custom_enabled and custom_enabled == "1" then
			table.insert(required_options, "custom_section_id")
		else
			local acl_file = self:get_abs_value(self.config, self.sid, "acl_file_path")
			local password_file = self:get_abs_value(self.config, self.sid, "password_file")
			local anonymous_access = self:get_abs_value(self.config, self.sid, "anonymous_access")
			if (not anonymous_access or anonymous_access == "0") and (not acl_file or acl_file == "") and (not password_file or password_file == "") then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: acl_file or password_file",
					"anonymous_access")
			end
			local use_tls_ssl = self:get_abs_value(self.config, self.sid, "use_tls_ssl")
			table.insert(required_options, "local_port")
			if use_tls_ssl and use_tls_ssl == "1" then
				table.insert(required_options, "tls_type")
				local tls_type = self:get_abs_value(self.config, self.sid, "tls_type")
				if tls_type and tls_type == "psk" then
					local opt_psk = self:get_abs_value(self.config, self.sid, "psk")
					if not opt_psk or opt_psk == "" then
						self:add_error(STD_CODES.INVALID_OPT, "Missing required option: psk", "enabled")
					end
					table.insert(required_options, "identity")
				elseif tls_type and tls_type == "cert" then
					table.insert(required_options, "ca_file")
					table.insert(required_options, "cert_file")
					table.insert(required_options, "key_file")
					table.insert(required_options, "tls_version")
				end
			end
			opt_enabled.require = {["1"] = required_options}
		end
	end
end

	opt_enabled = MqttBroker:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_local_port = MqttBroker:option("local_port", { list = true })
		-- opt_local_port.cfg_require = true
		function opt_local_port:validate(value)
			return self.dt:port(value)
		end

	local opt_allow_ra = MqttBroker:option("allow_ra")
		function opt_allow_ra:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_use_tls_ssl = MqttBroker:option("use_tls_ssl")
		function opt_use_tls_ssl:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_tls_type = MqttBroker:option("tls_type")
		function opt_tls_type:validate(value)
			return self.dt:check_array(value, {
				"cert", "psk"
			})
		end

	local opt_tls_version = MqttBroker:option("tls_version")
		function opt_tls_version:validate(value)
			return self.dt:check_array(value, {
				"tlsv1.1", "tlsv1.2", "tlsv1.3", "all"
			})
		end

	local opt_psk = MqttBroker:option("psk", { sensitive = true })
		opt_psk.maxlength = 128
		function opt_psk:validate(value)
			return self.dt:hexstring(value)
		end

	local opt_identity = MqttBroker:option("identity")
		function opt_identity:validate(value)
			return self.dt:uciname(value)
		end

	local opt_persistence = MqttBroker:option("persistence")
		function opt_persistence:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_anonymous_access = MqttBroker:option("anonymous_access")
		function opt_anonymous_access:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_require_certificate = MqttBroker:option("require_certificate")
		function opt_require_certificate:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_require_certificate:get(value)
			if value then return value end
			if self:get_abs_value(self.config, self.sid, "use_tls_ssl") ~= "1" then return end
			return "1"
		end

	-- File uploads
	local opt_device_sec_files = MqttBroker:option("device_sec_files")
		function opt_device_sec_files:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_device_sec_files:set(value)
			self:table_set(self.config, self.sid, "_device_sec_files", value)
		end
		function opt_device_sec_files:get()
			return self:table_get(self.config, self.sid, "_device_sec_files")
		end

	MqttBroker:option("ca_file", {
		certificate = {
			service = "mqtt",
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			failsafe = true
		}
	})

	MqttBroker:option("cert_file", {
		certificate = {
			service = "mqtt",
			cert_types = { "certificates" },
			failsafe = true
		}
	})

	MqttBroker:option("key_file", {
		certificate = {
			service = "mqtt",
			cert_types = { "keys" },
			failsafe = true
		}
	})

	local acl_file_path = MqttBroker:option("acl_file_path", {file = true})

	local password_file = MqttBroker:option("password_file", {file = true})

	local max_queued_msg = MqttBroker:option("max_queued_messages")
		function max_queued_msg:validate(value)
			return self.dt:irange(value, 0, 65535)
		end

	local opt_custom_enabled = MqttBroker:option("custom_enabled")
		function opt_custom_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local custom_section_id = MqttBroker:option("custom_section_id", {file = true})
	custom_section_id.file_size = 16777216

	local max_packet_size = MqttBroker:option("max_packet_size")
		function max_packet_size:validate(value)
			return self.dt:irange(value, 1, 268435456)
		end
		function max_packet_size:get(value)
			return value or "1048576" -- 1 MiB
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function Mqtt:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "mosquitto")
	return { path = path }
end

return Mqtt
