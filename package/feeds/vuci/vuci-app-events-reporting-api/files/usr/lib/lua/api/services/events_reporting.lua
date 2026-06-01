local ConfigService = require("api/ConfigService")
local all_modems = require("vuci.modem"):get_all_modems()
local util = require("vuci.util")
local event_type = require("vuci.event_type")
local email = require("vuci.email")

local EventsReporting = ConfigService:new({
	increment_name = true
})

function EventsReporting:get_used_params()
	return require("vuci.param"):get_params_by_service("events_reporting")
end

local EMAIL_TIMEOUT = 30

local ERR_CODES = {
	EMAIL_SEND_FAILED = 1,
	EMAIL_GROUP_NOT_FOUND = 2,
	EMAIL_SEND_TIMEOUT = 3,
	EMAIL_GROUP_INVALID_CFG = 4,
}

function EventsReporting:GET_TYPE_options()
	self:ResponseOK({
		params = self:get_used_params(),
		events = event_type:get_all_events("events_reporting")
	})
end

local opt_enable

function EventsReporting:require_validation()
	local _enable = self:getter_wrapped_abs_value(self.config, self.sid, "enable")
	local base_require = { "event", "eventMark", "action" }
	local action_require_options = {
		sendEmail = {"subject", "message", "emailgroup", "recipEmail"},
		sendSMS = {"message", "recipient_format"}
	}
	local additional_require_options = {
		sendEmail = #(all_modems or {}) > 1 and {"info_modem_id"} or {},
		sendSMS = #(all_modems or {}) > 1 and {"send_modem_id", "info_modem_id"} or {}
	}

	if _enable == "1" then
		local action = self:getter_wrapped_abs_value(self.config, self.sid, "action")
		local require_options = action_require_options[action] or {}
		local additional_options = additional_require_options[action] or {}

		if action == "sendSMS" then
			local recipient_format_value = self:getter_wrapped_abs_value(self.config, self.sid, "recipient_format")
			if recipient_format_value == "single" then
				table.insert(require_options, "telnum")
			elseif recipient_format_value == "group" then
				table.insert(require_options, "group")
			end
		end

		local combined_require = util.combine(base_require, require_options)
		combined_require = util.combine(combined_require, additional_options)
		opt_enable.require = { ["1"] = combined_require }
	end
	self:set_multi_option_action("info_modem_id", self:getter_wrapped_abs_value(self.config, self.sid, "info_modem_id"))
	self:set_multi_option_action("message", self:getter_wrapped_abs_value(self.config, self.sid, "message"))
end

EventsReporting.PUT_validate_section_hook = EventsReporting.require_validation
EventsReporting.POST_validate_section_hook = EventsReporting.require_validation

function EventsReporting:get_action_option(option_name)
	self:check_if_exist_action()
	local actions = self:table_get(self.config, self.sid, "actions")
	if actions and #actions >= 1 then
		return self:table_get(self.config, actions[1], option_name)
	end
end

function EventsReporting:set_action_option(option_name, value)
	self:check_if_exist_action()
	local actions = self:table_get(self.config, self.sid, "actions")
	if actions and #actions >= 1 then
		if not value or value == "" then
			return self:delete_action_option(option_name)
		end
		return self:table_set(self.config, actions[1], option_name, value)
	end
end

function EventsReporting:delete_action_option(option_name, value)
	local actions = self:table_get(self.config, self.sid, "actions")
	if actions and #actions >= 1 then
		return self:table_delete(self.config, actions[1], option_name, value)
	end
end

local multi_options = {
	message 		= { sendSMS = "sms_text", sendEmail = "smtp_text" },
    info_modem_id 	= { sendSMS = "sms_info_modem_id", sendEmail = "smtp_info_modem_id" }
}

function EventsReporting:set_multi_option_action(api_key, value)
	local default_option = true
	local opt_action = self:getter_wrapped_abs_value(self.config, self.sid, "action")
	if multi_options[api_key][opt_action] then
		self:set_action_option(multi_options[api_key][opt_action], value)
		default_option = false
	end
	if default_option then
		self:set_action_option(api_key, value)
	else
		self:delete_action_option(api_key)
	end
end

function EventsReporting:get_multi_option_action(api_key)
	local action = self:getter_wrapped_abs_value(self.config, self.sid, "action")
	if action and multi_options[api_key][action] then
		return self:get_action_option(multi_options[api_key][action])
	end
	for _, opt_name in pairs(multi_options[api_key] or {}) do
		local opt_value = self:get_action_option(opt_name)
		if opt_value then
			return opt_value
		end
	end
	return self:get_action_option(api_key)
end

