local board = require("vuci.board")
if not board:has_ios() then return nil end

local ConfigService = require("api/ConfigService")
local io = require("vuci.io")
local io_info = io:ioman_info()

local function get_range(from, to)
	local vals = {}
	for i = from, to, 1 do
		table.insert(vals, tostring(i))
	end
	return vals
end

local IoSchedulerInstance = ConfigService:new({ increment_name = true })

local s = IoSchedulerInstance:section("io_scheduler", "scheduler")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "pin", "period", "start_day", "start_time", "end_day", "end_time" }}
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local pin = s:option("pin")
		function pin:validate(value)
			local pin_options = {}
			for _, io_value in ipairs(io_info) do
				if (io_value.type == "gpio" and (io_value.direction == "out" or io_value.bi_dir == true)) or io_value.type == "relay" then
					pin_options[#pin_options + 1] = io_value.name
				end
			end
			return self.dt:check_array(value, pin_options)
		end

	local period = s:option("period")
		function period:validate(value)
			local period_options = { "week", "month" }
			return self.dt:check_array(value, period_options)
		end

	local start_day = s:option("start_day")
	start_day.require = { "period" }
		function start_day:validate(value)
			local period = self:get_abs_value(self.main_config, self.sid, "period")
			if period == "week" then
				return self.dt:check_array(value, get_range(0, 6))
			end
			if period == "month" then
				return self.dt:check_array(value, get_range(1, 31))
			end
			return true
		end

	local start_time = s:option("start_time")
		function start_time:validate(value)
			return self.dt:time(value)
		end

	local end_day = s:option("end_day")
	end_day.require = { "period" }
		function end_day:validate(value)
			local period = self:get_abs_value(self.main_config, self.sid, "period")
			if period == "week" then
				return self.dt:check_array(value, get_range(0, 6))
			end
			if period == "month" then
				return self.dt:check_array(value, get_range(1, 31))
			end
			return true
		end

	local end_time = s:option("end_time")
		function end_time:validate(value)
			return self.dt:time(value)
		end

	local force_last_day = s:option("force_last")
		function force_last_day:validate(value)
			return self.dt:is_bool(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

local function validate_type(current, others)
	for _, item in ipairs(others) do
		if item.enabled == "1" and item.period ~= current.period and current.enabled == "1" then
			return false
		end
	end
	return true
end

local function validate_interval(current_interval, intervals_to_check)
	local curr_start = current_interval._start
	local curr_end = current_interval._end
	for _, interval in ipairs(intervals_to_check) do
		local other_start = interval._start
		local other_end = interval._end
		if current_interval.pin == interval.pin then
			if other_start >= curr_start and other_start <= curr_end then
				return false
			end
			if curr_start >= other_start and curr_start <= other_end then
				return false
			end
		end
	end
	return true
end

local function get_time_number(day, time)
	local time_vals = time:split(":")
	local time_sum = 0
	time_sum = tonumber(day) * 10000 + tonumber(time_vals[1]) * 100 + tonumber(time_vals[2])
	return time_sum
end

function IoSchedulerInstance:validate_data()
	local start_day = self:get_abs_value(self.main_config, self.sid, "start_day")
	local end_day = self:get_abs_value(self.main_config, self.sid, "end_day")
	local start_time = self:get_abs_value(self.main_config, self.sid, "start_time")
	local end_time = self:get_abs_value(self.main_config, self.sid, "end_time")
	local section_pin = self:get_abs_value(self.main_config, self.sid, "pin")
	local period = self:get_abs_value(self.main_config, self.sid, "period")

	if not start_day or start_day == "" or not end_day or end_day == "" or not start_time or start_time == ""
	or not end_time or end_time == "" or not section_pin or section_pin == "" or not period or period == ""
	then
		return -- skip validation if at least one required option is not present
	end

	local enabled = self:get_abs_value(self.main_config, self.sid, "enabled") == "1"
	if not enabled then return end

	local current_pin
	local intervals_to_check = {}
	for _, single_pin in ipairs(io_info) do
		if single_pin.name == section_pin then current_pin = single_pin end
	end
	if current_pin and current_pin.direction == "in" then
		self:add_error(11, "Selected pin is set as \"input\" pin. You can change it to \"output\" in status page",
			"pin", self.sid, current_pin.name)
	end

	-- validate period
	local other_instances = {}
	self:table_foreach(self.config, "scheduler", function(s)
		if s[".name"] ~= self.sid then
			table.insert(other_instances, {
				[".name"] = s[".name"],
				enabled = self:get_abs_value(self.main_config, s[".name"], "enabled"),
				period = self:get_abs_value(self.main_config, s[".name"], "period")
			})
		end
	end)
	local current_instance = {
		enabled = enabled and "1" or "0",
		period = period
	}
	local valid_type = validate_type(current_instance, other_instances)
	if not valid_type then
		self:add_error(12, "Only intervals of the same period type can be active at one time",
			"period", self.sid, current_instance.period)
	end

	-- validate I/O pin
	if current_pin then
		local invalid = false
		local mdm = require "vuci.modem"
		local builtin_modems_count = mdm:modem_count()
		if builtin_modems_count > 0 then
			-- check other services' configs which use output pins
			self:table_foreach("sms_utils", "rule", function(s)
				if s.enabled == "1" and s.io == section_pin then invalid = true end
			end)
			if invalid then
				self:add_error(13,
					"Selected pin is used in SMS Utilites rules. You need to disable the rules in order to use the output scheduler",
					"pin", self.sid, current_pin.name)
			end
			invalid = false
			self:table_foreach("call_utils", "rule", function(s)
				if s.enabled == "1" and s.pin == section_pin then invalid = true end
			end)
			if invalid then
				self:add_error(14,
					"Selected pin is used in Call Utilites rules. You need to disable the rules in order to use the output scheduler",
					"pin", self.sid, current_pin.name)
			end
		end

		local actions = {}
		self:table_foreach("iojuggler", "action", function(s)
			table.insert(actions, s)
		end)
		invalid = false
		self:table_foreach("iojuggler", "input", function(s)
			if s.enabled == "1" then
				for _, action_id in ipairs(s.actions or {}) do
					for _, action in ipairs(actions) do
						if action.id == action_id and action.dest == section_pin then
							invalid = true
						end
					end
				end
			end
		end)
		if invalid then
			self:add_error(15,
				"Selected pin is used in I/O Juggler actions. You need to disable the input which uses the action in order to use the output scheduler",
				"pin", self.sid, current_pin.name)
		end
	end

	-- validate intervals
	local current_interval = {
		_start = get_time_number(start_day, start_time),
		_end = get_time_number(end_day, end_time),
		pin = section_pin
	}
	if current_interval._start == current_interval._end and self:get_abs_value(self.main_config, self.sid, "enabled") == "1" then
		self:add_error(17, "Starting time is the same as the ending time", "Validation", self.sid)
	end

	if current_pin then
		self:table_foreach(self.config, "scheduler", function(s)
			local s_period = self:get_abs_value(self.main_config, s[".name"], "period")
			local s_enabled = self:get_abs_value(self.main_config, s[".name"], "enabled")
			if s_period == period and s_enabled == "1" and s[".name"] ~= self.sid then
				local interval = {}
				local s_start_day = self:get_abs_value(self.main_config, s[".name"], "start_day")
				local s_start_time = self:get_abs_value(self.main_config, s[".name"], "start_time")
				local s_end_day = self:get_abs_value(self.main_config, s[".name"], "end_day")
				local s_end_time = self:get_abs_value(self.main_config, s[".name"], "end_time")
				local s_pin = self:get_abs_value(self.main_config, s[".name"], "pin")
				if s_start_day then interval._start = get_time_number(s_start_day, s_start_time) end
				if s_end_day then interval._end = get_time_number(s_end_day, s_end_time) end
				interval.pin = s_pin
				table.insert(intervals_to_check, interval)
			end
		end)
		local valid_interval = validate_interval(current_interval, intervals_to_check)
		if not valid_interval and self:get_abs_value(self.main_config, self.sid, "enabled") == "1" then
			self:add_error(16, "Scheduler interval overlaps with already enabled interval of same output pin", "Validation", self.sid)
		end
	end
end

function IoSchedulerInstance:PUT_after_validate_section_hook()
	self:validate_data()
end

function IoSchedulerInstance:POST_after_data_hook()
	self:validate_data()
end

return IoSchedulerInstance
