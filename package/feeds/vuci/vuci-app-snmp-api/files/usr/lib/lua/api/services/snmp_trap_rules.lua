local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local pac = require("vuci.package_checker")
local util = require("vuci.util")
local all_modems = require("vuci.modem"):get_all_modems()
local event_type = require("vuci.event_type")

local flags = {
	increment_name = true
}

local snmp_trap_rules = ConfigService:new(flags)

function snmp_trap_rules:initialize_hook()
	if not pac.is_installed("snmptrap") then
		return self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Service does not exist in device" , "Request", 404)
	end
end

function snmp_trap_rules:GET_TYPE_options()
	self:ResponseOK {
		events = event_type:get_all_events("snmp_trap_rules")
	}
end
local enabled

function snmp_trap_rules:validate_section_hook()
	local from_value = tonumber(self:get_abs_value(self.main_config, self.sid, "from"))
	local to_value = tonumber(self:get_abs_value(self.main_config, self.sid, "to"))
	if from_value and to_value and from_value >= to_value then
		self:add_error(STD_CODES.INVALID_OPT, "'from' option is bigger or equal to 'to' option", "Validation")
	end
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled") or self.current_data_block["enabled"]
	if opt_enabled and opt_enabled == "1" then
		local required_options = {"type"}
		local opt_type = self:get_abs_value(self.config, self.sid, "type") or self.current_data_block["type"]
		local opt_name = self:get_abs_value(self.config, self.sid, "name") or self.current_data_block["name"]
		if util.contains({"gsm", "iotrap"}, opt_type) then
			table.insert(required_options, "name")
		end
		if opt_type and opt_type == "gsm" then
			if opt_name and opt_name == "signalstrtrap" then
				table.insert(required_options, "signal")
			end
		end
		if opt_type and opt_type == "iotrap" then
			table.insert(required_options, "state")
			if opt_name and (opt_name == "adc0" or opt_name == "acl0" or opt_name == "pwr0") then
				table.insert(required_options, "from")
				table.insert(required_options, "to")
			end
		end
		if opt_type and opt_type == "eventtrap" then
			table.insert(required_options, "event")
			table.insert(required_options, "event_mark")
		end
		enabled.require = {["1"] = required_options}
	end
end

snmp_trap_rules.PUT_validate_section_hook = snmp_trap_rules.validate_section_hook
snmp_trap_rules.POST_validate_section_hook = snmp_trap_rules.validate_section_hook

	local trap = snmp_trap_rules:section("snmptrap", "trap")

		enabled = trap:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local _type = trap:option("type")
			function _type:validate(value)
				local available_types = { "eventtrap" }
				if #all_modems > 0 then
					table.insert(available_types, "gsm")
				end
				if board:has_ios() then
					table.insert(available_types, "iotrap")
				end
				if pac.is_installed("coova-chilli") then
					table.insert(available_types, "chilli")
				end
				return self.dt:check_array(value, available_types)
			end
			_type.orig_set = _type.set
			function _type:set(value)
				self:orig_set(value)
				if value == "eventtrap" then
					self:table_set(self.config, self.sid, "name", "log_event")
				end
			end

		local name = trap:option("name")
			function name:validate(value)
				local trap_type = self:get_abs_value(self.config, self.sid, "type")
				if trap_type == "iotrap" then
					local io = require("vuci.io")
					local pins = io:ioman_info()
					if not pins then return true end
					local pin_names = {}
					for _, v in pairs(pins) do
						table.insert(pin_names, v.name)
					end
					return self.dt:check_array(value, pin_names)
				elseif trap_type == "gsm" then
					return self.dt:check_array(value, { "signalstrtrap", "conntypetrap" })
				elseif trap_type == "eventtrap" then
					return self.dt:check_array(value, { "log_event" })
				elseif trap_type == "chilli" then
					return self.dt:check_array(value, { "connectedtrap", "disconnectedtrap" })
				else
					return false, "Can't set this option because 'type' is not set."
				end
			end
			name.orig_set = name.set
			function name:set(value)
				self:orig_set(value)
				if self:get_abs_value(self.config, self.sid, "type") == "eventtrap" then
					self:table_set(self.config, self.sid, "name", "log_event")
				end
			end

		local event = trap:option("event")
			function event:validate(value)
				local events = {}
				for event in pairs(event_type:get_all_events("snmp_trap_rules")) do
					table.insert(events, event)
				end
				return self.dt:check_array(value, events)
			end

		local event_mark = trap:option("event_mark")
			function event_mark:validate(value)
				local current_event = self:get_abs_value(self.config, self.sid, "event")
				local opt_type = self:get_abs_value(self.config, self.sid, "type")
				if not opt_type or opt_type ~= "eventtrap" then
					return false, "Can't set this option because 'type' is not 'eventtrap'."
				end
				if not current_event then
					return false, "Can't set this option because 'name' is not set."
				end
				local events = event_type:get_all_events("snmp_trap_rules")
				if not events[current_event] then
					return false, "Can't find 'event_mark' option."
				end
				return self.dt:check_array(value, events[current_event])
			end
			function event_mark:get(value)
				value = value == "successfully authenticated on HTTP" and "Password auth succeeded" or value
				value = value == "Invalid password attempt for" and "Bad password attempt" or value
				return value
			end
			function event_mark:set(value)
				value = value == "Password auth succeeded" and "successfully authenticated on HTTP" or value
				value = value == "Bad password attempt" and "Invalid password attempt for" or value
				self:table_set(self.config, self.sid, self.api_key, value)
			end

		local signal = trap:option("signal")
			function signal:validate(value)
				return self.dt:irange(value, -130,  0)
			end

		local state = trap:option("state")
			function state:validate(value)
				local io_name = self:get_abs_value(self.config, self.sid, "name")
				local states = { "both" }
				if io_name:match("din") or io_name:match("dout") or io_name:match("iio") or io_name:match("dio") then
					table.insert(states, "active")
					table.insert(states, "inactive")
				end
				if io_name:match("relay") then
					table.insert(states, "open")
					table.insert(states, "closed")
				end
				if io_name:match("dwi") then
					table.insert(states, "rising")
					table.insert(states, "falling")
				end
				if io_name == "adc0" or io_name == "acl0" or io_name == "pwr0" then
					table.insert(states, "in_range")
					table.insert(states, "out_of_range")
				end
				return self.dt:check_array(value, states)
			end

		local from = trap:option("from")
			function from:validate(value)
				local io_name = self:get_abs_value(self.config, self.sid, "name")
				if io_name == "adc0" or io_name == "pwr0" then
					return self.dt:ufloat(value)
				elseif io_name == "acl0" then
					return self.dt:range(value, 4, 20)
				end

				return false, "Only available to configure if option 'name' is adc0, acl0 or pwr0"
			end

		local to = trap:option("to")
			function to:validate(value)
				local io_name = self:get_abs_value(self.config, self.sid, "name")
				if io_name == "adc0" or io_name == "pwr0" then
					local res2, err2 = self.dt:ufloat(value)
					if  not res2 then
						return false, err2
					end
				elseif io_name == "acl0" then
					return self.dt:range(value, 4, 20)
				else
					return false, "Only available to configure if option 'name' is adc0, acl0 or pwr0"
				end
				return true
			end

		local modem = trap:option("modem")
			function modem:validate(value)
				return self.dt:check_modem(value)
			end

return snmp_trap_rules
