local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local all_modems = require("vuci.modem"):get_all_modems()

local AutoReboot = ConfigService:new({
	anonymous = true
})

local opt_enable

function AutoReboot:require_validation()
	local function get_option_value(opt_name) return self:get_abs_value(self.config, self.sid, opt_name) end

	if get_option_value("enable") == "1" then
		local required_options = {"period", "action", "time"}
		local period = get_option_value("period")
		local action = get_option_value("action")
		if action == "2" and #all_modems > 1 then
			table.insert(required_options, "modem")
		end
		if period == "week" then
			table.insert(required_options, "days")
		end
		if period == "month" then
			table.insert(required_options, "month_day")
			table.insert(required_options, "months")
		end
		opt_enable.require = {["1"] = required_options}
	end
end

AutoReboot.PUT_validate_section_hook = AutoReboot.require_validation
AutoReboot.POST_validate_section_hook = AutoReboot.require_validation

local PeriodicReboot = AutoReboot:section("periodic_reboot", "reboot_instance")
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
		function opt_months:get(value)
			return value and util.split(value, ",") -- months
		end
		function opt_months:set(value)
			self:table_set("periodic_reboot", self.sid, "months", value and table.concat(value, ","))
		end

	local opt_month_day = PeriodicReboot:option("month_day", {list = true})
		function opt_month_day:validate(value)
			return self.dt:irange(value, 1, 31)
		end
		function opt_month_day:get(value)
			return value and util.split(value, ",")
		end
		function opt_month_day:set(value)
			self:table_set("periodic_reboot", self.sid, "month_day", value and table.concat(value, ","))
		end

	local opt_period = PeriodicReboot:option("period")
		--FIXME: Disabled till WebUI fixes its issues.
		-- opt_period.require = {
		-- 	month = {"month_day", "months", "force_last"}
		-- }	
		function opt_period:validate(value)
			local available_actions = { "week", "month" }
			return self.dt:check_array(value, available_actions)
		end

	local opt_action = PeriodicReboot:option("action")
		function opt_action:validate(value)
			return self.dt:check_array(value, {
				"1", -- Device reboot
				#all_modems > 0 and "2" or nil -- Modem reboot
			})
		end

	local opt_modem = PeriodicReboot:option("modem")
		function opt_modem:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_days = PeriodicReboot:option("days", {list = true})
		function opt_days:validate(value)
			return self.dt:check_array(value, {
				"mon", "tue", "wed", "thu",
				"fri", "sat", "sun"
			})
		end
		function opt_days:get(value)
			return value and util.split(value, ",")
		end
		function opt_days:set(value)
			self:table_set("periodic_reboot", self.sid, "days", value and table.concat(value, ","))
		end

	local opt_time = PeriodicReboot:option("time", {list = true})
		function opt_time:validate(value)
			return self.dt:time(value)
		end

	function AutoReboot:POST_validate_hook()
		local interfaces = 0
		self:table_foreach("periodic_reboot", "reboot_instance", function (_)
				interfaces = interfaces + 1
		end)
		if interfaces >= 30 then
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 30 instances are allowed")
		end
	end

return AutoReboot