function EventsReporting:check_if_exist_action()
	local opt_actions = self:get_abs_value(self.config, self.sid, "actions")
	if not opt_actions or #opt_actions == 0 then
		local action_id = self:next_id()
		self:table_section(self.config, "action", action_id, { events_reporting = "1" })
		self:table_set(self.config, self.sid, "actions", {action_id})
	end
end

function EventsReporting:get_event_option(option_name)
	return self:table_get(self.config, self.sid, option_name)
end

function EventsReporting:set_event_option(option_name, value)
	self:table_set(self.config, self.sid, option_name, value)
end

function EventsReporting:delete_event_option(option_name)
	self:table_delete(self.config, self.sid, option_name)
end

local ranges = {
	["Signal strength dropped below -113 dBm"] = "-130,-113",
	["Signal strength dropped below -98 dBm"] = "-112,-98",
	["Signal strength dropped below -93 dBm"] = "-97,-93",
	["Signal strength dropped below -75 dBm"] = "-92,-75",
	["Signal strength dropped below -60 dBm"] = "-74,-60",
	["Signal strength dropped below -50 dBm"] = "-59,-50",
}

local function set_singal_range(val)
	if val == "all" then
		local all_values = {}
		for _, value in pairs(ranges) do
			table.insert(all_values, value)
		end
		table.insert(all_values, "-49,0")
		return all_values
	end
	return ranges[val] and { ranges[val] } or nil
end

local function get_singal_range(val)
	local swapped = {}
	for key, value in pairs(ranges) do
		swapped[value] = key
	end
	if #val == 1 then
		return swapped[val[1]]
	elseif #val == 7 then
		return "all"
	end
	return nil
end

local Rules = EventsReporting:section("event_juggler", "event")
function Rules:filter(options)
	return options.events_reporting == "1" 
end

function Rules:create_defaults(_)
	return { 
		events_reporting = "1",
		plugin = "log"
	}
