local ConfigService = require("api/ConfigService")
local io = require("vuci.io")
local io_info = io:ioman_info()
local board = require("vuci.board")
local io_juggler_utils = require("api.services.io_juggler_utils")

if not board:has_ios() then return nil end

local IoJugglerCondition = ConfigService:new({ increment_name = true })

local s = IoJugglerCondition:section("event_juggler", "condition")

function IoJugglerCondition:get_cond_option(option_name)
	return self:table_get(self.config, self.sid, option_name)
end

function IoJugglerCondition:delete_cond_option(option_names)
	if type(option_names) == "string" then
		option_names = { option_names }
	end
	for _, option_name in ipairs(option_names) do
		self:table_delete(self.config, self.sid, option_name)
	end
end

function IoJugglerCondition:set_cond_option(option_name, value)
	if not value or (type(value) == "table" and #value == 0) or value == "" then
		return self:table_delete(self.config, self.sid, option_name)
	end
	self:table_set(self.config, self.sid, option_name, value)
end

local multi_options = {
	["not"] = { analog = "io_cond_not", minute = "time_cond_not", hour = "time_cond_not", weekday = "time_cond_not", monthday = "time_cond_not", yearday= "time_cond_not"}
}
function IoJugglerCondition:set_multi_option(api_key, value)
	local default_option = true
	local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
	if multi_options[api_key][opt_type] then
		self:set_cond_option(multi_options[api_key][opt_type], value)
		default_option = false
	end
	if default_option then
		self:set_cond_option(api_key, value)
	else
		self:table_delete(self.config, self.sid, api_key)
	end
end

function IoJugglerCondition:get_multi_option(api_key)
	local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
	if opt_type and multi_options[api_key][opt_type] then
		return self:get_cond_option(multi_options[api_key][opt_type])
	end
	for _, opt_name in pairs(multi_options[api_key] or {}) do
		local opt_value = self:get_cond_option(opt_name)
		if opt_value then
			return opt_value
		end
	end
	return self:get_cond_option(api_key)
end

function IoJugglerCondition:section_init_hook()
	self:set_multi_option("not", self:getter_wrapped_abs_value(self.config, self.sid, "not"))
	local cfg_time_old_type = self:table_get(self.config, self.sid, "time_old_type")
	local ui_timetype = self:get_abs_value(self.config, self.sid, "ui_timetype")
	local ui_timetype_old = self:table_get(self.config, self.sid, "ui_timetype")
	if ui_timetype ~= ui_timetype_old then	
		self:delete_cond_option({"time_cond_start_time", "time_cond_end_time", "time_cond_wday", "time_cond_day", "time_cond_start_yday", "time_cond_end_yday"})
	end
	if cfg_time_old_type then
		self:refresh_value_interval(ui_timetype == "1", cfg_time_old_type)
	end
end

-- IoJugglerCondition.POST_section_init_hook = IoJugglerCondition.section_init_hook
IoJugglerCondition.PUT_section_init_hook = IoJugglerCondition.section_init_hook

local _type

function IoJugglerCondition:validate_section_hook()
	local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
	local required_options = {
		bool		= {"operation", "conditions"},
		io			= {"name", "state"},
		analog		= {"name", "not"},
		minute		= {},
		hour		= {},
		weekday		= {},
		monthday 	= {},
		yearday		= {},
	}
	if not required_options[opt_type] then
		return
	end
	if opt_type and (opt_type == "minute" or opt_type == "hour" or opt_type == "weekday" or opt_type == "monthday" or opt_type == "yearday") then
		local opt_ui_timetype = self:getter_wrapped_abs_value(self.config, self.sid, "ui_timetype")
		if opt_ui_timetype and opt_ui_timetype == "1" then
			table.insert(required_options[opt_type], "interval1")
			table.insert(required_options[opt_type], "interval2")
		else
			table.insert(required_options[opt_type], "value")
		end
	end
	if opt_type and opt_type == "analog" then
		local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
		if opt_name and opt_name:match("acl") then
			table.insert(required_options[opt_type], "acl")
			local opt_acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if opt_acl and opt_acl == "current" then
				table.insert(required_options[opt_type], "min_curr")
				table.insert(required_options[opt_type], "max_curr")
			end
			if opt_acl and opt_acl == "percent" then
				table.insert(required_options[opt_type], "min_perc")
				table.insert(required_options[opt_type], "max_perc")
			end
		end
		if opt_name and (opt_name:match("adc") or opt_name:match("pwr")) then
			table.insert(required_options[opt_type], "min")
			table.insert(required_options[opt_type], "max")
		end
	end
	_type.require = required_options
	if opt_type == "bool" then
		local opt_conditions = self:getter_wrapped_abs_value(self.config, self.sid, "conditions")
		if type(opt_conditions) == "table" and #opt_conditions < 2 then
			self:add_error(STD_CODES.INVALID_OPT, "Required at least two conditions", "conditions")
		end
	end
end

IoJugglerCondition.PUT_validate_section_hook = IoJugglerCondition.validate_section_hook

function s:create_defaults(_)
	return {
		io_juggler	= "1",
		enabled		= "1",
		name = require("vuci.util_tlt").get_next_name(self, self.config, self.section_type, "name", "condition"),
	}
end

function s:filter(options)
    return options["io_juggler"] == "1"
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local name = s:option("ui_name")
	name.maxlength = 16
	name.cfg_require = true
		function name:validate(value)
			local exists = false
			self:table_foreach(self.config, "condition", function(c)
				if c.ui_name == value and c[".name"] ~= self.sid then exists = true end
			end)
			if exists then return false, "Name is already used in another configuration." end
			return self.dt:uciname(value)
		end
		function name:set(value)
			self:set_cond_option("name", value)
		end
		function name:get()
			return self:get_cond_option("name")
		end

	_type = s:option("type")
		function _type:validate(value)
			local type_options = { "io", "minute", "hour", "weekday", "monthday", "yearday", "bool" }
			local adc, acl
			for _, pin in ipairs(io_info) do
				if pin.type == "adc" then adc = true end
				if pin.type == "acl" then acl = true end
			end
			if adc or acl then table.insert(type_options, "analog") end
			return self.dt:check_array(value, type_options)
		end
		function _type:set(value)
			if not value or value == "" then
				self:table_delete(self.config, self.sid, "analog")
				self:table_delete(self.config, self.sid, "io")
				self:table_delete(self.config, self.sid, "time_old_type")
				return self:table_delete(self.config, self.sid, "plugin")
			end
			local section_table = self:table_get(self.config, self.sid)
			if value == "analog" and section_table["io"] == "1" then
				self:table_delete(self.config, self.sid, "io")
			end
			if value == "io" and section_table["analog"] == "1" then
				self:table_delete(self.config, self.sid, "analog")
			end
			if value == "analog" or value == "io" then
				self:table_set(self.config, self.sid, value, "1")
				self:table_delete(self.config, self.sid, "time_old_type")
				return self:set_cond_option("plugin", "io")
			elseif value == "bool" then
				self:table_delete(self.config, self.sid, "time_old_type")
				return self:set_cond_option("plugin", value)
			end
			self:set_cond_option("plugin", "time")
			self:set_cond_option("time_old_type", value)
		end
		function _type:get()
			local section_table = self:table_get(self.config, self.sid) or {}
			if section_table["plugin"] == "io" then
				if section_table["io"] == "1" then
					return "io"
				end
				if section_table["analog"] == "1" then
					return "analog"
				end
			end
			if section_table["plugin"] == "time" then
				return section_table["time_old_type"]
			end
			return section_table["plugin"] ~= "" and section_table["plugin"] or nil
		end

	local name_original_analog = s:option("name")
		function name_original_analog:validate(value)
			local pin_names = {}
			for _, pin in ipairs(io_info or {}) do
				if pin.type == "adc" or pin.type == "acl" then table.insert(pin_names, pin.name) end
				if pin.type == "gpio" or pin.type == "dwi" or pin.type == "relay" then table.insert(pin_names, pin.name) end
			end
			return self.dt:check_array(value, pin_names)
		end
		function name_original_analog:set(value)
			self:set_cond_option("io_cond_name", value)
		end
		function name_original_analog:get()
			return self:get_cond_option("io_cond_name")
		end

	local is_not = s:option("not")
		function is_not:validate(value)
			return self.dt:is_bool(value)
		end
		function is_not:set(value)
			return self:set_multi_option(self.api_key, value)
		end
		function is_not:get()
			return self:get_multi_option(self.api_key)
		end

	
	local month_override = s:option("month_override")
		function month_override:validate(value)
			return self.dt:is_bool(value)
		end
		function month_override:set(value)
			self:set_cond_option("time_cond_month_override", value)
		end
		function month_override:get()
			return self:get_cond_option("time_cond_month_override")
		end

	local operation = s:option("operation")
		function operation:validate(value)
			local operation_options = { "and", "nand", "or", "nor" }
			return self.dt:check_array(value, operation_options)
		end
		function operation:get()
			local value = self:get_abs_value(self.config, self.sid, "bool_operation")
			local not_val = self:table_get(self.config, self.sid, "bool_not")
			if value == "and" and not_val == "1" then
				return "nand"
			elseif value == "or" and not_val == "1" then
				return "nor"
			end
			return value
		end
		function operation:set(value)
			if value == "nand" then
				self:table_set(self.config, self.sid, "bool_operation", "and")
				self:table_set(self.config, self.sid, "bool_not", "1")
			elseif value == "nor" then
				self:table_set(self.config, self.sid, "bool_operation", "or")
				self:table_set(self.config, self.sid, "bool_not", "1")
			else
				self:table_delete(self.config, self.sid, "bool_not")
				self:table_set(self.config, self.sid, "bool_operation", value)
			end
		end

IoJugglerCondition.condition_options = nil
function IoJugglerCondition:fetch_condition_options()
	if self.condition_options then return self.condition_options end
	self.condition_options = {}
	self:table_foreach(self.config, "condition", function(c)
		if c[".name"] ~= self.sid and c.name and c.io_juggler == "1" then
			self.condition_options[c[".name"]] = c.name
		end
	end)
	return self.condition_options
end

function IoJugglerCondition:check_condition_option(condition_name, all_conditions)
	local sid
	for k, v in pairs(all_conditions) do
		if (v == condition_name) then
			sid = k
		end
	end
	return require("api.services.io_juggler_utils"):validate_condition(self:table_get(self.config, sid))
end

	local conditions = s:option("conditions", { list = true })
		function conditions:validate(value)
			local condition_names = {}
			local all_conditions = {}
			for key, value in pairs(self:fetch_condition_options()) do
				table.insert(condition_names, value)
				all_conditions[key] = value
			end
			local ok, msg = self.dt:check_array(value, condition_names)
			if not ok then
				return false, msg
			end
			if not self:check_condition_option(value, all_conditions) then
				return false, string.format("Can't use '%s' condition because it is not fully configured.", value)
			end
			return true
		end
		function conditions:set(value)
			local id = {}
			for _, single_value in ipairs(value) do
				self:table_foreach(self.config, "condition", function(c)
					if c.io_juggler == "1" and c.name == single_value then id[#id + 1] = c[".name"] end
				end)
			end
			self:set_cond_option("bool_conditions", id)
		end
		function conditions:get()
			local value = self:get_cond_option("bool_conditions")
			local names = {}
			if value ~= nil and value ~= "" then
				for _, single_value in ipairs(value) do
					self:table_foreach(self.config, "condition", function(s)
						if s[".name"] == single_value then names[#names + 1] = s.name end
					end)
				end
			end
			return #names > 0 and names or nil
		end

	function IoJugglerCondition:get_opt_value(opt_type)
		if opt_type == "minute" then
			local minute = self:get_cond_option("time_cond_start_time") or self:get_cond_option("time_cond_end_time")
			return minute and minute:match(":(%d+)") or nil
		elseif opt_type == "hour" then
			local hour = self:get_cond_option("time_cond_start_time") or self:get_cond_option("time_cond_end_time")
			return hour and hour:match("(%d+):") or nil
		elseif opt_type == "weekday" then
			local weekdays = self:get_cond_option("time_cond_wday")
			return weekdays and weekdays[1] or nil
		elseif opt_type == "monthday" then
			local monthday = self:get_cond_option("time_cond_day")
			return monthday and monthday[1] or nil
		elseif opt_type == "yearday" then
			return self:get_cond_option("time_cond_start_yday") or self:get_cond_option("time_cond_end_yday")
		end
	end

	function IoJugglerCondition:get_opt_interval1(opt_type)
		if opt_type == "minute" then
			local minute = self:get_cond_option("time_cond_start_time")
			return minute and minute:match(":(%d+)") or nil
		elseif opt_type == "hour" then
			return self:get_cond_option("time_cond_start_time")
		elseif opt_type == "weekday" then
			local weekdays = self:get_cond_option("time_cond_wday")
			if not weekdays or #weekdays == 0 then
				return
			end
			return weekdays[1]
		elseif opt_type == "monthday" then
			local monthdays = self:get_cond_option("time_cond_day")
			if not monthdays or #monthdays == 0 then
				return
			end
			return tostring(math.min(unpack((function()
				local tmp = {}
				for i, v in ipairs(monthdays) do tmp[i] = tonumber(v) end
				return tmp
			end)())))
		elseif opt_type == "yearday" then
			return self:get_cond_option("time_cond_start_yday")
		end
	end

	function IoJugglerCondition:get_opt_interval2(opt_type)
		if opt_type == "minute" then
			local minute = self:get_cond_option("time_cond_end_time")
			return minute and minute:match(":(%d+)") or nil
		elseif opt_type == "hour" then
			return self:get_cond_option("time_cond_end_time")
		elseif opt_type == "weekday" then
			local weekdays = self:get_cond_option("time_cond_wday")
			if not weekdays or #weekdays == 0 then
				return
			end
			return weekdays[#weekdays]
		elseif opt_type == "monthday" then
			local monthdays = self:get_cond_option("time_cond_day")
			if not monthdays or #monthdays == 0 then
				return
			end
			return tostring(math.max(unpack((function()
				local tmp = {}
				for i, v in ipairs(monthdays) do tmp[i] = tonumber(v) end
				return tmp
			end)())))
		elseif opt_type == "yearday" then
			return self:get_cond_option("time_cond_end_yday")
		end
	end

	function IoJugglerCondition:refresh_value_interval(ui_timetype_on, opt_type)
		if not ui_timetype_on then
			local opt_value = self:find_option_by_key("value")
			local val = self:get_opt_value(opt_type)
			if opt_value and val then
				opt_value:set(val)
			end
		else
			local interval1 = self:find_option_by_key("interval1")
			local interval2 = self:find_option_by_key("interval2")
			local interval1_value = self.current_data_block.interval1 or self:get_opt_interval1(opt_type)
			local interval2_value = self.current_data_block.interval2 or self:get_opt_interval2(opt_type)
			if interval1 and interval1_value then
				interval1:set(interval1_value)
			end
			if interval2 and interval2_value then
				interval2:set(interval2_value)
			end
		end
	end

	local timetype = s:option("ui_timetype")
		function timetype:validate(value)
			return self.dt:is_bool(value)
		end

function IoJugglerCondition:time_validation(value, opt_name)
	local section_type = self:getter_wrapped_abs_value(self.main_config, self.sid, "type")
	if section_type == "minute" then
		return self.dt:irange(value, 0, 59)
	end
	if section_type == "hour" then
		if opt_name == "value" then
			return self.dt:irange(value, 0, 23)
		end
		if opt_name == "interval1" or opt_name == "interval2" then
			return self.dt:time(value)
		end
		return false, "Invalid option"
	end
	if section_type == "weekday" then
		return self.dt:irange(value, 0, 6)
	end
	if section_type == "monthday" then
		return self.dt:irange(value, 1, 31)
	end
	if section_type == "yearday" then
		return self.dt:irange(value, 1, 366)
	end
	return false, "Condition type is incorrect."
end

	local time_value = s:option("value")
		function time_value:validate(value)
			return self:time_validation(value, self.api_key)
		end
		time_value.orig_set = time_value.set
		function time_value:set(value)
			local range = self:getter_wrapped_abs_value(self.config, self.sid, "ui_timetype") == "1"
			local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
			if not range and opt_type == "minute" then
				self:set_cond_option("time_cond_start_time", "*:" .. value)
				self:set_cond_option("time_cond_end_time", "*:" .. value)
				self:delete_cond_option({"time_cond_wday", "time_cond_day", "time_cond_start_yday", "time_cond_end_yday", "time_cond_day_type"})
			elseif not range and opt_type == "hour" then
				self:set_cond_option("time_cond_start_time", value .. ":00")
				self:set_cond_option("time_cond_end_time", value .. ":59")
				self:delete_cond_option({"time_cond_wday", "time_cond_day", "time_cond_start_yday", "time_cond_end_yday", "time_cond_day_type"})
			elseif not range and opt_type == "weekday" then
				self:set_cond_option("time_cond_day_type", "weekday")
				self:set_cond_option("time_cond_wday", { value })
				self:delete_cond_option({"time_cond_start_time", "time_cond_end_time", "time_cond_day", "time_cond_start_yday", "time_cond_end_yday"})
			elseif not range and opt_type == "monthday" then
				self:set_cond_option("time_cond_day_type", "monthday")
				self:set_cond_option("time_cond_day", { value })
				self:delete_cond_option({"time_cond_start_time", "time_cond_end_time", "time_cond_wday", "time_cond_start_yday", "time_cond_end_yday"})
			elseif not range and opt_type == "yearday" then
				self:set_cond_option("time_cond_day_type", "yearday")
				self:set_cond_option("time_cond_start_yday", value)
				self:set_cond_option("time_cond_end_yday", value)
				self:delete_cond_option({"time_cond_start_time", "time_cond_end_time", "time_cond_wday", "time_cond_day"})
			end
		end
		function time_value:get(value)
			local range = self:getter_wrapped_abs_value(self.config, self.sid, "ui_timetype") == "1"
			local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
			if not range then
				return self:get_opt_value(opt_type)
			end
			return value
		end

	function generate_weekdays(start_index, end_index)
		local arr = {}
		local size = 7
		
		local i = start_index
		repeat
			table.insert(arr, tostring(i))
			i = (i + 1) % size
		until i == (end_index + 1) % size
		
		return arr
	end

	local start_interval = s:option("interval1")
		function start_interval:validate(value)
			return self:time_validation(value, self.api_key)
		end
		start_interval.orig_set = start_interval.set
		function start_interval:set(value)
			local range = self:getter_wrapped_abs_value(self.config, self.sid, "ui_timetype") == "1"
			local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
			if range and opt_type == "minute" then
				self:set_cond_option("time_cond_start_time", "*:" .. value)
				self:delete_cond_option({"time_cond_wday", "time_cond_day", "time_cond_start_yday", "time_cond_day_type"})
			elseif range and opt_type == "hour" then
				self:set_cond_option("time_cond_start_time", value)
				self:delete_cond_option({"time_cond_wday", "time_cond_day", "time_cond_start_yday", "time_cond_day_type"})
			elseif range and opt_type == "weekday" then
				local last_day = self:getter_wrapped_abs_value(self.config, self.sid, "interval2") or "6"
				local weekdays = generate_weekdays(tonumber(value) or 0, tonumber(last_day))
				self:set_cond_option("time_cond_day_type", "weekday")
				self:set_cond_option("time_cond_wday", weekdays)
				self:delete_cond_option({"time_cond_start_time", "time_cond_day", "time_cond_start_yday"})
			elseif range and opt_type == "monthday" then
				local monthdays = {}
				for i=value, 31 do
					table.insert(monthdays, tostring(i))
				end
				self:set_cond_option("time_cond_day_type", "monthday")
				self:set_cond_option("time_cond_day", monthdays)
				self:delete_cond_option({"time_cond_start_time", "time_cond_wday", "time_cond_start_yday"})
			elseif range and opt_type == "yearday" then
				self:set_cond_option("time_cond_day_type", "yearday")
				self:set_cond_option("time_cond_start_yday", value)
				self:delete_cond_option({"time_cond_start_time", "time_cond_wday", "time_cond_day"})
			end
		end
		function start_interval:get(value)
			local range = self:getter_wrapped_abs_value(self.config, self.sid, "ui_timetype") == "1"
			local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
			if range then
				return self:get_opt_interval1(opt_type)
			end
			return value
		end

	local end_interval = s:option("interval2")
		function end_interval:validate(value)
			return self:time_validation(value, self.api_key)
		end
		end_interval.orig_set = end_interval.set
		function end_interval:set(value)
			local range = self:getter_wrapped_abs_value(self.config, self.sid, "ui_timetype") == "1"
			local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
			if range and opt_type == "minute" then
				self:set_cond_option("time_cond_end_time", "*:" .. value)
				self:delete_cond_option({"time_cond_wday", "time_cond_day", "time_cond_end_yday", "time_cond_day_type"})
			elseif range and opt_type == "hour" then
				self:set_cond_option("time_cond_end_time", value)
				self:delete_cond_option({"time_cond_wday", "time_cond_day", "time_cond_end_yday", "time_cond_day_type"})
			elseif range and opt_type == "weekday" then
				local start_day = self:getter_wrapped_abs_value(self.config, self.sid, "interval1") or "0"
				local weekdays = generate_weekdays(tonumber(start_day), tonumber(value) or 6)
				self:set_cond_option("time_cond_day_type", "weekday")
				self:set_cond_option("time_cond_wday", weekdays)
				self:delete_cond_option({"time_cond_end_time", "time_cond_day", "time_cond_end_yday"})
			elseif range and opt_type == "monthday" then
				local monthdays = self:get_cond_option("time_cond_day")
				if not monthdays or #monthdays == 0 then
					return
				end
				for i = #monthdays, 1, -1 do
					if tonumber(value) < tonumber(monthdays[i]) then
						table.remove(monthdays, i)
					end
				end
				self:set_cond_option("time_cond_day_type", "monthday")
				self:set_cond_option("time_cond_day", monthdays)
				self:delete_cond_option({"time_cond_end_time", "time_cond_wday", "time_cond_end_yday"})
			elseif range and opt_type == "yearday" then
				self:set_cond_option("time_cond_day_type", "yearday")
				self:set_cond_option("time_cond_end_yday", value)
				self:delete_cond_option({"time_cond_end_time", "time_cond_wday", "time_cond_day"})
			end
		end
		function end_interval:get(value)
			local range = self:getter_wrapped_abs_value(self.config, self.sid, "ui_timetype") == "1"
			local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
			if range then
				return self:get_opt_interval2(opt_type)
			end
			return value
		end

	local state = s:option("state")
		function state:validate(value)
			return self.dt:is_bool(value)
		end
		function state:set(value)
			self:set_cond_option("io_cond_state", value)
		end
		function state:get()
			return self:get_cond_option("io_cond_state")
		end

	local minimum = s:option("min")
	minimum.maxlength = 16
		function minimum:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "max", "voltage", false)
			if not res then return res, message end

			local name = self:getter_wrapped_abs_value(self.main_config, self.sid, "name")
			if name and (name:find("adc") or name:find("pwr")) then
				return self.dt:range(value, 0, 24)
			else
				return false, "Option is not available for this pin."
			end
		end
		function minimum:get()
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl and acl ~= "" then
				return nil
			else
				return self:get_cond_option("io_cond_min")
			end
		end
		function minimum:set(value)
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if opt_name and (opt_name:find("adc") or opt_name:find("pwr")) then
				self:set_cond_option("io_cond_min", value)
			end
		end

	local maximum = s:option("max")
	maximum.maxlength = 16
		function maximum:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "min", "voltage", true)
			if not res then return res, message end
			local opt_name = self:getter_wrapped_abs_value(self.main_config, self.sid, "name")
			if opt_name and (opt_name:find("adc") or opt_name:find("pwr")) then
				return self.dt:range(value, 0, 24)
			else
				return false, "Option is not available for this pin."
			end
		end
		function maximum:get()
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl and acl ~= "" then
				return nil
			else
				return self:get_cond_option("io_cond_max")
			end
		end
		function maximum:set(value)
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if opt_name and (opt_name:find("adc") or opt_name:find("pwr")) then
				self:set_cond_option("io_cond_max", value)
			end
		end

	local acl = s:option("acl")
		function acl:validate(value)
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if not (opt_name and opt_name:find("acl")) then
				return false, "Option is not available for this PIN."
			end
			return self.dt:check_array(value, { "current", "percent" })
		end
		function acl:get()
			return self:get_cond_option("io_cond_acl")
		end
		function acl:set(value)
			self:set_cond_option("io_cond_acl", value)
		end

	local minimum_perc = s:option("min_perc")
	minimum_perc.maxlength = 16
		function minimum_perc:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "max_perc", "percentage", false)
			if not res then return res, message end
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			local name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if acl ~= "percent" then
				return false, "Option is not available for this ACL property."
			elseif not (name and name:find("acl")) then
				return false, "Option is not available for this PIN."
			end
			return self.dt:range(value, 0, 100)
		end
		function minimum_perc:set(value)
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl == "percent" then
				self:set_cond_option("io_cond_min", value)
			end
		end
		function minimum_perc:get()
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl == "percent" then
				return self:get_cond_option("io_cond_min")
			end
		end

	local maximum_perc = s:option("max_perc")
	maximum_perc.maxlength = 16
		function maximum_perc:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "min_perc", "percentage", true)
			if not res then return res, message end
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			local name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if acl ~= "percent" then
				return false, "Option is not available for this ACL property."
			elseif not (name and name:find("acl")) then
				return false, "Option is not available for this PIN."
			end
			return self.dt:range(value, 0, 100)
		end
		function maximum_perc:set(value)
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl == "percent" then
				self:set_cond_option("io_cond_max", value)
			end
		end
		function maximum_perc:get()
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl == "percent" then
				return self:get_cond_option("io_cond_max")
			end
		end

	local minimum_curr = s:option("min_curr")
	minimum_curr.maxlength = 16
		function minimum_curr:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "max_curr", "current", false)
			if not res then return res, message end
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			local name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if acl ~= "current" then
				return false, "Option is not available for this ACL property."
			elseif not (name and name:find("acl")) then
				return false, "Option is not available for this PIN."
			end
			return self.dt:range(value, 4, 20)
		end
		function minimum_curr:set(value)
			local acl = self:get_abs_value(self.config, self.sid, "acl")
			if acl == "current" then
				self:set_cond_option("io_cond_min", value)
			end
		end
		function minimum_curr:get()
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl == "current" then
				return self:get_cond_option("io_cond_min")
			end
		end

	local maximum_curr = s:option("max_curr")
	maximum_curr.maxlength = 16
		function maximum_curr:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "min_curr", "current", true)
			if not res then return res, message end
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			local name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if acl ~= "current" then
				return false, "Option is not available for this ACL property."
			elseif not (name and name:find("acl")) then
				return false, "Option is not available for this PIN."
			end
			return self.dt:range(value, 4, 20)
		end
		function maximum_curr:set(value)
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl == "current" then
				self:set_cond_option("io_cond_max", value)
			end
		end
		function maximum_curr:get()
			local acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if acl == "current" then
				return self:get_cond_option("io_cond_max")
			end
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function IoJugglerCondition:validate_value_interval()
	local interval1 = self:getter_wrapped_abs_value(self.config, self.sid, "interval1") or ""
	local interval2 = self:getter_wrapped_abs_value(self.config, self.sid, "interval2") or ""
	local value = self:getter_wrapped_abs_value(self.config, self.sid, "value") or ""

	if value ~= "" and (interval1 ~= "" or interval2 ~= "") then
		self:add_error(STD_CODES.INVALID_OPT, "'value' and 'interval' options can not be used simultaneously")
	end
