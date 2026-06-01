local ConfigService = require("api/ConfigService")
local certs = require("vuci.certificates")
local util = require("vuci.util")

local MqttBridge = ConfigService:new({ increment_name = true })
local ERR_CODES = {
	TOPIC_REQUIRED = 1
}
local MSG_CODES = {
	DEPRECATED_TLS = 1,
}

function MqttBridge:after_data_hook()
	local version = self:get_abs_value(self.config, self.sid, "bridge_tls_version")
	if version == "tlsv1.1" or version == "tlsv1" then
		self:add_message(MSG_CODES.DEPRECATED_TLS, "TLS 1.0 and TLS 1.1 are deprecated and considered insecure. Please upgrade to a newer TLS version.", "bridge_tls_version")
	end
end
MqttBridge.PUT_after_data_hook = MqttBridge.after_data_hook
MqttBridge.GET_after_data_hook = MqttBridge.after_data_hook
MqttBridge.POST_after_data_hook = MqttBridge.after_data_hook

local s = MqttBridge:section("mosquitto", "bridge")
function s:create_defaults()
	return {
		bridge_protocol_version = "mqttv31",
		remote_port 			= "1883",
		keepalive_interval 		= "60",
		connection_name = require("vuci.util_tlt").get_next_name(self, self.config, self.section_type, "connection_name", "bridge")
	}
end

local enabled

function MqttBridge:require_validation()
	local required_options = {"bridge_protocol_version", "remote_addr", "remote_port"}
	local opt_use_remote_tls = self:get_abs_value(self.config, self.sid, "use_remote_tls")
	if opt_use_remote_tls and opt_use_remote_tls == "1" then
		table.insert(required_options, "bridge_cafile")
		table.insert(required_options, "bridge_tls_version")
	end
	local opt_bridge_login = self:get_abs_value(self.config, self.sid, "use_bridge_login")
	if opt_bridge_login and opt_bridge_login == "1" then
		table.insert(required_options, "remote_clientid")
	end
	enabled.require = {["1"] = required_options}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	enabled = s:option("client_enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local connection_name = s:option("connection_name")
	connection_name.maxlength = 64
	connection_name.cfg_require = true
	function connection_name:validate(value)
		local name_exists = false
		self:table_foreach("mosquitto", "bridge", function(s)
			if s["connection_name"] == value and s[".name"] ~= self.sid then
				name_exists = true
			end
		end)
		if name_exists then
			return false, "Bridge with connection name '".. value .."' already exists"
		end
		return self.dt:nospace(value)
	end

	local bridge_prot_version = s:option("bridge_protocol_version")
		function bridge_prot_version:validate(value)
			return self.dt:check_array(value, { "mqttv31", "mqttv311", "mqttv50" })
		end

	local remote_addr = s:option("remote_addr")
		function remote_addr:validate(value)
			return self.dt:host(value)
		end

	local remote_port = s:option("remote_port")
		function remote_port:validate(value)
			return self.dt:port(value)
		end

	local use_remote_tls = s:option("use_remote_tls")
		function use_remote_tls:validate(value)
			return self.dt:is_bool(value)
		end

	local cert_from_device = s:option("device_brg_files")
		function cert_from_device:validate(value)
			return self.dt:is_bool(value)
		end
		function cert_from_device:set(value)
			self:table_set(self.config, self.sid, "_device_brg_files", value)
		end
		function cert_from_device:get()
			return self:table_get(self.config, self.sid, "_device_brg_files")
		end

	s:option("bridge_cafile", {
		certificate = {
			service = "mqtt_bridge",
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			failsafe = true
		}
	})

	s:option("bridge_certfile", {
		certificate = {
			service = "mqtt_bridge",
			cert_types = { "certificates" },
			failsafe = true
		}
	})

	s:option("bridge_keyfile", {
		certificate = {
			service = "mqtt_bridge",
			cert_types = { "keys" },
			failsafe = true
		}
	})

	local bridge_tls_version = s:option("bridge_tls_version")
		function bridge_tls_version:validate(value)
			return self.dt:check_array(value, { "tlsv1", "tlsv1.1", "tlsv1.2", "tlsv1.3" })
		end

	local opt_bridge_alpn = s:option("bridge_alpn")
		opt_bridge_alpn.maxlength = 254
		function opt_bridge_alpn:validate(value)
			return self.dt:string(value)
		end

	local bridge_insecure = s:option("bridge_insecure")
		function bridge_insecure:validate(value)
			return self.dt:is_bool(value)
		end

	local bridge_login = s:option("use_bridge_login")
		function bridge_login:validate(value)
			return self.dt:is_bool(value)
		end

	local remote_client_id = s:option("remote_clientid")
	remote_client_id.maxlength = 256
		function remote_client_id:validate(value)
			return self.dt:credentials_validate(value)
		end

	local remote_username = s:option("remote_username")
		remote_username.maxlength = 512
		function remote_username:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local remote_password = s:option("remote_password", { sensitive = true })
		remote_password.maxlength = 512
		function remote_password:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local try_private = s:option("try_private")
		function try_private:validate(value)
			return self.dt:is_bool(value)
		end

	local clean_session = s:option("cleansession")
		function clean_session:validate(value)
			return self.dt:is_bool(value)
		end

	local notifications = s:option("notifications")
		function notifications:validate(value)
			return self.dt:is_bool(value)
		end

	local notifications_local = s:option("notifications_local")
		function notifications_local:validate(value)
			return self.dt:is_bool(value)
		end

	local keepalive_interval = s:option("keepalive_interval")
		function keepalive_interval:validate(value)
			return self.dt:irange(value, 5, 65535)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function MqttBridge:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "mosquitto")
	return { path = path }
end

function MqttBridge:validate_topics()
	local sections = 0
	local name = self:get_abs_value(self.config, self.sid, "connection_name") or self.current_data_block["connection_name"]
	self:table_foreach(self.main_config, "topic", function(s)
		if s.connection_name == name then
			sections = sections + 1
		end
	end)
	if sections == 0 then
		self:add_critical_error(ERR_CODES.TOPIC_REQUIRED, "At least one topic is required to enable MQTT bridge.")
	end
end

function MqttBridge:POST_validate_section_hook()
	local is_enabled = self:get_abs_value(self.config, self.sid, "client_enabled") or self.current_data_block["client_enabled"]
	if is_enabled and is_enabled == "1" then
		self:require_validation()
		self:validate_topics()
	end
end

function MqttBridge:PUT_validate_section_hook()
	local old_name = self:table_get(self.main_config, self.sid, "connection_name") or nil
	local new_name = self.current_data_block["connection_name"] or nil
	if old_name and new_name and new_name ~= old_name then
		self:table_foreach(self.main_config, "topic", function(s)
			if s.connection_name == old_name then
				self:table_set(self.main_config, s[".name"], "connection_name", new_name)
			end
		end)
	end
	local is_enabled = self:get_abs_value(self.config, self.sid, "client_enabled") or self.current_data_block["client_enabled"]
	if is_enabled and is_enabled == "1" then
		self:require_validation()
		self:validate_topics()
	end
end

function MqttBridge:DELETE_before_section_delete_hook()
	local name = self:table_get(self.main_config, self.sid, "connection_name")
	self:table_foreach(self.main_config, "topic", function(s)
		if s.connection_name == name then
			self:table_delete(self.main_config, s[".name"])
		end
	end)
end

return MqttBridge
