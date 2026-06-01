local fs = require "nixio.fs"
local json = require "luci.jsonc"
local util = require "vuci.util"
local board = require("vuci.board")
local pac = require("vuci.package_checker")
local PLUGIN_DIR = "/tmp/event_juggler"
local PLUGIN_DATA = PLUGIN_DIR .. "/plugin_data.json"

local call_support = false
if board:has_mobile() then
	local mdm = require("vuci.modem")
	local all_modems = mdm:get_all_modems() or {}
	for _, modem in ipairs(all_modems) do
		if modem.id and mdm:call_functionality_supported(modem.id) then
			call_support = true
		end
	end
end

local event_juggler = {
	_plugin_data         = {},
	_plugin_names        = {},
	module_types         = { "action", "condition", "event" },
	available_plugins = {
		action = {
			sim_switch	= board:has_dual_sim(),
			modem		= board:has_mobile(),
			sms			= board:has_mobile(),
			out			= board:has_ios(),
			wifi		= board:has_wifi(),
			call		= call_support,
			led			= board:has_user_led()
		},
		condition = {
			gps 		= board:has_gps(),
			io 			= board:has_ios(),
		},
		event = {
			gps 		= board:has_gps(),
			gsm			= board:has_mobile(),
			io 			= board:has_ios(),
			quota		= board:has_mobile() and not not pac.is_installed("quota_limit"),
			hotspot		= not not pac.is_installed("coova-chilli")
		},
	},
}

function event_juggler:update_list()
	local function set_empty_tables(opt_name, keys)
		keys = keys and keys or self.module_types
		for _, val in ipairs(keys) do
			if not opt_name[val] then
				opt_name[val] = {}
			end
		end
	end

	set_empty_tables(self._plugin_data)
	set_empty_tables(self._plugin_names)
	
	local r = util.file_exec("/usr/sbin/event_juggler", { "-d" })
	if not r.stdout then error("event_juggler -d error") end
	local all_plugin_info = json.parse(r.stdout)["plugins"]

	for _, plugin in pairs(all_plugin_info) do
		(function ()
			if self.available_plugins[plugin.type][plugin.name] == false then
				return
			end
			if plugin.type and util.contains({"action", "event", "condition"}, plugin.type) then
				table.insert(self._plugin_names[plugin.type], plugin.name)
				table.insert(self._plugin_data[plugin.type], {
					name			= plugin.name,
					description		= plugin.description,
					params 			= plugin.params or nil
				})
			end
		end)()
	end
	local data = {
		plugin_data = self._plugin_data,
		plugin_names = self._plugin_names
	}
	fs.mkdir(PLUGIN_DIR)
	util.set_file_permissions(PLUGIN_DIR, "uhttpd", 775)
	local ok, err_code, err_str = fs.writefile(PLUGIN_DATA, json.stringify(data))
	util.set_file_permissions(PLUGIN_DATA, "uhttpd", 660)
	if not ok then
		error("Failed to write plugin data to file: " .. tostring(err_code) .. " " .. tostring(err_str))
	end
end

return event_juggler
