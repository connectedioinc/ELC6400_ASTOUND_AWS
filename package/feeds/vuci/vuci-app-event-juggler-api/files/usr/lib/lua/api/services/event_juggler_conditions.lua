local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local fs = require ("nixio.fs")
local board = require("vuci.board")
local io_info = board:has_ios() and require("vuci.io"):ioman_info(false, true) or {}

local events_juggler_conditions = ConfigService:new({ increment_name = true })

local config_name = "event_juggler"
local s = events_juggler_conditions:section(config_name, "condition")

local jg_utils = require("api.services.event_juggler_utils")(s, io_info)
local cond_plugin_list

function events_juggler_conditions:parent_exists()
	jg_utils:parent_exists("event")
end

function s:create_defaults(_)
	local set_available_conditions = function(options, sid)
		options.available_conditions = options.available_conditions or {}
		table.insert(options.available_conditions, sid)

		-- assign new condition to all related actions
		for _, action_id in ipairs(options.actions or {}) do
			local action_conds = self:table_get(self.config, action_id, "conditions") or {}
			table.insert(action_conds, sid)
			self:table_set(self.config, action_id, "conditions", action_conds)
		end
	end
	local enabled_value = (self.current_data_block["plugin"] ~= "" and self.current_data_block["plugin"]) and "1" or "0"
	return jg_utils:create_defaults(nil, { name = jg_utils:get_new_condition_name(), enabled = enabled_value }, set_available_conditions)
end

-- Return all conditions when request without binding or filtered by binding
function s:filter(options)
	if jg_utils:check_if_from_events_reporting_or_io_juggler(options) then return false end
	if not self.binding then return true end
	local event_sec = self:table_get(self.config, self.binding)
	return util.contains(event_sec.available_conditions or {}, options[".name"])
end

function events_juggler_conditions:GET_TYPE_options()
	return self:ResponseOK({
		plugins = jg_utils:get_plugin_info("condition") or {}
	})
end

function events_juggler_conditions:POST_init_hook()
	jg_utils:do_not_allow_create_without_binding(self)
	jg_utils:validate_limit_count("condition")
end

function events_juggler_conditions:validate_section_hook()
	pcall(self.validate_section_time_option, self)
	pcall(jg_utils.validate_section_io_min_max_values, jg_utils, "condition")
end

events_juggler_conditions.POST_validate_section_hook = events_juggler_conditions.validate_section_hook
events_juggler_conditions.PUT_validate_section_hook = events_juggler_conditions.validate_section_hook

function events_juggler_conditions:PUT_after_validate_section_hook()
	local enabled_value = self:get_abs_value(self.config, self.sid, "plugin") and "1" or "0"
	self:table_set(self.config, self.sid, "enabled", enabled_value)
end

function events_juggler_conditions:DELETE_before_section_delete_hook()
	local parent_sec = self:get_event_by_condition()
	if not parent_sec or not parent_sec.available_conditions then return end
	for _, cond_sid in ipairs(parent_sec.available_conditions) do
		local cond_sec = self:table_get(self.config, cond_sid)
		if cond_sec.plugin == "bool" and cond_sec[".name"] ~= self.sid and util.contains(cond_sec.bool_conditions or {}, self.sid) then
			jg_utils:remove_from_table(cond_sec.bool_conditions, self.sid)
			self:table_set(self.config, cond_sec[".name"], "bool_conditions", cond_sec.bool_conditions)
		end
	end
	self:return_if_error()
	for _, action_id in ipairs(parent_sec.actions or {}) do
		local action_sec = self:table_get(self.config, action_id)
		if action_sec.conditions and util.contains(action_sec.conditions, self.sid) then
			jg_utils:remove_from_table(action_sec.conditions, self.sid)
			self:table_set(self.config, action_id, "conditions", action_sec.conditions)
		end
	end
	jg_utils:remove_from_table(parent_sec.available_conditions, self.sid)
	self:table_set(self.config, parent_sec[".name"], "available_conditions", parent_sec.available_conditions)
end

events_juggler_conditions.UPLOAD_after_upload_hook = jg_utils.UPLOAD_after_upload_hook

function events_juggler_conditions:get_events_data()
	if not self.events_data then
		self.events_data = jg_utils:get_plugin_info("event")
	end
	return self.events_data
end

function events_juggler_conditions:get_event_by_condition()
	if self.last_sid_get_event == self.sid and self.parent_event_sec then
		return self.parent_event_sec
	end
	self.last_sid_get_event = self.sid
	self.parent_event_sec = self:table_find(self.config, "event", { available_conditions = { self.sid } })
	return self.parent_event_sec
end

events_juggler_conditions.config = config_name
cond_plugin_list = jg_utils:get_plugin_names("condition")
local event_sec = events_juggler_conditions:get_event_by_condition()
if event_sec and event_sec.plugin then
	for _, plugin in pairs(events_juggler_conditions:get_events_data()) do
		if plugin.name == event_sec.plugin and not plugin.params then
			jg_utils:remove_from_table(cond_plugin_list, "filter")
			break
		end
	end
