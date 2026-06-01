local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
if not board:is_switch() and not board:has_reset_button() then
	return nil
end

local buttons = ConfigService:new({ delete = false, create = false})
buttons.button_sections = {}


local function find_sid(self)
	self:table_foreach("buttons", "button", function(s)
		if s.handler == self.sid then
			self.sid = s[".name"]
			return
		end
	end)
end
-- finds handler name of section and sets its sid
function buttons:initialize_hook()
	find_sid(self)
end

--collect info from configuration
function buttons:PUT_init_hook()
	self:table_foreach("buttons", "button", function(s)
		if s.enabled and s.enabled == "1" then
			self.button_sections[s.handler] = { max = tonumber(s.max), min = tonumber(s.min) }
		end
	end)
end

function buttons:PUT_section_init_hook()
	find_sid(self)
end

--merge config values with changed ones
function buttons:PUT_after_data_hook()
	-- the check is only important if the configuration was/is enabled
	-- otherwise the configurations can overlap
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local handler = self:table_get("buttons", self.sid, "handler")
	if enabled == "1" then
		local max = self:get_abs_value(self.config, self.sid, "max")
		local min = self:get_abs_value(self.config, self.sid, "min")
		self.button_sections[handler] = { max = tonumber(max), min = tonumber(min) }
	elseif enabled == "0" then
		self.button_sections[handler] = nil
	end
end

local function is_overlaped(values_1, values_2)
	if values_1.min >= values_2.min and values_1.min <= values_2.max then
		return true
	end
	return false
end

function buttons:PUT_before_commit_hook()
	for first_name, first_values in pairs(self.button_sections) do
		for second_name, second_values in pairs(self.button_sections) do
			if first_name ~= second_name then
				if is_overlaped(first_values, second_values) then
					self:add_error(
						1,
						string.format(
							"Section '%s' max - %s and min - %s overlap with section '%s' max - %s and min - %s",
							first_name, first_values.max, first_values.min,
							second_name, second_values.max, second_values.min
						),
						"Validation"
					)
				end
			end
		end
	end
	self:return_if_error()
end

function buttons:get_name(sid)
	return self:table_get(self.main_config, sid, "handler") or sid
end

local s = buttons:section("buttons", "button")

	local handler = s:option("handler")
	handler.readonly = true

	local action = s:option("action")
	action.readonly = true

	local min = s:option("min")
		function min:validate(value)
			return self.dt:range(value, 0, 60)
		end

	local max = s:option("max")
		function max:validate(value)
			return self.dt:range(value, 0, 60)
		end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			-- because values can be incorrect if configuration is not enabled
			-- there is a check when configuration is enabled
			local bool, msg = self.dt:is_bool(value)
			if not bool then return bool, msg end
			if value == "1" then
				local min = self:get_abs_value(self.config, self.sid, "min")
				local max = self:get_abs_value(self.config, self.sid, "max")
				min = tonumber(min)
				max = tonumber(max)
				local function format_error(type)
					return string.format("%s value must be a valid number in '%s' section.", type, self:get_name(self.sid))
				end
				if not min then
					return false, format_error("Min")
				end
				if not max then
					return false, format_error("Max")
				end
				if tonumber(min) >= tonumber(max) then
					return false, string.format("Can't enable incorrect configuration. Upper interval bound(%s) cannot be lower or equal to lower bound(%s) value", max, min)
				end
			end
			return true
		end

return buttons