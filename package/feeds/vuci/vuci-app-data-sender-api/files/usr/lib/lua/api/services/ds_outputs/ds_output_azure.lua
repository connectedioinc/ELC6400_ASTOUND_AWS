local module = {}

function module:endpoint(service, s, bundle, output_type)

	output_type.require["azure"] = { "azure_configuration_type" }

	function service:azure_get(opt_name)
		if self:get_abs_value(self.config, self.sid, "azure_configuration_type") == "existing" then
			return nil
		end

		local azure_section_id = bundle.d_utils:get_azure_section_id(_, self)
		if not azure_section_id then return end

		return self:table_get("azure_iothub", azure_section_id, opt_name)
	end

	function service:azure_set(opt_name, value)
		local opt_configuration_type = self:getter_wrapped_abs_value(self.config, self.sid, "azure_configuration_type")
		if opt_configuration_type == "existing" then return end

		local azure_section_id = bundle.d_utils:get_azure_section_id(_, self)
		if not azure_section_id or not self:table_get("azure_iothub", azure_section_id) then return end

		self:table_set("azure_iothub", azure_section_id, opt_name, value)
	end

	function service:create_azure_section()
		local opt_configuration_type = self:get_abs_value(self.config, self.sid, "azure_configuration_type")
		if opt_configuration_type ~= "unique" then return end

		local azure_section_id = self:next_id("azure_iothub")
		if not self:table_get("azure_iothub", azure_section_id) then
			local collection_enabled = self:get_abs_value(self.config, bundle.d_utils:find_collection_id(self.sid, "output"), "enabled")
			local azure_enabled = collection_enabled or "1"
			self:table_section("azure_iothub", "azure_iothub", azure_section_id, { enabled = azure_enabled, hidden = "1" })
		end

		self:table_set(self.config, self.sid, "ubus_object", "azure." .. azure_section_id)
		self:table_set(self.config, self.sid, "ubus_method", "message")
	end

	function service:PUT_section_init_hook()
		local opt_plugin = self:getter_wrapped_abs_value(self.config, self.sid, "plugin")
		if opt_plugin ~= "azure" then return end
		local opt_configuration_type = self:get_abs_value(self.config, self.sid, "azure_configuration_type") or "unique"
		self.current_data_block["azure_configuration_type"] = opt_configuration_type

		local opt_azure_attestation_mechanism = self:azure_get("attestation_mechanism") or self.current_data_block["azure_attestation_mechanism"]
		local opt_azure_connection_type = self:azure_get("connection_type") or self.current_data_block["azure_connection_type"]

		if opt_configuration_type == "unique" and opt_azure_connection_type == "provisioning" and not opt_azure_attestation_mechanism then
			self.current_data_block["azure_attestation_mechanism"] = "x509_certificate"
		end
	end

	function service:validate_creation(configuration_type, value)
		if not value or value == "" then return end
		local opt_configuration_type = self:get_abs_value(self.config, self.sid, "azure_configuration_type") 
		if configuration_type == "unique" and opt_configuration_type ~= "unique" then
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "To create a unique Azure IoT Hub section, please set 'azure_configuration_type' to 'unique'.")
		end
		if configuration_type == "existing" and opt_configuration_type ~= "existing" then
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "To select an existing Azure IoT Hub section, please set 'azure_configuration_type' to 'existing'.")
		end
	end

	local configuration_type = s:option("azure_configuration_type")
	configuration_type.require = {
		["unique"]		= { "azure_connection_type" },
		["existing"]	= { "azure_section_name" }
	}
	function configuration_type:validate(value)
		return self.dt:check_array(value, { "unique", "existing" })
	end

	configuration_type.original_set = configuration_type.set
	function configuration_type:set(value)
		local old_value = self:table_get(self.config, self.sid, self.api_key)
		if old_value == "unique" and value == "existing" then
			bundle.d_utils:delete_azure_section()
		end
		if (old_value == "existing" or not old_value or old_value == "") and value == "unique" then
			self:table_delete(self.config, self.sid, "ubus_object")
			self:table_delete(self.config, self.sid, "ubus_method")
			self:create_azure_section()
		end
		self:original_set(value)
	end

	local azure_section_name = s:option("azure_section_name")
	function azure_section_name:validate(value)
		self:validate_creation("existing", value)
		local azure_section_names = {}
		self:table_foreach("azure_iothub", "azure_iothub", function(s)
			if s.name and s.enabled == "1" then
				table.insert(azure_section_names, s.name)
			end
		end)
		return self.dt:check_array(value, azure_section_names)
	end

	function azure_section_name:get()
		local azure_section_id = bundle.d_utils:get_azure_section_id(_, self)
		if not azure_section_id then return nil end
		return self:get_abs_value("azure_iothub", azure_section_id, "name")
	end

	function azure_section_name:set(value)
		local opt_configuration_type = self:get_abs_value(self.config, self.sid, "azure_configuration_type")
		if opt_configuration_type ~= "existing" then return end

		local azure_section_id
		self:table_foreach("azure_iothub", "azure_iothub", function(s)
			if s.name == value then
				azure_section_id = s[".name"]
			end
		end)

		if not azure_section_id then return end

		self:table_set(self.config, self.sid, "ubus_object", "azure." .. azure_section_id)
		self:table_set(self.config, self.sid, "ubus_method", "message")
	end

	local azure_connection_type = s:option("azure_connection_type")
	azure_connection_type.require = {
		["iothub"]			= { "azure_connection_string" },
		["provisioning"]	= { "azure_id_scope", "azure_registration_id", "azure_global_prov_uri", "azure_attestation_mechanism" }
	}
	function azure_connection_type:validate(value)
		self:validate_creation("unique", value)
		return self.dt:check_array(value, { "iothub", "provisioning" })
	end

	function azure_connection_type:get()
		return self:azure_get("connection_type")
	end

	function azure_connection_type:set(value)
		self:azure_set("connection_type", value)
	end

	local azure_attestation_mechanism = s:option("azure_attestation_mechanism")
	azure_attestation_mechanism.require = {
		["x509_certificate"] = { "azure_x509certificate", "azure_x509privatekey" },
		["symmetric_key"] = { "azure_symmetric_key" }
	}
	function azure_attestation_mechanism:validate(value)
		self:validate_creation("unique", value)
		return self.dt:check_array(value, { "x509_certificate", "symmetric_key" })
	end

	function azure_attestation_mechanism:get()
		local attestation_mechanism_value = self:azure_get("attestation_mechanism")
		local opt_azure_connection_type = self:azure_get("connection_type") or self.current_data_block["azure_connection_type"]
		local opt_azure_configuration_type= self:get_abs_value(self.config, self.sid, "azure_configuration_type")
		if opt_azure_configuration_type == "unique" and opt_azure_connection_type == "provisioning" and not attestation_mechanism_value then
			attestation_mechanism_value = "x509_certificate"
			self:azure_set("attestation_mechanism", "x509_certificate")
		end
		return attestation_mechanism_value
	end

	function azure_attestation_mechanism:set(value)
		self:azure_set("attestation_mechanism", value)
	end

	local azure_connection_string = s:option("azure_connection_string")
	azure_connection_string.maxlength = 4096
	function azure_connection_string:validate(value)
		self:validate_creation("unique", value)
		return self.dt:string(value)
	end

	function azure_connection_string:get()
		return self:azure_get("connection_string")
	end

	function azure_connection_string:set(value)
		self:azure_set("connection_string", value)
	end

	local azure_global_prov_uri = s:option("azure_global_prov_uri")
	function azure_global_prov_uri:validate(value)
		self:validate_creation("unique", value)
		return self.dt:string(value)
	end

	function azure_global_prov_uri:get()
		return self:azure_get("global_prov_uri")
	end

	function azure_global_prov_uri:set(value)
		self:azure_set("global_prov_uri", value)
	end

	local azure_id_scope = s:option("azure_id_scope")
	azure_id_scope.maxlength = 100
	function azure_id_scope:validate(value)
		self:validate_creation("unique", value)
		return self.dt:string(value)
	end

	function azure_id_scope:get()
		return self:azure_get("id_scope")
	end

	function azure_id_scope:set(value)
		self:azure_set("id_scope", value)
	end

	local azure_registration_id = s:option("azure_registration_id")
	azure_registration_id.maxlength = 128
	function azure_registration_id:validate(value)
		self:validate_creation("unique", value)
		return self.dt:string(value)
	end

	function azure_registration_id:get()
		return self:azure_get("registration_id")
	end

	function azure_registration_id:set(value)
		self:azure_set("registration_id", value)
	end

	local azure_x509certificate = s:option("azure_x509certificate", { file = true })
	azure_x509certificate.file_size = 16777216
	azure_x509certificate._get_file_size_default = azure_x509certificate._get_file_size
	function azure_x509certificate:validate(value)
		self:validate_creation("unique", value)
		return self.dt:file_validation(value, { "/etc/vuci-uploads/", "/etc/certificates/" })
	end

	function azure_x509certificate:get()
		return self:azure_get("x509certificate")
	end

	function azure_x509certificate:set(value)
		self:azure_set("x509certificate", value)
	end

	function azure_x509certificate:_get_file_size()
		return self:_get_file_size_default(self:azure_get("x509certificate"))
	end

	local azure_x509privatekey = s:option("azure_x509privatekey", { file = true })
	azure_x509privatekey.file_size = 16777216
	azure_x509privatekey._get_file_size_default = azure_x509privatekey._get_file_size
	function azure_x509privatekey:validate(value)
		self:validate_creation("unique", value)
		return self.dt:file_validation(value, { "/etc/vuci-uploads/", "/etc/certificates/" })
	end

	function azure_x509privatekey:get()
		return self:azure_get("x509privatekey")
	end

	function azure_x509privatekey:set(value)
		self:azure_set("x509privatekey", value)
	end

	function azure_x509privatekey:_get_file_size()
		return self:_get_file_size_default(self:azure_get("x509privatekey"))
	end

	local azure_symmetric_key = s:option("azure_symmetric_key")
	azure_symmetric_key.maxlength = 128
	function azure_symmetric_key:validate(value)
		self:validate_creation("unique", value)
		return self.dt:string(value)
	end

	function azure_symmetric_key:get()
		return self:azure_get("symmetric_key")
	end

	function azure_symmetric_key:set(value)
		self:azure_set("symmetric_key", value)
	end
end

return module
