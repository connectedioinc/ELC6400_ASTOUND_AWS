local util = require("vuci.util")

local azure_utils = util.class()
function azure_utils.__init__(self, service, from_data_sender)
	self.service = service
	self.from_data_sender = from_data_sender or false
end

---Check if option is not null and check if option is equal to value
---@param option string
---@param value string
---@return boolean
local function check_if_equal(option, value)
	return option == value
end

---Get abs_value for option_name
---@param option_name string
---@return string
function azure_utils:get_option_value(option_name)
	return self.service:get_abs_value(self.service.config, self.service.sid, option_name)
end

---Parse Azure Iot Hub connection string to hostname and deviceid parts
---@param connection_string string?
---@return table { hostname: string, deviceid: string }
function azure_utils:parse_connection_string(connection_string)
	local data = {}
	for key, value in string.gmatch(connection_string or "", "(%w+)=([^;]+)") do
		key = string.lower(key)
		if ({hostname = true, deviceid = true})[key] then
			data[key] = value
		end
	end
	return data
end

---Checks if connnection is equal then connection_type is 'iothub'
---@param s table section with which it is compared
---@return nil|string section id
function azure_utils:check_if_equal_iothub(s)
	if s.connection_type ~= "iothub" and not s.connection_string then return end
	local splited_conn_str = azure_utils:parse_connection_string(s.connection_string)
	if not splited_conn_str.deviceid or not splited_conn_str.hostname then return end
	if #util.keys(splited_conn_str) ~= 0 and util.deep_compare(self.parsed_conn_str, splited_conn_str) then
		return s[".name"]
	end
end

---Checks if connnection is equal then connection_type is 'provisioning'
---@param s table section with which it is compared
---@return nil|string section_id section id which is equal
function azure_utils:check_if_equal_provisioning(s)
	if s.connection_type ~= "provisioning" then return end
	local prov_opt_from_s = {
		id_scope = s.id_scope,
		registration_id = s.registration_id,
		global_prov_uri = s.global_prov_uri
	}
	return util.deep_compare(prov_opt_from_s, self.prov_opt) and s[".name"]
end

---Find Data to Server Output section which use azure section which id is 'azure_section_id'
---@param azure_section_id string Azure Iot Hub section id
---@return table ds_output_section Data to Server Output instance configuration
function azure_utils:find_ds_output_by_azure_section_id(azure_section_id)
	local ds_output_section
	self.service:table_foreach("data_sender", "output", function(s)
		if s.plugin == "ubus" and s.ubus_object == "azure." .. azure_section_id then
			ds_output_section = s
			return false
		end
	end)
	return ds_output_section
end

---Find Data to Server Collection section which use azure section which id is 'azure_section_id' as output
---@param azure_section_id string Azure Iot Hub section id
---@return table ds_collection_section Data to Server Collection instance configuration
function azure_utils:find_ds_collection_by_azure_section_id(azure_section_id)
	local ds_output = self:find_ds_output_by_azure_section_id(azure_section_id)
	local ds_collection_section
	self.service:table_foreach("data_sender", "collection", function(s)
		if s.output == ds_output[".name"] then
			ds_collection_section = s
			return false
		end
	end)

	return ds_collection_section
end

---Throws an error message when a duplicate section is found when its ID is passed through parameters
---@param section_id string duplicate section ID
---@return nil
function azure_utils:throw_error_message(section_id)
	local section = self.service:table_get("azure_iothub", section_id)
	if section then
		local message = section.hidden == "1" and
			string.format(
				"Can't use same connection to Azure. The same connection is used by Data to Server collection which id is '%s'",
				self:find_ds_collection_by_azure_section_id(section_id)[".name"]
			) or
			string.format(
				"Can't use same connection to Azure. The same connection is used by Azure Iot Hub instance which id is'%s'",
				section_id
			)
		return self.service:add_critical_error(STD_CODES.INVALID_OPT, message, "Validation")
	end
