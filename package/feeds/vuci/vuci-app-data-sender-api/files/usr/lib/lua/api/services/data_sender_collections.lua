local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local pac = require("vuci.package_checker")
local fs = require("nixio.fs")

local data_sender_collections = ConfigService:new({ increment_name = true })
local d_utils = require("api.services.data_sender_utils")(data_sender_collections, nil, "collection")

local bundle = {
	["util"]		= util,
	["d_utils"] 	= d_utils
}

---Validates option requires using api-core functions and adds error messages
---@param plugin_sname string Section name of plugin to validate
---@param plugin table Plugin to validate object
---@param plugin_type "input"|"output"
function data_sender_collections:validate_requires(plugin_sname, plugin, plugin_type)
	local msg
	
	if plugin_type == "input" and self:table_get(self.config, plugin_sname, "enabled") ~= "1" then
		return
	end

	if (plugin_type == "input" or plugin_type == "output") and plugin_sname and plugin_sname ~= "" then
		msg = string.format("Data sender %s (id = %s) is missing required option:", plugin_type, plugin_sname)
	end

	if not self:table_get(self.config, plugin_sname, "name") and msg then
		self:add_error(STD_CODES.INVALID_OPT, msg .. " name", "name", plugin_sname)
	end

	local plugin_val = self:table_get(self.config, plugin_sname, "plugin")
	plugin_val = plugin_val == "ubus" and "azure" or plugin_val
	if not plugin_val and msg then
		self:add_error(STD_CODES.INVALID_OPT, msg .. " plugin", "plugin", plugin_sname)
		return
	end
	local opt_prefix = d_utils:plugin_to_opt_prefix(plugin_val)

	for _, sec in ipairs(plugin.sections) do
		for _, opt_wrapper in ipairs(sec.options) do
			local _, opt = next(opt_wrapper)

			-- only validate options related to the plugin and main options
			if not opt_prefix or opt.api_key:match("^" .. opt_prefix) or d_utils.main_options[opt.api_key] then
				opt.sid = plugin_sname
				local abs_val = opt:get(self:table_get(self.config, opt:_get_sid(plugin_sname), opt.api_key), plugin_sname)
				if abs_val ~= "" and abs_val ~= nil then
					function opt:add_error(code, default_msg, src, sid, ...)
						local missing_opt_name = util.split(default_msg, ":")[2]
						data_sender_collections:add_error(code, msg .. missing_opt_name, src, plugin_sname, ...)
					end

					function opt:_get_value(key)
						local required_opt = self:find_option_by_key(key)
						required_opt.sid = plugin_sname
						return required_opt:get(
							self:table_get(required_opt.config, required_opt:_get_sid(required_opt.sid), key),
							required_opt.sid
						)
					end

					opt:validate_requires(abs_val)
				end
			end
		end
	end
end

function data_sender_collections:validate_plugins()
	local d_outputs = require "api.services.data_sender_outputs"
	local d_inputs = require "api.services.data_sender_inputs"
	local output_sname = self:get_abs_value(self.config, self.sid, "output") or self.current_data_block["output"]
	local input_snames = self:get_abs_value(self.config, self.sid, "input") or self.current_data_block["input"] or {}
	local collection_name = self:get_abs_value(self.config, self.sid, "name") or self.current_data_block["name"]
	if not collection_name or collection_name == "" then
		self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", "name")
	end
	if output_sname then
		self:validate_requires(output_sname, d_outputs, "output")
	end
	for _, inp_sname in ipairs(input_snames) do
		self:validate_requires(inp_sname, d_inputs, "input")
	end
end

function data_sender_collections:time_validation()
	local time_data = {}
	for key, val in ipairs(type(self.current_data_block.time) == "table" and self.current_data_block.time or {}) do
		if val ~= "" then  
			if not self.dt.regex.new("^([0-1][0-9]|[2][0-3]|\\*):([0-5][0-9]|\\*)(,([0-5][0-9]|\\*))*$"):exec(val) then
				self:add_error(STD_CODES.INVALID_OPT,
					"Time of format hh:mm, hh:mm,mm, *:mm, *:mm,mm hh:*, or *:* is accepted. '*' means 'every hour' or 'every minute'. If regular minutes are used, multiple minute values can be provided by seperating them with ','.", "time at index " .. key, nil, val)
			else
				local data = util.split(val, ":")
				local hour = data[1]
				local minutes = util.split(data[2], ",")
				for _, minute in pairs(minutes) do
					time_data[hour] = time_data[hour] or {}
					if minute == "*" and #minutes > 1 then
						self:add_error(STD_CODES.INVALID_OPT, "It's not possible to use multiple minute values when '*' (every minute wildcard) is selected.", "time at index " .. key, nil, val)
					elseif time_data[hour][minute] then
						self:add_error(STD_CODES.INVALID_OPT, string.format("'%s' minute value for hour '%s' is already used.", minute, hour), "time at index " .. key, nil, val)
					else
						time_data[hour][minute] = true
					end
				end
			end
		end
	end
