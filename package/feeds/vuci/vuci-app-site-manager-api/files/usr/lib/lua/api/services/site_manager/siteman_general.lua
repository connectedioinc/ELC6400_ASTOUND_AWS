local ConfigService = require("api/ConfigService")
local siteman_utils = require("api/services/site_manager/siteman_utils")
local util = require("vuci.util")

local DeviceGeneral = ConfigService:new({ create = false, delete = false, global_settings = true, general_section = "general" })

function DeviceGeneral:set_pw_changed()
	self.pw_changed = true
end
function DeviceGeneral:get_pw_changed()
	return self.pw_changed
end

function DeviceGeneral:has_running_instance(object)
	if not object.instances then return false end
	for _, instance in pairs(object.instances) do
		if instance.running then return true end
	end
	return false
end
function DeviceGeneral:before_response_hook()
	if self.request_method == "GET" then return end
	if self.arguments and self.arguments.data and self.arguments.data.enabled == "1" then
		local running = util.ubus("service", "list", {name="siteman"}).siteman
		local devman_enabled = self:has_running_instance(running) and "1" or "0"
		if not devman_enabled then
			siteman_utils:wait_for_devman_reload(10000)
		end
	end
end

local s = DeviceGeneral:section("siteman", "siteman")

	local opt_enabled = s:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_password = s:option("password")
		function opt_password:validate(value)
			local ok, err = self.dt:system_password(value)
			if not ok then return ok, err end

			if value ~= self.current_data_block.password_confirm then
				return false, "'password' and 'password_confirm' options do not match."
			end
			return true
		end
		function opt_password:get(value)
			return self:table_get("siteman_devices", "settings", "custom_password_set") == "1" and "set" or "unset"
		end
		opt_password.orig_set = opt_password.set
		function opt_password:set(value)
			if value == "" then
				return -- password can not be cleared
			end
			self:table_set("siteman_devices", "settings", "custom_password_set", "1")
			self:table_set("siteman_devices", "settings", "password", util.trim(util.exec("echo %s | mkpasswd" % util.shellquote(value))))
			DeviceGeneral:set_pw_changed()
		end

	local opt_password_confirm = s:option("password_confirm")
		function opt_password_confirm:set() end
		function opt_password_confirm:validate(value)
			local ok, err = self.dt:system_password(value)
			if not ok then return ok, err end
			return true
		end

return DeviceGeneral
