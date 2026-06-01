local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local util = require "vuci.util"
local fs = require ("nixio.fs")
local util_tlt = require ("vuci.util_tlt")
local io_info = board:has_ios() and require("vuci.io"):ioman_info(false, true) or {}

local events_juggler = ConfigService:new({ increment_name = true })

local s = events_juggler:section("event_juggler", "event")
local jg_utils = require("api.services.event_juggler_utils")(s, io_info)
local event_plugin_list = jg_utils:get_plugin_names("event")

function s:create_defaults()
	return {
		name = util_tlt.get_next_name(self, self.config, self.section_type, "name", "event")
	}
end

function s:filter(options)
	return not jg_utils:check_if_from_events_reporting_or_io_juggler(options)
end

function events_juggler:cache_plugin_info_event()
	self.events_data = self.events_data or jg_utils:get_plugin_info("event")
end

function events_juggler:GET_TYPE_options()
	self:cache_plugin_info_event()
	return self:ResponseOK({
		plugins = self.events_data,
		log_events = self:event_get_all_events(),
		params = require("vuci.param"):get_params_by_service("events_reporting")
	})
end

function events_juggler:event_get_all_events()
	if self.all_events then
		return self.all_events
	end
	self.all_events = require("vuci.event_type"):get_all_events()
	return self.all_events
end

function events_juggler:POST_init_hook()
	jg_utils:validate_limit_count("event")
end

function events_juggler:POST_after_data_hook()
	local action_id = self:next_id()
	self:table_section(self.config, "action", action_id, { name = jg_utils:get_new_action_name() })
	self:table_set(self.config, self.sid, "actions", { action_id })
	self:add_message(jg_utils.CODES.ACTION_CREATED, "Action configuration was automatically created.", "action")
end

function events_juggler:validate_filter_cond()
	local filter_params = util.keys(jg_utils:get_filter_params(self:get_abs_value(self.config, self.sid, "plugin"),
		self:get_abs_value(self.config, self.sid, "io_name")))

	for _, condition_id in ipairs(self:table_get(self.config, self.sid, "available_conditions")) do
		local condition_sec = self:table_get(self.config, condition_id)
		if condition_sec.plugin == "filter" and condition_sec.filter_name then
			if not filter_params or not util.contains(filter_params, condition_sec.filter_name) then
				self:add_error(
					STD_CODES.INVALID_SECTION,
					string.format(
						"The filter_name option '%s' is not valid for the event plugin in section '%s'.",
						condition_sec.filter_name,
						condition_sec[".name"]
					),
					"Validation"
				)
			end
		end
	end

	self:return_if_error()
end

function events_juggler:validate_section_hook()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled") or "0"
	jg_utils[(opt_enabled == "1" and "enable" or "disable") .. "_requires"](jg_utils)
	pcall(self.validate_reset, self)
	pcall(self.validate_filter_cond, self)
	pcall(self.validate_relay_both, self)
	pcall(self.validate_io_trigger_option, self)
	pcall(jg_utils.validate_section_io_min_max_values, jg_utils, "event")
end

events_juggler.POST_validate_section_hook = events_juggler.validate_section_hook
events_juggler.PUT_validate_section_hook = events_juggler.validate_section_hook

function events_juggler:DELETE_before_section_delete_hook()
	local function delete_uploaded_files(sid)
		local cfg = self:table_get(self.config, sid)
		for api_key, value in pairs(cfg) do
			if type(api_key) == "string" and type(value) == "string" then
				local not_contains = not util.contains({"exec_file_path", "exec_path"}, api_key)
				local match = value:match("^/etc/vuci%-uploads/")
				if not_contains and match then
					fs.remove(value)
				end
			end
		end
	end
	local actions = self:table_get(self.config, self.sid, "actions") or {}
	local conditions = self:table_get(self.config, self.sid, "available_conditions") or {}

	-- delete related actions
	for _, action in ipairs(actions) do
		delete_uploaded_files(action)
		self:table_delete(self.config, action)
	end
	-- delete related conditions
	for _, condition in ipairs(conditions) do
		delete_uploaded_files(condition)
		self:table_delete(self.config, condition)
	end