end
function data_sender_collections:GET_TYPE_limits()
	return self:ResponseOK(d_utils:get_max_limit_count())
end

function data_sender_collections:change_output_name()
	local old_name = self:table_get(self.config, self.sid, "name")
	local new_name = self:get_abs_value(self.config, self.sid, "name")
	if new_name and new_name ~= "" and old_name ~= new_name then
		local output_id = self:get_abs_value(self.config, self.sid, "output")
		self:table_set(self.config, output_id, "name", new_name .. "_output")
	end
end

function data_sender_collections:validate_section_hook()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled")

	if self.request_method == "POST" and opt_enabled == "1" then self:add_critical_error(STD_CODES.INVALID_OPT, "Only existing collections can be enabled.", "enabled", nil, self.sid, opt_enabled) end
	if not opt_enabled or opt_enabled == "0" then
		d_utils:disable_requires()
	else
		d_utils:enable_requires()
	end

	-- Checks if need change output plugin name
	if self.request_method == "PUT" then
		self:change_output_name()
	end

	-- Validate Input and Output Plugins
	if opt_enabled and opt_enabled == "1" then
		self:validate_plugins()
	end
	self:time_validation()
end

function data_sender_collections:ubus_service_enable_disable(package_name, config, sid, option, value)
	-- Checks if package controll file exists
	if not pac.is_installed(package_name) then
		return
	end

	-- Checks if plugin type == ubus
	local output = self:get_abs_value(self.config, self.sid, "output")
	local is_ubus = self:table_get(self.config, output, "plugin") == "ubus"
	local is_hidden_or_old = self:table_get(config, sid, "hidden") == "1" or self:table_get(config, sid, "old") == "1"
	if output and is_ubus and is_hidden_or_old then
		self:table_set(config, sid, option, value)
	end
end

function data_sender_collections:azure_enable_disable(value)
	local opt_output = self:get_abs_value(self.config, self.sid, "output")
	local azure_section_id = d_utils:get_azure_section_id(opt_output)
	if azure_section_id then
		self:ubus_service_enable_disable("azure_iothub", "azure_iothub", azure_section_id, "enabled", value)
	end
end

data_sender_collections.POST_validate_section_hook = data_sender_collections.validate_section_hook
data_sender_collections.PUT_validate_section_hook = data_sender_collections.validate_section_hook

function data_sender_collections:POST_after_data_hook()
	-- Create automatically output section and assign to collection
	local output_id = self:next_id()
	local opt_name = self:get_abs_value(self.config, self.sid, "name") or self.current_data_block["name"]
	self:table_section(self.config, "output", output_id, { name = opt_name .. "_output" })
	self:table_set(self.config, self.sid, "output", output_id)
	self:add_message(d_utils.CODES.OUTPUT_CREATED, "Output configuration was automatically created.", "output")

	local input_id = self:next_id()
	self:table_section(self.config, "input", input_id, {
		enabled = "1",
		plugin = "base",
		format = "json",
		name = require("vuci.util_tlt").get_next_name(self, self.config, "input", "name", "input", true)
	})
	self:table_set(self.config, self.sid, "input", { input_id })
	self:add_message(d_utils.CODES.INPUT_CREATED, "Input configuration was automatically created.", "input")
end

function data_sender_collections:DELETE_before_section_delete_hook()
	local function delete_uploaded_files(sid)
		for uploaded_file in fs.glob("/etc/vuci-uploads/cbid.data_sender." .. sid .. ".*") do
			fs.remove(uploaded_file) -- remove section uploaded files
		end
	end
	local inputs = self:table_get(self.config, self.sid, "input") or {}
	local output = self:table_get(self.config, self.sid, "output")
	-- delete related inputs and outputs
	for _, inp in ipairs(inputs) do
		if self:table_get(self.config, inp) then
			self:table_delete(self.config, inp)
			delete_uploaded_files(inp)
		end
	end
	if output and self:table_get(self.config, output) then
		d_utils:remove_azure_plugin_selection(output)
		self:table_delete(self.config, output)
		delete_uploaded_files(output)
	end
end

function data_sender_collections:get_week_days()
	local week_days = self.current_data_block.week_days
	if week_days and week_days ~= "" then
		return d_utils:convert_from_week_days(week_days)
	end
	return self:table_get(self.config, self.sid, "week_days")
end

