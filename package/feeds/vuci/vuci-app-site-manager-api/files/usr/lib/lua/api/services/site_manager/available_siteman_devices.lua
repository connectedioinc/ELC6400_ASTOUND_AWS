local ConfigService = require("api/ConfigService")
local siteman_utils = require("api/services/site_manager/siteman_utils")
local p = siteman_utils.API_PATHS
local util = require "vuci.util"
local nixio = require "nixio"
local uci = require "vuci.uci".cursor()

local DEFAULT_PW = "admin01"
local JWT_ALG = "ES384"

local Devices = ConfigService:new({ create = false, delete = false })

function Devices:update_status(devices)
	local update_info = {}

	for mac, dev in pairs(devices) do
		if dev.paired and dev.online then
			local res = siteman_utils:device_api_call({
				mac = mac,
				endpoint = "/firmware/device/updates/status",
				method = "GET"
			})

			local body = res and res.resp_data or {}
			local fw_status_override = nil

			if not body.success and body.errors then
				for _, err in ipairs(body.errors) do
					if err.code == 15 then
						fw_status_override = siteman_utils.FW_UPDATE_STATUS.NO_INTERNET_CONNECTION
						break
					end
				end
			end

			if body.success and body.data and body.data.device then
				local d = body.data.device
				local needs_update = d.version ~= "newest"
				update_info[mac] = {
					latest_available_firmware = needs_update and d.version or nil,
					needs_update = needs_update
				}
			elseif fw_status_override then
				update_info[mac] = {
					status_override = fw_status_override
				}
			end
		end
	end

	return update_info
end

function Devices:empty_check(val)
	return val ~= "" and val or nil
end

function Devices:next_uci_id(cfg)
	local max_id = 0
	uci:foreach(cfg, nil, function(s)
		local id = tonumber(s[".name"])
		if id and id >= max_id then
			max_id = id
		end
	end)
	return tostring(max_id + 1)
end

function Devices:get_group(device_id)
	local group
	self:table_foreach("siteman_groups", "group", function(s)
		if util.contains(s.devices or {}, tostring(device_id)) then
			group = s
			return false -- break
		end
	end)
	return group
end

function Devices:parse_params()
	local params = {
		wireless_devices_status = true,
		wireless_interfaces_status = true,
		device_info = true,
		interfaces_status = true,
		rms_status = true,
		events_log = true,
		device_status = true,
		port_status = true,
		topology = true
	}
	if self.query_parameters and self.query_parameters.data then
		for k in pairs(params) do
			params[k] = false
		end
		for _, v in ipairs(util.split(self.query_parameters.data, ",")) do
			v = string.gsub(v, "%s+", "")
			if params[v] then
				return nil
			end
			params[v] = true
		end
	end

	return params
end

