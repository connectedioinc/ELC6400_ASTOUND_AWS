local fs = require "nixio.fs"
local json = require "luci.jsonc"
local util = require "vuci.util"
local pac = require("vuci.package_checker")

local PLUGIN_DIR = "/tmp/data_sender"
local PLUGIN_DATA = PLUGIN_DIR .. "/plugin_data.json"

local d_utils = util.class()
function d_utils.__init__(self, service, plugin_type, data_sender_service)
	self.service = service
	self.plugin_type = plugin_type
	self.data_sender_service = data_sender_service

	self._plugin_data = {}
	self._plugin_names = {}
	self._solo_plugin_names = {}
	self._params = {}

	self.azure_installed = pac.is_installed("azure_iothub")
	self.remove_ubus = true

	self.CODES = {
		OUTPUT_CREATED     = 1,
		INPUT_CREATED      = 2,
		CANT_CHANGE_NAME   = 3,
		UNAVAILABLE_PLUGIN = 4,
	}
	self.app_modules_location = "/usr/lib/data_sender/ds_*"
	self.module_types = { "input", "output", "format" }
	self.api_installed_modules_prefix = "/usr/local"
	self.api_modules_location = {
		input  = "/usr/lib/lua/api/services/ds_inputs/ds_input_%s.lua",
		output = "/usr/lib/lua/api/services/ds_outputs/ds_output_%s.lua",
		format = "/usr/lib/lua/api/services/ds_formats/ds_format_%s.lua"
	}
	self.api_import_modules_location = {
		input  = "api.services.ds_inputs.ds_input_%s",
		output = "api.services.ds_outputs.ds_output_%s",
		format = "api.services.ds_formats.ds_format_%s"
	}
	self.week_days = { "mon", "tue", "wed", "thu", "fri", "sat", "sun" }
	self.main_options = {
		name = true,
		plugin = true,
		format = true,
		members = true,
	}
end

---------------------------------- Get data about plugins ----------------------------------

--- Checks if the provided plugin type is supported, if not it throws an error.
---@param type any
---@param available_plugin_types any
---@return any
function d_utils:check_plugin_type(type, available_plugin_types)
	type = type or self.plugin_type
	available_plugin_types = available_plugin_types and available_plugin_types or self.module_types
	if not util.contains(available_plugin_types, type) then
		error("unsupported plugin type")
	end
	return type
end

---Returns info about all plugins
---@param plugin_type "input"|"output"
function d_utils:get_plugin_data(plugin_type, force_update)
	if self._plugin_data[plugin_type] and #self._plugin_data[plugin_type] >= 1 and not force_update then return end
	if fs.access(PLUGIN_DATA) then
		local pl = json.parse(fs.readfile(PLUGIN_DATA) or "{}") or {}
		if pl.plugin_data and pl.plugin_names and pl.solo_plugin_names then
			self._plugin_data = pl.plugin_data
			self._plugin_names = pl.plugin_names
			self._solo_plugin_names = pl.solo_plugin_names
			return
		end
	end
	local ds = require("vuci.ds_update_list")
	ds:update_list()
	self._plugin_data = ds._plugin_data
	self._plugin_names = ds._plugin_names
	self._solo_plugin_names = ds._solo_plugin_names
end

function d_utils:get_plugin_info(plugin_type)
	plugin_type = plugin_type or self.plugin_type
	self:check_plugin_type(plugin_type)
	self:get_plugin_data(plugin_type)
	return self._plugin_data[plugin_type]
end

function d_utils:get_plugin_names(plugin_type)
	plugin_type = plugin_type or self.plugin_type
	self:check_plugin_type(plugin_type)
	self:get_plugin_data(plugin_type)
	return self._plugin_names[plugin_type]
end

--------------------------------------------------------------------------------------------

---------------------------------- Validate ----------------------------------

---Validates name
---@param service table service object - used for table_foreach fn
---@param value string name value
---@param section_type "input"|"output"|"collection"
---@return boolean
---@return string
function d_utils:validate_name(value, section_type, service)
	if section_type ~= "input" and section_type ~= "output" and section_type ~= "collection" then
		error("unsupported section type")
	end
	service = service or self.service
	local valid = true
	service:table_foreach("data_sender", section_type, function(s)
		if s.name == value and service.sid ~= s[".name"] then
			valid = false
		end
	end)
	if not valid then
		return valid, "Name already used."
	end
	return service.dt:uciname(value)
end

---Disables all option requires for the given service
---@param service any
function d_utils:disable_requires(service)
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

function d_utils:plugin_to_opt_prefix(plugin_type)
	local mapped_types = {
		bluetooth = "bl_",
		mdcollect = "mdc_",
		wifiscan = "wifi_",
	}
	local prefix = mapped_types[plugin_type]
	if prefix then
		return prefix
	elseif plugin_type then
		return plugin_type .. "_"
	else
		return nil
	end
end


