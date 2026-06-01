local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local siteman_utils = require("api/services/site_manager/siteman_utils")
local nixio = require "nixio"

local DeviceGroups = ConfigService:new({ increment_name = true })

function DeviceGroups:initialize_hook()
	self.affected_groups = {}
	self.affected_devices = {}
	self.removed_devices = {}
end

function DeviceGroups:DELETE_before_section_delete_hook()
	local default = self:get_abs_value(self.main_config, self.sid, "default")
	if default == "1" then
		return self:add_critical_error(STD_CODES.INVALID_SECTION, "Default group can not be deleted.")
	end
	siteman_utils:remove_group_from_configs(self, self.sid)
end

function DeviceGroups:validate_section_hook()
	local default = self:get_abs_value(self.config, self.sid, "default")
	local platform = self:get_abs_value(self.config, self.sid, "platform")
	if default == "1" then
		self:table_foreach(self.config, "group", function(s)
			if s[".name"] == self.sid then return end -- continue
			if s.default == "1" and s.platform == platform then
				self:table_set(self.config, s[".name"], "default", "0")
			end
		end)
	else
		local default_count = 0
		self:table_foreach(self.config, "group", function(s)
			if s.default == "1" and s.platform == platform then
				default_count = default_count + 1
			end
		end)
		if platform and default_count == 0 then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "At least one group must be default for this platform.")
		end
	end
end

DeviceGroups.PUT_validate_section_hook = DeviceGroups.validate_section_hook
DeviceGroups.POST_validate_section_hook = DeviceGroups.validate_section_hook

function DeviceGroups:periodic_status_check(mac, index, removed)
	local res_device, err, msg = siteman_utils:device_status(mac)
	if err then
		return self:add_critical_error(err.code, err.msg)
	end
	if msg then
		self:add_message(msg.code, msg.msg)
	end
	if not removed and res_device.group == self.sid then
		return true
	elseif removed and not res_device.group then
		return true
	else
		if index and index > 5 then
			return self:add_critical_error(siteman_utils.ERR_CODES.SYNC_FAILED, "Device could not be added to group.")
		end
		index = index + 1
		-- need sleep to not spam ubus and still check status every second
		nixio.nanosleep(1)
		self:periodic_status_check(mac, index, removed)
	end
end

function DeviceGroups:before_response_hook()
	local devman_status = self:get_abs_value("siteman", "general", "enabled")
	if self.request_method == "GET" or devman_status == "0" then return end
end

local s = DeviceGroups:section("siteman_groups", "group")
	local opt_name = s:option("name")
		opt_name.cfg_require = true
		function opt_name:validate(value)
			local ok, err = siteman_utils:validate_duplicate(self, self.api_key, value)
			if not ok then return ok, err end
			return self.dt:string(value)
		end

	local opt_platform = s:option("platform")
		opt_platform.cfg_require = true
		function opt_platform:validate(value)
			return self.dt:check_array(value, {"default", "switch"})
		end

	local opt_default = s:option("default")
		function opt_default:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_devices = s:option("devices", { list = true })
		function opt_devices:validate(value)
			local available_devices = {}
			self:table_foreach("siteman_devices", "device", function(s)
				table.insert(available_devices, s[".name"])
			end)

			if #available_devices == 0 then
				return false, "No devices available"
			end
			local ok, err = self.dt:check_array(value, available_devices)
			if not ok then return ok, err end
			return true
		end
		function opt_devices:get(value)
			return self.uci:get(self.config, self.sid, "devices")
		end
		function opt_devices:set(value)
			local new_devices = value
			local platform = self:get_abs_value(self.config, self.sid, "platform")
			-- collect changed devices for syncing
			local old_devices = self:table_get(self.config, self.sid, self.api_key) or {}
			local old_devices_keys = {}
			local new_devices_keys = {}
			for _, dev_id in ipairs(old_devices) do
				old_devices_keys[dev_id] = true
			end
			for _, dev_id in ipairs(type(new_devices) == "table" and new_devices or {}) do
				new_devices_keys[dev_id] = true
			end
			for dev_id in pairs(old_devices_keys) do
				if not new_devices_keys[dev_id] then
					self.affected_devices[dev_id] = true
					self.removed_devices[dev_id] = true
				end
			end
			for dev_id in pairs(new_devices_keys) do
				if not old_devices_keys[dev_id] then
					self.affected_devices[dev_id] = true
				end
			end
			self.affected_groups[self.sid] = true

			-- remove devices from all other groups if they are being set in this group
			local removed_devs = {}
			self:table_foreach(self.config, "group", function(s)
				if s[".name"] == self.sid then return end -- continue
				if not s.devices or #s.devices == 0 then return end -- continue
				if s.platform ~= platform then return end -- continue

				local devs = util.clone(s.devices, true)
				for _, v in ipairs(new_devices) do
					for i = #devs, 1, -1 do
						if devs[i] == v then
							removed_devs[v] = true
							table.remove(devs, i)
						end
					end
				end
				if #devs == 0 then
					self.uci:delete(self.config, s[".name"], "devices")
				else
					self.uci:set(self.config, s[".name"], "devices", devs)
				end
			end)
			local removed_devs_arr = util.keys(removed_devs)
			if #removed_devs_arr > 0 then
				self:add_message(siteman_utils.ERR_CODES.DEVICE_REMOVED_FROM_GROUP, siteman_utils.ERR_STR.DEVICE_REMOVED_FROM_GROUP,
				"devices", nil, removed_devs_arr)
				end
			self.uci:set(self.config, self.sid, "devices", new_devices)
			self.uci:commit(self.config)
		end

return DeviceGroups
