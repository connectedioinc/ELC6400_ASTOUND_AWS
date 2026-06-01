local fs = require ("nixio.fs")
local util = require ("vuci.util")
local json = require ("luci.jsonc")
local jg_utils = util.class()

local PLUGIN_DIR = "/tmp/event_juggler"
local PLUGIN_DATA = PLUGIN_DIR .. "/plugin_data.json"

function jg_utils.__init__(self, service, io_info)
	self.service = service
	self._module_names = {}
	self._io_pins = nil
	self._io_info = io_info
	self._instance_limit = {
		event 		= 10,
		action 		= 10,
		condition	= 10
	}
	self.weekdays = {
		["1"] = "mon",
		["2"] = "tue",
		["3"] = "wed",
		["4"] = "thu",
		["5"] = "fri",
		["6"] = "sat",
		["0"] = "sun"
	}
	self.months = {
		["0"] =	"jan", 
		["1"] = "feb",
		["2"] = "mar",
		["3"] = "apr",
		["4"] = "may", 
		["5"] = "jun",
		["6"] = "jul",
		["7"] = "aug",
		["8"] = "sep",
		["9"] = "oct", 
		["10"] = "nov", 
		["11"] = "dec"
	}
	self.CODES = {
		ACTION_CREATED = 1,
	}
	self.module_types = {"action", "condition", "event"}
	self._plugin_data = {}
	self._plugin_names = {}
	self._path_require = {}
	self._solo_plugin_names = {}
	self.count = 0
end

function jg_utils:check_plugin_type(type, available_plugin_types)
	if not type then error("plugin type is not defined") end
	available_plugin_types = available_plugin_types or self.module_types
	if not util.contains(available_plugin_types, type) then
		error("unsupported plugin type")
	end
end

function jg_utils:get_plugin_data(plugin_type, force_update)
	if self._plugin_data[plugin_type] and #self._plugin_data[plugin_type] >= 1 and not force_update then return end
	local pl = json.parse(fs.readfile(PLUGIN_DATA) or "{}") or {}
	if pl.plugin_data and pl.plugin_names then
		self._plugin_data = pl.plugin_data
		self._plugin_names = pl.plugin_names
		return
	end
	local jg = require("vuci.jg_update_list")
	jg:update_list()
	self._plugin_data = jg._plugin_data
	self._plugin_names = jg._plugin_names
end

function jg_utils:get_plugin_info(plugin_type)
	plugin_type = plugin_type or self.plugin_type
	self:check_plugin_type(plugin_type)
	self:get_plugin_data(plugin_type)
	return self._plugin_data[plugin_type] or {}
end

function jg_utils:get_plugin_names(plugin_type)
	plugin_type = plugin_type or self.plugin_type
	self:check_plugin_type(plugin_type)
	self:get_plugin_data(plugin_type)
	return self._plugin_names[plugin_type] or {}
end

function jg_utils:get_new_action_name(service)
	service = service or self.service
	return require("vuci.util_tlt").get_next_name(service, service.config, "action", "name", "action", true)
end

function jg_utils:get_new_condition_name(service)
	service = service or self.service
	return require("vuci.util_tlt").get_next_name(service, service.config, "condition", "name", "condition", true)
end

function jg_utils:validate_name(value, section_type, service)
	service = service or self.service
	local valid = true
	service:table_foreach(service.config, section_type, function(s)
		if s.name == value and service.sid ~= s[".name"] then
			valid = false
		end
	end)
	return valid, "Name already used."
end

function jg_utils:parent_exists(type, service)
	service = service or self.service
	if not service.binding then return end
	local parent_section_type = service.uci:get("event_juggler", service.binding)
	if not parent_section_type or parent_section_type ~= type then
		service:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Parent section '%s' does not exist", service.binding),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