local s = data_sender_collections:section("data_sender", "collection")
function s:create_defaults(sid)
	local max_sender_id = 1
	self:table_foreach("data_sender", "collection", function(s)
		local sender_id = tonumber(s.sender_id)
		if sender_id and sender_id >= max_sender_id then
			max_sender_id = sender_id + 1
		end
	end)
	local default_values = {
		sender_id 	= tostring(max_sender_id),
		format 		= "json",
		name = require("vuci.util_tlt").get_next_name(self, self.config, self.section_type, "name", "collection")
	}
	local opt_timer = self:get_abs_value(self.config, sid, "timer")
	if not opt_timer or opt_timer == "" then
		default_values.period 	= "60"
		default_values.timer 	= "period"
	end
	return default_values
end

local name = s:option("name")
name.cfg_require = true
name.maxlength = 64
function name:validate(value)
	return d_utils:validate_name(value, "collection")
end

------------------------ Filter options ------------------------

local format = s:option("format")
format.require = {}
function format:validate(value)
	return self.dt:check_array(value, d_utils:available_format_types())
end

d_utils:import_modules("format", s, bundle, format)

local enabled = s:option("enabled")
enabled.require = {
	["1"] = { "input", "output", "timer" }
}
function enabled:validate(value)
	return self.dt:is_bool(value)
end

enabled.original_set = enabled.set
function enabled:set(value)
	self:original_set(value)
	self:azure_enable_disable(value)
end

local timer = s:option("timer")
timer.require = { 
	["period"] = { "period" }, 
	["scheduler"] = { "time", "day_mode" } 
}
function timer:validate(value)
	return self.dt:check_array(value, {"none", "period", "scheduler"})
end
function timer:get(value)
	return value or "period"
end

local period = s:option("period")
function period:validate(value)
	return self.dt:irange(value, 1, 86400)
end

local time = s:option("time", { list = true })
time.allow_duplicates = true
time.list_length = 10

function time:set(value)
	local week_day = table.concat(self:get_week_days() or {}, ",")
	local month_day = table.concat(self:get_abs_value(self.config, self.sid, "month_days") or {}, ",")
	week_day = (week_day == "" and "*") or week_day
	month_day = (month_day == "" and "*") or month_day
	local res = {}
	for _, v in ipairs(value or {}) do
		if v ~= "" then
			table.insert(res, v:match("^[^:]+:[^:]+") .. ":" .. month_day .. ":" .. week_day)
		end
	end
	self:table_set(self.config, self.sid, self.api_key, res)
end
function time:get(value)
	for k, v in ipairs(value or {}) do
		value[k] = v:match("^[^:]+:[^:]+")
	end
	return value
end

local day_mode = s:option("day_mode")

function day_mode:validate(value)
	return self.dt:check_array(value, {"month", "week"})
end

local month_day = s:option("month_days", { list = true })
function month_day:validate(value)
	return self.dt:irange(value, 1, 31)
end
function month_day:set(value)
	local opt_time = self:getter_wrapped_abs_value(self.config, self.sid, "time") or {}
	time:set(opt_time)
	if value == "" or (type(value) == "table" and #value == 0) then
		return self:table_delete(self.config, self.sid, self.api_key)
	end
	self:table_set(self.config, self.sid, self.api_key, value)
end

local week_day = s:option("week_days", { list = true })
function week_day:validate(value)
	return self.dt:check_array(value, d_utils.week_days)
end
function week_day:set(value)
	local opt_time = self:getter_wrapped_abs_value(self.config, self.sid, "time") or {}
	time:set(opt_time)
	if value == "" or (type(value) == "table" and #value == 0) then
		return self:table_delete(self.config, self.sid, self.api_key)
	end
	self:table_set(self.config, self.sid, self.api_key, d_utils:convert_from_week_days(value))
end
function week_day:get(value)
	if not value or value == "" then
		return nil
	end
	return d_utils:convert_to_week_days(value)
end

local last_day = s:option("last_day")
function last_day:validate(value)
	return self.dt:is_bool(value)
end

local retry = s:option("retry")
retry.require = { ["1"] = { "retry_count", "retry_timeout" } }
function retry:validate(value)
	return self.dt:is_bool(value)
end

local retry_count = s:option("retry_count")
function retry_count:validate(value)
	return self.dt:irange(value, 1, 10)
end

local retry_timeout = s:option("retry_timeout")
function retry_timeout:validate(value)
	return self.dt:irange(value, 1, 10)
end

local available_encoders = d_utils:available_encoder_types()

if available_encoders and #available_encoders > 0 then

	local encoder = s:option("encoder")
		function encoder:validate(value)
			return self.dt:check_array(value, available_encoders)
		end
end

local input = s:option("input", { list = true })
input.readonly = true

local output = s:option("output")
output.readonly = true

function data_sender_collections:POST_validate_hook()
	d_utils:validate_limit_count("collection")
end

function data_sender_collections:UPLOAD_after_upload_hook(upload_request) return d_utils:upload_hook(upload_request) end

return data_sender_collections
