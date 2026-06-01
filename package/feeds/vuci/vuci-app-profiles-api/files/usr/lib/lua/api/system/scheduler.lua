local ConfigService = require("api/ConfigService")

local flags = {
	anonymous = true
}

local function get_profiles_id(self)
	local profiles_id = {}
	self:table_foreach("profiles", "profile", function(s)
		if s.id then
			table.insert(profiles_id, s.id)
		end
	end)
	return profiles_id
end

local function get_time_number(day, time)
	local time_vals = time:split(":")
	local time_sum = 0
	time_sum = tonumber(day) * 10000 + tonumber(time_vals[1]) * 100 + tonumber(time_vals[2])
	return time_sum
end

local function validate_period(current_period, others)
	local valid = true

	for _, item in pairs(others) do
		if item ~= current_period then
			valid = false
			break
		end
	end

	return valid
end

local function validate_interval(current_interval, intervals_to_check)
	local start_num = current_interval._start
	local end_num = current_interval._end
	for i = 1, #intervals_to_check do
		local interval = intervals_to_check[i]
		if interval._start <= interval._end then
			if start_num <= end_num then
				if (start_num >= interval._start and start_num <= interval._end) or
					(end_num >= interval._start and end_num <= interval._end) then
					return false
				end
			else
				if start_num <= interval._end or end_num >= interval._start then
					return false
				end
			end
		else
			if (start_num <= interval._end or start_num >= interval._start) or
				(end_num <= interval._end or end_num >= interval._start) then
				return false
			end
		end
	end

	return true
end

local scheduler = ConfigService:new(flags)
scheduler.profiles_id = get_profiles_id(scheduler)

	local scheduler_instance = scheduler:section("profiles", "scheduler")
	function scheduler_instance:create_defaults()
		return {
			profile_id = self.profiles_id[2] or "0",
			start_day = "1",
			start_time = "12:00",
			end_day = "2",
			end_time = "12:00",
			enabled = "0",
			period = "week"
		}
	end

		local enabled = scheduler_instance:option("enabled")
		enabled.require = { ["1"] = { "start_time", "end_time" } }
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local profile_id = scheduler_instance:option("profile_id")
		profile_id.cfg_require = true
			function profile_id:validate(value)
				return self.dt:check_array(value, self.profiles_id)
			end

		local period = scheduler_instance:option("period")
		period.cfg_require = true
			function period:validate(value)
				return self.dt:check_array(value, {"week", "month"})
			end

		local start_day = scheduler_instance:option("start_day")
		start_day.cfg_require = true
			function start_day:validate(value)
				local days = {}
				local period_type = self:get_abs_value(self.config, self.sid, "period")
				if period_type == "week" then
					days = {"1", "2", "3", "4", "5", "6", "0"}
				elseif period_type == "month" then
					for i = 1, 31 do
						table.insert(days, tostring(i))
					end
				end
				return self.dt:check_array(value, days)
			end

		local start_time = scheduler_instance:option("start_time")
			function start_time:validate(value)
				return self.dt:time(value)
			end

		local end_day = scheduler_instance:option("end_day")
		end_day.cfg_require = true
			function end_day:validate(value)
				local days = {}
				local period_type = self:get_abs_value(self.config, self.sid, "period")
				if period_type == "week" then
					days = {"1", "2", "3", "4", "5", "6", "0"}
				elseif period_type == "month" then
					for i = 1, 31 do
						table.insert(days, tostring(i))
					end
				end
				return self.dt:check_array(value, days)
			end

		local end_time = scheduler_instance:option("end_time")
			function end_time:validate(value)
				return self.dt:time(value)
			end

		local force_last = scheduler_instance:option("force_last")
			function force_last:validate(value)
				return self.dt:is_bool(value)
			end

function scheduler:POST_validate_hook()
	if #self.profiles_id < 2 then
		self:add_critical_error(
			STD_CODES.UCI_CREATE_ERROR,
			"Can't create if no custom profiles present",
			"UCI"
		)
	end
end

function scheduler:validate_instance()
	local other_instances, intervals_to_check = {}, {}
	local instance_enabled = self:table_get(self.main_config, self.sid, "enabled") or "0"
	local current_period = self:table_get(self.main_config, self.sid, "period")
	if instance_enabled == "1" then
		self:table_foreach(self.main_config, "scheduler", function(s)
			if self.sid ~= s[".name"] and s.enabled and s.enabled == "1" then
				table.insert(other_instances, s.period)
			end

			if self.sid ~= s[".name"] and s.enabled and s.enabled == "1" and s.period == current_period then
				local interval = {}
                interval._start = get_time_number(s.start_day, s.start_time)
                interval._end = get_time_number(s.end_day, s.end_time)
                table.insert(intervals_to_check, interval)
			end
		end)

		local valid = validate_period(current_period, other_instances)
		if not valid then
			self:add_critical_error(
				STD_CODES.UCI_CREATE_ERROR,
				"Only intervals of the same period type can be active at one time",
				"UCI"
			)
		end

		local start_num = get_time_number(self:table_get(self.main_config, self.sid, "start_day"),
							self:table_get(self.main_config, self.sid, "start_time"))
		local end_num = get_time_number(self:table_get(self.main_config, self.sid, "end_day"),
							self:table_get(self.main_config, self.sid, "end_time"))

		local current_interval = {_start = start_num, _end = end_num}

		valid = validate_interval(current_interval, intervals_to_check)
		if not valid then
			self:add_critical_error(
				STD_CODES.UCI_CREATE_ERROR,
				"Scheduler interval overlaps with already enabled interval of same time",
				"UCI"
			)
		end
	end
end

scheduler.POST_after_data_hook = scheduler.validate_instance
scheduler.PUT_after_data_hook = scheduler.validate_instance

return scheduler
