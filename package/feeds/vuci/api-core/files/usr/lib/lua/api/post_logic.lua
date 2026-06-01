local api_utils = require("api/api_utils")
local uci = require("vuci.uci")
local o = {}

function o:get_section_sid(section)
	if self.flags.anonymous then
		return nil
	end
	return section:_get_sid(self.sid)
end

function o:POST()
	self:validate_body()
	if self.service_group == self.service_groups_enum.actions then
		self:POST_action()
	elseif self.service_group == self.service_groups_enum.config then
		self:POST_configuration()
	end
	return self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "POST not implemented", "Request", "501")
end

function o:POST_configuration()
	uci.show_commit_or_revert_warning = true
	self:validate_service_group()

	self:POST_init_hook()

	self:populate_configs()

	self:POST_validate()

	self:POST_validate_hook()

	self:POST_delegator()

	self:return_if_error()

	self:POST_create_uci_sections()

	self:POST_before_commit_hook()

	self:auxiliary_sections()

	self:set_uci_values()

	self:_perform_reorder()

	self:POST_commit()

	if not self.bulk then
		self:POST_after_commit_hook()
	end

	self:POST_format_response()

	self:POST_response()
end

function o:POST_reorder()
	self:_perform_reorder()
end

function o:POST_init_hook()
end

function o:POST_validate()
	if self.flags.create == false then
		self:add_critical_error(
			STD_CODES.NO_CREATE,
			"Section creation is not allowed",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end
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
				"Invalid POST structure, illegal argument provided: " .. illegal_argument,
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
	end
	if not self.flags.anonymous and not self.flags.increment_name and not self.arguments.data then
		self:add_critical_error(
			STD_CODES.INVALID_STRUCT,
			"Invalid POST structure, data field is missing",
			"Validation",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end
	if self.service_group == "config" and self.sid ~= nil then
		self:add_critical_error(
			STD_CODES.INVALID_SID_USAGE,
			"ID cannot be used in URL while performing POST method",
			"Validation",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end

	local data = self.arguments.data
	if not (type(data) == "table" and (not api_utils:is_array(data) or api_utils:is_table_empty(data))) then
		self:add_critical_error(
			STD_CODES.INVALID_STRUCT,
			"Invalid POST structure, data field must be an object",
			"Validation",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end
end

function o:POST_validate_hook()
end

-- can be expanded to add many sections
function o:POST_delegator()
	self:array_error()
	self.current_data_block = self.arguments.data or {}
	if self.flags.anonymous then
		self.sid = '.anonymous'
	elseif self.flags.increment_name then
		self.sid = self:next_id()
	else
		self.sid = self.arguments.data.id
		if self.sid == nil or self.sid == "" then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "'id' is required.", "id")
		end
		if type(self.sid) ~= "string"  then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "'id' is provided in incorrect format, string format allowed.")
		end
	end
	self.current_uci_section_valid = true
	self:POST_section_logic()
end

function o:POST_section_logic()
	self:section_general()

	self:POST_section_init_hook()

	self:POST_validate_section()

	if self.current_uci_section_validations.valid_data_types then
		self:POST_validate_section_hook()

		self:POST_add_defaults()
	end

	self:POST_data()

	if self.current_uci_section_validations.valid_data_types and
		self.current_uci_section_validations.valid_requires_and_other_constraints then
		self:POST_after_validate_section_hook()
	end

	if self.current_uci_section_valid then
		self:POST_after_data_hook()
	end
end

function o:POST_before_commit_hook()
end

function o:POST_commit()
	self.t_func:general_commit()
end

function o:POST_after_commit_hook()
end

function o:POST_format_response()
	-- !should be changed with many sections creation support, as in POST with array of sections to create
	for _, s in pairs(self.sections) do
		if s.primary_section then
			self.response_table = self:retrieve_section()
			self.response_table[".type"] = s:_get_section_type()
			self.response_table.id = self.sid
			break
		end
	end
end

function o:POST_response()
	self:return_if_error()
	self:reformat_response()
	self:before_response_hook()
	self:ResponseCreated(self.response_table, self.messages)
end

function o:POST_section_init_hook()
end

function o:POST_validate_section()
	local args = self.current_data_block
	if not self.flags.anonymous and not self.flags.increment_name and (not args.id or args.id == "") then
		self:add_critical_error(
			STD_CODES.NAME_NOT_PROVIDED,
			"Section id not provided",
			"Validation"
		)
	end
	if self.t_func:get_uci_config(self.main_config)[args.id] then
		self:add_error(
			STD_CODES.NAME_USED,
			"Name already used for a configuration",
			"Validation"
		)
	end

	self:validate_data_types()
end

function o:POST_validate_section_hook()
end

-- FIXME: maybe an API logic restructuring. Motive - most template steps iterate self.sections
-- repeating iteration could be moved outside the template logic of the delegators insides - "section_logic"
-- delegator could call section_logic which would iterate through self.sections and call template steps for every section if applicable
function o:POST_add_defaults()
	for _, s in pairs(self.sections) do
		local id = s:_get_sid(self.sid)
		local config_sections = self.t_func:get_uci_config(s.config) or {}
		local config_size = api_utils:table_length(config_sections)
		self:table_set(s.config, id, ".index", config_size)

		for opt, value in pairs(s:create_defaults(self.sid)) do
			-- Only setting defaults if value wasn't received with request body, to not perform unnecessary actions
			if not self.current_data_block[opt] then
				self:table_set(s.config, id, opt, value)
			end
		end
		self.t_func.config_set_table[s.config] = self.t_func.config_set_table[s.config] and self.t_func.config_set_table[s.config] or {}
	end
end

function o:POST_data()
	self:general_data()
end

function o:POST_after_validate_section_hook()
end

function o:POST_after_data_hook(_)
end

-- FIXME "Creating" a section should not be a separate action, it should be part of the main process of adding
-- all sections to the config. Right now this disrupts the queue - sections that are set to be created
-- earlier in code than main POST appear lower in the config
function o:POST_create_uci_sections()
	for _, s in pairs(self.sections) do
		local create_sid = self:get_section_sid(s)
		local post_options
		if self.sid ~= ".anonymous" then
			post_options = api_utils:is_table_empty(self.t_func.config_set_table[s.config][s:_get_sid(self.sid)]) and {} or
				self.t_func.config_set_table[s.config][s:_get_sid(self.sid)]
		else
			post_options = api_utils:is_table_empty(self.t_func.config_set_table[s.config]) and {} or
				self.t_func.config_set_table[s.config][s:_get_sid(self.sid)]
		end
		post_options = self:filter_dot_options(post_options)
		local sid, err = self.uci:section(s.config,
			s:_get_section_type(),
			create_sid,
			post_options)

		if err then
			self:add_critical_error(
				STD_CODES.UCI_CREATE_ERROR,
				string.format("Failed to create section: %s. Message (%s)", self.sid, err),
				"UCI"
			)
		end

		-- FIXME: improve logic to change ".anonymous" sid
		if self.flags.anonymous and not api_utils:is_table_empty(self.t_func.config_set_table[s.config]) then
			self.t_func.config_set_table[s.config][sid] = post_options
			self.t_func.config_set_table[s.config][s:_get_sid(self.sid)] = nil
		end

		self.t_func.config_set_table[s.config][sid][".type"] = s:_get_section_type()
		self.t_func.config_set_table[s.config][sid][".name"] = sid

		if s.primary_section then
			self.sid = sid
		end
	end
end

return o
