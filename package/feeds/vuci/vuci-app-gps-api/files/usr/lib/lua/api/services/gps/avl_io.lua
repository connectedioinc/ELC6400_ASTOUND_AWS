local ConfigService = require("api/ConfigService")
local io = require("vuci.io")
local board = require("vuci.board")
local rule_utils = require("api.services.gps.avl_rule_utils")

if not board:has_gps()then
	return nil
end

local function is_str_empty(str)
	return not str or str == ""
end

local GPS = ConfigService:new({
	anonymous = true
})

local AVLIO = GPS:section("avl", "input")

	local opt_enabled = AVLIO:option("enabled")
	opt_enabled.require = { ["1"] = { "io_name", "priority", "event" }}
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_io_name = AVLIO:option("io_name")
		function opt_io_name:validate(value)
			return io:has_io(value, "gpio", "in") or io:has_io(value, "adc") or io:has_io(value, "acl") or false, "IO not found."
		end
		function opt_io_name:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if io:has_io(value, "gpio") then
				self:table_set(self.config, self.sid, "io_type", "gpio")
			elseif io:has_io(value, "acl") then
				self:table_set(self.config, self.sid, "io_type", "acl")
			elseif io:has_io(value, "adc") then
				local min = self:get_abs_value(self.config, self.sid, "min")
				local max = self:get_abs_value(self.config, self.sid, "max")
				if is_str_empty(min) then
					self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", "min")
				end
				if is_str_empty(max) then
					self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", "max")
				end
				self:table_set(self.config, self.sid, "io_type", "adc")
			end
		end

		local opt_min = AVLIO:option("min")
		function opt_min:validate(value)
			local io_name = self:get_abs_value(self.config, self.sid, "io_name")
			local acl = self:get_abs_value(self.config, self.sid, "acl")
			local max = self:get_abs_value(self.config, self.sid, "max")
			return rule_utils.validate_io_range_min(self.dt, io_name, acl, value, max)
		end

		local opt_max = AVLIO:option("max")
		function opt_max:validate(value)
			local io_name = self:get_abs_value(self.config, self.sid, "io_name")
			local acl = self:get_abs_value(self.config, self.sid, "acl")
			local min = self:get_abs_value(self.config, self.sid, "min")
			return rule_utils.validate_io_range_max(self.dt, io_name, acl, min, value)
		end

		local acl = AVLIO:option("acl")
		function acl:validate(value)
			local acl_options = { "current", "percent" }
			return self.dt:check_array(value, acl_options)
		end

	local opt_event = AVLIO:option("event")
		function opt_event:validate(value)
			local allowed_values = {
				"in", -- Inside range
				"out" -- Outside range
			}
			local pin_id = self:get_abs_value(self.config, self.sid, "io_name")
			if pin_id and io:has_io(pin_id, "gpio") then
				allowed_values = {
					"no", -- Input active
					"nc", -- Input low
					"both" -- Both
				}
			end
			return self.dt:check_array(value, allowed_values)
		end

	local opt_priority = AVLIO:option("priority")
		function opt_priority:validate(value)
			return self.dt:check_array(value, {"low", "high", "panic", "security"})
		end

return GPS
