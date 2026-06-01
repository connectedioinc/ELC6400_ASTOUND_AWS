-- re-required for test to function correctly
require("api/standard_codes")
local Base 			= require("api/BaseEndpoint")
local api_utils     = require("api/api_utils")
local option_common     = require("api/option_common")
local uci = require("vuci.uci")
HTTP_STATUS_CODES = {
	METHOD_NOT_ALLOWED = "405",
	NOT_FOUND          = "404",
	BAD_REQUEST        = "400"
}

local unique_messages = {}
-- helper functions ----------------
local function add_length_error(self, msg, value)
	self:add_error(STD_CODES.INVALID_OPT, msg, self.api_key, nil, value)
end

local function format_length_error(self, max_length, value)
	local msg = string.format("Provided value is too long. Is %s characters, but can be up to %s characters", #value,
		max_length)
	add_length_error(self, msg, value)
end

local function format_min_length_error(self, min_length, value)
	local msg = string.format("Provided value is too short. Is %s characters, but can not be shorter than %s characters",
		#value, min_length)
	add_length_error(self, msg, value)
end

local function length_validation(self, val)
	if self.maxlength and #val > self.maxlength then
		format_length_error(self, self.maxlength, val)
	elseif #val > self.dt.MAX_LENGTH_DEFAULT then
		format_length_error(self, self.dt.MAX_LENGTH_DEFAULT, val)
	elseif self.minlength and #val < self.minlength then
		format_min_length_error(self, self.minlength, val)
	end
end

local function empty_value(val)
	if type(val) == "table" then
		for _, v in ipairs(val) do
			if v ~= "" then
				return false
			end
		end
		return true
	end
	return not val or val == ""
end
---------------------------

local BasicService = {}

-- Basic service implementation
-- Should NEVER be used directly
function BasicService:new()
	local o = Base:new()
	self.__index = self
	-- datatypes
	o.dt = require("api.Validations")
	-- dispatcher passes the body as json to this table
	o.arguments = {}
	-- added errors through add_error or lastly add_critical error
	o.errors = {}
	-- added messages through add_message
	o.messages = {}
	-- array of actions added with self:action
	o.actions = {}
	-- current block section
	o.sid = nil
	-- parent section if child is used
	o.binding = nil
	-- holds info about current requested method
	o.request_method = nil
	-- flag that holds state if its a singular request i.e. if a sid is specified or all configurations are requested
	o._single = true
	setmetatable(o, self)
	-- enum of special service groups
	o.service_groups_enum = {
		actions = "actions",
		config = "config"
	}
	-- basic action constructor that holds its public key - value with which the action is called through a request
	-- action - a function that is called
	-- FIXME in a perfect scenario the action logic should be included automatically in function and
	-- ConfigService, while basic service should be deleted altogether or at least left as a
	-- container for all common functions
	function o:action(action_key, action)
		local s = {}
		self.__index = self
		s.action_key = action_key
		s.action = action
		s.options = {}
		-- as with sections, actions can also have options that are used in similar fashion
		-- these options are simplified, because there is no predifined connection to configuration
		-- so all nonstandart validations or extra functionality must be made in the action itself
		function s.option(selfo, api_key, flags)
			flags                    = flags or {}
			local opt                = {}
			selfo.__index            = selfo
			opt.require              = false
			opt.api_key              = api_key
			opt.list                 = flags.list and true or false
			opt.skip_list_validation = flags.skip_list_validation and true or false -- for options which initially supported array and single value type
			opt.list_length          = nil
			opt.min_list_length      = nil
			opt.allow_duplicates     = true

			function opt:validate(value)
				return self.dt:default_validation(value)
			end

			-- expects an array
			function opt:validate_list(value)
				return option_common.validate_option_list(self, value)
			end

			setmetatable(opt, selfo)
			s:add_option(api_key, opt)
			return opt
		end

		function s:add_option(api_key, option)
			s.options[api_key] = option
		end

		setmetatable(s, self)
		self:_add_action(s)
		return s
	end

	-- Private wrapper for adding actions to main class
	function o:_add_action(s)
		self.actions[s.action_key] = s
	end

	-- function to merge tables
	-- second table values overwrite the first table values
	function o:MergeTables(firstT, secondT)
		local newT = {}
		for k, v in pairs(firstT) do newT[k] = v end
		for k, v in pairs(secondT) do newT[k] = v end
		return newT
	end

	-- wrapper for adding errors to a request
	-- code - standard error code
	-- message - descriptive error message
	-- source - optional field to describe where the error originates from  e.g. (UCI, validation ..)
	function o:add_error(code, message, source, sid, value)
		local section_name = sid or self.sid
		if section_name and self.flags and self.flags.general_section then
			section_name = "general"
		end
		local error = {
			code = code,
			error = message,
			source = source and source or nil,
			section = section_name,
			value = value and value or nil,
		}
		table.insert(self.errors, error)
	end

	-- wrapper for extra messages that are added on succesfull requests
	-- same structure as errors
	function o:add_message(code, message, source, sid, value)
		local identifier = table.concat({code, message, source}, ":")
		if not unique_messages[identifier] then
			unique_messages[identifier] = true
		end
		local msg = {
			code = code,
			message = message,
			source = source and source or nil,
			section = sid,
			value = value
		}
		table.insert(self.messages, msg)
	end

	-- critical error. Same structure as errors
	-- also accepts http_code for more flexibility
	-- instantly yields - all other code execution stops. Response is returned
	function o:add_critical_error(code, message, source, http_code, sid, value)
		self:add_error(code, message, source, sid, value)
		coroutine.yield({
			critical = true,
			code = http_code and http_code or "422",
			payload = { success = false, errors = self.errors }
		})
	end

	-- yielding function that stops execution if there are any errors
	-- usefull for collecting errors after some validations
	function o:return_if_error(http_code)
		if #self.errors > 0 then
			coroutine.yield({
				critical = true,
				code = http_code and http_code or "422",
				payload = { success = false, errors = self.errors }
			})
		end
	end

	-- bulk is a special boy that excutes commit logic after all endpoints have executed
	-- logic could be better but due to the nature of uci is essiantialy unavoidable
	-- otherwise repeated requests to services that take a long time to commit changes
	-- would drastically extend time needed to execute the request
	function o:run_endpoint_after_commit()
		return nil, nil
	end

	-- wrapper for body validation, usually means incorrect format
	-- should not reach here, because dispatcher should catch such errors
	function o:validate_body()
		if not self.arguments then
			self:add_critical_error(
				STD_CODES.NO_BODY,
				"Invalid or no body for POST provided",
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
	end

	---@param value any
	---@param api_key string
	---@param validate_single_value? fun(value: any): (result: boolean, message: string?, std_code: number?) Function for custom validation. Default behaviour is to check if value is of string type.
	function o:validate_option_value(value, api_key, validate_single_value)
		local function validate_type(v)
			if type(v) ~= "string" then
				return false, "Value must be a string", STD_CODES.INVALID_OPT
			end
			return true
		end
		local function check_validation(fn, v, source)
			local result, msg, code = fn(v)
			if not result then
				self:add_error(code or STD_CODES.INVALID_OPT, msg or "", source, nil, v)
			end
		end

		local fn = validate_single_value or validate_type
		-- avoids empty arrays for validation
		if api_utils:is_array(value) and #value ~= 0 then
			for k, v in pairs(value) do
				if v then
					local source = api_key .. " at index " .. k
					check_validation(fn, v, source)
				end
			end
		elseif type(value) ~= "table" then
			check_validation(fn, value, api_key)
		end
	end

	-- default implementation for actions
	-- used by Config and Function services
	function o:POST_action()
		self:POST_action_before_check_hook()
		if not self.sid or not self.actions[self.sid] then
			local available_actions = {}
			for key, _ in pairs(self.actions) do
				table.insert(available_actions, key)
			end
			if not self.sid then
				self:ResponseNotFound(string.format("No action provided. Available actions: [%s]",
					table.concat(available_actions, ", ")))
			else
				self:ResponseNotFound(string.format("Provided action is not available. Available actions: [%s]",
					table.concat(available_actions, ", ")))
			end
		end

		self:POST_action_init_hook()

		local requested_action = self.actions[self.sid]

		self:POST_action_validate(requested_action)

		self:POST_action_validate_options(requested_action)

		self:return_if_error()

		return requested_action.action(self, self.arguments.data)
	end

	-- checks if any options are added to action and checks if any are provided in the request
	function o:POST_action_validate(action)
		if type(next(action.options)) ~= "nil" and not self.arguments.data then
			self:add_critical_error(STD_CODES.NO_ACTION_ARGS, "No arguments provided for action", "Validation")
		end
	end

	-- basic options validation checker
	-- iterates through provided and existing options
	-- checks validation function and if the options is required
	function o:POST_action_validate_options(action)
		local errors_before_validation = #self.errors
		local data = self.arguments.data or {}
		if type(next(action.options)) ~= "nil" then
			for key, opt in pairs(action.options) do
				if opt.require == true and ((not data[key] or data[key] == "") or (opt.list and empty_value(data[key]))) then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: " .. key, key)
				end
				if api_utils:is_array(data[key], true) and not opt.skip_list_validation then
					local res, msg = opt:validate_list(data[key])
					if not res then
						self:add_error(STD_CODES.INVALID_OPT, msg, opt.api_key, nil, data[key])
					end
				elseif data[key] and type(data[key]) ~= "table" and opt.list then
					if not data[key] ~= "" then -- "" for option reset
						self:add_error(STD_CODES.INVALID_OPT, "Option only accepts arrays", opt.api_key)
					end
				end
			end
		end

		for api_key, val in pairs(data) do
			if action.options[api_key] then
				-- skips empty options
				if val ~= "" then
					local api_object = action.options[api_key]
					if type(val) == "table" then
						for id, element in ipairs(val) do
							if type(element) == "table" then
								self:add_error(STD_CODES.INVALID_OPT, "Nested arrays not supported.", api_key)
								return
							end
							val[id] = tostring(element)
							length_validation(api_object, val[id])
						end
					else
						val = tostring(val)
						length_validation(api_object, val)
					end

					self:validate_option_value(val, api_object.api_key) -- as 'val' gets converted to string, this is still necessary for catching errors in null valued arrays
				end
			else
				if self.sensitive and api_key:sub(-4) == ":set" then
					local option_name = api_key:sub(1, -5)
					if action.options[option_name] then
						self:add_error(STD_CODES.INVALID_OPT, "Option is read-only", api_key)
					else
						self:add_error(STD_CODES.INVALID_OPT, "Invalid option", api_key)
					end
				else
					self:add_error(STD_CODES.INVALID_OPT, "Invalid option", api_key)
				end
			end
		end

		-- if no general errors were found, check custom option validations
		if #self.errors <= errors_before_validation then
			for api_key, val in pairs(data) do
				if action.options[api_key] then
					-- skips empty options
					if val ~= "" then
						local api_object = action.options[api_key]
						local validate_single_value = function(v) return api_object:validate(tostring(v)) end
						self:validate_option_value(val, api_object.api_key, validate_single_value)
					end
				end
			end
		end
	end

	function o:POST_action_before_check_hook()
	end

	function o:POST_action_init_hook()
	end

	local function filter_response(data, options)
		local result = {}
		local options_lookup = {}
		for _, option in ipairs(options) do
			options_lookup[option] = true
		end

		local function filter_recursive(tbl)
			if api_utils:is_array(tbl) then
				local filtered_array = {}
				for _, value in ipairs(tbl) do
					if type(value) == "table" then
						local filtered_value = filter_recursive(value)
						if filtered_value and next(filtered_value) then
							table.insert(filtered_array, filtered_value)
						end
					elseif options_lookup[value] then
						table.insert(filtered_array, value)
					end
				end
				return #filtered_array > 0 and filtered_array or nil
			else
				local filtered_tbl = {}
				local has_values = false
				for name, value in pairs(tbl) do
					if options_lookup[name] then
						filtered_tbl[name] = value
						has_values = true
					elseif type(value) == "table" then
						local filtered_value = filter_recursive(value)
						if filtered_value and next(filtered_value) then
							filtered_tbl[name] = filtered_value
							has_values = true
						end
					end
				end
				return has_values and filtered_tbl or nil
			end
		end
		result = filter_recursive(data)
		return result or {}
	end
	local function process_data(data, find_option_by_key, sensitive_options)
		local function process_recursive(value)
			if type(value) ~= "table" then
				return value
			end

			local processed = {}
			if api_utils:is_array(value) then
				for i, val in ipairs(value) do
					processed[i] = process_recursive(val)
				end
			else
				for key, val in pairs(value) do
					local processed_key = key
					local processed_val = process_recursive(val)

					local opt = find_option_by_key and find_option_by_key(key) or nil
					if opt and opt.sensitive then
						processed_key = key .. ":set"
						processed_val = "1"
					end

					processed[processed_key] = processed_val
				end
			end

			if not api_utils:is_array(value) and next(processed) then
				for key, _ in pairs(sensitive_options) do
					if not processed[key .. ":set"] then
						processed[key .. ":set"] = "0"
					end
				end
			end

			return processed
		end

		return process_recursive(data)
	end

	function o:_ok_response_wrapper(data, messages, code)
		if type(data) == "string" then data = { response = data } end
		if self.allowed_options then
			data = filter_response(data, self.allowed_options)
		end
		if self.sensitive and type(data) == "table" then
			local sensitive_options = {}
			if self.service_group == "config" then
				if self.sections then
					local all_options = {}
					for _, section in pairs(self.sections) do
						if section.options then
							for _, option in pairs(section.options) do
								table.insert(all_options, option)
							end
						end
					end
					for _, option in pairs(all_options) do
						for key, opt in pairs(option) do
							if opt.sensitive then
								sensitive_options[key] = true
							end
						end
					end
				end
			end
			data = process_data(data, function(key)
				if self.find_option_by_key then
					return self:find_option_by_key(key)
				else
					return nil
				end
			end, sensitive_options)
		end
		messages = messages and messages or {}
		coroutine.yield(
			{
				payload = {
					success = true,
					data = data,
					messages = #messages > 0 and messages or nil
				},
				code = code
			})
	end

	function o:_error_response_wrapper(error, err_code, http_code)
		local error_formated = {
			code = err_code,
			error = error,
			source = "Request"
		}
		if type(error) == 'table' then
			error_formated = error
		end
		coroutine.yield(
			{
				payload = {
					success = false,
					errors = { error_formated }
				},
				code = http_code
			})
	end

	-- FIXME most likely overkill, confusion arrises which to use: these reponses or critical error
	-- less flexible most likely should be removed or atleast hidden for internal usage
-- helper functions for common responses that wrap messages and errors
	function o:ResponseCreated(data, messages)
		self:_ok_response_wrapper(data, messages, "201")
	end

	function o:ResponseOK(data, messages)
		self:_ok_response_wrapper(data, messages, "200")
	end

	function o:ResponseNotImplemented(error)
		self:_error_response_wrapper(error, 100, "501")
	end

	function o:ResponseNotFound(error)
		self:_error_response_wrapper(error, 122, "404")
	end

	function o:ResponseError(error)
		self:_error_response_wrapper(error, 122, "422")
	end

	-- AP manager crazines
	function o:Response(body, code)
		coroutine.yield(
			{
				payload = body,
				http_code = code and tostring(code) or "200"
			})
	end

	-- file response type used only when a file needs to be downloaded
	-- is required because the file is provided by the dispatcher
	function o:File(path, name, file_type, remove_after_send, content)
		coroutine.yield({
			file = {
				path = path,
				name = name,
				file_type = file_type and file_type or nil,
				remove_after_send = remove_after_send and remove_after_send or nil,
				content = content
			}
		})
	end

	-- framework entry function
	-- used here for various initialization due to caching nature of requires
	-- and lack of proper support for classes
	-- also checks existance of parents if a subconfiguration is being called
	-- TODO: service_groups should arise logicaly and structuraly and not by string checking
	function o:initialize_method()
		uci.show_commit_or_revert_warning = false
		if not self[self.request_method] then
			self:ResponseNotImplemented(string.format("%s not implemented", self.request_method))
		end
		self:initialize_tables_basic()
		self:initialize_tables_config()
		self:initialize_hook()
		self:parent_exists()
		if self.request_method == "GET" then
			local f_name
			if self.service_group and self.service_group ~= "global" then
				f_name = string.format("GET_TYPE_%s", self.service_group)
			end
			if self.flags and self.flags.global_settings then
				f_name = "GET_TYPE_global"
			end

			if self.service_group == "status" then
				if not self:STATUS_sid_exists() then
					self:ResponseNotImplemented("Endpoint not implemented")
				end
			elseif self.service_group == "options" then
				if not self:OPTIONS_sid_exists() then
					self:ResponseNotImplemented("Endpoint not implemented")
				end
			end

			if self[f_name] then
				self[f_name](self)
			elseif not self.service_group and self[self.request_method] then
				self[self.request_method](self)
			elseif self.service_group then
				self:ResponseNotImplemented(string.format("Endpoint for '%s' not implemented.", self.service_group))
			end
		else
			if self.disable_service_group_check or
				self.request_method == "POST" or
				self.service_group == self.service_groups_enum.config or
				(self.flags and self.flags.global_settings) or
				(self.disable_upload_service_group_check and self.request_method == "UPLOAD")
			then
				self[self.request_method](self)
			end
			self:ResponseNotImplemented(string.format("%s not implemented", self.request_method))
		end
	end

	function o:initialize_tables_basic()
		self.errors   = {}
		self.messages = {}
	end

	function o:initialize_tables_config()
	end

	function o:initialize_hook()
	end

	-- Basic empty implementations of supptorted HTML verbs
	function o:GET()
		self:ResponseNotImplemented("GET not implemented")
	end

	function o:POST()
		self:ResponseNotImplemented("POST not implemented")
	end

	function o:DELETE()
		self:ResponseNotImplemented("DELETE not implemented")
	end

	function o:OPTIONS()
		self:ResponseNotImplemented("OPTIONS not implemented")
	end

	function o:PUT()
		self:ResponseNotImplemented("PUT not implemented")
	end

	-- Realization of a defaul Upload function that provides necessary callbacks
	-- and accepts initialization function for more flexability
	function o:UPLOAD()
		local default_callbacks = self:UPLOAD_default_callbacks()
		self:UPLOAD_validate_path()
		local user_callbacks = self:UPLOAD_init()
		-- if tables are not initialized Upload is not implemented
		-- location or callback to set location should be always provided
		-- otherwise it is not apparent where to upload a file
		if not default_callbacks and not user_callbacks then
			self:ResponseNotImplemented("File upload is not implemented")
		else
			default_callbacks = self:MergeTables(default_callbacks or {}, user_callbacks or {})
			self:UPLOAD_before_upload_hook()
			local upload_request, err = self.parser(default_callbacks)
			if not upload_request then
				self:ResponseError(err)
			else
				local res = self:UPLOAD_after_upload_hook(upload_request)
				self:ResponseOK(res)
			end
		end
	end

	function o:UPLOAD_before_upload_hook()
	end

	-- empty wrapper for default callbacks
	function o:UPLOAD_default_callbacks()
	end

	-- Checks if files are uploaded to 'config' service group, or can be overwritten with custom checks
	function o:UPLOAD_validate_path()
		if self.service_group ~= "config" and not (self.flags and self.flags.global_settings) then
			self:ResponseError("Incorrect upload path")
		end
	end

	-- hook after the file is fully uploaded and saved. Must return response data object.
	-- path - uploaded file path
	function o:UPLOAD_after_upload_hook(upload_request)
		if #upload_request.files == 1 then
			return { path = upload_request.files[1].location }
		else
			local paths = {}
			for _, file in ipairs(upload_request) do
				table.insert(paths, file.location)
			end
			return { path = paths }
		end
	end

	-- Override this function to specify temporary directory paths for file uploads.
	-- Returns an array of directory paths in priority order. The upload handler will attempt
	-- to use the first path with sufficient available space, falling back to subsequent paths
	-- if needed. This allows automatic fallback from RAM to external storage for large files.
	-- Note: Later paths may have slower I/O but prevent memory exhaustion on constrained devices.
	function o:UPLOAD_path()
		return {"/tmp"}
	end

	function o:UPLOAD_init()
		return nil
	end

	function o:parent_exists()
	end

	-- This function is only called for /status endpoints
	function o:STATUS_sid_exists()
		-- returning true, means sid exists and everything is good
		-- returning false, means that it should throw an error that endpoint is not implemented
		-- So that means by default, it will not allow providing sid to /status endpoints
		--
		-- The intended use case is that you return true, if sid is optional or required,
		-- you if need to throw an error just use ':add_critical_error(...)'
		return self.sid == nil
	end

	-- This function is only called for /options endpoints
	function o:OPTIONS_sid_exists()
		-- returning true, means sid exists and everything is good
		-- returning false, means that it should throw an error that endpoint is not implemented
		-- So that means by default, it will not allow providing sid to /options endpoints
		--
		-- The intended use case is that you return true, if sid is optional or required,
		-- you if need to throw an error just use ':add_critical_error(...)'
		return self.sid == nil
	end

	function o:get_file_upload_too_large_error()
		return false, {
			code = STD_CODES.FILE_MAX_SIZE,
			error = "File is too large",
			source = "Upload"
		}
	end

	return o
end

return BasicService
