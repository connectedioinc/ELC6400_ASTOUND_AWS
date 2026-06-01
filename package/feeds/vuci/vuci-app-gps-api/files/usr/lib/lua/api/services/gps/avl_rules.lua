local ConfigService = require("api/ConfigService")
local io = require("vuci.io")
local board = require("vuci.board")
local rule_utils = require("api.services.gps.avl_rule_utils")

if not board:has_gps() then
	return nil
end

local AVL = ConfigService:new({
	anonymous = true
})

local AVLRules = AVL:section("avl", "avl_rule")
function AVLRules:create_defaults()
	return {
		collect_period = "5",
		saved_records = "20",
		send_period = "50"
	}
end

rule_utils.append_rule_options(AVLRules)

	local opt_enabled = AVLRules:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_wan_status = AVLRules:option("wan_status")
		function opt_wan_status:validate(value)
			return self.dt:check_array(value, {"mobile_both", "mobile_home", "mobile_roaming", "wifi", "wired"})
		end

	local opt_ignore = AVLRules:option("ignore")
		function opt_ignore:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_din_status = AVLRules:option("din_status")
		function opt_din_status:validate(value)
			local io_type = self:get_abs_value(self.config, self.sid, "io_type")
			if not io_type then
				return false, "IO type must be defined"
			end
			if io_type == "gpio" then
				return self.dt:check_array(value, {"low", "high", "both"})
			elseif io_type == "adc" or io_type == "acl" then
				return self.dt:check_array(value, {"in", "out"})
			else
				return false, "IO type is incorrect or provided in the wrong format"
			end
		end

	local opt_io_min = AVLRules:option("io_min")
		function opt_io_min:validate(value)
			local io_name = self:get_abs_value(self.config, self.sid, "io_name")
			local acl = self:get_abs_value(self.config, self.sid, "io_acl")
			local max = self:get_abs_value(self.config, self.sid, "io_max")
			return rule_utils.validate_io_range_min(self.dt, io_name, acl, value, max)
		end

	local opt_io_max = AVLRules:option("io_max")
		function opt_io_max:validate(value)
			local io_name = self:get_abs_value(self.config, self.sid, "io_name")
			local acl = self:get_abs_value(self.config, self.sid, "io_acl")
			local min = self:get_abs_value(self.config, self.sid, "io_min")
			return rule_utils.validate_io_range_max(self.dt, io_name, acl, min, value)
		end

	local opt_io_type = AVLRules:option("io_type")
	opt_din_status.require = {
		["adc"] = { "io_min", "io_max" },
		["acl"] = { "io_min", "io_max", "io_acl" },
	}
		function opt_io_type:validate(value)
			return self.dt:check_array(value, {"gpio", "adc", "acl"})
		end

	local opt_io_acl = AVLRules:option("io_acl")
		function opt_io_acl:validate(value)
			local acl_options = { "current", "percent" }
			return self.dt:check_array(value, acl_options)
		end

	local opt_io_name = AVLRules:option("io_name")
		function opt_io_name:validate(value)
			local io_type = self:get_abs_value(self.config, self.sid, "io_type")
			if not io_type then
				return false, "IO type must be defined"
			end

			if io_type == "gpio" then
				return io:has_io(value, io_type, "in"), "IO not found."
			else
				return io:has_io(value, io_type), "IO not found."
			end
		end

return AVL
