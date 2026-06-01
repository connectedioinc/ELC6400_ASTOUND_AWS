local ConfigService = require("api/ConfigService")
local all_modems = require("vuci.modem"):get_all_modems()
local util = require "vuci.util"
local fs = require "nixio.fs"


local data_sender_inputs = ConfigService:new({ increment_name = true })

local d_utils = require("api.services.data_sender_utils")(data_sender_inputs, "input")
local bundle = {
	["fs"]         = fs,
	["util"]       = util,
	["d_utils"]    = d_utils,
	["all_modems"] = all_modems
}

function data_sender_inputs:parent_exists()
	d_utils:check_if_parrent_exists("collection")
end

function data_sender_inputs:GET_TYPE_options()
	local plugins = d_utils:get_plugin_info("input")
	return self:ResponseOK({
		plugins = plugins
	})
end

local s = data_sender_inputs:section("data_sender", "input")
function s:create_defaults(_)
	local opt_inputs = self:table_get(self.config, self.binding, "input") or {}
	table.insert(opt_inputs, self.sid)
	self:table_set(self.config, self.binding, "input", opt_inputs)
	return {
		enabled = "1",
		plugin = "base",
		format = "json",
		name = require("vuci.util_tlt").get_next_name(self, self.config, "input", "name", "input")
	}
end

s.filter = function(self, options)
	return not self.binding or util.contains(self:get_abs_value(self.config, self.binding, "input") or {}, options[".name"])
end

function data_sender_inputs:find_parent_section()
	if not self.sid then return end
	local parent_section_id = self.binding
	if not parent_section_id then
		self:table_foreach(self.config, "collection", function(s)
			if s[".name"] and s["input"] and util.contains(s["input"], self.sid) then
				parent_section_id = s[".name"]
				return false
			end
		end)
	end
	return parent_section_id
end

function data_sender_inputs:validate_filter_options()
	local err_added = {}
	local function validate_filter(filter_key)
		if err_added[filter_key] then return end

		local filter_value = self:get_abs_value(self.config, self.sid, filter_key)
		local invert_val = self:get_abs_value(self.config, self.sid, filter_key .. "_invert")
		if filter_value == "all" and invert_val == "1" then
			self:add_error(STD_CODES.INVALID_OPT, "Can not be set to '1' when %s is 'all'." % filter_key, filter_key .. "_invert", self.sid, invert_val)
			err_added[filter_key] = true
		end
	end

	for key, value in pairs(self.current_data_block) do
		if key:match("_filter$") then
			validate_filter(key)
		elseif key:match("_filter_invert$") then
			validate_filter(key:gsub("_invert$", ""))
		end
	end
end

function data_sender_inputs:validate_section_hook()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled")

	if not opt_enabled or opt_enabled == "0" then
		d_utils:disable_requires()
	else
		local opt_plugin = self:get_abs_value(self.config, self.sid, "plugin")
		d_utils:enable_requires(nil, opt_plugin)
	end
	self:validate_filter_options()
end

function data_sender_inputs:PUT_validate_section_hook()
	d_utils:can_modify_name()
	self:validate_section_hook()
end

-- Option requires are validated only if the input section is enabled
data_sender_inputs.POST_validate_section_hook = data_sender_inputs.validate_section_hook

function data_sender_inputs:POST_init_hook()
	if not self.binding then
		self.flags.create = false
	end
	self:set_filter_list_options()
	d_utils:validate_limit_count("input")
end

function data_sender_inputs:POST_before_commit_hook()
	d_utils:update_db_path(self)
end

function data_sender_inputs:PUT_before_commit_hook()
	d_utils:update_db_path(self)
end

function data_sender_inputs:DELETE_before_section_delete_hook()
	local parent_section_id = self:find_parent_section()
	if not parent_section_id then return end
	local input_list = self:get_abs_value(self.config, parent_section_id, "input")
	local new_inputs
	for i, inp in ipairs(input_list or {}) do
		if inp == self.sid then
			if #input_list <= 1 then
				return self:add_critical_error(
					STD_CODES.NO_DELETE,
					string.format("Can't delete all inputs which appended to data sender colletion (id = %s).",
						parent_section_id),
					"Validation"
				)
			end
			table.remove(input_list, i)
			new_inputs = input_list
			break
		end
	end
	if new_inputs then
		self:table_set(self.config, parent_section_id, "input", new_inputs)
	end
end