function jg_utils:create_defaults(binding_key, default_return, parent_section_mod_func, service)
	service = service or self.service
	local function clear_options_keys(options, keys)
		for _, key in ipairs(keys) do
			options[key] = nil
		end
	end
	if not service.binding then return {} end
	local options = service:table_get(service.config, service.binding) or {}
	local section_name = options[".type"]
	clear_options_keys(options, {".index", ".anonymous", ".name", ".type"})
	if binding_key then
		options[binding_key] = options[binding_key] or {}
		table.insert(options[binding_key], service.sid)
	end
	if type(parent_section_mod_func) == "function" then
		parent_section_mod_func(options, service.sid)
	end
	service:table_section(service.config, section_name, service.binding, options)
	return default_return
end

function jg_utils:check_if_from_events_reporting_or_io_juggler(options)
	return options.events_reporting == "1" or options.io_juggler == "1"
end

---------------------------------------------- Enable/Disable require ----------------------------------------------

function jg_utils:disable_requires(service)
	service = service or self.service
	for _, sec in ipairs(service.sections) do
		for _, opt_wrapper in ipairs(sec.options) do
			local _, opt = next(opt_wrapper)
			if opt.require then
				opt.orig_require = util.clone(opt.require, true)
				opt.require = nil
			end
		end
	end
end

function jg_utils:enable_requires(service)
	service = service or self.service
	for _, sec in ipairs(service.sections) do
		for _, opt_wrapper in ipairs(sec.options) do
			local _, opt = next(opt_wrapper)
			if opt.orig_require then
				opt.require = util.clone(opt.orig_require, true)
				opt.orig_require = nil
			end
		end
	end
end

---------------------------------------------- Helpers ----------------------------------------------

function jg_utils:check_if_number(value)
	local num_value = tonumber(value)
	if value ~= "" and num_value == nil then
		return false, string.format("%s is not a valid number", value), nil
	end
	return true, nil, num_value
end

function jg_utils:convert_values(tbl, map)
	local new_tbl = {}

	for _, val in ipairs(tbl or {}) do
		if map[val] then
			table.insert(new_tbl, map[val])
		end
	end
	return #new_tbl > 0 and new_tbl or nil
end

function jg_utils:convert_weekdays_to_numbers(tbl)
	local weekdays_map = {}
	for k, v in pairs(self.weekdays) do
		weekdays_map[v] = k
	end
	return self:convert_values(tbl, weekdays_map)
end

function jg_utils:convert_numbers_to_weekdays(tbl)
	return self:convert_values(tbl, self.weekdays)
end

function jg_utils:convert_months_to_numbers(tbl)
	local months_map = {}
	for k, v in pairs(self.months) do
		months_map[v] = k
	end
	return self:convert_values(tbl, months_map)
end

---------------------------------------------- IO pin list getters ----------------------------------------------

function jg_utils:get_io_pins(func)
	-- return cached results if they exist
	if self._io_pins and type(func) ~= "function" then 
		return self._io_pins 
	end

	if not self._io_info or #self._io_info == 0 then
		self._io_info = require("vuci.io"):ioman_info(false, true) or {}
	end

	self._io_pins  = {}
	local func_values = {}

	for _, v in pairs(self._io_info) do
		table.insert(self._io_pins, v.name)
		if type(func) == "function" and func(v) then
			table.insert(func_values, v.name)
		end
	end

	return type(func) == "function" and func_values or self._io_pins
end

function jg_utils:get_copy_io_pins()
	local func = function (v)
		return util.contains({"relay", "dwi", "gpio"}, v.type)
	end
	return self:get_io_pins(func)
end

function jg_utils:get_dest_io_pins()
	local func = function (v)
		if (v.type == "gpio" and (v.direction == "out" or v.bi_dir == true)) then
			return true
		end
		if v.type == "relay" then
			return true
		end
		return false
	end
	return self:get_io_pins(func)
end

function jg_utils:get_event_io_pins()
	local func = function (v)
		if util.contains({ "dwi", "acl", "adc", "relay" }, v.type) then
			return true
		end
		if v.type == "gpio" and (v.direction ~= "out" or (v.direction == "out" and v.bi_dir == true)) then
			return true
		end
		return false
	end
	return self:get_io_pins(func)
end

