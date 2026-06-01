local board = require("vuci.board")
if not board:has_ios() then return nil end

local ConfigService = require("api/ConfigService")

local io_juggler_utils = require("api.services.io_juggler_utils")

local name

local IoJugglerInput = ConfigService:new({ increment_name = true })

local jg_utils = require ("api.services.event_juggler_utils")(s)

local s = IoJugglerInput:section("event_juggler", "event")

local enabled

function s:create_defaults(_)
	return {
		io_juggler = "1",
		plugin = "io"
	}
end

function s:filter(options)
    return options["io_juggler"] == "1"
end

function IoJugglerInput:get_event_option(option_name)
	return self:table_get(self.config, self.sid, option_name)
end

function IoJugglerInput:set_event_option(option_name, value)
	self:table_set(self.config, self.sid, option_name, value)
end

function IoJugglerInput:validate_section_hook()
	local opt_enable = self:get_abs_value(self.config, self.sid, "enabled")
	if opt_enable and opt_enable == "1" then
		local required_options = {"actions", "name"}
		local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
		if opt_name and opt_name:match("acl") then
			table.insert(required_options, "acl")
			table.insert(required_options, "inside")
			local opt_acl = self:getter_wrapped_abs_value(self.config, self.sid, "acl")
			if opt_acl and opt_acl == "current" then
				table.insert(required_options, "min_curr")
				table.insert(required_options, "max_curr")
			end
			if opt_acl and opt_acl == "percent" then
				table.insert(required_options, "min_perc")
				table.insert(required_options, "max_perc")
			end
		end
		if opt_name and (opt_name:match("adc") or opt_name:match("pwr")) then
			table.insert(required_options, "inside")
			table.insert(required_options, "min")
			table.insert(required_options, "max")
		end
		if opt_name and (opt_name:match("din") or opt_name:match("iio")) then
			table.insert(required_options, "trigger")
		end	
		enabled.require = {["1"] = required_options}
	end
end