end

	local cond_plugin = s:option("plugin")
	cond_plugin.require = {}
	function cond_plugin:validate(value)
		return self.dt:check_array(value, cond_plugin_list)
	end

	local name = s:option("name")
		name.cfg_require = true
		function name:validate(value)
			return jg_utils:validate_name(value, "condition")
		end

	-- --------------------------------- BOOL ---------------------------------

	if util.contains(cond_plugin_list, "bool") then
		cond_plugin.require["bool"] = {"bool_operation", "bool_conditions"}

		function events_juggler_conditions:get_available_conditions()
			if self.last_sid_get_conditions == self.sid and self.available_conditions then
				return self.available_conditions
			end
			local parent_event_sec = util.clone(self:table_find(self.config, "event", { available_conditions = { self.sid } }), true) or {}
			jg_utils:remove_from_table(parent_event_sec.available_conditions, self.sid)
			self.available_conditions = parent_event_sec.available_conditions
			self.last_sid_get_conditions = self.sid
			return self.available_conditions
		end

		s:option("bool_operation").validate = function(self, value)
			return self.dt:check_array(value, {"and", "or"})
		end

		local bool_conditions = s:option("bool_conditions", { list = true })
			function bool_conditions:validate(value)
				return self.dt:check_array(value, self:get_available_conditions())
			end
			function bool_conditions:set(value)
				if not value or #value == 0 then
					return self:table_delete(self.config, self.sid, self.api_key)
				end
				if value and #value < 2 then
					return self:add_critical_error(STD_CODES.INVALID_OPT, "Required at least two conditions", "bool_conditions")
				end
				self:table_set(self.config, self.sid, self.api_key, value)
			end
		s:option("bool_not").validate = function(self, value)
				return self.dt:is_bool(value)
		end
	end

	-- --------------------------------- FILTER ---------------------------------
	if util.contains(cond_plugin_list, "filter") then
		cond_plugin.require["filter"] = {"filter_name", "filter_value", "filter_operator"}

		function events_juggler_conditions:get_params()
			if self.sid_get_params == self.sid and self.event_params then 
				return self.event_params
			end
			local event_sec = self:get_event_by_condition()
			if not event_sec or not event_sec[".name"] then return false end
			self.event_params = jg_utils:get_filter_params(event_sec.plugin, event_sec.io_name)
			self.sid_get_params = self.event_params and self.sid or nil
			return self.event_params
		end

		function events_juggler_conditions:get_event_params()
			local params = self:get_params()
			if not params then return {} end
			return util.keys(params)
		end

		function events_juggler_conditions:get_param_type()
			local params = self:get_params()
			if not params then return nil end
			local opt_filter_name = self:get_abs_value(self.config, self.sid, "filter_name")
			if not opt_filter_name then return nil end
			return params[opt_filter_name]
		end

		s:option("filter_name").validate = function(self, value)
			return self.dt:check_array(value, self:get_event_params())
		end

		local filter_value = s:option("filter_value")
		function filter_value:validate(value)
			local data_type = self:get_param_type()
			local rules = {
				["bool"] = "is_bool",
				["int"] = "uinteger",
				["double"] = "ufloat"
			}
			return self.dt[rules[data_type] or "string"](self, value)
		end

		s:option("filter_operator").validate = function(self, value)
			local data_type = self:get_param_type()
			local operators = {
				["bool"] 	= {"eq", "ne"},
				["string"]	= { "eq", "ne", "in" },
			}
			return self.dt:check_array(value, operators[data_type] or { "eq", "ne", "gt", "ge", "lt", "le" })
		end

		s:option("filter_not").validate = function(self, value)
			return self.dt:is_bool(value)
		end
	end

	-- --------------------------------- GPS ---------------------------------

	if util.contains(cond_plugin_list, "gps") then
		cond_plugin.require["gps"] = {"gps_cond_longitude", "gps_cond_latitude", "gps_cond_radius", "gps_cond_event"}

		s:option("gps_cond_longitude").validate = function(self, value)
			return self.dt:precision_range(value, -180.000000, 180.000000)
		end

		s:option("gps_cond_latitude").validate = function(self, value)
			return self.dt:precision_range(value, -90.000000, 90.000000)
		end

		s:option("gps_cond_radius").validate = function(self, value)
			return self.dt:irange(value, 1, 999999)
		end

		s:option("gps_cond_event").validate = function(self, value)
			return self.dt:check_array(value, {"in", "out"})
		end
	end

	-- --------------------------------- IO ---------------------------------

	if util.contains(cond_plugin_list, "io") then
		cond_plugin.require["io"] = {"io_cond_name"}

		local io_cond_name = s:option("io_cond_name")
			if #io_info > 0 then
				for _, pin in ipairs(io_info) do
					if not io_cond_name.require then io_cond_name.require = {} end
					if pin.type == "acl" then io_cond_name.require[pin.name] = {"io_cond_acl", "io_cond_min", "io_cond_max"} end
					if pin.type == "adc" then io_cond_name.require[pin.name] = {"io_cond_min", "io_cond_max"} end
					if util.contains({"dwi", "relay", "gpio"}, pin.type) then
						io_cond_name.require[pin.name] = {"io_cond_state"} 
					end
				end
			end
			function io_cond_name:validate(value)
				return self.dt:check_array(value, jg_utils:get_cond_io_pins())
			end

		s:option("io_cond_state").validate = function(self, value)
				return self.dt:is_bool(value)
		end

		s:option("io_cond_acl").validate = function(self, value)
			local name = self:get_abs_value(self.config, self.sid, "io_cond_name")
			if not (name and name:find("acl")) then
				return false, "Option is not available for this IO pin"
			end
			return self.dt:check_array(value, { "current", "percent" })
		end
	
		s:option("io_cond_not").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		s:option("io_cond_max").maxlength = 16
		s:option("io_cond_min").maxlength = 16
	end

	-- --------------------------------- LUA ---------------------------------

	if util.contains(cond_plugin_list, "lua") then
		cond_plugin.require["lua"] = {"lua_cond_path"}

		jg_utils.userscripts_permission_option("lua_cond_path", s, { file = true })

		events_juggler_conditions:action("download_example_condition_lua", function (self)
			local file_path = "/etc/event_juggler/condition.lua"
			if not fs.access(file_path) then
				return self:ResponseNotFound("Failed to download condition example lua file.")
			end
			return self:File(file_path, "example_condition_lua.lua")
		end)
	end

	-- --------------------------------- TIME ---------------------------------

	if util.contains(cond_plugin_list, "time") then
		cond_plugin.require["time"] = {"time_cond_day_type"}

		s:option("time_cond_not").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		local time_cond_day_type = s:option("time_cond_day_type")
			time_cond_day_type.require = {
				["yearday"] 	= {"time_cond_start_yday", "time_cond_end_yday"}
			}
			function time_cond_day_type:validate(value)
				return self.dt:check_array(value, {"weekday", "monthday", "yearday"})
			end

		s:option("time_cond_day", { list = true }).validate = function(self, value)
			return self.dt:irange(value, 1, 31)
		end

		local time_cond_wday= s:option("time_cond_wday", { list = true })
			function time_cond_wday:validate(value)
				return self.dt:check_array(value, jg_utils.weekdays)
			end
			function time_cond_wday:set(value)
				value = jg_utils:convert_weekdays_to_numbers(value)
				if not value or #value == 0 then
					return self:table_delete(self.config, self.sid, self.api_key)
				end
				self:table_set(self.config, self.sid, self.api_key, value)
			end
			function time_cond_wday:get(value)
				return jg_utils:convert_numbers_to_weekdays(value)
			end

		s:option("time_cond_start_yday").validate = function(self, value)
			local opt_time_cond_end_yday = self:get_abs_value(self.config, self.sid, "time_cond_end_yday")
			if tonumber(value) > tonumber(opt_time_cond_end_yday) then
				return false, "Start day of the year cannot be greater than the end day."
			end
			return self.dt:irange(value, 1, 365)
		end

		s:option("time_cond_end_yday").validate = function(self, value)
			local time_cond_start_yday = self:get_abs_value(self.config, self.sid, "time_cond_start_yday")
			if tonumber(time_cond_start_yday) > tonumber(value) then
				return false, "End day of the year cannot be earlier than the start day."
			end
			return self.dt:irange(value, 1, 366)
		end

		local time_cond_start_time = s:option("time_cond_start_time")
			time_cond_start_time.require = {"time_cond_end_time"}
			function time_cond_start_time:validate(value)
				return events_juggler_conditions:time_cond_time_validation(value)
			end

		local time_cond_end_time = s:option("time_cond_end_time")
			time_cond_end_time.require = {"time_cond_start_time"}
			function time_cond_end_time:validate(value)
				return events_juggler_conditions:time_cond_time_validation(value)
			end

		s:option("time_cond_month_override").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		function events_juggler_conditions:time_cond_time_validation(val)
			if val and (val:match("^[0-1][0-9]:[0-5][0-9]$") or
					val:match("^[0-9]:[0-5][0-9]$") or
					val:match("^[0-2][0-3]:[0-5][0-9]$") or
					val:match("^%*:[0-5][0-9]$")) then
				return true
			end
			return false, "Time of format hh:mm or *:mm is accepted. '*' means 'every hour'."
		end

		function events_juggler_conditions:validate_section_time_option()
			local opt_time_cond_start_time = self:get_abs_value(self.config, self.sid, "time_cond_start_time")
			local opt_time_cond_end_time = self:get_abs_value(self.config, self.sid, "time_cond_end_time")
			if not (opt_time_cond_start_time and opt_time_cond_end_time) then
				return
			end
			local splited_start_time = util.split(opt_time_cond_start_time, ":")[1]
			local splited_end_time = util.split(opt_time_cond_end_time, ":")[1]
			if (splited_start_time == "*" and splited_end_time ~= "*") or 
				(splited_start_time ~= "*" and splited_end_time == "*") then
				self:add_critical_error(
					STD_CODES.INVALID_OPT,
					"Both 'time_cond_start_time' and 'time_cond_end_time' must be '*' or neither should be '*'",
					"Validation"
				)
			end
		end

	end

return s