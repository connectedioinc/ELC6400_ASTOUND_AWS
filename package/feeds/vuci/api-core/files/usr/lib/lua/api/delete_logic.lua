local api_utils = require("api/api_utils")
local uci = require("vuci.uci")
local o = {}

function o:DELETE()
	uci.show_commit_or_revert_warning = true
	self:validate_service_group()

	self:DELETE_init_hook()

	self:DELETE_validate()

	self:DELETE_validate_hook()

	self:DELETE_delegator()

	self:return_if_error()

	self:DELETE_before_commit_hook()

	self:auxiliary_sections()

	self:set_uci_values()

	self:DELETE_commit()

	self:DELETE_delete_uploaded_files()

	if not self.bulk then
		self:DELETE_after_commit_hook()
	end

	self:DELETE_response()
end

function o:DELETE_init_hook()
end

function o:DELETE_validate()
	-- temporary please remove when full argument validation is added, currently you can send whatever you want there
	if type(self.arguments) == "table" then
		local params = { method = true, endpoint = true, data = true }
		local illegal_argument = nil
		for key, _ in  pairs(self.arguments) do
			if not params[key] then
				illegal_argument = key
				break
			end
		end
		if illegal_argument then
			return self:add_critical_error(
				STD_CODES.INVALID_STRUCT,
				"Invalid DELETE structure, illegal argument provided: " .. illegal_argument,
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
	end
	if self.flags.delete == false then
		self:add_critical_error(
			STD_CODES.NO_DELETE,
			"Section deletion is not allowed",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end
	if not self._single and type(self.arguments.data) ~= "nil" and not api_utils:is_array(self.arguments.data) then
		self:add_critical_error(
			STD_CODES.INVALID_STRUCT,
			"Invalid data structure, only an array is acceptable",
			"Validation",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end
	if not self.sid then
		if type(self.arguments) == "string" then
			self:add_critical_error(
				STD_CODES.INVALID_STRUCT,
				"Invalid DELETE structure, data field must be an object",
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		elseif api_utils:is_table_empty(self.arguments) or type(self.arguments.data) ~= "table" or api_utils:is_table_empty(self.arguments.data) then
			self:add_error(
				STD_CODES.CONF_DEL_DISALLOWED,
				"Deletion of whole configuration is not allowed",
				"Validation"
			)
		end
	end
end

function o:DELETE_validate_hook()
end

function o:DELETE_delegator()
	if self._single then
		self:array_error()
		self.response_table = self:DELETE_section_logic()
	else
		if self.arguments and self.arguments.data and api_utils:is_array(self.arguments.data) then
			for _, sid in pairs(self.arguments.data) do
				self.sid = sid
				self.current_data_block = sid
				table.insert(self.response_table, self:DELETE_section_logic())
			end
		end
	end
end

function o:DELETE_before_commit_hook()
end

function o:DELETE_commit()
	for _, s in pairs(self.sections) do
		if self.t_func:get_uci_config() and self.t_func:get_uci_config(s.config) and self.t_func:get_uci_config(s.config)[s:_get_sid(self.sid)] then
			self.t_func:get_uci_config(s.config)[s:_get_sid(self.sid)] = nil
		end
	end
	self.t_func:general_commit()
end

function o:DELETE_after_commit_hook()
end

function o:DELETE_response()
	self:general_response()
end

function o:DELETE_get_files_to_delete()
	for _, o in pairs(self._file_options) do
		local file_type
		if not api_utils:is_table_empty(o.certificate) then
			file_type = o.certificate.tpm2 and "tpm2" or "cert"
		end
		local filename = o:get(self.uci:get(o.config, self.sid, o.api_key))
		if o.list and filename then
			for _, file in pairs(filename) do
				o:add_files_to_delete(file, file_type)
			end
		else
			o:add_files_to_delete(filename, file_type)
		end
	end
end

function o:DELETE_section_logic()
	self:DELETE_section_init_hook()

	self:DELETE_validate_section()

	self:DELETE_validate_section_hook()

	self:DELETE_get_files_to_delete()

	self:DELETE_before_section_delete_hook()

	local response_data = self:DELETE_data()

	self:DELETE_after_data_hook(response_data)

	return response_data
end

function o:DELETE_section_init_hook()
end

function o:DELETE_before_section_delete_hook()
end

function o:DELETE_validate_section()
	if type(self.sid) ~= "string" then
		self:add_critical_error(STD_CODES.INVALID_STRUCT, "Malformed DELETE request.", "Validation")
	end
	self:Exists()
end

function o:DELETE_data()
	for _, s in pairs(self.sections) do
		local _, err = self.uci:delete(s.config, s:_get_sid(self.sid))
		if not s.optional and err then
			self:add_critical_error(
				STD_CODES.UCI_DELETE_ERROR,
				string.format("DELETE of section '%s' in configuration '%s' failed. Message (%s) ",
					s:_get_sid(self.sid),
					s.config, err
				),
				"UCI"
			)
		end

		-- need to refresh config in order for the table_* functions to see the changes
		self.t_func:_get_config(s.config)
	end
	return { id = self.sid }
end

function o:DELETE_after_data_hook(_)
end

function o:DELETE_validate_section_hook()
end

function o:DELETE_delete_uploaded_files()
	return self:general_delete_uploaded_files()
end

return o
