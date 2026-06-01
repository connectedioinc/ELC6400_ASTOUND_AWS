local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local fs = require "nixio.fs"
local all_modems = require("vuci.modem"):get_all_modems()


local data_sender_outputs = ConfigService:new({ increment_name = true, create = false, delete = false })

local d_utils = require("api.services.data_sender_utils")(data_sender_outputs, "output")
local azure_installed = d_utils.azure_installed
local bundle = {
	["fs"]				= fs,
	["util"]			= util,
	["d_utils"]			= d_utils,
	["all_modems"]		= all_modems,
	["azure_installed"] = azure_installed
}

function data_sender_outputs:parent_exists()
	d_utils:check_if_parrent_exists("collection")
end

local s = data_sender_outputs:section("data_sender", "output")

s.filter = function(self, options)
	return not self.binding or self:get_abs_value(self.config, self.binding, "output") == options[".name"]
end

function data_sender_outputs:GET_TYPE_options()
	local plugins = d_utils:get_plugin_info("output")
	return self:ResponseOK({
		plugins = plugins
	})
end

function data_sender_outputs:GET_section_init_hook()
	d_utils:check_if_plugin_is_stil_valid("output")
end

-- Option required are validated only if the related collection is enabled
function data_sender_outputs:PUT_validate_section_hook() d_utils:validate_plugin() end

function data_sender_outputs:PUT_after_validate_section_hook()
	local opt_plugin = self:get_abs_value(self.config, self.sid, "plugin")
	opt_plugin = opt_plugin == "ubus" and "azure" or opt_plugin
	d_utils:enable_requires(nil, opt_plugin)
	if opt_plugin == "azure" then
		local ok, azure_init = pcall(require, "api.services.azure_utils")
		if ok then
			local azure_utils = azure_init(self, true)
			azure_utils:validate_is_duplicated_login()
		end
	end
end

local name = s:option("name")
name.readonly = true

local plugin = s:option("plugin")
plugin.require = {}
function plugin:validate(value)
	return self.dt:check_array(value, d_utils:get_plugin_names("output"))
end

plugin.original_get = plugin.get
function plugin:get(...)
	local value = self:original_get(...)
	return value == "ubus" and "azure" or value
end

plugin.original_set = plugin.set
function plugin:set(value)
	local old_val = self:table_get(self.config, self.sid, self.api_key)
	self:original_set(value)
	if value == "azure" then
		self:table_set(self.config, self.sid, self.api_key, "ubus")
	end
	if old_val and old_val == "ubus" and value ~= "azure" then
		d_utils:remove_azure_plugin_selection(self.sid)
		self:table_delete(self.config, self.sid, "azure_configuration_type")
	end
end

d_utils:import_modules("output", s, bundle, plugin)

-----------------------------------------------

function data_sender_outputs:UPLOAD_after_upload_hook(upload_request)
	local v_table = upload_request.parameters
	local path = upload_request.files[1].location
	if util.contains({ "azure_x509certificate", "azure_x509privatekey" }, v_table.option) then
		util.set_file_permissions(path, "azure")
	else
		util.set_file_permissions(path, "ds")
	end
	return { path = path }
end

return data_sender_outputs
