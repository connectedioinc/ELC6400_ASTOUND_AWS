local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["mqtt"] = { "mqtt_in_host", "mqtt_in_topic" }

	local mqtt_in_host = s:option("mqtt_in_host")
		function mqtt_in_host:validate(value)
			local coll = self:table_find(self.config, "collection", { input = { self.sid } })
			if self:get_abs_value(self.config, coll.output, "mqtt_host") == value then
				return false, string.format("Server address '%s' is already used for output '%s'.", value, coll.name)
			end
			return self.dt:host(value)
		end

	local mqtt_in_port = s:option("mqtt_in_port")
		function mqtt_in_port:validate(value)
			return self.dt:port(value)
		end

	local mqtt_in_keepalive = s:option("mqtt_in_keepalive")
		function mqtt_in_keepalive:validate(value)
			return self.dt:irange(value, 0, 2147483647)
		end

	local mqtt_in_topic = s:option("mqtt_in_topic")
		mqtt_in_topic.maxlength = 65535
		function mqtt_in_topic:validate(value)
			return self.dt:mqtt_client_id(value)
		end

	local mqtt_in_client_id = s:option("mqtt_in_client_id")
		mqtt_in_client_id.maxlength = 64
		function mqtt_in_client_id:validate(value)
			return self.dt:mqtt_client_id(value)
		end

	local mqtt_in_qos = s:option("mqtt_in_qos")
		function mqtt_in_qos:validate(value)
			return self.dt:check_array(value, { "0", "1", "2" })
		end

	local mqtt_in_tls = s:option("mqtt_in_tls")
		mqtt_in_tls.require = { ["1"] = {"mqtt_in_tls_type"} }
		function mqtt_in_tls:validate(value)
			return self.dt:is_bool(value)
		end

	local mqtt_in_tls_type = s:option("mqtt_in_tls_type")
		mqtt_in_tls_type.require = {
			cert = {"mqtt_in_cafile"},
			psk = {"mqtt_in_psk", "mqtt_in_identity"}
		}
		function mqtt_in_tls_type:validate(value)
			local tls_type_options = { "cert", "psk" }
			return self.dt:check_array(value, tls_type_options)
		end

	local mqtt_in_psk = s:option("mqtt_in_psk", { sensitive = true })
		mqtt_in_psk.maxlength = 128
		function mqtt_in_psk:validate(value)
			return self.dt:hexstring(value)
		end
		function mqtt_in_psk:get(value)
			local opt_plugin = self:get_abs_value(self.config, self.sid, "plugin")
			if opt_plugin ~= "mqtt" then
				return
			end
			return value
		end

	local mqtt_in_identity = s:option("mqtt_in_identity")
		mqtt_in_identity.maxlength = 255
		function mqtt_in_identity:validate(value)
			return self.dt:uciname(value)
		end

	local mqtt_device_files = s:option("mqtt_device_files")
		function mqtt_device_files:validate(value)
			return self.dt:is_bool(value)
		end

	s:option("mqtt_in_cafile", {
		certificate = {
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			length_warnings = true,
			failsafe = true
		}
	})

	s:option("mqtt_in_certfile", {
		certificate = {
			cert_types = { "certificates" },
			length_warnings = true,
			failsafe = true
		}
	})

	s:option("mqtt_in_keyfile", {
		certificate = {
			cert_types = { "keys" },
			failsafe = true
		}
	})

	local mqtt_in_insecure = s:option("mqtt_in_insecure")
		function mqtt_in_insecure:validate(value)
			return self.dt:is_bool(value)
		end

	local mqtt_in_username = s:option("mqtt_in_username")
		mqtt_in_username.maxlength = 512
		function mqtt_in_username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local mqtt_in_password = s:option("mqtt_in_password", { sensitive = true })
		mqtt_in_password.maxlength = 512
		function mqtt_in_password:validate(value)
			return self.dt:credentials_validate(value)
		end
		function mqtt_in_password:get(value)
			local opt_plugin = self:get_abs_value(self.config, self.sid, "plugin")
			if opt_plugin ~= "mqtt" then
				return
			end
			return value
		end

end
return module