end

	local enabled = s:option("enabled")
		enabled.require = {
			["1"] = {"plugin"}
		}
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function enabled:set(value)
			local function set_enabled(sec, sid, val)
				self:table_set(self.config, sid, "enabled", (sec.plugin and sec.plugin ~= "") and val or "0")
			end
			-- enable actions
			local actions = self:get_abs_value(self.config, self.sid, "actions") or {}
			for _, action_id in ipairs(actions) do
				local action_sec = self:table_get(self.config, action_id) or {}
				local enabled_val = action_sec.plugin == "call" and self:table_get("callman", "callman", "enabled") == "1" and "0" or value -- call actions should be disabled if phone settings is enabled
				set_enabled(action_sec, action_id, enabled_val)
			end
			-- enable conditions
			local conditions = self:get_abs_value(self.config, self.sid, "available_conditions") or {}
			for _, cond_id in ipairs(conditions) do
				local cond_sec = self:table_get(self.config, cond_id) or {}
				set_enabled(cond_sec, cond_id, value)
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local name = s:option("name")
		name.cfg_require = true
		function name:validate(value)
			return jg_utils:validate_name(value, "event")
		end

	local event_plugin = s:option("plugin")
		event_plugin.require = {}
		function event_plugin:validate(value)
			return self.dt:check_array(value, event_plugin_list)
		end

	s:option("wait").validate = function(self, value)
		return self.dt:irange(value, 0, 4294967295) -- 2^32 - 1 (max uint32)
	end

	s:option("actions", { list = true }).readonly = true

	s:option("available_conditions", { list = true }).readonly = true

	-- --------------------------------- ASTRO ---------------------------------

	if util.contains(event_plugin_list, "astro_time") then
		event_plugin.require["astro_time"] = {"astro_trigger", "astro_latitude", "astro_longitude", "astro_type"}

		s:option("astro_trigger").validate = function(self, value)
			return self.dt:check_array(value, {"sunrise", "sunset"})
		end

		s:option("astro_offset").validate = function(self, value)
			return self.dt:irange(value, 0,  720)
		end

		s:option("astro_latitude").validate = function(self, value)
			return self.dt:precision_range(value, -90.000000, 90.000000)
		end

		s:option("astro_longitude").validate = function(self, value)
			return self.dt:precision_range(value, -180.000000, 180.000000)
		end

		s:option("astro_type").validate = function(self, value)
			return self.dt:check_array(value, {"official", "civil", "nautical", "astronomical"})
		end
	end

	-- --------------------------------- BOOT ---------------------------------

	if util.contains(event_plugin_list, "boot") then
		event_plugin.require["boot"] = {"boot_mode"}

		s:option("boot_mode").validate = function(self, value)
			return self.dt:check_array(value, {"reboot", "power_on"})
		end
	end

	-- --------------------------------- GPS ---------------------------------

	if util.contains(event_plugin_list, "gps") then
		event_plugin.require["gps"] = {"gps_trigger", "gps_operator"}

		local gps_trigger = s:option("gps_trigger")
			gps_trigger.require = {
				speed 		= {"gps_speed"},
				altitude 	= {"gps_altitude"},
				radius		= {"gps_latitude", "gps_longitude", "gps_radius"}
			}
			function gps_trigger:validate(value)
				local ok, msg = self.dt:check_array(value, {"radius", "altitude", "speed"})
				if not ok then
					return false, msg
				end
				if value == "radius" then return true end
				local gps_operator = self:get_abs_value(self.config, self.sid, "gps_operator")
				if gps_operator == "le/gt" then
					self:add_error(
						STD_CODES.INVALID_OPT,
						"Operator 'le/gt' is only available for 'radius' trigger.",
						"gps_operator",
						self.sid,
						gps_operator
					)
				end
				return true
			end

		s:option("gps_latitude").validate = function(self, value)
			return self.dt:precision_range(value, -90.000000, 90.000000)
		end

		s:option("gps_longitude").validate = function(self, value)
			return self.dt:precision_range(value, -180.000000, 180.000000)
		end

		s:option("gps_radius").validate = function(self, value)
			return self.dt:irange(value, 1, 999999)
		end
		
		s:option("gps_altitude").validate = function(self, value)
			return self.dt:precision_range(value, 0.000000, 4000.000000)
		end

		s:option("gps_speed").validate = function(self, value)
			return self.dt:irange(value, 0, 482)
		end

		s:option("gps_operator").validate = function(self, value)
			local operators = {"lt", "le", "gt", "ge", "eq", "ne"}
			if self:get_abs_value(self.config, self.sid, "gps_trigger") == "radius" then
				table.insert(operators, "le/gt")
			end
			return self.dt:check_array(value, operators)
		end
	end

	-- --------------------------------- GSM ---------------------------------

	if util.contains(event_plugin_list, "gsm") then
		event_plugin.require["gsm"] = {"gsm_event"}

		s:option("gsm_modem_id").validate = function(self, value)
			return self.dt:check_modem(value)
		end

		local gsm_event = s:option("gsm_event")
			gsm_event.require = {
				["rssi_value"] = {"gsm_signal_trigger"}
			}
			function gsm_event:validate(value)
				return self.dt:check_array(value, {"rssi_value", "service_mode"})
			end

		local gsm_signal_trigger = s:option("gsm_signal_trigger")
			gsm_signal_trigger.require = {
				["lt"] = {"gsm_signal"},
				["gt"] = {"gsm_signal"},
				["range"] = {"gsm_signal_range"}
			}
			function gsm_signal_trigger:validate(value)
				return self.dt:check_array(value, {"lt", "gt", "range"})
			end

		s:option("gsm_signal").validate = function(self, value)
			return self.dt:irange(value, -130, 0)
		end

		s:option("gsm_signal_range", { list = true }).validate = function(self, value)
			local seperated = util.split(value, ",")
			if #seperated ~= 2 then
				return false, "Invalid range format. Example: -112,-98"
			end
			local from, to = seperated[1], seperated[2]
			if not self.dt:irange(from, -130, 0) or not self.dt:irange(to, -130, 0) then
				return false, "Invalid range value. Range should be between -130 and 0."
			end
			if tonumber(from) >= tonumber(to) then
				return false, "Invalid range value. The first value should be smaller than the second value."
			end
			return true
		end
	end

	-- --------------------------------- HOTSPOT ---------------------------------

	if util.contains(event_plugin_list, "hotspot") then
		event_plugin.require["hotspot"] = {"hotspot_trigger"}

		s:option("hotspot_trigger").validate = function(self, value)
			return self.dt:check_array(value, {"connect", "disconnect"})
		end
	end

	-- --------------------------------- IO ---------------------------------

	if util.contains(event_plugin_list, "io") then

		function events_juggler:validate_reset() 
			local io_reset = self:getter_wrapped_abs_value(self.config, self.sid, "io_reset")
			if self:get_abs_value(self.config, self.sid, "plugin") ~= "io" and io_reset == "1" then
				self:add_error(
					STD_CODES.INVALID_OPT, 
					"Only 'io' plugin supports the 'io_reset' option.", 
					"io_reset",
					nil, 
					io_reset
				)
			end
		end

		function events_juggler:validate_relay_both() -- handle action: relay, invert => do not allow event: relay, both options
			if not util_tlt.check_current_data_block(self, {"io_name", "io_trigger", "plugin"}) then return end 
			local name = self:get_abs_value(self.config, self.sid, "io_name")
			local io_trigger = self:get_abs_value(self.config, self.sid, "io_trigger")
			if self:get_abs_value(self.config, self.sid, "plugin") == "io" and name and name:find("relay") and io_trigger == "both" then
				local event_actions = self:table_get(self.config, self.sid, "actions")

				self:table_foreach(self.config, "action",
					function(s)
						if util.contains(event_actions, s[".name"]) and s.plugin == "out" and s.out_mode == "invert" 
							and s.out_dest and s.out_dest:find("relay") then
							self:add_error(STD_CODES.INVALID_OPT,
								string.format("Option 'both' is disabled due to an existing action (id = %s) configured with out_dest - %s and out_mode - invert.",
								s[".name"], s.out_dest), "io_trigger", nil, io_trigger)
							return false
						end
					end)
			end
		end

		function events_juggler:validate_io_trigger_option()
			if not util_tlt.check_current_data_block(self, { "io_name", "io_trigger" }) then return end
			local io_trigger = self:get_abs_value(self.config, self.sid, "io_trigger")
			if io_trigger == nil then return end
			local io_name = self:get_abs_value(self.config, self.sid, "io_name")
			local trigger_options = io_name and io_name:find("relay") and { "both", "opening", "closing" } or { "both", "rising", "falling" }
			local ok, msg = self.dt:check_array(io_trigger, trigger_options)
			if not ok then self:add_error(STD_CODES.INVALID_OPT, msg, "io_trigger", nil, io_trigger) end
		end

		event_plugin.require["io"] = {"io_name"}

		local io_name = s:option("io_name")
			if #io_info > 0 then
				for _, pin in ipairs(io_info) do
					if not io_name.require then io_name.require = {} end
					if pin.type == "acl" then io_name.require[pin.name] = {"io_acl", "io_inside", "io_min", "io_max"} end
					if pin.type == "adc" then io_name.require[pin.name] = {"io_inside", "io_min", "io_max"} end
					if pin.type == "dwi" or pin.type == "relay" then io_name.require[pin.name] = { "io_trigger" } end
					if pin.type == "gpio" and (pin.direction ~= "out" or (pin.direction == "out" and pin.bi_dir == true)) then
						io_name.require[pin.name] = {"io_trigger"}
					end
				end
			end

			function io_name:validate(value)
				return self.dt:check_array(value, jg_utils:get_event_io_pins())
			end

		s:option("io_trigger").validate = function (self, value)
			local name = self:get_abs_value(self.config, self.sid, "io_name")
			local require = io_name.require or io_name.orig_require
			if not (name and util.contains(require[name], "io_trigger")) then
				return false, "Option is not available for this I/O pin."
			end
			return true
		end

		s:option("io_inside").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		local io_reset = s:option("io_reset")
			function io_reset:validate(value)
				return self.dt:is_bool(value)
			end
			function io_reset:set(value)
				self:table_set(self.config, self.sid, "reset", value)
			end
			function io_reset:get()
				return self:table_get(self.config, self.sid, "reset")
			end

		s:option("io_acl").validate = function(self, value)
			local name = self:get_abs_value(self.config, self.sid, "io_name")
			if not (name and name:find("acl")) then
				return false, "Option is not available for this I/O pin."
			end
			return self.dt:check_array(value, { "current", "percent" })
		end

		s:option("io_min").maxlength = 16
		s:option("io_max").maxlength = 16
	end

	-- --------------------------------- LOG ---------------------------------

	if util.contains(event_plugin_list, "log") then
		event_plugin.require["log"] = {"log_event", "log_event_mark"}

		s:option("log_event").validate = function(self, value)
			local events = {}
			for event in pairs(self:event_get_all_events()) do
				table.insert(events, event)
			end
			return self.dt:check_array(value, events)
		end

		local log_event_mark =  s:option("log_event_mark")
			function log_event_mark:validate(value)
				local current_event = self:get_abs_value(self.config, self.sid, "log_event")
				if not current_event then
					return false, "event not set"
				end
				local events = self:event_get_all_events()
				if not events[current_event] then
					return false, "event type not found"
				end
				return self.dt:check_array(value, events[current_event])
			end
			function log_event_mark:set(value)
				self:table_set(self.config, self.sid, self.api_key, value == "sms reboot" and "sms" or value)
			end
			function log_event_mark:get(value)
				return value == "sms" and "sms reboot" or value
			end
	end

	-- --------------------------------- QUOTA ---------------------------------

	if util.contains(event_plugin_list, "quota") then
		event_plugin.require["quota"] = {"quota_interface"}

		s:option("quota_interface").validate = function(self, value)
			local ql_interfaces = {}
			self:table_foreach("quota_limit", "interface", function(c)
				table.insert(ql_interfaces, c[".name"])
			end)
			return self.dt:check_array(value, ql_interfaces)
		end

	end

	-- --------------------------------- TIME ---------------------------------

	if util.contains(event_plugin_list, "time") then
		event_plugin.require["time"] = {"time_day_type"}

		local time_month = s:option("time_month", { list = true })
			function time_month:validate(value)
				local months = {}
				for _, val in pairs(jg_utils.months) do
					table.insert(months, val)
				end
				return self.dt:check_array(value, months)
			end
			function time_month:set(value)
				value = jg_utils:convert_months_to_numbers(value)
				if not value or #value == 0 then
					return self:table_delete(self.config, self.sid, self.api_key)
				end
				self:table_set(self.config, self.sid, self.api_key, value)
			end
			function time_month:get(value)
				return jg_utils:convert_values(value, jg_utils.months)
			end


		 s:option("time_day_type").validate = function(self, value)
			return self.dt:check_array(value, {"days", "weekdays"})
		end

		s:option("time_day", { list = true }).validate = function(self, value)
			return self.dt:irange(value, 1, 31)
		end

		local time_weekday = s:option("time_weekday", { list = true })
			function time_weekday:validate(value)
				local weekdays = {}
				for _, val in pairs(jg_utils.weekdays) do
					table.insert(weekdays, val)
				end
				return self.dt:check_array(value, weekdays)
			end
			function time_weekday:set(value)
				value = jg_utils:convert_weekdays_to_numbers(value)
				if not value or #value == 0 then
					return self:table_delete(self.config, self.sid, self.api_key)
				end
				self:table_set(self.config, self.sid, self.api_key, value)
			end
			function time_weekday:get(value)
				return jg_utils:convert_numbers_to_weekdays(value)
			end
			
		s:option("time_hour", { list = true }).validate = function(self, value)
			return self.dt:irange(value, 0, 23)
		end

		s:option("time_minute", { list = true }).validate = function(self, value)
			return self.dt:irange(value, 0, 59)
		end

		s:option("time_month_override").validate = function(self, value)
			return self.dt:is_bool(value)
		end
	end
	

return s