---Enables all previously disabled option requires for the given service
---@param service any
---@param plugin_type string If plugin_type is provided, it will enable requires only for the options related to this plugin type, and disable all others
function d_utils:enable_requires(service, plugin_type)
	local opt_prefix = d_utils:plugin_to_opt_prefix(plugin_type)

	-- shared options which requires should always be enabled
	local exclude = self.main_options

	service = service or self.service
	for _, sec in ipairs(service.sections) do
		for _, opt_wrapper in ipairs(sec.options) do
			local _, opt = next(opt_wrapper)
			if opt_prefix then
				if opt.api_key:match("^" .. opt_prefix) then
					opt.require = opt.orig_require and util.clone(opt.orig_require, true) or opt.require
					opt.orig_require = nil
				elseif not exclude[opt.api_key] then
					opt.orig_require = opt.require and util.clone(opt.require, true) or nil
					opt.require = nil
				end
			else
				opt.require = opt.orig_require and util.clone(opt.orig_require, true) or opt.require
				opt.orig_require = nil
			end
		end
	end
end

---Returns collection which contains the given plugin
---@param service any
---@param plugin_sname string Plugin section id/name
---@return table|nil c Collection
function d_utils:get_collection(service, plugin_sname)
	service = service or self.service
	plugin_sname = plugin_sname or service.sid
	local c
	service:table_foreach(service.config, "collection", function(s)
		if s.input and util.contains(s.input, plugin_sname) then
			c = s
			return false --break	
		end
		if s.output == plugin_sname then
			c = s
			return false --break
		end
	end)
	return c
end

---Validates plugin options and disables it's option requires if the related collection is not enabled
function d_utils:validate_plugin(service)
	service = service or self.service
	local c = self:get_collection()
	if c and c.enabled == "1" then
		for _, option in ipairs({"plugin", "name"}) do
			local value = service:get_abs_value(service.config, service.sid, option)
			if not value or value == "" then
				service:add_error(STD_CODES.INVALID_OPT, "Option is required for this configuration.", option)
			end
		end
	else
		self:disable_requires()
	end
end

function d_utils:can_modify_name(service)
	service = service or self.service
	local old_name = service:table_get(service.config, service.sid, "name")
	local new_name = service:get_abs_value(service.config, service.sid, "name")
	local collection_data = nil
	service:table_foreach(service.config, "collection", function(c)
		if c["input"] and util.contains(c["input"], service.sid) then
			collection_data = c
		end
	end)
	local is_name_changed = old_name and new_name and old_name ~= new_name
	local is_custom_format = collection_data and collection_data["format"] == "custom" and collection_data["format_str"]

	if is_name_changed and is_custom_format then
		local is_name_in_format_str = collection_data["format_str"]:match("%%" .. old_name .. "%%")
		if is_name_in_format_str then
			return service:add_critical_error(
				self.CANT_CHANGE_NAME,
				string.format(
					"Can't modify input name. Before modify please change or delete [%%" ..
					old_name .. "%%] value in data sender collection (id = %s) 'format_str' option.",
					collection_data[".name"])
			)
		end
	end
end

---------------------------------------- Limit validations ----------------------------------------

function d_utils:get_max_limit_count()
	local data = {
		max_inputs      = 10,
		max_collections = 10
	}
	local r = util.file_exec("/usr/sbin/datasender", { "-f" })
	if r.stdout then
		local response = json.parse(r.stdout)
		data = {
			max_inputs = response.max_inputs or data.max_inputs,
			max_collections = response.max_collections or data.max_collections
		}
	end
	return data
end

function d_utils:validate_limit_count(validate_type, service)
	local function validate_collection(service, data)
		local collection_count = 0
		service:table_foreach(service.config, "collection", function(_)
			collection_count = collection_count + 1
		end)
		if collection_count >= data.max_collections then
			return service:add_critical_error(
				STD_CODES.UCI_CREATE_ERROR,
				string.format("Can't create more collections. Only %s instances are allowed.",
					tostring(data.max_collections)),
				"Validation"
			)
		end
	end
	
	local function validate_input(service, data)
		local opt_collection = service:get_abs_value(service.config, service.binding, "input")
		if opt_collection and #opt_collection >= data.max_inputs then
			return service:add_critical_error(
				STD_CODES.UCI_CREATE_ERROR,
				string.format("Can't add more input plugins. Only %s inputs are allowed.", tostring(data.max_inputs)),
				"Validation"
			)
		end
	end
	
	if validate_type ~= "input" and validate_type ~= "collection" then
		error("unsupported validate type")
	end
	service = service or self.service
	local data = self:get_max_limit_count()

	if validate_type == "collection" then
		return validate_collection(service, data)
	end
	if validate_type == "input" then
		return validate_input(service, data)
	end	
end

-------------------------------------------------------------------------------------------

