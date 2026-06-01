local ConfigService = require("api/ConfigService")
local siteman_utils = require("api/services/site_manager/siteman_utils")

local AutoReboot = ConfigService:new({
	increment_name = true
})

function AutoReboot:get_option_value(opt_name)
	return self:get_abs_value(self.config, self.sid, opt_name) or self.current_data_block[opt_name]
end

local opt_enable

function AutoReboot:require_validation()
	local enabled = self:get_option_value("enable")
	if enabled and enabled == "1" then
		local required_options = {"period", "action", "time"}
		local period = self:get_option_value("period")
		if period and period == "week" then
			table.insert(required_options, "days")
		end
		if period and period == "month" then
			table.insert(required_options, "month_day")
			table.insert(required_options, "months")
		end
		opt_enable.require = {["1"] = required_options}
	end
end

AutoReboot.PUT_validate_section_hook = AutoReboot.require_validation
AutoReboot.POST_validate_section_hook = AutoReboot.require_validation

local PeriodicReboot = AutoReboot:section("siteman_periodic_reboot", "reboot_instance")
	function PeriodicReboot:create_defaults()
		return {
			action = "1"
		}
	end

	opt_enable = PeriodicReboot:option("enable")
		function opt_enable:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_force_last = PeriodicReboot:option("force_last")
		function opt_force_last:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_months = PeriodicReboot:option("months", {list = true})
		function opt_months:validate(value)
			return self.dt:irange(value, 1, 12)
		end

	local opt_month_day = PeriodicReboot:option("month_day", {list = true})
		function opt_month_day:validate(value)
			return self.dt:irange(value, 1, 31)
		end

	local opt_period = PeriodicReboot:option("period")
		function opt_period:validate(value)
			local available_actions = { "week", "month" }
			return self.dt:check_array(value, available_actions)
		end

	local opt_action = PeriodicReboot:option("action")
		function opt_action:validate(value)
			local available_actions = {
				"1" -- Device reboot
			}
			return self.dt:check_array(value, available_actions)
		end

	local opt_days = PeriodicReboot:option("days", {list = true})
		function opt_days:validate(value)
			return self.dt:check_array(value, {
				"mon", "tue", "wed", "thu",
				"fri", "sat", "sun"
			})
		end

	local opt_time = PeriodicReboot:option("time", {list = true})
		function opt_time:validate(value)
			return self.dt:time(value)
		end

AutoReboot = siteman_utils:wrap_endpoint(AutoReboot)

return AutoReboot