function Devices:before_response_hook()
	if self.request_method == "GET" then return end

	local macs = {}
	for _, v in ipairs(self.response_table[1] and self.response_table or {self.response_table}) do
		macs[#macs+1] = siteman_utils:strip_mac(v.mac)
	end
	if #macs == 0 then return end
end

function Devices:GET_TYPE_status_full()
	local events_log_limit = self.query_parameters.events_log_limit or "5"
	local valid, err = self.dt:uinteger(events_log_limit)
	if not valid then
		self:add_critical_error(STD_CODES.INVALID_QUERY, err, "events_log_limit")
	end

	local devices, err = self:get_devices_status(self.sid)
	if not devices then
		return self:add_critical_error(err.code, err.msg)
	end

	local params = self:parse_params()
	if not params then
		return self:add_critical_error(
			STD_CODES.INVALID_QUERY,
			"Query param 'data' key value is invalid, accepted values: ['wireless_devices_status', 'wireless_interfaces_status', 'device_info', 'interfaces_status', 'rms_status', 'events_log', 'device_status', 'port_status']",
			"data"
		)
	end

	for _, device in ipairs(devices[1] and devices or {devices}) do
		if device.id and device.paired and device.online then
			self:process_device_data(device, params, events_log_limit)
		end
	end

	return self:ResponseOK(devices)
end

function Devices:process_device_data(device, params, events_log_limit)
	local data = {}
	local idx = {}
	local i = 1

	local function insert_data(endpoint, method)
		table.insert(data, { endpoint = endpoint, method = method })
		idx[endpoint] = i
		i = i + 1
	end

	local wifi_dev_status_path = siteman_utils:get_api_path_by_dev_id(p.WIFI_DEV_STATUS, device.id, true)
	local wifi_iface_status_path = siteman_utils:get_api_path_by_dev_id(p.WIFI_IFACE_STATUS, device.id, true)
	local dev_info_path = siteman_utils:get_api_path_by_dev_id(p.DEV_INFO, device.id, true)
	local iface_status_path = siteman_utils:get_api_path_by_dev_id(p.IFACES_STATUS, device.id, true)
	local rms_status_path = siteman_utils:get_api_path_by_dev_id(p.RMS_STATUS, device.id, true)
	local events_log_path = siteman_utils:get_api_path_by_dev_id(p.EVENTS_LOG_LOG, device.id, true) .. "?limit=" .. events_log_limit
	local port_status_path = siteman_utils:get_api_path_by_dev_id(p.PORT_STATUS, device.id, true)
	local dev_status_path = siteman_utils:get_api_path_by_dev_id(p.DEV_STATUS, device.id, true) .. "?data=uptime,uptime_seconds,localtime"
	local topology_path = siteman_utils:get_api_path_by_dev_id(p.TOPOLOGY, device.id, true)

	if params.wireless_devices_status then
		insert_data(wifi_dev_status_path, "GET")
	end

	if params.wireless_interfaces_status then
		insert_data(wifi_iface_status_path, "GET")
	end

	if params.device_info then
		insert_data(dev_info_path, "GET")
	end

	if params.interfaces_status then
		insert_data(iface_status_path, "GET")
	end

	if params.rms_status then
		insert_data(rms_status_path, "GET")
	end

	if params.events_log then
		insert_data(events_log_path, "GET")
	end

	if params.port_status then
		insert_data(port_status_path, "GET")
	end

	if params.device_status then
		insert_data(dev_status_path, "GET")
	end

	if params.topology then
		insert_data(topology_path, "GET")
	end

	local r = siteman_utils:device_api_call({
		mac = device.id,
		data = data,
		endpoint = "/bulk",
		method = "post",
		timeout = "15"
	})

	local body = r.resp_data or {}
	if not body.success then
		return self:add_critical_error(siteman_utils.ERR_CODES.BULK_ERROR, siteman_utils.ERR_STR.BULK_ERROR, "bulk")
	end

	device.wireless_devices_status = params.wireless_devices_status and body.data[idx[wifi_dev_status_path]].data or nil
	device.wireless_interfaces_status = params.wireless_interfaces_status and body.data[idx[wifi_iface_status_path]].data or nil
	device.device_info = params.device_info and body.data[idx[dev_info_path]].data or nil
	device.interfaces_status = params.interfaces_status and body.data[idx[iface_status_path]].data or nil
	device.rms_status = params.rms_status and body.data[idx[rms_status_path]].data or nil
	device.events_log = params.events_log and body.data[idx[events_log_path]].data or nil
	device.device_status = params.device_status and body.data[idx[dev_status_path]].data or nil
	device.port_status = params.port_status and body.data[idx[port_status_path]].data or nil
	device.topology = params.topology and body.data[idx[topology_path]].data or nil

	local function check_error(name)
		if params[name] and not device[name] then
			util.perror("device request failed: " .. name)
		end
	end

	check_error("wireless_devices_status")
	check_error("wireless_interfaces_status")
	check_error("device_info")
	check_error("interfaces_status")
	check_error("rms_status")
	check_error("port_status")
	check_error("topology")
	check_error("events_log")
	check_error("device_status")
end

---@param id_or_mac any
---@return table?
---@return err_obj?
---@return msg_obj?
function Devices:get_devices_status(id_or_mac)
	local devices = {}
	if siteman_utils:devman_enabled() then
		local res_devs = siteman_utils:device_status(nil, true)
		if not res_devs then
			-- Service may not be ready yet, return empty devices silently
			return devices
		else
			for _, dev in ipairs(res_devs) do
				devices[dev.mac] = devices[dev.mac] or { mac = dev.mac }
				local d = devices[dev.mac]
				d.id = dev.mac
				d.platform = dev.platform
				d.hostname = dev.hostname or dev.platform
				d.devicename = dev.name
				d.firmware_version = dev.fw_version
				d.online = dev.connected
				d.device_type = d.device_type or dev.platform
				d.api_version = dev.api_version
				d.syncing = dev.syncing or false
				d.paired = dev.paired
				d.sync_retry_count = dev.sync_retry_count
				d.sync_retry_max = dev.sync_retry_max
				d.sync_next_retry = dev.sync_next_retry
				if dev.fota and dev.fota.status then
					-- Map fota.status to firmware_status
					-- fota.status: 0=unknown, 1=downloading, 2=ready, 3=upgrading, 7=upgrade_timeout (success)
					local upgrading_statuses = {
						[1] = true, -- downloading
						[2] = true, -- ready
						[3] = true, -- upgrading
					}
					local success_statuses = {
						[7] = true, -- upgrade_timeout with percents=100 means success
					}
					
					if upgrading_statuses[dev.fota.status] then
						d.firmware_status = siteman_utils.FW_UPDATE_STATUS.UPGRADING
						d.firmware_download_percentage = dev.fota.percents
						d.firmware_status_str = siteman_utils:get_status_str(siteman_utils.FW_UPDATE_STATUS, d.firmware_status)
					elseif success_statuses[dev.fota.status] and dev.fota.percents == 100 then
						-- Upgrade completed successfully
						d.firmware_status = siteman_utils.FW_UPDATE_STATUS.LATEST_INSTALLED
						d.firmware_status_str = siteman_utils:get_status_str(siteman_utils.FW_UPDATE_STATUS, d.firmware_status)
					end
				end
				if dev.pair then
					d.pair_status = dev.pair.state
					d.pair_status_message = dev.pair.state_str
				end
				d.errors = {}
				if dev.fota and dev.fota.errors then
					for _, err in ipairs(dev.fota.errors) do
						table.insert(d.errors, err)
					end
				end
				for _, job in ipairs(dev.jobs or {}) do
					-- if qos > 0 only collect errors if the job was retried at least once
					-- API errors are always collected because they won't change after retry anyways 
					if job.qos > 0 then
						if job.error and #job.error > 0 then
							if job.retry_count > 0 then
								util.append(d.errors, job.error)
							else
								for _, e in ipairs(job.error) do
									d.errors[#d.errors+1] = e
								end
							end
						end
					elseif job.error and #job.error > 0 then
						util.append(d.errors, job.error)
					end
				end
				d.errors = #d.errors > 0 and d.errors or nil
			end
		end
	end

	local paired = siteman_utils:list_paired()
	for _, device in ipairs(paired) do
		if devices[device.mac] then
			local d = devices[device.mac]
			d.id = device[".name"]
			d.mac = device.mac
			d.hostname = device.hostname or d.hostname
			d.firmware_version = d.firmware_version or device.fw_version
			d.custom_name = device.custom_name
			local group = self:get_group(device[".name"])
			if group then
				d.group_id = group[".name"]
				d.group_name = group.name
			end
		end
	end

	-- Always add firmware_status_str for devices that already have firmware_status from fota
	for _, dev in pairs(devices) do
		if dev.firmware_status then
			dev.firmware_status_str = siteman_utils:get_status_str(siteman_utils.FW_UPDATE_STATUS, dev.firmware_status)
		end
	end

	-- Only check for available updates when not excluded
	if self.query_parameters.exclude_firmware_status ~= "1" and next(devices) then
		local update_status = self:update_status(devices)
		for mac, status in pairs(update_status) do
			-- Don't overwrite if firmware_status is already UPGRADING or LATEST_INSTALLED
			local current_status = devices[mac].firmware_status
			if current_status ~= siteman_utils.FW_UPDATE_STATUS.UPGRADING 
			   and current_status ~= siteman_utils.FW_UPDATE_STATUS.LATEST_INSTALLED then
				if status.status_override then
					devices[mac].firmware_status = status.status_override
				else
					devices[mac].firmware_status = status.needs_update
						and siteman_utils.FW_UPDATE_STATUS.NEEDS_UPDATE
						or siteman_utils.FW_UPDATE_STATUS.LATEST_INSTALLED
				end
			end
			devices[mac].latest_available_firmware = status.latest_available_firmware
		end

		for _, dev in pairs(devices) do
			if not dev.firmware_status and dev.paired then
				dev.firmware_status = siteman_utils.FW_UPDATE_STATUS.NO_INTERNET_CONNECTION
			end

			if not dev.firmware_status then
				dev.firmware_status = siteman_utils.FW_UPDATE_STATUS.UNKNOWN_ERROR
			end
			dev.firmware_status_str = siteman_utils:get_status_str(siteman_utils.FW_UPDATE_STATUS, dev.firmware_status)
		end
	end

	-- TODO: optimize single device getting
	local response = {}
	for _, device in pairs(devices) do
		device.mac = siteman_utils:format_mac_address(device.mac)
		device.online = device.online or false
		
		if id_or_mac then
			if device.mac == siteman_utils:format_mac_address(id_or_mac) or device.id == id_or_mac then
				return device, nil, msg
			end
		end
		table.insert(response, device)
	end

	-- if id_or_mac is not nil and we got here that means device was not found
	if id_or_mac then return nil, siteman_utils:form_error(siteman_utils.ERR_CODES.DEVICE_NOT_FOUND, siteman_utils.ERR_STR.DEVICE_NOT_FOUND) end

	return response, nil, msg
end

function Devices:generate_pw()
	return util.trim(util.exec("cat /proc/sys/kernel/random/uuid | mkpasswd"))
end

function Devices:generate_name(device_name)
	local used_names = {}
	uci:foreach("siteman_devices", "device", function(s)
		if s.custom_name then
			used_names[s.custom_name] = true
		end
	end)

	local new_name = device_name
	local idx = 1
	while true do
		if used_names[new_name] then
			new_name = device_name .. " " .. idx
			idx = idx + 1
		else
			return new_name
		end
	end
end

function Devices:GET_TYPE_status()
	local devices, err, msg = self:get_devices_status(self.sid)
	if msg then
		self:add_message(msg.code, msg.msg)
	end
	if not devices then
		return self:add_critical_error(err.code, err.msg)
	end

	return self:ResponseOK(devices)
end

function Devices:pair()
	local mac = string.gsub(self.arguments.data.mac, ":", "")
	local device = siteman_utils:get_device({mac = mac})
	if not device then return self:add_critical_error(siteman_utils.ERR_CODES.DEVICE_UNREACHABLE, siteman_utils.ERR_STR.DEVICE_UNREACHABLE, "mac", 404) end


	local username = self:empty_check(self.arguments.data.username) or "admin"
	local password = self:empty_check(self.arguments.data.password) or DEFAULT_PW

	local res, err = siteman_utils:devman_ubus("site_manager.device", "pair", { mac = mac, username = username, password = password })
	if err then
		return self:add_critical_error(siteman_utils.ERR_CODES.AUTH_ERROR, siteman_utils.ERR_STR.AUTH_ERROR, "authorization")
	end
	self:periodic_status_check(mac)
end

function Devices:periodic_status_check(mac)
	-- need sleep to not spam ubus and still check status every second
	-- sleep before sometimes pair state is not instantly added
	nixio.nanosleep(1)
	
	-- Skip the heavy get_devices_status which checks firmware updates
	-- Just get the basic device status from ubus directly
	local devices = {}
	if siteman_utils:devman_enabled() then
		local res_devs = siteman_utils:device_status(nil, true)
		if res_devs then
			for _, dev in ipairs(res_devs) do
				if dev.mac == mac then
					local d = { mac = dev.mac }
					d.id = dev.mac
					d.platform = dev.platform
					d.hostname = dev.hostname or dev.platform
					d.firmware_version = dev.fw_version
					d.online = dev.connected
					d.paired = dev.paired
					if dev.pair then
						d.pair_status = dev.pair.state
						d.pair_status_message = dev.pair.state_str
					end
					devices = d
					break
				end
			end
		end
	end
	
	local res_device = devices
	if not res_device or not res_device.mac then
		return self:add_critical_error(siteman_utils.ERR_CODES.DEVICE_NOT_FOUND, siteman_utils.ERR_STR.DEVICE_NOT_FOUND)
	end
	
	if not res_device.pair_status then
		return self:ResponseOK(res_device)
	end
	
	if res_device.pair_status == 2 or res_device.pair_status == 5 then
		return self:add_critical_error(siteman_utils.ERR_CODES.AUTH_ERROR, siteman_utils.ERR_STR.AUTH_ERROR, "authorization")
	elseif res_device.pair_status == 13 then
		return self:add_critical_error(siteman_utils.ERR_CODES.JOB_TIMEOUT, siteman_utils.ERR_STR.JOB_TIMEOUT, "timeout")	
	elseif res_device.pair_status == 14 then
		-- Pairing job completed successfully - return immediately
		return self:ResponseOK(res_device)
	else
		self:periodic_status_check(mac)
	end
end

local pair = Devices:action("pair", Devices.pair)

	local device_mac = pair:option("mac")
		device_mac.require = true
		function device_mac:validate(value)
			return self.dt:macaddr(value)
		end

	local username = pair:option("username")
		function username:validate(value)
			return self.dt:string(value)
		end

	local password = pair:option("password")
		function password:validate(value)
			return self.dt:string(value)
		end

	local custom_name = pair:option("custom_name")
		custom_name.maxlength = 200
		function custom_name:validate(value)
			local ok = true
			uci:foreach(self.config, self.section_type, function(s)
				if siteman_utils:strip_mac(s.mac) ~= siteman_utils:strip_mac(self.arguments.data.mac) and s.custom_name == value then
					ok = false
					return false
				end
			end)
			if not ok then return false, "Name already used." end
			return self.dt:string(value)
		end

	local expiration_time = pair:option("expiration_time")
		expiration_time.maxlength = 11
		function expiration_time:validate(value)
			return self.dt:uinteger(value)
		end

	local group = pair:option("group")
		function group:validate(value)
			local g = {}
			uci:foreach("siteman_groups", "group", function(s)
				table.insert(g, s[".name"])
			end)
			if #g == 0 then return false, "No device groups created" end
			return self.dt:check_array(value, g)
		end

function Devices:unpair()
	local mac = string.gsub(self.arguments.data.mac, ":", "")

	local dev_cfg = siteman_utils:get_device_cfg({ mac = mac })

	if not dev_cfg then
		return self:add_critical_error(siteman_utils.ERR_CODES.DEVICE_NOT_PAIRED, siteman_utils.ERR_STR.DEVICE_NOT_PAIRED, "mac", 404, nil,
			self.arguments.data.mac)
	end

	local res, err = siteman_utils:devman_ubus("site_manager.device", "unpair", { mac = mac })
	if not err then
		return self:ResponseOK({ mac = siteman_utils:format_mac_address(mac) })
	else
		return self:add_critical_error(siteman_utils.ERR_CODES.UNPAIR_FAILED_TO_START, siteman_utils.ERR_STR.UNPAIR_FAILED_TO_START, "mac", 404, nil,
			self.arguments.data.mac)
	end
end

local unpair = Devices:action("unpair", Devices.unpair)

	local mac = unpair:option("mac")
		mac.require = true
		function mac:validate(value)
			return self.dt:macaddr(value)
		end
		
function Devices:reboot()
	local mac = string.gsub(self.arguments.data.mac, ":", "")

	local dev_cfg = siteman_utils:get_device_cfg({ mac = mac })

	if not dev_cfg then
		return self:add_critical_error(siteman_utils.ERR_CODES.DEVICE_NOT_PAIRED, siteman_utils.ERR_STR.DEVICE_NOT_PAIRED, "mac", 404, nil,
			self.arguments.data.mac)
	end

	local _, err = self:get_devices_status(mac)
	if err then util.perror(err.msg) end
	local _, err = siteman_utils:devman_ubus("site_manager.device", "action", { mac = {mac}, action = "reboot", qos = 0 })
	if err then
		return self:add_critical_error(siteman_utils.ERR_CODES.DEVMAN_ERR, siteman_utils.ERR_STR.DEVMAN_ERR)
	end
	return self:ResponseOK({ mac = siteman_utils:format_mac_address(mac) })
end

local reboot = Devices:action("reboot", Devices.reboot)

	local mac_reboot = reboot:option("mac")
		mac_reboot.require = true
		function mac_reboot:validate(value)
			return self.dt:macaddr(value)
		end

function Devices:upgrade_fota()
	local mac = self:empty_check(self.arguments.data.mac)
	local id = self:empty_check(self.arguments.data.id)
	local group = self:empty_check(self.arguments.data.group)

	local count = 0
	if mac then count = count + 1 end
	if id then count = count + 1 end
	if group then count = count + 1 end

	if id then
		for _, v in ipairs(id) do
			local dev = siteman_utils:get_device_cfg({ id = v })
			mac = mac or {}
			mac[#mac+1] = dev.mac
		end
	end
	if mac then
		for _, v in ipairs(mac) do
			local dev = siteman_utils:get_device_cfg({ mac = v })
			id = id or {}
			id = dev[".name"]
		end
	end

	if count > 1 then
		return self:add_critical_error(STD_CODES.INVALID_OPT, "'mac', 'id', or 'group' options can not be used together.")
	end
	if count == 0 then
		return self:add_critical_error(STD_CODES.INVALID_OPT, "One of 'mac', 'id', or 'group' option is required.")
	end

	if not group then
		local devices_to_check = {}
		local mac_list = {}
		for _, v in ipairs(mac) do
			local smac = siteman_utils:strip_mac(v)
			devices_to_check[smac] = { mac = smac }
			table.insert(mac_list, smac)
		end

		local dev_statuses = siteman_utils:device_status(mac_list)
		if dev_statuses then
			for _, d in ipairs(dev_statuses) do
				if devices_to_check[d.mac] then
					devices_to_check[d.mac].paired = d.paired
					devices_to_check[d.mac].online = d.connected
				end
			end
		end

		local status = self:update_status(devices_to_check)
		for i, v in ipairs(mac) do
			local stripped_mac = siteman_utils:strip_mac(v)
			if not status[stripped_mac] or not status[stripped_mac].needs_update then
				return self:add_critical_error(siteman_utils.ERR_CODES.LATEST_FW_ALREADY, siteman_utils.ERR_STR.LATEST_FW_ALREADY,
					"mac", nil, nil, v)
			end
			local dev = siteman_utils:device_status(stripped_mac)
			if not dev then
				return self:add_critical_error(siteman_utils.ERR_CODES.DEVICE_UNREACHABLE, siteman_utils.ERR_STR.DEVICE_UNREACHABLE, nil, "404")
			end
			if dev.fota then
				if dev.fota.process_status == siteman_utils.FOTA_STATUS.FOTA_PROCESS_STARTED
				or dev.fota.process_status == siteman_utils.FOTA_STATUS.FOTA_PROCESS_SUCCEEDED
				or dev.fota.process_status == siteman_utils.FOTA_STATUS.FOTA_PROCESS_DOWNLOADING
				or dev.fota.process_status == siteman_utils.FOTA_STATUS.FOTA_PROCESS_DOWNLOADED
				or dev.fota.process_status == siteman_utils.FOTA_STATUS.FOTA_PROCESS_UPGRADING then
					return self:add_critical_error(siteman_utils.ERR_CODES.FW_UPDATE_ALREADY_STARTED, siteman_utils.ERR_STR.FW_UPDATE_ALREADY_STARTED)
				end
			end
		end
	end

	for i, v in ipairs(mac or {}) do
		mac[i] = siteman_utils:strip_mac(v)
	end

	local _, err = siteman_utils:devman_ubus("site_manager.device", "action", { mac = mac, group = group, action = "fota_upgrade", qos = 0 })
	if err then
		return self:add_critical_error(siteman_utils.ERR_CODES.DEVMAN_ERR, siteman_utils.ERR_STR.DEVMAN_ERR)
	end

	return self:ResponseOK("Firmware upgrade started successfully.")
end

local upgrade_fota = Devices:action("upgrade_fota", Devices.upgrade_fota)

local mac = upgrade_fota:option("mac", { list = true })
	function mac:validate(value)
		local dev = siteman_utils:get_device_cfg({ mac = value })
		if not dev then
			return false, siteman_utils.ERR_STR.DEVICE_NOT_PAIRED, siteman_utils.ERR_CODES.DEVICE_NOT_PAIRED
		else
			return true
		end
	end

local id = upgrade_fota:option("id", { list = true })
	function id:validate(value)
		local dev = siteman_utils:get_device_cfg({ id = value })
		if not dev then
			return false, siteman_utils.ERR_STR.DEVICE_NOT_PAIRED, siteman_utils.ERR_CODES.DEVICE_NOT_PAIRED
		end
		return true
	end

local group = upgrade_fota:option("group")
	function group:validate(value)
		local groups = {}
		uci:foreach("siteman_groups", "group", function(s)
			table.insert(groups, s[".name"])
		end)
		if #groups == 0 then
			return false, "No groups configured."
		end
		return self.dt:check_array(value, groups)
	end

function Devices:clear_errors()
	local macs = self:empty_check(self.arguments.data.mac)

	local macs_stripped = {}
	for _, m in ipairs(macs or {}) do
		table.insert(macs_stripped, siteman_utils:strip_mac(m))
	end

	local _, err = siteman_utils:devman_ubus("site_manager.job", "clean", { mac = macs_stripped })
	if err then
		return self:add_critical_error(siteman_utils.ERR_CODES.DEVMAN_ERR, siteman_utils.ERR_STR.DEVMAN_ERR)
	end

	return self:ResponseOK("Errors cleared successfully.")
end

local clear_errors = Devices:action("clear_errors", Devices.clear_errors)

	local mac = clear_errors:option("mac", { list = true })
		mac.require = true
		function mac:validate(value)
			local dev = siteman_utils:get_device_cfg({ mac = value })
			if not dev then
				return false, siteman_utils.ERR_STR.DEVICE_NOT_PAIRED, siteman_utils.ERR_CODES.DEVICE_NOT_PAIRED
			end
			return true
		end

local function file_exists(name)
	local nixio = require "nixio"
	return nixio.fs.stat(name, "type") == "reg"
end
	
function Devices:download()
	local mac = self:empty_check(self.arguments.data.mac)
	local id = self:empty_check(self.arguments.data.id)
	local file_type = self:empty_check(self.arguments.data.type)

	if not mac and not id then
		return self:add_critical_error(STD_CODES.INVALID_OPT, "'id' or 'mac' option is required.")
	end
	if mac and id then
		return self:add_critical_error(STD_CODES.INVALID_OPT, "'id' and 'mac' options can not be used together at the same time.")
	end

	local id_or_mac = id or mac

	local api_version = siteman_utils:get_device_api_version(id_or_mac)
	if not api_version then
		return self:add_critical_error(siteman_utils.ERR_CODES.DEVICE_UNREACHABLE, siteman_utils.ERR_STR.DEVICE_UNREACHABLE)
	end
	local res = siteman_utils:devman_ubus("site_manager.device", "action", { mac = {id}, action = "troubleshoot" })
	if res then
		local folder_path = "/tmp"
		local file_name = "troubleshoot_" .. id .. ".tar.gz"
		while true do
			if file_exists(folder_path .. "/" .. file_name) then
				return self:File("/tmp/troubleshoot_" .. id .. ".tar.gz", "troubleshoot.tar.gz")
			end
			nixio.nanosleep(1)
		end
	end
end


local download = Devices:action("download", Devices.download)

	local opt_type = download:option("type")
		opt_type.require = true
		function opt_type:validate(value)
			return self.dt:check_array(value, { "troubleshoot" }) -- only troubleshoot for now
		end

	local mac = download:option("mac")
		function mac:validate(value)
			local dev = siteman_utils:get_device_cfg({ mac = value })
			if not dev then
				return false, siteman_utils.ERR_STR.DEVICE_NOT_PAIRED, siteman_utils.ERR_CODES.DEVICE_NOT_PAIRED
			end
			return true
		end

	local id = download:option("id")
		function id:validate(value)
			local dev = siteman_utils:get_device_cfg({ id = value })
			if not dev then
				return false, siteman_utils.ERR_STR.DEVICE_NOT_PAIRED, siteman_utils.ERR_CODES.DEVICE_NOT_PAIRED
			end
			return true
		end

local s = Devices:section("siteman_devices", "device")

function s:filter(section)
	local res_devs = siteman_utils:device_status(nil, true)
	if not res_devs then
		-- Service may not be ready yet, return false silently
		return false
	else
		for _, dev in ipairs(res_devs) do
			if section.mac == dev.mac then
				return true
			end
		end
	end
	return false
end

	local custom_name = s:option("custom_name")
		custom_name.cfg_require = true
		custom_name.maxlength = 200
		function custom_name:validate(value)
			local ok, err = siteman_utils:validate_duplicate(self, self.api_key, value)
			if not ok then return ok, err end
			return self.dt:string(value)
		end

	local sync_ntp = s:option("sync_ntp")
		function sync_ntp:validate(value)
			return self.dt:is_bool(value)
		end
	local group_id = s:option("group_id")
		group_id.readonly = true
		function group_id:get()
			local group = self:get_group(self.sid)
			if group then
				return group[".name"]
			end
			return 'none'
		end

	local group_name = s:option("group_name")
		group_name.readonly = true
		function group_name:get()
			local group = self:get_group(self.sid)
			if group then
				return group.name
			end
		end

	local mac = s:option("mac")
		mac.readonly = true
		function mac:get(value)
			return value and siteman_utils:format_mac_address(value) or nil
		end

	local devicename = s:option("devicename")

	local hostname = s:option("hostname")
		function hostname:validate(value)
			return self.dt:host(value)
		end

local api_action = Devices:action("api", function(self, data)
	if data.method and string.upper(data.method) == "PUT" and not data.data then
		self:add_error(self.dt.ERR_CODES.INVALID_OPT, "Data option is required for PUT method", "data")
		self:return_if_error()
	end

	if data.mac then
		data.mac = siteman_utils:strip_mac(data.mac)
	end

	local res = util.ubus("site_manager.device", "api", data)
	if res then
		self:ResponseOK(res)
	else
		self:add_critical_error(siteman_utils.ERR_CODES.CURL_ERROR, "Internal API call failed")
	end
end)

local mac = api_action:option("mac")
mac.require = true
function mac:validate(value)
	return self.dt:macaddr(value)
end

local endpoint = api_action:option("endpoint")
endpoint.require = true

local method = api_action:option("method")
method.require = true
function method:validate(value)
	local methods = { GET = true, POST = true, PUT = true, DELETE = true }
	if methods[string.upper(value)] then
		return true
	end
	return false, "Invalid method"
end

local timeout = api_action:option("timeout")
function timeout:validate(value)
	return self.dt:integer(value)
end

local data = api_action:option("data")

return Devices