function d_utils:find_collection_id(plugin_id, plugin_type, service)
	service = service or self.service
	local collection_id = nil
	service:table_foreach(service.config, "collection", function(collection)
		local plugin = collection[plugin_type]
		local is_plugin_table = plugin and type(plugin) == "table" and util.contains(plugin, plugin_id)
		local is_plugin_string = plugin and type(plugin) == "string" and plugin == plugin_id

		if is_plugin_table or is_plugin_string then
			collection_id = collection[".name"]
		end
	end)
	return collection_id
end

function d_utils:check_if_plugin_is_stil_valid(plugin_type, service)
	if plugin_type ~= "input" and plugin_type ~= "output" then
		error("unsupported validate type")
	end
	service = service or self.service

	local opt_plugin = service:getter_wrapped_abs_value(service.config, service.sid, "plugin")
	if opt_plugin and not util.contains(self:get_plugin_names(plugin_type), opt_plugin) then
		local collection_id = service.binding or self:find_collection_id(service.sid, plugin_type)
		if collection_id then
			local message = string.format(
				"The '%s' plugin has been removed. Please select a different plugin type or delete this data %s which belongs to the data sender collection (id = %s).",
				opt_plugin,
				plugin_type,
				collection_id
			)
			service:add_message(self.CODES.UNAVAILABLE_PLUGIN, message, service.sid)
		end
	end
end

-------------------------------------------------------------------------------------------

function d_utils:available_format_types()
	return self:get_plugin_names("format")
end

function d_utils:available_encoder_types()
	local r = util.file_exec("/usr/sbin/datasender", { "-f" })
	if r.stdout then
		return json.parse(r.stdout).encoders or {}
	end
	return {}
end

------------------------------------------ AZURE ------------------------------------------

function d_utils:get_azure_section_id(output_sid, service)
	service = service or self.service
	local sid = output_sid or service.sid
	local opt_ubus_object = service:get_abs_value(service.config, sid, "ubus_object")
	if not opt_ubus_object then return nil end
	return opt_ubus_object:match("azure%.(.*)")
end

function d_utils:delete_azure_section(output_sid, service)
	service = service or self.service
	if not self.azure_installed then return end

	local azure_s_id = self:get_azure_section_id(output_sid)
	if not azure_s_id then return end

	local azure_s = service:table_get("azure_iothub", azure_s_id)
	if azure_s and azure_s.hidden == "1" then
		service:table_delete("azure_iothub", azure_s_id)
	end
end

---Deletes related azure section if it exists. Also deletes ubus_* options
function d_utils:remove_azure_plugin_selection(output_sid, service)
	service = service or self.service
	self:delete_azure_section(output_sid)
	if service.request_method ~= "DELETE" then
		service:table_delete(service.config, output_sid, "ubus_object")
		service:table_delete(service.config, output_sid, "ubus_method")
	end
end

------------------------------------- DATABASE PATH ---------------------------------------

---Updates db path in accordance to the input type
function d_utils:update_db_path(service)
	local pl = service:get_abs_value(service.config, service.sid, "plugin")
	if pl == "mbus" then
		local mbus_utils = require("api.services.mbus_utils")
		service:table_set(service.config, service.sid, "mbus_db", mbus_utils:get_db_path())
	end
end

function d_utils:check_if_parrent_exists(section_type, service)
	service = service or self.service
	if not service.binding then return end
	local section = service.binding and service.uci:get("data_sender", service.binding)

	if section ~= section_type then
		service:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Parent section '%s' does not exist", service.binding),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

function d_utils:import_modules(section_type, section, bundle, type, service)
	service = service or self.service
	if section_type ~= "input" and section_type ~= "output" and section_type ~= "format" then
		error("unsupported plugin type")
	end
	local modules = self:get_plugin_names(section_type)
	for _, value in ipairs(modules) do
		if fs.access(self.api_modules_location[section_type] % value) or fs.access(self.api_installed_modules_prefix .. self.api_modules_location[section_type] % value) then
			require(self.api_import_modules_location[section_type] % value):endpoint(service, section, bundle, type)
		end
	end
end

function d_utils:convert_to_week_days(value)
	local week_days = {}
	for k, v in ipairs(value) do
		week_days[k] = v == "0" and "sun" or self.week_days[tonumber(v)]
	end
	return week_days
end

function d_utils:convert_from_week_days(value)
	local week_days = {}
	for k, v in ipairs(value) do
		for i, day in ipairs(self.week_days) do
			if v == day then
				week_days[k] = tostring(i)
			end
		end
	end
	table.sort(week_days)
	if week_days[#week_days] == "7" then
		week_days[#week_days] = "0"
	end
	return week_days
end

function d_utils:get_io_pins()
	local io_info = require("vuci.io"):ioman_info(false, false) or {}
	local io_pins = {}
	for _, v in pairs(io_info) do
		if util.contains({ "dwi", "acl", "adc", "gpio", "relay" }, v.type) then
			table.insert(io_pins, v.name)
		end
	end
	return io_pins
end

d_utils.userscripts_permission_option = require("vuci.util_tlt").userscripts_permission_option
function d_utils:upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "ds")
	return { path = path }
end

return d_utils
