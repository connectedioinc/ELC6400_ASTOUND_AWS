local api_utils = require("api/api_utils")
local option_common = require("api/option_common")

-- functions moved here so they do not get reinitialized every time a value is validated
local function format_length_error(self, value, max_length)
	self:add_error(
		STD_CODES.INVALID_OPT,
		string.format("Provided value is too long. Is %s characters, but can be up to %s characters", #value, max_length),
		self.api_key,
		nil,
		value
	)
end

local function format_min_length_error(self, value, min_length)
	self:add_error(
		STD_CODES.INVALID_OPT,
		string.format("Provided value is too short. Is %s characters, but can not be shorter than %s characters", #value, min_length),
		self.api_key,
		nil,
		value
	)
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

local function same_tables(tbl1, tbl2)
	if #tbl1 ~= #tbl2 then
		return false
	end
	for i = 1, #tbl1 do
		if tbl1[i] ~= tbl2[i] then
			return false
		end
	end
	return true
end

local o = {}

function o:new(inheritance, api_key, flags)
	flags = flags or {}
	local opt = {}
	local opt_mt = { __index = inheritance}

	setmetatable(opt, opt_mt)
	opt.api_key             = api_key
	opt.hidden              = string.find(api_key, "%.") and true or false
	opt.file                = flags.file
	opt.file_size           = flags.file_size or (flags.certificate and 16777216)
	opt.list                = flags.list or false
	opt.skip_validation     = flags.skip_validation or false
	opt.always_set          = flags.always_set or false
	opt.certificate         = flags.certificate or {}
	opt.require             = nil
	opt.cfg_require         = nil
	opt.list_length         = nil
	opt.min_list_length     = nil
	opt.readonly            = nil
	opt.sensitive           = flags.sensitive or false
	opt.allow_duplicates    = false
	opt.current_uci_section = self.current_uci_section

	if opt.file or not api_utils:is_table_empty(opt.certificate) and not opt.certificate.device_only then
		function opt:_get_file_size(value)
			if not value then
				return nil
			end
			local fs = require "nixio.fs"
			local stat = {}
			if api_utils:is_array(value) then
				local sizes = {}
				for test,val in pairs(value) do
					stat = fs.stat(val) or {}
					table.insert(sizes, stat.size)
				end
				return sizes
			else
				stat = fs.stat(value) or {}
			end
			return stat.size
		end
	end
	
	function opt:set(value)
		self:table_set(self.config, self:_get_sid(self.sid), self.api_key, value)
	end
	local set_ref = opt.set

	function opt:get(value, sid)
		return value
	end

	function opt:add_files_to_delete(filename, file_type)
		if not filename then return end
		local skip_file = filename:match("^/etc/ssl/certs") or
						  (file_type == nil and filename:match("^/etc/certificates"))

		if not skip_file then
			table.insert(self._removed_files, {
				file = filename,
				type = file_type or "default",
				opt = self.api_key,
			})
		end
	end

	local get_ref = opt.get
		
	-- TODO test
	function opt:_set(value)
		if self.order_by ~= nil and self.order_by == self.api_key then
			table.insert(self.order_table, { sid = self.sid, index = tonumber(value) })
		end
		if self.hidden and self.api_key ~= ".index" then
			return
		end
		if (self.file or not api_utils:is_table_empty(self.certificate)) and self.current_uci_section and self.current_uci_section[self.api_key]
			and value ~= self.current_uci_section[self.api_key] then
			if not api_utils:is_array(value) and not api_utils:is_array(self.current_uci_section[self.api_key]) then
				self:add_files_to_delete(self.current_uci_section[self.api_key],
					not api_utils:is_table_empty(self.certificate)
					and (self.certificate.tpm2 and "tpm2" or "cert")
					or nil
				)
			else
				local files_to_delete = {}
				for _, file in ipairs(self.current_uci_section[self.api_key]) do
					local found = false
					if api_utils:is_array(value) then
						for _, v in ipairs(value) do
							if file == v then
								found = true
								break
							end
						end
					end
					if not found then
						table.insert(files_to_delete, file)
					end
				end
				-- delete files
				for _, file in ipairs(files_to_delete) do
					self:add_files_to_delete(file, not api_utils:is_table_empty(self.certificate)
						and (self.certificate.tpm2 and "tpm2" or "cert")
						or nil)
				end
			end
		end
		local check = true
		if self.current_uci_section 
          and not api_utils:is_table_empty(self.current_uci_section)
          and (not value or value == "")
          and not api_utils:is_table_empty(self.certificate)
          and (not self.current_uci_section[self.api_key] or self.current_uci_section[self.api_key] == "") then

			require("vuci.certificates").remove_service_from_config(
				self.current_uci_section[self.api_key],
				self.certificate.service or self.config,
				self.certificate.instance or self.sid,
				self.certificate.tpm2
			)
		end
		if value and value ~= "" and not api_utils:is_table_empty(self.certificate) then
			local certificates = require("vuci.certificates")
			local util = require("vuci.util")
			if util.contains(self.certificate.allow_values or {}, value) then
				return self:set(value)
			end
			certificates.add_service_to_config(value, self.certificate.service or self.config, self.certificate.instance or self.sid, self.certificate.info_table)

			for _, val in ipairs(self.certificate.default_values or {}) do
				if value == val then
					check = false
					break
				end
			end
			if self.certificate.length_warnings and check then
				local certificates = require("vuci.certificates")
				local valid, encryption, messages, key_length = certificates.validate_cert_length(value)
				if valid and messages and #messages > 0 then
					self:add_message(messages[1].code, messages[1].message, self.sid..":"..self.api_key)
				end
			end
			if self.certificate.tpm2 then
				local has_tpm = require("vuci.board"):has_tpm()
				if has_tpm then
					local enabled
					if type(self.certificate.tpm2) == "function" then
						enabled = self.certificate.tpm2(self)
					else
						enabled = self.certificate.tpm2
					end
					if enabled then
						local ret = certificates.add_key_to_tpm2(value)
						if ret ~= 0 and ret == 5 then
							self:add_message(ret, "TPM storage is full", "key")
						elseif ret ~= 0 then
							self:add_message(ret, "Error uploading to TPM storage", "key")
						end
					end
				end
			end
			util.set_file_permissions(value, "certificates", 0660)

		end
		local current_value = nil
		-- huge config files cannot handle a lot of uci:gets
		-- this workaround only compares initial and current value for options that have a custom set or get
		if (get_ref ~= self.get or set_ref ~= self.set or self.list) and self.api_key ~= "id" then
			current_value = self:get(self.uci:get(self.config, self.sid, self.api_key), self.sid)
		end
		if self.list then
			local stripped_value = {}
			if type(value) == "table" then
				for _, v in pairs(value) do
					if v ~= "" then
						table.insert(stripped_value, v)
					end
				end
			end
			if current_value == nil or not same_tables(current_value, stripped_value) then
				self:set(stripped_value)
			end
		-- Always call set if no custom set or get is defined
		-- Calls set when custom set or get exists only when the value is different or always_set is true
		elseif not (self.set ~= set_ref or self.get ~= get_ref) or current_value ~= value or self.always_set then
			if self.api_key ~= "id" then
				self:set(value)
			end
		end
	end

	function opt:_get(value, sid, section_response)
		if self.file or (not api_utils:is_table_empty(self.certificate) and not self.certificate.device_only) then
			section_response[self.api_key .. ":file_size"] = self:_get_file_size(value)
		end
		local check = true
		if not api_utils:is_table_empty(self.certificate) and self.certificate.length_warnings and value then
			for _, val in ipairs(self.certificate.default_values or {}) do
				if value == val then
					check = false
					break
				end
			end
			if check then
				local certificates = require("vuci.certificates")
				local valid, encryption, messages, key_length = certificates.validate_cert_length(value)
				if valid and messages and #messages > 0 then
					self:add_message(messages[1].code, messages[1].message, sid..":"..self.api_key)
				end
			end
		end
			
		local result = self:get(value, sid)
		if self.list and result and type(result) ~= "table" then
			result = { result }
		end
		if self.query_parameters.all_options == "true" and self.request_method == "GET" and not result then
			result = (self.list and {}) or ''
		end
		section_response[self.api_key] = result
	end

	function opt:validate_requires(value)
		local function check_opt_require(optname)
			local existing_value = self:_get_value(optname)
			if empty_value(existing_value) then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: " .. optname, self.api_key)
			end
		end
		-----------------------------------------------------
		if self.require then
			if api_utils:is_array(self.require) then
				for _, optname in ipairs(self.require) do
					check_opt_require(optname)
				end
			else
				for opt_val, options in pairs(self.require) do
					if value == opt_val then
						for _, optname in pairs(options) do
							check_opt_require(optname)
						end
					end
				end
			end
		end
	end

	-- wrapps validation for easier testing 
	function opt:validate_single_value(value)
		local resp, msg = self:_general_validate(value)
		if resp ~= nil then return resp, msg end
		return true, nil
	end

	-- TODO add_error should be like a outside dependancy that should be tested separately
	-- TODO test branches with add_error
	function opt:_general_validate(value)
		if self.readonly then
			return false, "Option is readonly"
		end
		if value == "" and self.cfg_require and self.request_method ~= "POST" then
			return false, "Option can not be empty"
		end
		if value == "" then
			return true, nil
		end
		if self.maxlength then
			if #value > self.maxlength then
				format_length_error(self, value, self.maxlength)
			end
		else
			if #value > self.dt.MAX_LENGTH_DEFAULT then
				format_length_error(self, value, self.dt.MAX_LENGTH_DEFAULT)
			end
		end
		if self.minlength and #value < self.minlength then
			format_min_length_error(self, value, self.minlength)
		end
		-- nil means - continue validating, tru or false mean that the validator provided an answer
		return nil, nil
	end

	-- validation entry point, checks to see if option is a file, then checks the usual upload locations
	-- otherwise returns the default validator
	function opt:validate(value)
		if not api_utils:is_table_empty(self.certificate) then
			if self.certificate.allow_values then
				local util = require("vuci.util")
				if util.contains(self.certificate.allow_values, value) then
					return true
				end
			end
			local certificates = require("vuci.certificates")
			local valid, err = certificates.validate_path(value, self.certificate)
			if not valid then
				return false, err
			end
			self.certificate.info_table = certificates.validate_service(value, self.certificate)
			if not self.certificate.info_table then
				return false, "Uploaded certificate is not valid", STD_CODES.CERT_VALIDATION_ERR
			end
			return true
		end
		if self.file or not api_utils:is_table_empty(self.certificate) then
			return self.dt:file_validation(value, { "/etc/vuci-uploads/", "/etc/certificates/", "/etc/ssl/certs/" })
		else
			return self.dt:default_validation(value)
		end
	end

	-- expects an array
	function opt:validate_list(value)
		return option_common.validate_option_list(self, value)
	end

	-- is private. Has additional logic to get values from request (if POST or PUT)
	-- otherwise does additional checks to see if the option actually exists for the current configuration
	-- lastly calls the default getter
	function opt:_get_value(key)
		-- checks if value is already provided in the request
		if self.current_data_block[key] then
			return self.current_data_block[key] ~= "" and self.current_data_block[key] or nil
		else
			local opt_obj = self:find_option_by_key(key)
			return opt_obj:get(self:table_get(self.config, self:_get_sid(self.sid), key), self.sid)
		end
	end

	return opt
end

return o