IoJugglerInput.PUT_validate_section_hook = IoJugglerInput.validate_section_hook
IoJugglerInput.POST_validate_section_hook = IoJugglerInput.validate_section_hook

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	name = s:option("name")
	name.cfg_require = true
		function name:validate(value)
			return self.dt:check_array(value, jg_utils:get_event_io_pins())
		end
		function name:set(value)
			self:set_event_option("io_name", value)
		end
		function name:get()
			return self:get_event_option("io_name")
		end

	local trigger = s:option("trigger")
		function trigger:validate(value)
			local name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if name and (name:find("acl") or name:find("adc") or name:find("pwr")) then
				return false, "Option is not available for this IO pin"
			end
			return self.dt:check_array(value, {"rising", "falling", "both"})
		end
		function trigger:set(value)
			self:set_event_option("io_trigger", value)
		end
		function trigger:get()
			return self:get_event_option("io_trigger")
		end

	local wait = s:option("wait")
	wait.maxlength = 8
		function wait:validate(value)
			local name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if name and (name:find("acl") or name:find("adc") or name:find("pwr")) then
				return false, "Option is not available for this IO pin"
			end
			return self.dt:uinteger(value)
		end

	local inside = s:option("inside")
		function inside:validate(value)
			local pin = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if pin and (pin:find("adc") or pin:find("acl") or pin:find("pwr")) then
				return self.dt:is_bool(value)
			end
			return false, "Option is not available for this input."
		end
		function inside:set(value)
			self:set_event_option("io_inside", value)
		end
		function inside:get()
			return self:get_event_option("io_inside")
		end

	local min = s:option("min")
	min.maxlength = 16
		function min:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "max", "voltage", false)
			if not res then return res, message end
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if opt_name and (opt_name:find("adc") or opt_name:find("pwr")) then
				return self.dt:range(value, 0, 24)
			end
			return false, "Option is not available for this pin."
		end
		function min:get(value)
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if type(opt_name) ~= "string" or opt_name == "" then return end
			if opt_name:find("adc") or opt_name:find("pwr") then
				return self:get_event_option("io_min")
			end
		end
		function min:set(value)
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if not opt_name or opt_name == "" then return end
			if opt_name:find("adc") or opt_name:find("pwr") then
				self:set_event_option("io_min", value)
			end
		end

	local maximum = s:option("max")
	maximum.maxlength = 16
		function maximum:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "min", "voltage", true)
			if not res then return res, message end
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if opt_name and (opt_name:find("adc") or opt_name:find("pwr")) then
				return self.dt:range(value, 0, 24)
			end
			return false, "Option is not available for this pin."
		end
		function maximum:get()
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if type(opt_name) ~= "string" or opt_name == "" then return end
			if opt_name:find("adc") or opt_name:find("pwr") then
				return self:get_event_option("io_max")
			end
		end
		function maximum:set(value)
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if not opt_name or opt_name == "" then return end
			if opt_name:find("adc") or opt_name:find("pwr") then
				self:set_event_option("io_max", value)
			end
		end

	local acl = s:option("acl")
		function acl:validate(value)
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if not opt_name or not opt_name:find("acl") then
				return false, "Option is not available for this PIN."
			end
			return self.dt:check_array(value, { "current", "percent" })
		end
		function acl:set(value)
			self:set_event_option("io_acl", value)
		end
		function acl:get()
			return self:get_event_option("io_acl")
		end

	local min_curr = s:option("min_curr")
	min_curr.maxlength = 16
		function min_curr:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "max_curr", "current", false)
			if not res then return res, message end
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") ~= "current" then
				return false, "Option is not available for this ACL property."
			elseif not opt_name or not opt_name:find("acl") then
				return false, "Option is not available for this PIN."
			end
			return self.dt:range(value, 4, 20)
		end
		function min_curr:set(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") == "current" then
				self:set_event_option("io_min", value)
			end
		end
		function min_curr:get()
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") == "current" then
				return self:get_event_option("io_min")
			end
		end

	local max_curr = s:option("max_curr")
	max_curr.maxlength = 16
		function max_curr:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "min_curr", "current", true)
			if not res then return res, message end
			local min_current = self:getter_wrapped_abs_value(self.config, self.sid, "min_curr")
			if min_current and tonumber(min_current) >= tonumber(value) then
				return false, "Minimum current is larger than maximum."
			end
			local opt_name = self:getter_wrapped_abs_value(self.config, self.sid, "name")
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") ~= "current" then
				return false, "Option is not available for this ACL property."
			elseif not opt_name or not opt_name:find("acl") then
				return false, "Option is not available for this PIN."
			end
			return self.dt:range(value, 4, 20)
		end
		function max_curr:set(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") == "current" then
				self:set_event_option("io_max", value)
			end
		end
		function max_curr:get()
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") == "current" then
				return self:get_event_option("io_max")
			end
		end

	local min_perc = s:option("min_perc")
	min_perc.maxlength = 16
		function min_perc:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "max_perc", "percentage", false)
			if not res then return res, message end
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") ~= "percent" then
				return false, "Option is not available for this ACL property."
			elseif not self:getter_wrapped_abs_value(self.config, self.sid, "name"):find("acl") then
				return false, "Option is not available for this PIN."
			end
			return self.dt:range(value, 0, 100)
		end
		function min_perc:set(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") == "percent" then
				self:set_event_option("io_min", value)
			end
		end
		function min_perc:get()
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") == "percent" then
				return self:get_event_option("io_min")
			end
	end

	local max_perc = s:option("max_perc")
	max_perc.maxlength = 16
		function max_perc:validate(value)
			local res, message = io_juggler_utils:validate_io_min_max_values(self, value, "min_perc", "percentage", true)
			if not res then return res, message end
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") ~= "percent" then
				return false, "Option is not available for this ACL property."
			elseif not self:getter_wrapped_abs_value(self.config, self.sid, "name"):find("acl") then
				return false, "Option is not available for this PIN."
			end
			return self.dt:range(value, 0, 100)
		end
		function max_perc:set(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") == "percent" then
				self:set_event_option("io_max", value)
			end
		end
		function max_perc:get()
			if self:getter_wrapped_abs_value(self.config, self.sid, "acl") == "percent" then
				return self:get_event_option("io_max")
			end
		end

	local actions = s:option("actions", { list = true })
		function actions:validate(value)
			local action_options = {}
			self:table_foreach(self.config, "action", function(s)
				if s.io_juggler == "1" then
					action_options[s[".name"]] = s.name
				end
			end)
			local ok, msg = self.dt:check_array(value, action_options)
			if not ok then
				return false, msg
			end
			if not self:check_action_option(action_options, value) then
				return false, string.format("Can't use '%s' action because it is not fully configured.", value)
			end
			return true
		end
		function actions:set(value)
			local id = {}
			for _, single_value in ipairs(value) do
				self:table_foreach(self.config, "action", function(s)
					if s.name == single_value then id[#id + 1] = s[".name"] end
				end)
			end
			self:table_set(self.config, self.sid, self.api_key, id)
		end
		function actions:get(value)
			local names = {}
			if value ~= nil and value ~= "" then
				for _, single_value in ipairs(value) do
					self:table_foreach(self.config, "action", function(s)
						if s[".name"] == single_value then names[#names + 1] = s.name end
					end)
				end
			end
			return #names > 0 and names or nil
		end

	local conditions = s:option("conditions", { list = true })
		function conditions:validate(value)
			local all_conditions = {}
			local conditions_with_id = {}
			self:table_foreach(self.config, "condition", function(s)
				if s.io_juggler == "1" then
					table.insert(all_conditions, s.name)
					conditions_with_id[s[".name"]] = s.name
				end
			end)
			local ok, msg = self.dt:check_array(value, all_conditions)
			if not ok then
				return false, msg
			end
			if not self:check_condition_option(conditions_with_id, value) then
				return false, string.format("Can't use '%s' condition because it is not fully configured.", value)
			end
			return true
		end
		function conditions:set(value)
			local id = {}
			for _, single_value in ipairs(value) do
				self:table_foreach(self.config, "condition", function(s)
					if s.name == single_value then id[#id + 1] = s[".name"] end
				end)
			end
			self:table_set(self.config, self.sid, self.api_key, id)
		end
		function conditions:get(value)
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

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function IoJugglerInput:check_action_option(action_options, action_name)
	local sid
	for k, v in pairs(action_options) do
		if (v == action_name) then
			sid = k
		end
	end
	return io_juggler_utils:validate_action(self:table_get(self.config, sid))
end

function IoJugglerInput:check_condition_option(all_conditions, condition_name)
	local sid
	for k, v in pairs(all_conditions) do
		if (v == condition_name) then
			sid = k
		end
	end
	return io_juggler_utils:validate_condition(self:table_get(self.config, sid))
end

return IoJugglerInput