function jg_utils:get_cond_io_pins()
	local func = function (v)
		if util.contains({"adc", "acl", "dwi", "relay", "gpio"}, v.type) then
			return true
		end
		return false
	end
	return self:get_io_pins(func)
end

---------------------------------------------- IO validations ----------------------------------------------

function jg_utils:get_io_options_name(module_type) 
	if module_type == "condition" then
		return "io_cond_name", "io_cond_acl", "io_cond_min", "io_cond_max"
	end
	if module_type == "event" then
		return "io_name", "io_acl", "io_min", "io_max"
	end
end

function jg_utils:validate_io(module_type, value, limit_func, service)
	service = service or self.service
	self:check_plugin_type(module_type, {"condition", "event"})

	local io_name, io_acl, io_min, io_max = self:get_io_options_name(module_type)
	local pin_name = service:get_abs_value(service.config, service.sid, io_name)
	local name, acl

	if not pin_name then
		return false, "IO Pin not selected"
	end

	if pin_name and (pin_name:find("adc") or pin_name:find("pwr")) then
		name = "voltage"
	end

	if pin_name and pin_name:find("acl") then
		acl = service:get_abs_value(service.config, service.sid, io_acl)
		if not acl then
			return true, nil
		end
		name = acl == "percent" and "percentage" or "current"
	end

	if not name then
		return false, "Option is not available for this IO pin"
	end

	local ok, err = limit_func(name, io_min, io_max)
	if not ok then
		return false, err
	end

	if pin_name and (pin_name:find("adc") or pin_name:find("pwr")) then
		return service.dt:range(value, 0, 24)
	end

	if acl and pin_name and pin_name:find("acl") then
		if acl == "percent" then
			return service.dt:range(value, 0, 100)
		end
		if acl == "current" then
			return service.dt:range(value, 4, 20)
		end
		return service.dt:ufloat(value)
	end

	return false, "Option is not available for this IO pin"
end

function jg_utils:validate_io_min(module_type, value, service)
	service = service or self.service
	local limit_func = function (name, io_min, io_max)
		local max = service:get_abs_value(service.config, service.sid, io_max)
		local num_max = tonumber(max)

		local ok, err, num_value = self:check_if_number(value)
		if not ok then
			return false, err
		end

		if num_max and num_max <= num_value then
			return false, string.format("Minimum %s must be smaller than maximum.", name)
		end

		return true, nil
	end
	return self:validate_io(module_type, value, limit_func, service)
end

function jg_utils:validate_io_max(module_type, value, service)
	service = service or self.service
	local limit_func = function (name, io_min, io_max)
		local min = service:get_abs_value(service.config, service.sid, io_min)
		local num_min = tonumber(min)

		local ok, err, num_value = self:check_if_number(value)
		if not ok then
			return false, err
		end
	
		if num_min and num_min >= num_value then
			return false, string.format("Maximum %s must be bigger than minimum.", name)
		end

		return true, nil
	end
	return self:validate_io(module_type, value, limit_func, service)
end

---------------------------------------------- Binding validation ----------------------------------------------

