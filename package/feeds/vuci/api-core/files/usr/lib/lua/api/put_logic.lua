local api_utils = require("api/api_utils")
local uci = require("vuci.uci")
local o = {}

function o:PUT()
	uci.show_commit_or_revert_warning = true
	self:validate_service_group()

	self:PUT_init_hook()

	self:PUT_validate()

	self:PUT_validate_hook()

	self:PUT_general_section_reformat()

	self:populate_configs()

	self:PUT_delegator()

	self:return_if_error()

	self:PUT_before_commit_hook()

	self:auxiliary_sections()

	self:set_uci_values()

	self:_perform_reorder()

	self:PUT_commit()

	self:PUT_delete_uploaded_files()

	if not self.bulk then
		self:PUT_after_commit_hook()
	end

	self:PUT_format_response()

	self:PUT_response()
end

function o:PUT_reorder()
	self:_perform_reorder()
end

function o:PUT_format_response()
	if self._single or self.flags.global_settings then
		self.response_table = self:retrieve_section()
	else
		if self.arguments and self.arguments.data then
			for _, data in pairs(self.arguments.data) do
				self.sid = data.id
				self.current_data_block = data
				table.insert(self.response_table, self:retrieve_section())
			end
		end
	end
end

function o:PUT_init_hook()
end

function o:PUT_general_section_reformat()
	if self.flags.global_settings then
		self.sid = self:_get_general_section()
	else
		if self.flags.general_section and not self._single then
			for _, sec in pairs(self.arguments.data) do
				if sec.id == "general" then
					sec.id = self:_get_general_section()
				end
			end
		end
	end
end

function o:PUT_validate()
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
				"Invalid PUT structure, illegal argument provided: " .. illegal_argument,
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
	end
	if not self.arguments.data then
		self:add_critical_error(
			STD_CODES.INVALID_STRUCT,
			"Invalid PUT structure, data field is missing",
			"Validation",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end
	local data = self.arguments.data

	if self._single or self.flags.global_settings then
		if type(data) ~= "table" then
			self:add_critical_error(
				STD_CODES.INVALID_STRUCT,
				"Invalid PUT structure, data field must be an object",
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
	else
		if not (type(data) == "table" and (api_utils:is_array(data) or api_utils:is_table_empty(data))) then
			self:add_critical_error(
				STD_CODES.INVALID_STRUCT,
				"Invalid PUT structure, data field must be an array",
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
		for _, section in ipairs(data) do
			if type(section) ~= "table" then
				self:add_critical_error(
					STD_CODES.INVALID_STRUCT,
					"Invalid PUT structure, element in data array must be an object",
					"Validation",
					HTTP_STATUS_CODES.BAD_REQUEST
				)
			end
		end
	end
end

function o:PUT_validate_hook()
end

function o:_check_id()
	if self.current_data_block.id ~= nil then
		return self:add_critical_error(
		STD_CODES.INVALID_OPT,
		"'id' is not accepted for a singular configuration request.",
		"id"
		)
	end
end

function o:_validate_id(id)
	if id == nil or id == "" then
		return self:add_critical_error(STD_CODES.INVALID_SECTION, "'id' is required.", "id")
	end
	if type(id) ~= "string"  then
		return self:add_critical_error(STD_CODES.INVALID_SECTION, "'id' is provided in incorrect format, string format allowed.", "id")
	end
end

function o:PUT_delegator()
	if self._single or self.flags.global_settings then
		self:array_error()
		self.current_data_block = self.arguments.data or {}
		self:_check_id()
		self.current_data_block.id = self.sid
		self:PUT_section_logic()
	else
		if self.arguments and self.arguments.data and (api_utils:is_array(self.arguments.data) or api_utils:is_table_empty(self.arguments.data)) then
			for _, data in pairs(self.arguments.data) do
				if type(data) == "table" and next(data) ~= nil then
					self.current_uci_section_valid = true
					self:_validate_id(data.id)
					self.sid = data.id
					self.current_data_block = data
					self:PUT_section_logic()
				else
					self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Invalid data structure, only array of objects is acceptable" , "Request")
				end
			end
		else
			self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Invalid data structure, only an array is acceptable" , "Request")
		end
	end
end

function o:PUT_before_commit_hook()
end

function o:PUT_commit()
	self.t_func:general_commit()
end

function o:PUT_delete_uploaded_files()
	return self:general_delete_uploaded_files()
end

function o:PUT_after_commit_hook()
end

function o:PUT_response()
	self:general_response()
end

function o:PUT_section_logic()
	self:section_general()

	self:PUT_section_init_hook()

	self:PUT_validate_section()

	if self.current_uci_section_validations.valid_data_types then
		self:PUT_validate_section_hook()
	end

	self:PUT_data()

	if self.current_uci_section_validations.valid_data_types and
		self.current_uci_section_validations.valid_requires_and_other_constraints then
		self:PUT_after_validate_section_hook()
	end

	if self.current_uci_section_valid then
		self:PUT_after_data_hook()
	end

end

function o:PUT_section_init_hook()
end

function o:PUT_validate_section()
	if not self.sid then
		self:add_critical_error(
			STD_CODES.NAME_NOT_PROVIDED,
			"Section id not provided",
			"Validation"
		)
	end
	self:Exists()

	self:validate_data_types()
end

function o:PUT_validate_section_hook()
end

function o:PUT_data()
	self:general_data()
end

function o:PUT_after_validate_section_hook()
end

function o:PUT_after_data_hook(_)
end

return o
