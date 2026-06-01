local fs = require "nixio.fs"
local json = require "luci.jsonc"
local util = require "vuci.util"
local pac = require("vuci.package_checker")
local board = require("vuci.board")
local PLUGIN_DIR = "/tmp/data_sender"
local PLUGIN_DATA = PLUGIN_DIR .. "/plugin_data.json"

local data_to_server = {
	_params					= {},
	remove_ubus				= true,
	_plugin_data			= {},
	_plugin_names			= {},
	_solo_plugin_names		= {},
	app_modules_location	= "/usr/lib/data_sender/ds_*",
	azure_installed			= pac.is_installed("azure_iothub"),
	available_plugins = {
		input = {
			gsm 		= board:has_mobile(),
			wifiscan 	= board:has_wifi(),
			bluetooth 	= board:has_bluetooth(),
			mdcollect 	= board:has_mobile() and pac.is_installed("mdcollectd"),
			gps 		= board:has_gps(),
			sms 		= board:has_mobile(),
			io  		= board:has_ios(),
			impulse_counter = board:has_ios(),
		},
		output = {
			sms 		= board:has_mobile()
		},
		format = {},
		filter = {}
	},
	plugin_types = {
		"input",
		"format",
		"filter",
		"output"
	}
}
function data_to_server:update_list()
	local function set_empty_tables(opt_name, keys)
		keys = keys or self.plugin_types
		for _, val in ipairs(keys) do
			opt_name[val] = opt_name[val] or {}
		end
	end

	set_empty_tables(self._plugin_data)
	set_empty_tables(self._plugin_names)
	set_empty_tables(self._solo_plugin_names)
	set_empty_tables(self._params)

	local r = util.file_exec("/usr/sbin/datasender", { "-d" })
	if not r.stdout then error("datasender -d error") end
	local all_plugin_info = json.parse(r.stdout)["plugins"]

	for _, plugin in pairs(all_plugin_info) do
		(function ()
			if plugin.type and not self.plugin_types[plugin.type] or not plugin.name then return end
			local plugin_type = self.plugin_types[plugin.type]
			if self.available_plugins[plugin_type][plugin.name] == false then
                return
            end
			if plugin.name == "ubus" then
				if self.azure_installed then
					plugin.name = "azure"
					plugin.description = "Plugin for sending data to Azure IoT Hub"
				elseif self.remove_ubus then
					return
				end
			end
			table.insert(self._plugin_names[plugin_type], plugin.name)
			local solo_collection_value = plugin.solo_collection and plugin.solo_collection or false
			table.insert(self._plugin_data[plugin_type], {
				name			= plugin.name,
				params			= plugin.params,
				description		= plugin.description,
				solo_collection	= solo_collection_value
			})
			if solo_collection_value then
				table.insert(self._solo_plugin_names[plugin_type], plugin.name)
			end
		end)()
	end
	local data = {
		plugin_data = self._plugin_data,
		plugin_names = self._plugin_names,
		solo_plugin_names = self._solo_plugin_names
	}
	fs.mkdir(PLUGIN_DIR)
	util.set_file_permissions(PLUGIN_DIR, "uhttpd", 775)
	local ok, err_code, err_str = fs.writefile(PLUGIN_DATA, json.stringify(data))
	util.set_file_permissions(PLUGIN_DATA, "uhttpd", 660)
	if not ok then
		error("Failed to write plugin data to file: " .. tostring(err_code) .. " " .. tostring(err_str))
	end
end

return data_to_server
