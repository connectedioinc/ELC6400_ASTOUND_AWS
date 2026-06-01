local BasicService  = require("api/BasicService")
local lua_crypto    = require("lua_crypto")
local fs = require("nixio.fs")
local api_utils     = require("api/api_utils")
local table_func	= require("api/api_table_wrapper")

local function init_http_logic(self)
	-- now this is multitrack drifting
	for _, method in pairs({"get","post" ,"put", "delete", "options"}) do
		local method_logic = require(string.format("api/%s_logic", method))
		for name, func in pairs(method_logic) do
			self[name] = func
		end
	end
end

local ConfigService = {}
--[[
	Available flags:
	-- does not allow section deletion
	- delete = false,
	-- does not allow section creation
	- create = false,
	-- allows POST without name, creates an anonymous section
	- anonymous = true,
	-- allows POST without name, creates a named section with incremental ID (number as string e.g. "1", "99" etc.)
	- increment_name  = true,
	-- accepts requests with {sid} as "general", replaces response ".name" to "general"
	- general_section = sid / function that returns sid
]]--

-- Implementation of service that has an associated configuration file
function ConfigService:new(flags)
	local o = BasicService:new()
	self.__index = self
	-- method logic must be preloaded here because otherwise
	-- it overrides other inheritance layer logic
	init_http_logic(o)

	-- options to be set by the primary or only section
	o.main_config = nil
	o.main_section_type = nil

	o.t_func = table_func:new()
	o.t_func.bulk = false
	o.uci = o.t_func.uci
	o.section_req = require("api/section_logic")

	o.flags = flags or {}
	-- flag used to check if request part of the bulk - does not commit changes on individual requests
	o.bulk = false
	-- sections added with self:section
	o.sections = {}
	-- last id received from next_id function
	o.last_id_by_config = {}
	-- table filled with values that are provided on a response as data
	o.response_table = {}
	-- data block that is currently in action, if POST/PUT is singular this is self.arguments.data
	-- otherwise it is an iterated object in self.arguments.data array
	o.current_data_block = {}
	-- order configuration
	o.order_by = nil
	-- only order response
	o.sort_response_by = ".index"
	-- used for faster file option searching
	o._file_options = {}

	o._removed_files = {}

	-- contains current uci section
	o.current_uci_section = {}
	-- contains current uci section validations state
	o.current_uci_section_valid = true
	-- contains current uci section separate validation states
	o.current_uci_section_validations = {
		valid_data_types = true,
		valid_requires_and_other_constraints = true,
	}

	-- TABLE Wrappers for easier access and backwards compatibility
	o.config_set_table =  o.t_func.config_set_table
	o.table_get = function(self, ...)
		return self.t_func:table_get(...)
	end
	o.table_set = function(self, ...)
		return self.t_func:table_set(...)
	end
	o.table_foreach = function(self, ...)
		return self.t_func:table_foreach(...)
	end
	o.table_delete = function(self, ...)
		return self.t_func:table_delete(...)
	end
	o.table_section = function(self, ...)
		return self.t_func:table_section(...)
	end
	o.table_find = function(self, ...)
		return self.t_func:table_find(...)
	end
	o.table_find_many = function(self, ...)
		return self.t_func:table_find_many(...)
	end
	o.table_count = function(self, ...)
		return self.t_func:table_count(...)
	end
	o.commit = function(self, ...)
		return self.t_func:commit(...)
	end

	setmetatable(o, self)

	function o:_get_general_section()
		if type(self.flags.general_section) == "function" then
			local func = self.flags.general_section
			return func(self)
		else
			return self.flags.general_section
		end
	end

	function o:section(config, section_type, name_constructor)
		local sec = self.section_req:new(self, config, section_type, name_constructor)
		table.insert(self.sections, sec)
		return sec
	end

	function o:initialize_tables_config()
		-- initializes the main section as first if no other distinction is made via
		-- the make_primary() function
		self.t_func.bulk = self.bulk
		if not self.main_config then
			local sec = self.sections[1]
			self:_make_primary(sec, sec.config)
		end
		self.response_table   = {}

		if self.flags.general_section and self._single and self.service_group == "config" then
			if self.sid == "general" then
				self.sid = self:_get_general_section()
			elseif not self.flags.first_general then
				self:add_critical_error(
					STD_CODES.INVALID_SECTION,
					string.format("Section: %s for service does not exist", self.sid),
					"UCI",
					HTTP_STATUS_CODES.NOT_FOUND
				)
			end
		end
	end

	-- bulk is a special boy that excutes commit logic after all endpoints have executed
	-- logic could be better but due to the nature of uci is essiantialy unavoidable
	-- otherwise repeated requests to services that take a long time to commit changes
	-- would drastically extend time needed to execute the request
	function o:run_endpoint_after_commit(method)
		local endpoint_coroutine = coroutine.create(self[method .. "_after_commit_hook"])

		return coroutine.resume(endpoint_coroutine, self)
	end

	-- private function that sets the first section as the "main" section
	-- only executes if the main section is not set manually
	-- defines the main config, the main section type and main .name/sid
	function o:_make_primary(section, config)
		section.default_options          = {}
		section.primary_section          = true
		section.default_options[".type"] = section:option(".type")

		local name = section:option("id")
		if not self.flags.anonymous and not self.flags.increment_name then
			function name:validate(value)
				return self.dt:uciname(value)
			end
		end
		function name:set()
			return nil
		end
		function name:get()
			return self:table_get(self.config, self.sid, ".name")
		end
		section.default_options["id"] = name

		-- FIXME should be unneeded as only the sections should be used to get a config
		self.config                       = config
		self.main_config                  = config
		self.main_section                 = section
		self.main_section_type            = section._get_section_type
		self.main_section_filter          = section.filter
	end

	function o:get_data_from_arguments(section, opt)
		local data
		if self.arguments.data and self.arguments.data[1] then
			data = self.arguments.data
		elseif self.arguments.data then
			data = { self.arguments.data }
		else
			data = {}
		end
		for _, s in ipairs(data) do
			-- used when getting value from other section (for example PUT with multiple sections)
			if type(s) == "table" then
				if s.id == section then
					if s[opt] then
						return s[opt]
					end
				end
			end
		end
	end

	-- for getter wrapper value use getter_wrapped_abs_value
	function o:get_abs_value(config, section, opt)
		local value = self:get_data_from_arguments(section, opt)
		if value == "" then return nil end
		return value and value or self:table_get(config, section, opt)
	end
	-- To not risk breaking the whole API it is currently a separate function
	-- Would wrap the current one if i was shure that people didn't use same option
	-- get_abs_value in custom getters/setters
	function o:getter_wrapped_abs_value(config, section, opt)
		local base_option = self:find_option_by_key(opt)
		local value = self:get_data_from_arguments(section, opt)
		if value then
			if value == "" then return nil end
			return value
		end
		local config_value = self:table_get(config, section, opt)
		return base_option and base_option:get(config_value, section) or nil
	end

	function o:validate_service_group()
		-- FIXME omega dumb, should be in the initialization, but CANT, because its is called to early, before population
		if not self.service_group and not self.flags.global_settings then
			self:ResponseNotImplemented(string.format("%s not implemented", self.request_method))
		end
	end

	-- load initial configs that are described via the sections
	function o:populate_configs()
		local all_configs = {}
		for _, sec in pairs(self.sections) do
			all_configs[sec.config] = true
		end
		for config, _ in pairs(all_configs) do
			self.t_func:_get_config(config)
		end
	end

	function o:find_option_by_key(key)
		for _, sec in pairs(self.sections) do
			for _, pair in ipairs(sec.options) do
				local op_key, opt = next(pair)
				if op_key == key then
					return opt
				end
			end
		end
		return nil
	end

	function o:sort_response()
		table.sort(self.response_table, function(a, b)
			if a and a[self.sort_response_by] and b and b[self.sort_response_by] then
				return tonumber(a[self.sort_response_by]) < tonumber(b[self.sort_response_by])
			else
				return false
			end
		end)
	end

	-- FIXME might not work in edge cases, bu I could not replicate them
	-- related to option values hashing https://git.openwrt.org/?p=project/uci.git;a=blob;f=list.c;h=24ed2ee6ddf1fa84adf84acc11ab455086f83df9;hb=HEAD#l171
	function o:find_section_hash()
		local hash = 0
		hash = lua_crypto.djb_hash(self:_retrieve_main_section_type(), hash)
		return hash
	end

	function o:reformat_response()
		if self.flags.global_settings then
			if api_utils:is_array(self.response_table) then
				self.response_table = self.response_table[1]
			end
			self.response_table[".index"] = nil
			self.response_table.id = nil
			self.response_table[".type"] = nil
			return
		end
		if not api_utils:is_array(self.response_table) then
			if self.flags.general_section and  self.response_table.id == self:_get_general_section() then
				self.response_table.id = "general"
			end
			self.response_table[".index"] = nil
			return
		end
		for _, sec in pairs(self.response_table) do
			if self.flags.anonymous and #self.main_section.order_table ~= 0 then
				local name = string.format("cfg%02x%04x", sec[".index"] + 1, self:find_section_hash())
				sec.id = name
			end
			if sec.id == self:_get_general_section() and self.flags.general_section then
				sec.id = "general"
			end
			-- Delete .index as it is no longer needed
			sec[".index"] = nil
		end
	end

	function o:before_response_hook() end

	function o:general_response()
		self:return_if_error()
		self:sort_response()
		self:reformat_response()
		self:before_response_hook()
		self:ResponseOK(self.response_table, self.messages)
	end

	function o:general_delete_uploaded_files()
		for _, filename in ipairs(self._removed_files) do
			if filename.type == "default" then
				os.remove(filename.file)
			end
		end
	end

	-- request data validation function which checks if option values are either strings or lists
	function o:validate_data_types()
		local errors_before_validation = #self.errors
		local option = nil
		for k, value in pairs(self.current_data_block) do
			option = self:find_option_by_key(k)
			if option then
				if type(value) ~= "table" and option.list then
					if value ~= "" then -- "" for option reset
						self:add_error(STD_CODES.INVALID_OPT, "Option only accepts arrays", option.api_key)
					end
				else
					if api_utils:is_array(value, true) and not option.list and not option.skip_validation then
						self:add_error(STD_CODES.INVALID_OPT, "Option does not accept an array", option.api_key, nil, value)
					else
						self:validate_option_value(value, option.api_key)
					end
				end
			end
		end
		if #self.errors > errors_before_validation then self.current_uci_section_validations.valid_data_types = false end
	end

	-- wrapper that checks whether the request value is an array
	-- uses the validation function for all members of an array, or singular values
	function o:validate_rule(value, option)
		-- checks if option accepts lists and vice-versa
		-- skip validation is a workaround, because list validation shouldn't be executed in config service and should be moved to option logic.
		-- currently it is needed for deprecated options that became lists out of string inputs
		if api_utils:is_array(value, true) and not option.skip_validation then
			if option.list then
				local res, msg = option:validate_list(value)
				if not res then
					self:add_error(STD_CODES.INVALID_OPT, msg, option.api_key, nil, value)
				end
			end
		end

		self:validate_option_value(value, option.api_key, function(v)
				-- skip single value validation if value is not of string type
				if type(v) ~= "string" then
					return true, nil
				else
					return option:validate_single_value(v)
				end
			end)

		-- returns false if THERE ARE NO errors
		return false
	end

	-- a general function that works with received request data
	-- checks all validations and required fields
	-- if validation passes then uses the option setters
	function o:general_data()
		-- FIXME: optimize self.current_uci_section setting because now it is being set for every option
		local errors_before_validation = #self.errors
		local found_options = {}
		local option = nil
		for k, value in pairs(self.current_data_block) do
			option = self:find_option_by_key(k)
			if not option then
				if k:sub(-4) == ":set" then
					local option_name = k:sub(1, -5)
					local sensitive_option = self:find_option_by_key(option_name)
					if sensitive_option and sensitive_option.sensitive then
						self:add_error(STD_CODES.INVALID_OPT, "Option is read-only", k)
					else
						self:add_error(STD_CODES.INVALID_OPT, "Invalid option", k)
					end
				else
					self:add_error(STD_CODES.INVALID_OPT, "Invalid option", k)
				end
			else
				self.current_uci_section = self.t_func:get_uci_config(option.config)[option:_get_sid(self.sid)]
				self:validate_rule(value, option)
				found_options[k] = option
			end
		end
		-- validates required options, iterates current options and checks if they arrived in the request
		for _, sec in pairs(self.sections) do
			for _, pair in ipairs(sec.options) do
				local op_key, v = next(pair)
				local request_value = self.current_data_block[op_key]

				-- check option requires if an option came with the request or if it already exists in the config
				local abs_val = request_value or v:get(self:table_get(self.config, v:_get_sid(self.sid), op_key), self.sid)
				if abs_val ~= "" and abs_val ~= nil then
					v:validate_requires(abs_val)
				end
				-- checks if defaults are set for cfg_required option. If they are set, then it does not trigger an error
				-- when user does not provide the option in the request
				if (abs_val == "" or not abs_val) and
					self.request_method == "POST" and
					v.cfg_require then
					self:add_critical_error(STD_CODES.INVALID_OPT, "Option is required when creating a configuration.", op_key)
				end
			end
		end
		if #self.errors > errors_before_validation then self.current_uci_section_validations.valid_requires_and_other_constraints = false end

		-- if all is good check custom option validations
		if self.current_uci_section_validations.valid_data_types and self.current_uci_section_validations.valid_requires_and_other_constraints then
			for _, opt in pairs(found_options) do
				self:validate_option_value(self.current_data_block[opt.api_key], opt.api_key, function(v)
						-- skip opt validation if it's being reset
						if v == "" then
							return true, nil
						else
							return opt:validate(v)
						end
					end)
			end
		end

		if #self.errors > 0 then
			self.current_uci_section_valid = false
			return
		end
		for _, sec in pairs(self.sections) do
			for _, pair in ipairs(sec.options) do
				local op_key, v = next(pair)
				local option = found_options[op_key]
				if option then
					self.current_uci_section = self.t_func:get_uci_config(option.config)[option:_get_sid(self.sid)]
					option.current_uci_section = self.current_uci_section -- Pass data to options so it could be used in _set
					option:_set(self.current_data_block[option.api_key])
				end
			end
		end
	end

	-- is a general getter of all configuration values that are described by options
	function o:retrieve_section()
		local section_response = {}
		-- iterates descibed sections
		for _, sec in pairs(self.sections) do
			local section = self.t_func:get_uci_config(sec.config)[sec:_get_sid(self.sid)]
			self.current_uci_section = section
			if section and sec:_filter(section) then
				-- "gets" the options
				for _, pair in ipairs(sec.options) do
					local _, opt = next(pair)
					-- first checks if anything is set by the option:set or
					-- whole section with option is deleted by table:delete functions
					-- if nothing is found uses the original values from the uci config
					local value = self:table_get(sec.config, sec:_get_sid(self.sid), opt.api_key)
					opt:_get(value, self.sid, section_response)
				end
				--Add .index for sorting.
				section_response[".index"] = self:table_get(sec.config, sec:_get_sid(self.sid), ".index")
			end
		end
		-- POST is a special boy and gets a loop to iterate all added sections
		-- FIXME: burn it and rebuild
		if self.request_method == "POST" then
			for _, sec in pairs(self.sections) do
				if self.t_func.config_set_table[sec.config] then
					for sid, section in pairs(self.t_func.config_set_table[sec.config]) do
						--[[
							Main problem is that initial iteration is used to collect available configs from sections
							as sections can be from multiple configs. Then an iteration through available sections with set values done.
							The problem appears when iterated 'sec' does not match iterated 'section'.
							Options are found(from sec) but values are not(from section) and are set to nil.
							That way all options that were set correctly(by chance) are removed by equaling them to nil
						]] --
						if sid == sec:_get_sid(self.sid) then
							for _, pair in ipairs(sec.options) do
								local _, opt = next(pair)
								local value = self:table_get(sec.config, sid, opt.api_key)
								opt:_get(value, self.sid, section_response)
							end
						end
					end
				end
			end
		end
		return section_response
	end

	-- Gets next available id in the config
	---@param config? string Config to get the next id from. Uses self.main_config if not set.
	function o:next_id(config)
		config = config or self.main_config
		if not self.t_func:get_uci_config(config) then self.t_func:_get_config(config) end
		local sections = self.t_func:merge_config_tables()[config] or {}
		local next_id = self.last_id_by_config[config] or 0
		for name in pairs(sections) do
			local name_num = tonumber(name)
			if name_num then
				next_id = math.max(name_num, next_id)
			end
		end
		o.last_id_by_config[config] = next_id + 1
		return tostring(next_id + 1)
	end

	-- auxiliary sections are sections that are not part of the main configurations i.e. are not described using section constructor
	-- these sections are created or deleted using the table_xxx functions and are processed separately
	-- they are usually an artifact or byproduct of configuration
	function o:auxiliary_sections()
		for conf, sections in pairs(self.t_func.config_delete_section_table) do
			for section, _ in pairs(sections) do
				local res, err = self.uci:delete(conf, section)
				if not res then
					self:add_critical_error(STD_CODES.INVALID_SECTION,
						string.format("Failed to delete configuration section. Message (%s)", err), "UCI")
				end
			end
		end

		for conf, types in pairs(self.t_func.config_create_table) do
			for t, array in pairs(types) do
				for _, array_element in pairs(array) do
					local name, values = next(array_element)
					if name == "anonymous" then
						name = nil
					end
					local res, err = self.uci:section(conf, t, name, values)
					if not res then
						self:add_critical_error(STD_CODES.INVALID_SECTION,
							string.format("Failed to add configuration section. Message (%s)", err), "UCI")
					end
				end
			end
		end
		for _, filename in ipairs(self._removed_files) do
			if filename.type == "cert" or filename.type == "tpm2" then
				local service = self.config
				if filename.opt then
					local option = self:find_option_by_key(filename.opt)
					if option and option.certificate and option.certificate.service then
						service = option.certificate.service
					end
				end
				require("vuci.certificates").remove_service_from_config(
					filename.file,
					service,
					self.sid,
					filename.type=="tpm2"
				)
			end
		end
	end

	-- for main section type
	function o:_retrieve_main_section_type()
		return self.main_section_type(self.main_section)
	end


	-- FIXEME state management class that wraps state of uci config - changes, deletions, creations
	-- hides complexity, easier use, tables should be merged instead of being separated
	function o:array_error()
		if api_utils:is_array(self.arguments.data) then
			self:add_critical_error(STD_CODES.INVALID_STRUCT,
				"Specified object does not support data as array",
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
	end

	-- initializes curent_data_block.id so it is available form the beginning of section hooks
	-- previously it was initialized in general_data
	function o:section_general()
		self.current_data_block.id = self.sid
	end

	function o:filter_dot_options(array)
		local filtered = {}
		for k, v in pairs(array) do
			if string.find(k, "%.") ~= 1 then
				filtered[k] = v
			end
		end
		return filtered
	end

	-- step where all options in the "config_set_table" are set to uci configuration
	function o:set_uci_values()
		for config, section in pairs(self.t_func.config_set_table) do
			for sid, options in pairs(section) do
				local filtered_options = self:filter_dot_options(options)
				if not api_utils:is_table_empty(filtered_options) then
					local ret, err = self.uci:tset(config, sid, filtered_options)
					if err then
						local options_formatted = {}
						for k, v in pairs(filtered_options) do
							table.insert(options_formatted, k .. ": " .. v)
						end
						self:add_critical_error(
							STD_CODES.UCI_SET_ERROR,
							string.format("Failed to set options for section %s in configuration %s. Options: [%s]. Message: (%s)",
								sid, config, table.concat(options_formatted, ", "), err
							),
							"UCI"
						)
					end
				end
			end
		end
	end

	local function option_error()
		return false,
			{
				code = STD_CODES.INVALID_OPT,
				error = "'option' must be provided for this upload endpoint.",
				source = "option"
			}
	end

	local function name_error()
		return false,
			{
				code = STD_CODES.INVALID_OPT,
				error = "File option with the provided name was not found.",
				source = "option"
			}
	end

	-- default implementation of the upload endpoint
	-- automatically construct the file name - config.sid.option.Originalfilename.extension
	-- and sets its location as /etc/vuci-uploads/
	function o:UPLOAD_default_callbacks()
		local excluded_for_deletion = {
			"^/etc/certificates",
			"^/etc/ssl/certs",
			"^/etc/uhttpd%.key$",
			"^/etc/uhttpd%.crt$"
		}

		return {
			list_files_to_delete = function(option_name)
				local is_option_name_given = option_name and option_name ~= ""

				-- If multiple file options exist, option_name must be given
				if api_utils:table_length(self._file_options) > 1 and not is_option_name_given then
					return option_error()
				end

				local option
				if is_option_name_given then
					option = self._file_options[option_name]
				else
					_, option = next(self._file_options)
				end

				if not option then
					return name_error()
				end

				-- A list of files option is a special case
				-- Deletion of unused files from a list is handled in `option_logic.lua`
				if option.list then
					return nil
				end

				local used_file = option:get(self.uci:get(option.config, self.sid, option.api_key))

				local files_to_delete = {}
				local sid = self.sid or self.flags.general_section or ""
				local upload_dir = api_utils:is_table_empty(option.certificate) and "/etc/vuci-uploads" or "/etc/certificates"

				local file_pattern = upload_dir .. "/cbid." .. option.main_config .. "." .. sid .. "." .. option.api_key .. "*"
				for filename in fs.glob(file_pattern) do
					local is_excluded = false
					for _, excluded_pattern in ipairs(excluded_for_deletion) do
						if filename:match(excluded_pattern) then
							is_excluded = true
							break
						end
					end

					if not is_excluded and filename ~= used_file then
						table.insert(files_to_delete, filename)
					end
				end

				return files_to_delete
			end,

			handle_request = function(upload_request)
				local opt_name = upload_request.parameters.option

				local o
				if opt_name and opt_name ~= "" then
					o = self._file_options[opt_name]
				else
					-- returns the first and only file option
					_, o = next(self._file_options)
				end

				if not o then
					return name_error()
				end

				if not o.list and #upload_request.files > 1 then
					return false, {
						code = STD_CODES.FILE_MAX_SIZE,
						error = "Only a single file can be uploaded",
						source = "Upload"
					}
				end

				if o.file_size then
					for _, file in ipairs(upload_request.files) do
						if file.size > o.file_size then
							return self:get_file_upload_too_large_error()
						end
					end
				end

				if not self.sid and not (self.flags and self.flags.global_settings) then
					return false, {
						code = STD_CODES.NAME_NOT_PROVIDED,
						error = "Section id not provided",
						source = "Validation"
					}
				end
				local id = self.flags.general_section and self:_get_general_section() == self.sid and "general" or self.sid
				if self.flags and self.flags.global_settings then
					id = self:_get_general_section()
				end
				local upload_dir = api_utils:is_table_empty(o.certificate) and "/etc/vuci-uploads" or "/etc/certificates"

				for _, file in ipairs(upload_request.files) do
					file.location = upload_dir .. "/cbid." .. o.main_config .. "." .. id .. "." .. o.api_key .. file.filename:gsub("[^%w%.]", "_")
				end
				if o.certificate and o.certificate.tpm2 then
					local certs = require("vuci.certificates")
					local has_tpm = require("vuci.board"):has_tpm()
					local path = upload_request.files[1].location
					if has_tpm and fs.access(path) then
						certs.remove_key_from_tpm2(path)
					end
				end

				if o.file_handle_request then o:file_handle_request(upload_request) end

				return true
			end
		}
	end

	function o:UPLOAD_init()
		if not self.sid and not (self.flags and self.flags.global_settings) then
			self:add_critical_error(STD_CODES.NAME_NOT_PROVIDED, "Configuration name must be provided", "Upload")
		end

		if api_utils:is_table_empty(self._file_options) then
			self:ResponseNotImplemented("File upload is not implemented for this endpoint.")
		end

		return {}
	end

	-- Simple helper to check whether a section exists
	function o:Exists()
		local options, err = self:table_get(self.main_config, self.sid)
		if not options or options[".type"] ~= self:_retrieve_main_section_type() or not self:main_section_filter(options) then
			self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				string.format("Section: %s for service does not exist", self.sid),
				"UCI",
				HTTP_STATUS_CODES.NOT_FOUND
			)
		end
	end

	-- tries to retrieve the parent if a child section is used
	function o:parent_exists()
		if self.binding and not self.uci:get(self.main_config, self.binding) then
			self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				string.format("Parent section '%s' does not exist", self.binding),
				"UCI",
				HTTP_STATUS_CODES.NOT_FOUND
			)
		end
	end

	function o:_perform_reorder()
		for _, sec in pairs(self.sections) do
			-- only primary section sort is important
			if #sec.order_table ~= 0 and sec.primary_section then
				local highest_index = api_utils:table_length(self.t_func:get_uci_config(sec.config) or {})-1

				-- get array of sections
				local uci_sections = {}
				local indexes = {}
				for _, v in pairs(sec.order_table) do
					table.insert(uci_sections, {
						name = v.sid,
						order = v.index
					})
					local index = self:table_get(sec.config, v.sid, ".index")
					if not index then
						highest_index = highest_index + 1
						index = highest_index
					end
					table.insert(indexes, index)
				end

				-- Sort indexes
				table.sort(indexes, function(a, b) return a < b end)

				-- Sort sections by PUT order value
				table.sort(uci_sections, function(a, b) return a.order < b.order end)

				-- Get current order of sections
				local all_indexes = {}
				for name, section in pairs(self.t_func:merge_config_tables()[sec.config] or {}) do
					all_indexes[name] = section[".index"]
				end

				-- Update order gotten by sorting sections
				for i = 1, #uci_sections do
					local name = uci_sections[i].name
					all_indexes[name] = indexes[i]
				end

				-- Getting name and index for final sort as `all_indexes` is unsortable
				local response_data = {}
				for name, index in pairs(all_indexes) do
					table.insert(response_data, {name = name, index = index})
				end

				-- Final sort by .index
				table.sort(response_data, function(a, b)
					if a and b and type(a.index) == "number" and type(b.index) == "number" then return a.index < b.index end
					return false
				end)

				-- Stripping everything but name
				local order_table = {}
				for i = 1, #response_data do
					table.insert(order_table, response_data[i].name)
				end

				self.uci:reorder(sec.config, order_table)
				-- For updatig indexes from the config
				self:populate_configs()
				return
			end
		end
	end

	return o
end



return ConfigService