end

	opt_enable = Rules:option("enable")
		function opt_enable:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enable:set(value)
			self:table_set(self.config, self.sid, "enabled", value)
			local actions = self:table_get(self.config, self.sid, "actions") or {}
			for _, action_id in ipairs(actions) do
				self:table_set(self.config, action_id, "enabled", value)
			end
		end
		function opt_enable:get(value)
			return self:table_get(self.config, self.sid, "enabled")
		end

	local opt_event = Rules:option("event")
		function opt_event:validate(value)
			local events = {}
			for event in pairs(event_type:get_all_events("events_reporting")) do
				table.insert(events, event)
			end
			return self.dt:check_array(value, events)
		end
		function opt_event:set(value)
			if not value or value == "" then
				self:delete_event_option("plugin")
				self:delete_event_option("log_event")
				return
			end
			if value == "Startup" then
				self:delete_event_option("log_event")
				self:delete_event_option("log_event_mark")
				return self:set_event_option("plugin", "boot")
			elseif value == "Signal strength" then
				self:delete_event_option("log_event")
				self:delete_event_option("log_event_mark")
				local gsm_signal_range = self:get_event_option("gsm_signal_range")
				if not gsm_signal_range or not self.current_data_block.eventMark then
					self:set_event_option("gsm_signal_range", set_singal_range("all"))
				end
				self:set_event_option("gsm_event", "rssi_value")
				self:set_event_option("gsm_signal_trigger", "range")
				return self:set_event_option("plugin", "gsm")
			end
			self:delete_event_option("gsm_event")
			self:delete_event_option("gsm_signal_trigger")
			self:delete_event_option("gsm_signal_range")
			self:set_event_option("plugin", "log")
			self:set_event_option("log_event", value)
		end
		function opt_event:get()
			local plugin_val = self:get_event_option("plugin")
			if plugin_val == "boot" then
				return "Startup"
			elseif plugin_val == "gsm" then
				return "Signal strength"
			end
			return self:get_event_option("log_event")
		end

	local boot_mode_map = {
		reboot = "Device startup completed",
		power_on = "unexpected shutdown",
		all = "all"
	}

	local opt_eventMark = Rules:option("eventMark")
		function opt_eventMark:validate(value)
			local current_event = self:getter_wrapped_abs_value(self.config, self.sid, "event")
			if not current_event then
				return false, "event not set"
			end
			local events = event_type:get_all_events("events_reporting")
			if not events[current_event] then
				return false, "event type not found"
			end
			return self.dt:check_array(value, events[current_event])
		end
		function opt_eventMark:get()
			local event = self:getter_wrapped_abs_value(self.config, self.sid, "event")
			local boot_mode = self:get_event_option("boot_mode")
			local gsm_signal_range = self:get_event_option("gsm_signal_range")
			if boot_mode and boot_mode_map[boot_mode] and event == "Startup" then
				return boot_mode_map[boot_mode]
			elseif gsm_signal_range then
				return get_singal_range(gsm_signal_range)
			end
			local event_mark = self:get_event_option("log_event_mark")
			if event == "Reboot" and event_mark == "sms" then
				return "sms reboot"
			end
			event_mark = event_mark == "successfully authenticated on HTTP" and "Password auth succeeded" or event_mark
			event_mark = event_mark == "Invalid password attempt for" and "Bad password attempt" or event_mark
			return event_mark
		end
		function opt_eventMark:set(value)
			if not value or value == "" then
				self:delete_event_option("boot_mode")
				self:delete_event_option("gsm_event")
				self:delete_event_option("gsm_signal")
				self:delete_event_option("gsm_signal_trigger")
				self:delete_event_option("log_event_mark")
				return
			end
			local event = self:getter_wrapped_abs_value(self.config, self.sid, "event")
			local signal_strength = value:match("Signal strength dropped below (%-?%d+) dBm")
			if signal_strength or (event == "Signal strength" and value == "all") then
				self:delete_event_option("boot_mode")
				self:delete_event_option("log_event_mark")
				self:set_event_option("plugin", "gsm")
				self:set_event_option("gsm_event", "rssi_value")
				self:set_event_option("gsm_signal_trigger", "range")
				self:set_event_option("gsm_signal_range", set_singal_range(value))
				return
			end
			for k, v in pairs(boot_mode_map) do
				if v == value and event == "Startup" then
					self:delete_event_option("gsm_signal")
					self:delete_event_option("gsm_signal")
					self:delete_event_option("gsm_signal_trigger")
					self:delete_event_option("log_event_mark")
					self:set_event_option("plugin", "boot")
					self:set_event_option("boot_mode", k)
					return
				end
			end
			self:delete_event_option("gsm_signal")
			self:delete_event_option("gsm_signal")
			self:delete_event_option("gsm_signal_trigger")
			self:delete_event_option("boot_mode")
			if event and value and event == "Reboot" and value == "sms reboot" then
				return self:set_event_option("log_event_mark", "sms")
			end
			value = value == "Password auth succeeded" and "successfully authenticated on HTTP" or value
			value = value == "Bad password attempt" and "Invalid password attempt for" or value
			self:set_event_option("log_event_mark", value)
		end

	local action_map = {
		sendEmail = "smtp",
		sendSMS = "sms"
	}

	local opt_action = Rules:option("action")
		function opt_action:validate(value)
			local check = {"sendEmail"}
			if all_modems and #all_modems > 0 then
				table.insert(check, "sendSMS")
			end
			return self.dt:check_array(value, check)
		end
		function opt_action:set(value)
			if not value or value == "" or not action_map[value] then
				self:delete_action_option("plugin")
				return
			end
			self:set_action_option("plugin", action_map[value])
		end
		function opt_action:get()
			local plugin_val = self:get_action_option("plugin")
			for k, v in pairs(action_map) do
				if v == plugin_val then
					return k
				end
			end
		end

	local opt_info_modem_id = Rules:option("info_modem_id")
		function opt_info_modem_id:validate(value)
			return self.dt:check_modem(value)
		end
		function opt_info_modem_id:set(value)
			self:set_multi_option_action(self.api_key, value)
		end
		function opt_info_modem_id:get()
			return self:get_multi_option_action(self.api_key)
		end

	local opt_send_modem_id = Rules:option("send_modem_id")
		function opt_send_modem_id:validate(value)
			return self.dt:check_modem(value)
		end
		function opt_send_modem_id:set(value)
			return self:set_action_option("sms_modem_id", value)
		end
		function opt_send_modem_id:get()
			return self:get_action_option("sms_modem_id")
		end

	local opt_subject = Rules:option("subject")
		opt_subject.maxlength = 256
		function opt_subject:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9!@#$%%&*+/=?^_`{|}~%. %-]+$")
		end
		function opt_subject:set(value)
			return self:set_action_option("smtp_subject", value)
		end
		function opt_subject:get()
			return self:get_action_option("smtp_subject")
		end

	local opt_message = Rules:option("message")
		function opt_message:validate(value)
			return self.dt:string(value)
		end
		function opt_message:set(value)
			self:set_multi_option_action(self.api_key, value)
		end
		function opt_message:get()
			return self:get_multi_option_action(self.api_key)
		end

	local opt_recipient_format = Rules:option("recipient_format")
		function opt_recipient_format:validate(value)
			return self.dt:check_array(value, {
				"single", "group"
			})
		end
		function opt_recipient_format:set(value)
			self:set_action_option("sms_recipient_format", value)
		end
		function opt_recipient_format:get()
			return self:get_action_option("sms_recipient_format")
		end

	local opt_telnum = Rules:option("telnum")
		function opt_telnum:validate(value)
			return self.dt:phonedigit(value)
		end
		function opt_telnum:set(value)
			self:set_action_option("sms_phone", value)
		end
		function opt_telnum:get()
			return self:get_action_option("sms_phone")
		end

	local opt_group = Rules:option("group")
		function opt_group:validate(value)
			local ok = false
			self:table_foreach("user_groups", "phone", function (s)
				if s.name == value then ok = true end
			end)
			return ok, "phone group not found"
		end
		function opt_group:set(value)
			self:set_action_option("sms_group", value)
		end
		function opt_group:get()
			return self:get_action_option("sms_group")
		end

	local opt_emailgroup = Rules:option("emailgroup")
		function opt_emailgroup:validate(value)
			local ok = false
			self:table_foreach("user_groups", "email", function (s)
				if s.name == value then ok = true end
			end)
			return ok, "Email account not found", ERR_CODES.EMAIL_GROUP_NOT_FOUND
		end
		function opt_emailgroup:set(value)
			self:set_action_option("smtp_email_group", value)
		end
		function opt_emailgroup:get()
			return self:get_action_option("smtp_email_group")
		end

	local opt_recipEmail = Rules:option("recipEmail", {list = true})
		function opt_recipEmail:validate(value)
			return self.dt:email(value)
		end
		function opt_recipEmail:set(value)
			self:set_action_option("smtp_recipients", value)
		end
		function opt_recipEmail:get()
			return self:get_action_option("smtp_recipients")
		end

	function EventsReporting:POST_validate_hook()
		local sec_count = 0
		self:table_foreach("event_juggler", "event", function (s)
			if s.events_reporting == "1" then
				sec_count = sec_count + 1
			end
		end)
		if sec_count >= 90 then
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 90 instances are allowed")
		end
	end

	function EventsReporting:DELETE_before_section_delete_hook()
		local actions = self:table_get(self.config, self.sid, "actions") or {}
		
		-- delete related actions
		for _, action in ipairs(actions) do
			self:table_delete(self.config, action)
		end
	end