function jg_utils:do_not_allow_create_without_binding(service)
	service = service or self.service
	if not service.binding then
		service:add_critical_error(
			STD_CODES.NO_CREATE,
			"Section creation is not allowed",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end
end

---------------------------------------------- Limit validations ----------------------------------------------

function jg_utils:update_instance_limits()
	local r = util.file_exec("/usr/sbin/event_juggler", { "-f" })
	if r.stdout then
		local response = json.parse(r.stdout) or {}
		for k, v in pairs({event="max_events", action="max_actions", condition="max_conditions"}) do
			self._instance_limit[k] = response[v]
		end
	end
end

function jg_utils:validate_option_count(section_id, option_name, limit, service)
	service = service or self.service
	if not limit or not option_name then
		error(not limit and "no limit" or "no option_name")
	end
	local option_value = service:get_abs_value(service.config, section_id, option_name) or {}
	return option_value and type(option_value) == "table" and limit > #option_value
end

function jg_utils:validate_section_count(section_type, limit, service)
	service = service or self.service
	if not limit or not section_type then
		error(not limit and "no limit" or "no section_type")
	end
	local count = 0
	service:table_foreach(service.config, section_type, function(s)
		if not (s.io_juggler == "1" or s.events_reporting == "1" or s.power_control == "1") then
			count = count + 1
		end
	end)
	return limit > count
end

function jg_utils:validate_limit_count(section_type, service)
	service = service or self.service
	local limit_types 	= {action = "action", condition = "condition", event = "event"}
	local option_names 	= {action = "actions", condition = "available_conditions"}

	if not limit_types[section_type] then
		error("unsupported plugin type")
	end

	self:update_instance_limits()

	local limit = self._instance_limit[section_type]
	
	local count = true
	if section_type == "event" then
		count = self:validate_section_count(limit_types[section_type], limit, service)
	else
		if not service.binding then return end
		count = self:validate_option_count(service.binding, option_names[section_type], limit, service)
	end

	if not count then
		local error_message = string.format(
			"Can't create more %s. Only %s %s allowed.",
			limit_types[section_type],
			tostring(limit),
			limit == 1 and "is" or "are"
		)
		service:add_critical_error(STD_CODES.UCI_CREATE_ERROR, error_message, "Validation")
	end
end

function jg_utils:validate_section_io_min_max_values(section_type)
	local prefix = section_type == "condition" and "io_cond" or "io"
	local s = self.service
	local name = s.current_data_block[prefix .. "_name"] or ""
	local is_match = name:find("adc", nil, true) or name:find("acl", nil, true)
	for _, val in ipairs { "_max", "_min" } do
		if is_match or s.current_data_block[prefix .. "_acl"] or s.current_data_block[prefix .. val] then
			local io_val = s:get_abs_value(s.config, s.sid, prefix .. val)
			local res, message = true, ""
			if io_val then res, message = self["validate_io" .. val](self, section_type, io_val, s) end
			if not res then s:add_error(STD_CODES.INVALID_OPT, message, prefix .. val, nil, io_val) end
		end
	end
end
---------------------------------------------- Limit getter ----------------------------------------------

function jg_utils:get_instance_limits()
	self:update_instance_limits()
	return self._instance_limit
end

--------------------------------------------------------------------------------------------------------------

function jg_utils:UPLOAD_after_upload_hook(upload_request, service)
	service = service or self.service
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "juggler")
	return { path = path }
end

function jg_utils:remove_from_table(tbl, value)
	for i = #tbl, 1, -1 do
		if tbl[i] == value then
			table.remove(tbl, i)
		end
	end
end

function jg_utils:get_all_modems()
	self.all_modems = self.all_modems or require("vuci.modem"):get_all_modems()
	return self.all_modems
end

function jg_utils:sim_number_validation(modem_id, value, service)
	service = service or self.service
	local sim_count, all_modems = nil, self:get_all_modems()

	if #all_modems > 1 then
		if modem_id then
			for _, modem in ipairs(all_modems) do
				if modem.id == modem_id then
					sim_count = modem.sim_count
					break
				end
			end
		end
	elseif #all_modems == 1 then
		sim_count = all_modems[1].sim_count
	end

	if not sim_count then
		return false, "Modem not found."
	end

	local sims = {}
	for i = 1, sim_count do
		table.insert(sims, tostring(i))
	end

	return service.dt:check_array(value, sims)
end

jg_utils.userscripts_permission_option = require("vuci.util_tlt").userscripts_permission_option
function jg_utils:get_filter_params(event_plugin, event_io_name)
	local service = self.service
	if not event_plugin then return end
	service.events_data = service.events_data or self:get_plugin_info("event")
	for _, event in pairs(service.events_data) do
		if event.name == event_plugin and event.params then
			if (event_plugin == "io" and event_io_name and
					not (event_io_name:find("adc") or event_io_name:find("acl") or event_io_name:find("pwr"))) then
				event.params["io.fvalue"] = nil
			end
			return event.params
		end
	end
end

return jg_utils