end

function IoJugglerCondition:POST_validate_section_hook()
	local count = 0
	self:table_foreach("event_juggler", "condition", function(s)
		if s.io_juggler == "1" then
			count = count + 1
		end
	end)
	if count >= 10 then
		self:add_critical_error(STD_CODES.NO_CREATE, "Condition limit reached, no more than 10 can be created", "Validation")
	end
	IoJugglerCondition:validate_section_hook()
end

function IoJugglerCondition:PUT_after_validate_section_hook()
	self:validate_value_interval()
end
function IoJugglerCondition:POST_after_validate_section_hook()
	self:validate_value_interval()
end

function IoJugglerCondition:DELETE_before_section_delete_hook()
	local sections = {"event", "action", "condition"}
	for _, section in pairs(sections) do
		self:table_foreach(self.config, section, function(c)
			local cond_list = c.conditions
			if c.io_juggler == "1" and c[".name"] ~= self.sid and cond_list and #cond_list > 0 then
				local changed = false
				for key = #cond_list, 1, -1 do
					if cond_list[key] == self.sid then
						table.remove(cond_list, key)
						changed = true
					end
				end
				if changed then
					if #cond_list == 0 then
						self:table_delete(self.config, c[".name"], "conditions")
					else
						self:table_set(self.config, c[".name"], "conditions", cond_list)
					end
				end
			end
		end)
	end
end

return IoJugglerCondition
