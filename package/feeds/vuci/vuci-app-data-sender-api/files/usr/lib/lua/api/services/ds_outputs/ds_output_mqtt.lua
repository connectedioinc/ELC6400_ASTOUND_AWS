local module = {}

function module:endpoint(service, s, bundle, output_type)

	output_type.require["mqtt"] = { "mqtt_host", "mqtt_topic"}

	local mqtt_host = s:option("mqtt_host")
		function mqtt_host:validate(value)
			local coll = self:table_find(self.config, "collection", { output = self.sid })
			for _, input_id in ipairs(coll.input or {}) do
				local input = self:table_get(self.config, input_id)
				if input["mqtt_in_host"] == value then
					return false, string.format("Server address '%s' is already used for input '%s'.", value, input.name)
				end
			end
			return self.dt:host(value)
		end

	local mqtt_port = s:option("mqtt_port")
		function mqtt_port:validate(value)
			return self.dt:port(value)
		end

	local mqtt_keepalive = s:option("mqtt_keepalive")
		function mqtt_keepalive:validate(value)
			return self.dt:irange(value, 1, 640)
		end

	local mqtt_topic = s:option("mqtt_topic")
		mqtt_topic.maxlength = 65535
		function mqtt_topic:validate(value)
			return self.dt:mqtt_client_id(value)
		end

	local mqtt_client_id = s:option("mqtt_client_id")
		mqtt_client_id.maxlength = 64
		function mqtt_client_id:validate(value)
			return self.dt:mqtt_client_id(value)
		end

	local mqtt_qos = s:option("mqtt_qos")
		function mqtt_qos:validate(value)
			return self.dt:check_array(value, { "0", "1", "2" })
		end

	local mqtt_tls = s:option("mqtt_tls")
		mqtt_tls.require = { ["1"] = {"mqtt_tls_type"} }
		function mqtt_tls:validate(value)
			return self.dt:is_bool(value)
		end

	local mqtt_tls_type = s:option("mqtt_tls_type")
		mqtt_tls_type.require = {cert = {"mqtt_cafile"}, psk = {"mqtt_psk", "mqtt_identity"}}
		function mqtt_tls_type:validate(value)
			return self.dt:check_array(value, {"cert", "psk"})
		end

	local mqtt_device_files = s:option("mqtt_device_files")
		function mqtt_device_files:validate(value)
			return self.dt:is_bool(value)
		end

	s:option("mqtt_cafile", {
		certificate = {
			service = "data_sender_output",
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			length_warnings = true,
			failsafe = true
		}
	})

	s:option("mqtt_certfile", {
		certificate = {
			service = "data_sender_output",
			cert_types = { "certificates" },
			length_warnings = true,
			failsafe = true
		}
	})
	
	s:option("mqtt_keyfile", {
		certificate = {
			service = "data_sender_output",
			cert_types = { "keys" },
			failsafe = true
		}
	})

	local mqtt_psk = s:option("mqtt_psk", { sensitive = true })
		mqtt_psk.maxlength = 128
		function mqtt_psk:validate(value)
			return self.dt:hexstring(value)
		end

	local mqtt_identity = s:option("mqtt_identity")
		mqtt_identity.maxlength = 128
		function mqtt_identity:validate(value)
			return self.dt:uciname(value)
		end

	local mqtt_use_credentials = s:option("mqtt_use_credentials")
		mqtt_use_credentials.require = {["1"] = {"mqtt_username", "mqtt_password"}}
		function mqtt_use_credentials:validate(value)
			return self.dt:is_bool(value)
		end
	
	local mqtt_insecure = s:option("mqtt_insecure")
		function mqtt_insecure:validate(value)
			return self.dt:is_bool(value)
		end

	local mqtt_username = s:option("mqtt_username")
		mqtt_username.maxlength = 512
		function mqtt_username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local mqtt_password = s:option("mqtt_password", { sensitive = true })
		mqtt_password.maxlength = 512
		function mqtt_password:validate(value)
			return self.dt:credentials_validate(value)
		end
		function mqtt_password:get(value)
			local opt_plugin = self:get_abs_value(self.config, self.sid, "plugin")
			if opt_plugin ~= "mqtt" then
				return
			end
			return value
		end

	local mqtt_insecure = s:option("mqtt_insecure")
		function mqtt_insecure:validate(value)
			return self.dt:is_bool(value)
		end

	local mqtt_msg_count = s:option("mqtt_msg_count")
		function mqtt_msg_count:validate(value)
			return self.dt:irange(value, 0, 2147483647)
		end
end
return module