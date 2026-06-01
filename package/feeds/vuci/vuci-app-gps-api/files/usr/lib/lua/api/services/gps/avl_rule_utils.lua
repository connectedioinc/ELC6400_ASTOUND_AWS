local utils = {}

local function validate_voltage(dt, value)
	return dt:range(value, 0, 40)
end

local function validate_current(dt, value)
	return dt:range(value, 4, 20)
end

local function validate_percentage(dt, value)
	return dt:range(value, 0, 100)
end

function utils.validate_io_range_min(dt, io_name, acl_option, min, max)
	local min_number = tonumber(min)
	local max_number = tonumber(max)
	if min_number > max_number then
		return false, "Option can not be greater than max"
	end

	if io_name and io_name:find("acl") then
		if acl_option == "current" then
			return validate_current(dt, min)
		elseif acl_option == "percent" then
			return validate_percentage(dt, min)
		end
	end

	return validate_voltage(dt, min)
end

function utils.validate_io_range_max(dt, io_name, acl_option, min, max)
	local min_number = tonumber(min)
	local max_number = tonumber(max)
	if min_number > max_number then
		return false, "Option can not be less than min"
	end

	if io_name and io_name:find("acl") then
		if acl_option == "current" then
			return validate_current(dt, max)
		elseif acl_option == "percent" then
			return validate_percentage(dt, max)
		end
	end

	return validate_voltage(dt, max)
end

function utils.append_rule_options(section)
	local opt_priority = section:option("priority")
		function opt_priority:validate(value)
			return self.dt:check_array(value, {"low", "high", "panic", "security"})
		end

	local opt_collect_period = section:option("collect_period")
		function opt_collect_period:validate(value)
			return self.dt:irange(value, 1, 999999)
		end

	local opt_distance = section:option("distance")
		function opt_distance:validate(value)
			return self.dt:irange(value, 1, 999999)
		end

	local opt_accuracy = section:option("accuracy")
		function opt_accuracy:validate(value)
			return self.dt:irange(value, 1, 999999)
		end

	local opt_angle = section:option("angle")
		function opt_angle:validate(value)
			return self.dt:irange(value, 1, 360)
		end

	local opt_saved_records = section:option("saved_records")
		function opt_saved_records:validate(value)
			return self.dt:irange(value, 1, 32)
		end

	local opt_send_period = section:option("send_period")
		function opt_send_period:validate(value)
			return self.dt:irange(value, 1, 999999)
		end
end

return utils