------------------------------------- Send Test Email -------------------------------------

local EmailTest = EventsReporting:action("send_test_email", function (self, email_data)
	local v = require "lualibparam"
	local data = email_data or self.arguments.data

	if string.find(data.message, "%%et") then
		data.message = string.gsub(data.message, "%%et", data.event)
	end
	if string.find(data.message, "%%ex") then
		data.message = string.gsub(data.message, "%%ex", "Test email")
	end
	local result = v.expand_params(data.message, data.info_modem_id)
	data.message = util.trim(result)

	local group
	self:table_foreach("user_groups", "email", function(s)
		if s.name == data.group then
			group = s
			return false -- break
		end
	end)

	if not group.smtp_ip or not group.smtp_port or not group.senderemail or
	(group.credentials == "1" and (not group.username or not group.password)) then
		return self:add_critical_error(ERR_CODES.EMAIL_GROUP_INVALID_CFG, "Email account configuration is invalid")
	end

	local code = email:send_email(group, data.subject, data.message, data.recipients, EMAIL_TIMEOUT)

	if code == 0 then
		return self:ResponseOK("Email sent successfully")
	elseif code == ERR_CODES.EMAIL_SEND_TIMEOUT then
		return self:add_critical_error(ERR_CODES.EMAIL_SEND_TIMEOUT, "Email sending timed out")
	else
		return self:add_critical_error(ERR_CODES.EMAIL_SEND_FAILED, "Failed to send the email")
	end
end)

	local aopt_event = EmailTest:option("event")
		aopt_event.require = true
		aopt_event.validate = opt_event.validate

	local aopt_subject = EmailTest:option("subject")
		aopt_subject.require = true
		aopt_subject.validate = opt_subject.validate
		aopt_subject.maxlength = 256

	local aopt_message = EmailTest:option("message")
		aopt_message.require = true
		aopt_message.validate = opt_message.validate

	local aopt_recipients = EmailTest:option("recipients", { list = true })
		aopt_recipients.require = true
		aopt_recipients.validate = opt_recipEmail.validate

	local aopt_group = EmailTest:option("group")
		aopt_group.require = true
		aopt_group.validate = opt_emailgroup.validate

	local aopt_info_modem_id = EmailTest:option("info_modem_id")
		aopt_info_modem_id.require = #all_modems > 1
		function aopt_info_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

return EventsReporting