end

---Parse Azure Iot Hub connection type and related values
---@return nil|string azure_section_id Azure Iot Hub section ID
---@return nil|string opt_connection_type Azure Iot Hub Connection Type
function azure_utils:parse_connection()
	local azure_section_id, opt_connection_type

	if self.from_data_sender then
		local ubus_obj = self.service:get_abs_value(self.service.config, self.service.sid, "ubus_object")
		azure_section_id = ubus_obj and ubus_obj:match("azure%.(.*)") or nil
		
		if self.service:get_abs_value(self.service.config, self.service.sid, "azure_configuration_type") == "existing" then
			return
		end
	else
		azure_section_id = self.service.sid
	end
	if not azure_section_id then return end
	opt_connection_type = self.service:get_abs_value("azure_iothub", azure_section_id, "connection_type")

	if opt_connection_type == "iothub" then
		local opt_connection_string = self.service:get_abs_value("azure_iothub", azure_section_id, "connection_string") or ""
		self.parsed_conn_str = self:parse_connection_string(opt_connection_string)
	end

	if opt_connection_type == "provisioning" then
		self.prov_opt = {
			id_scope        = self.service:get_abs_value("azure_iothub", azure_section_id, "id_scope"),
			registration_id = self.service:get_abs_value("azure_iothub", azure_section_id, "registration_id"),
			global_prov_uri = self.service:get_abs_value("azure_iothub", azure_section_id, "global_prov_uri")
		}
	end

	return azure_section_id, opt_connection_type
end

---Check if exist same Azure Iot Hub connection configuration if exist then throw error
function azure_utils:validate_is_duplicated_login()
	local azure_section_id, opt_connection_type = self:parse_connection()
	if not azure_section_id or not opt_connection_type then return end

	local section_id
	self.service:table_foreach("azure_iothub", "azure_iothub", function(s)
		if s[".name"] == azure_section_id then return end
		if opt_connection_type == "iothub" and self.parsed_conn_str then
			section_id = self:check_if_equal_iothub(s)
		end
		if opt_connection_type == "provisioning" and self.prov_opt then
			section_id = self:check_if_equal_provisioning(s)
		end
		if section_id then return false end
	end)
	if section_id then self:throw_error_message(section_id) end
end

-------------------------------------------------------------------------------- Require Validation ----------------------------------------------------

---Check if need add 'model_id' option name to required options list
function azure_utils:require_validation_pnp()
	if self:get_option_value("direct_methods_enabled") == "1" then
		table.insert(self.required_options, "model_id")
	end
end

---Add 'connection_string' option name to required options list
function azure_utils:require_validation_iothub()
	table.insert(self.required_options, "connection_string")
end

---Add option names to required options list which related with provisioning connection type
function azure_utils:require_validation_provisioning()
	local base_required_options = { "attestation_mechanism", "registration_id", "id_scope", "global_prov_uri" }
	self.required_options = util.combine(self.required_options, base_required_options)

	local opt_attestation_mechanism = self:get_option_value("attestation_mechanism")

	if opt_attestation_mechanism == "x509_certificate" then
		self.required_options = util.combine(self.required_options, { "x509certificate", "x509privatekey" })
	elseif opt_attestation_mechanism == "symmetric_key" then
		self.required_options = util.combine(self.required_options, { "symmetric_key" })
	end
end

---Determining which options are required
---@return nil|table self.required_options Required option names list
function azure_utils:require_validation()
	if self:get_option_value("enabled") ~= "1" then return end
	self.required_options = { "connection_type" }
	local opt_connection_type = self:get_option_value("connection_type")

	if opt_connection_type == "iothub" then
		self:require_validation_iothub()
	end

	if opt_connection_type == "provisioning" then
		self:require_validation_provisioning()
	end

	self:require_validation_pnp()
	return self.required_options
end

return azure_utils