function data_sender_inputs:set_filter_list_options()
	for _, sec in ipairs(self.sections) do
		for _, opt_wrapper in ipairs(sec.options) do
			local _, opt = next(opt_wrapper)
			if opt.api_key and opt.filter_option then
				local opt_value = self:get_abs_value(self.config, self.sid, opt.api_key)
				opt.list = type(opt_value) == "table"
				opt.get = function(opt_self, val)
					local flag = self:get_abs_value(self.config, self.sid, "filter_list_" .. opt_self.api_key)
					if val and val[1] and (not flag or flag ~= "1") then
						return val[1]
					end
					return val
				end
				opt.set = function(opt_self, value)
					local opt_type = type(value)
					if opt_type == "table" then
						self:table_set(self.config, self.sid, "filter_list_" .. opt.api_key, "1")
					end
					if opt_type ~= "table" then
						value = { value }
						self:table_set(self.config, self.sid, "filter_list_" .. opt.api_key, "0")
					end
					if #value == 1 and value[1] == "" then
						self:table_delete(self.config, self.sid, "filter_list_" .. opt.api_key)
						return self:table_delete(self.config, self.sid, opt.api_key)
					end
					self:table_set(self.config, self.sid, opt.api_key, value)
				end
			end
		end
	end
end

function data_sender_inputs:disable_filter_list_option()
	for _, sec in ipairs(self.sections) do
		for _, opt_wrapper in ipairs(sec.options) do
			local _, opt = next(opt_wrapper)
			if opt.api_key and opt.filter_option then
				opt.list = false
			end
		end
	end
end

data_sender_inputs.GET_after_data_hook   			= data_sender_inputs.disable_filter_list_option
data_sender_inputs.PUT_section_init_hook 			= data_sender_inputs.set_filter_list_options

function data_sender_inputs:GET_section_init_hook()
	self:set_filter_list_options()
	d_utils:check_if_plugin_is_stil_valid("input")
end

function data_sender_inputs:PUT_after_validate_section_hook()
	self:disable_filter_list_option()
	if self.current_data_block.members then return end
	local opt_members = self:find_option_by_key("members")
	local opt_members_value = self:get_abs_value(self.config, self.sid, "members")
	for k, val in ipairs(opt_members_value or {}) do
		if not val:match("^%s*$")then
			local ok, err = opt_members:validate(val)
			if not ok then
				self:add_error(STD_CODES.INVALID_OPT, err, "members at index " .. k, self.sid, val)
			end
		end
	end
end

local enabled = s:option("enabled")
enabled.require = {
	["1"] = {"plugin"}
}
function enabled:validate(value)
	return self.dt:is_bool(value)
end

local name = s:option("name")
name.maxlength = 64
name.cfg_require = true
function name:validate(value)
	return d_utils:validate_name(value, "input")
end

local plugin = s:option("plugin")
plugin.require = {}
function plugin:validate(value)
	local data_plugins = d_utils:get_plugin_names("input")
	local parent_section_id = self:find_parent_section()
	if parent_section_id then
		local collection_data_inputs = self:get_abs_value(self.config, parent_section_id, "input")
		local solo_plugin_set = {}
		for _, plugin_name in ipairs(d_utils._solo_plugin_names.input) do
			solo_plugin_set[plugin_name] = true
		end
		local plugin_to_index_map = {}
		for index, plugin_type in ipairs(data_plugins) do
			plugin_to_index_map[plugin_type] = index
		end
		for _, val in ipairs(collection_data_inputs) do
			local plugin_type = self:get_abs_value(self.config, val, "plugin")
			if plugin_type and solo_plugin_set[plugin_type] ~= nil then
				if solo_plugin_set[plugin_type] == false then
					local index = plugin_to_index_map[plugin_type]
					if index then
						table.remove(data_plugins, index)
						plugin_to_index_map[plugin_type] = nil
						for p_type, p_index in pairs(plugin_to_index_map) do
							if p_index > index then
								plugin_to_index_map[p_type] = p_index - 1
							end
						end
					end
				else
					solo_plugin_set[plugin_type] = false
				end
			end
		end
	end
	return self.dt:check_array(value, data_plugins)
end

local format = s:option("format")
format.require = {}
function format:validate(value)
	local format_types = d_utils:available_format_types()
	return self.dt:check_array(value, format_types)
end

local members = s:option("members", { list = true })
	function members:validate(value)
		local plugin = self:get_abs_value(self.config, self.sid, "plugin")
		local params = {}
		for _, plugin_info in ipairs(d_utils:get_plugin_info("input")) do
			if plugin_info.name == plugin then
				for _, param in ipairs(plugin_info.params or {}) do
					params[#params + 1] = param.name
				end
				break
			end
		end
		if #params == 0 then
			return false, "No members found for the selected plugin."
		end
		return self.dt:check_array(value, params)
	end
d_utils:import_modules("format", s, bundle, format)
d_utils:import_modules("input", s, bundle, plugin)
------------------------------------------------------------------

function data_sender_inputs:UPLOAD_after_upload_hook(upload_request) return d_utils:upload_hook(upload_request) end

return data_sender_inputs
