local uci = require "vuci.uci".cursor()
local util = require "vuci.util"
local json = require "luci.jsonc"
local fs = require "nixio.fs"
local nixio = require "nixio"
require "uloop"
require "ubus"

---@alias device_props { mac: string, jwt: string, id: string } Properties which are used to find the device

---@class err_obj
---@field code number Error code
---@field msg string Error msg
---@field http_code number? HTTP code

---@class msg_obj
---@field code number Message code
---@field msg string Message msg

---@class mdns_scan_entry
---@field mac string
---@field port number
---@field name string Service name (e.g. TAP200._https._tcp.local)
---@field hostname string
---@field target string e.g. (TAP200.local)
---@field ipv6 string[] List of IPv6 addresses
---@field ip string[] List of IPv4 addresses
---@field duplicated boolean Device is duplicated. It means that multiple devices with the same MAC address exist.
---@field gateway boolean Device has controller as gateway.
---@field type string Device's type e.g. "TAP100"

---@class job_status
---@field device string device MAC
---@field status_str string
---@field status JOB_STATUS
---@field uuid string job's uuid
---@field qos number
---@field delay number
---@field error {}[] error array

local siteman_utils = {
	PROTO = "https://",
	CERT_FILE = "/etc/ssl/certs/tlt-pairing.crt",
	REQUEST_TIMEOUT = 30
}

local ERR_CODES = {
	MDNS_ERR = 1,
	DUPLICATE_MAC = 2,
	DEVICE_NOT_FOUND = 3,
	CERTIFICATE_INVALID = 4,
	DEVICE_UNREACHABLE = 5,
	DEVICE_NOT_PAIRED = 6,
	CURL_ERROR = 7,
	USER_NOT_FOUND = 8,
	NEW_PW_NEEDED = 9,
	PW_DOESNT_MATCH = 10,
	BULK_ERROR = 11,
	AUTH_ERROR = 12,
	DEVMAN_ERR = 13,
	REQUEST_FAILED = 14,
	OLD_DEVICE_FOR_GROUP = 15,
	DEVICE_BLOCKED = 16,
	OLD_DEVICE = 17,
	FW_UPGRADE_FAILED = 18,
	DEV_LOCKED = 19,
	LATEST_FW_ALREADY = 20,
	SYNC_FAILED = 21,
	ID_FILE_TYPE_REQUIRED = 22,
	INVALID_FILE_TYPE = 23,
	TROUBLESHOOT_FAILED = 24,
	DEVICE_REMOVED_FROM_GROUP = 25,
	FW_UPDATE_ALREADY_STARTED = 26,
	JOB_TIMEOUT = 27,
	UNPAIR_FAILED_TO_START = 28,
}
local ERR_STR = {
	MDNS_ERR = "mdns-scan error.",
	DUPLICATE_MAC = "Warning: duplicate MAC detected. Someone might be trying to impersonate a device.",
	DEVICE_NOT_FOUND = "Device with the provided MAC or ID was not found.",
	CERTIFICATE_INVALID = "AP device's certificate changed - someone might be trying to impersonate the device. Ensure that you trust this device and re-pair it.",
	DEVICE_UNREACHABLE = "Device is unreachable or doesn't exist.",
	DEVICE_NOT_PAIRED = "Device is not paired.",
	CURL_ERROR = "Unexpected curl error. Check curl_code for more information.",
	USER_NOT_FOUND = "User with the selected username not found.",
	NEW_PW_NEEDED = "New password is needed. Please setup new password (use 'password_change' and 'password_change_confirm' options).",
	PW_DOESNT_MATCH = "Passwords do not match ('password_change' and 'password_change_confirm' options).",
	BULK_ERROR = "Bulk request error.",
	AUTH_ERROR = "Device returned authorization error.",
	DEVMAN_ERR = "Site manager daemon error.",
	REQUEST_FAILED = "Device request failed.",
	OLD_DEVICE_FOR_GROUP = "Device's firmware doesn't support groups. Please pair the device without adding it to a group and update it's firmware.",
	DEVICE_BLOCKED = "Access to this device is currently restricted, possibly due to repeated incorrect authentication attempts or there may be a connectivity issue. Please ensure your device is connected to the network and try again later. Reset the device if needed.",
	OLD_DEVICE = "Device's firmware does not support this functionality. Please update the device's firmware.",
	FW_UPGRADE_FAILED = "Firmware ugrade failed. Please ensure that the device has internet connection.",
	DEV_LOCKED = "Device is locked - it's configuration can not be synced. Unlock the device and try again.",
	LATEST_FW_ALREADY = "Device already has the latest firmware installed.",
	SYNC_FAILED = "Configuration synchronization failed.",
	ID_FILE_TYPE_REQUIRED = "Device's ID and file_type is required.",
	INVALID_FILE_TYPE = "Invalid file type. Available file types: ['troubleshoot']",
	TROUBLESHOOT_FAILED = "Troubleshoot request failed.",
	DEVICE_REMOVED_FROM_GROUP = "Devices were removed from other groups.",
	FW_UPDATE_ALREADY_STARTED = "Firmware upgrade is already started.",
	JOB_TIMEOUT = "Site manager job timed out.",
	UNPAIR_FAILED_TO_START = "Device unpair failed to start.",
}

local DEV_STATE = {
	UNKNOWN = 0,
	OFFLINE = 1,
	ONLINE = 2,
	INITIALIZING = 5,
	SYNCING = 6,
}

---@enum JOB_STATUS
local JOB_STATUS = {
	JOB_PENDING = 0,
	JOB_ERROR = 1,
	JOB_FINISHED = 2,
	JOB_IN_PROGRESS = 3
}

local FW_UPDATE_STATUS = {
	LATEST_INSTALLED = 0,
	NEEDS_UPDATE = 1,
	NO_INTERNET_CONNECTION = 2,
	UPGRADING = 3,
  UNKNOWN_ERROR = 4,
	NO_UPDATE_AVAILABLE = 7
}

local FOTA_STATUS = {
	FOTA_PROCESS_IDLE = 0,
	FOTA_PROCESS_STARTED = 1,
	FOTA_PROCESS_FAILED = 2,
	FOTA_PROCESS_SUCCEEDED = 3,
	FOTA_PROCESS_UPGRADING = 4,
	FOTA_PROCESS_DOWNLOADING = 5,
	FOTA_PROCESS_DOWNLOADED = 6,
}

local JOB_ERR = {
	OK = 0,
	JWT = 1,
	HANDLER = 2,
	API = 3,
	UNKNOWN = 4,
	MAX = 5,
}

---@enum API_PATHS
local API_PATHS = {
	REFRESH = 1,
	JWT_LOGIN = 2,
	USERS_CFG = 3,
	WIFI_DEV_STATUS = 4,
	WIFI_IFACE_STATUS = 5,
	BULK = 6,
	DEV_INFO = 7,
	PORT_STATUS = 8,
	ADMIN_SYS_CFG_GENERAL = 9,
	EVENTS_LOG_LOG = 10,
	IFACES_STATUS = 11,
	RMS_STATUS = 12,
	WIFI_DEV_CONFIG = 13,
	IFACES_CONFIG = 14,
	DEV_STATUS = 15,
	INFO = 16,
	GENERATE_TROUBLESHOOT = 17,
	DOWNLOAD_TROUBLESHOOT = 18,
	CHANGE_PW_HASH = 19,
	AC_WEBUI_GENERAL = 20,
	AC_SSH_GENERAL = 21,
	FIRSTBOOT = 22,
	TOPOLOGY = 23,
}

-- API paths are described for each version. If path is unchanged, a reference to the previous path is used.
local _api_paths_str = {}
_api_paths_str["0.1"] = {
	[API_PATHS.REFRESH] =                       "/refresh",
	[API_PATHS.JWT_LOGIN] =                     "/jwt_login",
	[API_PATHS.USERS_CFG] =                     "/system/users/config/",
	[API_PATHS.WIFI_DEV_STATUS] =               "/network/wireless/devices/status/",
	[API_PATHS.WIFI_IFACE_STATUS] =             "/network/wireless/interfaces/status/",
	[API_PATHS.BULK] =                          "/bulk",
	[API_PATHS.DEV_INFO] =                      "/system/device/info",
	[API_PATHS.PORT_STATUS] = 									"/ports_settings/status",
	[API_PATHS.ADMIN_SYS_CFG_GENERAL] =         "/system/administration/system/config/general",
	[API_PATHS.EVENTS_LOG_LOG] =                "/status/events_log/log/",
	[API_PATHS.IFACES_STATUS] =                 "/network/interfaces/status/",
	[API_PATHS.RMS_STATUS] =                    "/services/cloud_solutions/rms/status/",
	[API_PATHS.WIFI_DEV_CONFIG] =               "/network/wireless/devices/config/",
	[API_PATHS.IFACES_CONFIG] =                 "/network/interfaces/config/",
	[API_PATHS.DEV_STATUS] =                    "/system/device/status",
	[API_PATHS.INFO] =                          "/info",
	[API_PATHS.GENERATE_TROUBLESHOOT] =         "/system/troubleshoot/actions/generate_troubleshoot",
	[API_PATHS.DOWNLOAD_TROUBLESHOOT] =         "/system/troubleshoot/files/troubleshoot",
	[API_PATHS.CHANGE_PW_HASH] =                nil,
	[API_PATHS.AC_WEBUI_GENERAL] =              "/system/access_control/webui/config/general",
	[API_PATHS.AC_SSH_GENERAL] =                "/system/access_control/ssh/config/general",
	[API_PATHS.FIRSTBOOT] =                     "/system/firmware/actions/factory_reset",
}
_api_paths_str["0.2"] = {
	[API_PATHS.REFRESH] =                       _api_paths_str["0.1"][API_PATHS.REFRESH],
	[API_PATHS.JWT_LOGIN] =                     _api_paths_str["0.1"][API_PATHS.JWT_LOGIN],
	[API_PATHS.USERS_CFG] =                     "/users/config/",
	[API_PATHS.WIFI_DEV_STATUS] =               "/wireless/devices/status/",
	[API_PATHS.WIFI_IFACE_STATUS] =             "/wireless/interfaces/status/",
	[API_PATHS.BULK] =                          _api_paths_str["0.1"][API_PATHS.BULK],
	[API_PATHS.DEV_INFO] = 											"/device/info",
	[API_PATHS.PORT_STATUS] = 									"/ports_settings/status",
	[API_PATHS.ADMIN_SYS_CFG_GENERAL] =         "/administration/system/config/general",
	[API_PATHS.EVENTS_LOG_LOG] =                "/events_log/log/",
	[API_PATHS.IFACES_STATUS] =                 "/interfaces/basic/status/",
	[API_PATHS.RMS_STATUS] =                    "/cloud_solutions/rms/status/",
	[API_PATHS.WIFI_DEV_CONFIG] =               "/wireless/devices/config/",
	[API_PATHS.IFACES_CONFIG] =                 "/interfaces/config/",
	[API_PATHS.DEV_STATUS] =                    "/device/status",
	[API_PATHS.INFO] =                          _api_paths_str["0.1"][API_PATHS.INFO],
	[API_PATHS.GENERATE_TROUBLESHOOT] =         "/troubleshoot/actions/generate_troubleshoot",
	[API_PATHS.DOWNLOAD_TROUBLESHOOT] =         "/troubleshoot/files/troubleshoot",
	[API_PATHS.CHANGE_PW_HASH] =                nil,
	[API_PATHS.AC_WEBUI_GENERAL] =              "/access_control/webui/config/general",
	[API_PATHS.AC_SSH_GENERAL] =                "/access_control/ssh/config/general",
	[API_PATHS.FIRSTBOOT] =                     "/firmware/actions/factory_reset",
}
_api_paths_str["0.3"] = {
	[API_PATHS.REFRESH] =                       _api_paths_str["0.2"][API_PATHS.REFRESH],
	[API_PATHS.JWT_LOGIN] =                     _api_paths_str["0.2"][API_PATHS.JWT_LOGIN],
	[API_PATHS.USERS_CFG] =                     _api_paths_str["0.2"][API_PATHS.USERS_CFG],
	[API_PATHS.WIFI_DEV_STATUS] =               _api_paths_str["0.2"][API_PATHS.WIFI_DEV_STATUS],
	[API_PATHS.WIFI_IFACE_STATUS] =             _api_paths_str["0.2"][API_PATHS.WIFI_IFACE_STATUS],
	[API_PATHS.BULK] =                          _api_paths_str["0.2"][API_PATHS.BULK],
	[API_PATHS.DEV_INFO] =                      "/system/device/status",
	[API_PATHS.PORT_STATUS] =                   _api_paths_str["0.2"][API_PATHS.PORT_STATUS],
	[API_PATHS.ADMIN_SYS_CFG_GENERAL] =         "/system/config/general",
	[API_PATHS.EVENTS_LOG_LOG] =                _api_paths_str["0.2"][API_PATHS.EVENTS_LOG_LOG],
	[API_PATHS.IFACES_STATUS] =                 _api_paths_str["0.2"][API_PATHS.IFACES_STATUS],
	[API_PATHS.RMS_STATUS] =                    "/rms/status",
	[API_PATHS.WIFI_DEV_CONFIG] =               _api_paths_str["0.2"][API_PATHS.WIFI_DEV_CONFIG],
	[API_PATHS.IFACES_CONFIG] =                 _api_paths_str["0.2"][API_PATHS.IFACES_CONFIG],
	[API_PATHS.DEV_STATUS] =                    "/system/device/usage/status",
	[API_PATHS.INFO] =                          "/unauthorized/status",
	[API_PATHS.GENERATE_TROUBLESHOOT] =         "/troubleshoot/actions/generate",
	[API_PATHS.DOWNLOAD_TROUBLESHOOT] =         "/troubleshoot/actions/download",
	[API_PATHS.CHANGE_PW_HASH] =                "/system/actions/change_password_hash",
	[API_PATHS.AC_WEBUI_GENERAL] =              _api_paths_str["0.2"][API_PATHS.AC_WEBUI_GENERAL],
	[API_PATHS.AC_SSH_GENERAL] =                _api_paths_str["0.2"][API_PATHS.AC_SSH_GENERAL],
	[API_PATHS.FIRSTBOOT] =                     _api_paths_str["0.2"][API_PATHS.FIRSTBOOT],
}
_api_paths_str["1.0"] = {
	[API_PATHS.REFRESH] =                       _api_paths_str["0.3"][API_PATHS.REFRESH],
	[API_PATHS.JWT_LOGIN] =                     _api_paths_str["0.3"][API_PATHS.JWT_LOGIN],
	[API_PATHS.USERS_CFG] =                     _api_paths_str["0.3"][API_PATHS.USERS_CFG],
	[API_PATHS.WIFI_DEV_STATUS] =               _api_paths_str["0.3"][API_PATHS.WIFI_DEV_STATUS],
	[API_PATHS.WIFI_IFACE_STATUS] =             _api_paths_str["0.3"][API_PATHS.WIFI_IFACE_STATUS],
	[API_PATHS.BULK] =                          _api_paths_str["0.3"][API_PATHS.BULK],
	[API_PATHS.DEV_INFO] =                      _api_paths_str["0.3"][API_PATHS.DEV_INFO],
	[API_PATHS.PORT_STATUS] =                   _api_paths_str["0.3"][API_PATHS.PORT_STATUS],
	[API_PATHS.ADMIN_SYS_CFG_GENERAL] =         _api_paths_str["0.3"][API_PATHS.ADMIN_SYS_CFG_GENERAL],
	[API_PATHS.EVENTS_LOG_LOG] =                _api_paths_str["0.3"][API_PATHS.EVENTS_LOG_LOG],
	[API_PATHS.IFACES_STATUS] =                 _api_paths_str["0.3"][API_PATHS.IFACES_STATUS],
	[API_PATHS.RMS_STATUS] =                    _api_paths_str["0.3"][API_PATHS.RMS_STATUS],
	[API_PATHS.WIFI_DEV_CONFIG] =               _api_paths_str["0.3"][API_PATHS.WIFI_DEV_CONFIG],
	[API_PATHS.IFACES_CONFIG] =                 _api_paths_str["0.3"][API_PATHS.IFACES_CONFIG],
	[API_PATHS.DEV_STATUS] =                    _api_paths_str["0.3"][API_PATHS.DEV_STATUS],
	[API_PATHS.INFO] =                          _api_paths_str["0.3"][API_PATHS.INFO],
	[API_PATHS.GENERATE_TROUBLESHOOT] =         _api_paths_str["0.3"][API_PATHS.GENERATE_TROUBLESHOOT],
	[API_PATHS.DOWNLOAD_TROUBLESHOOT] =         _api_paths_str["0.3"][API_PATHS.DOWNLOAD_TROUBLESHOOT],
	[API_PATHS.CHANGE_PW_HASH] =                _api_paths_str["0.3"][API_PATHS.CHANGE_PW_HASH],
	[API_PATHS.AC_WEBUI_GENERAL] =              _api_paths_str["0.3"][API_PATHS.AC_WEBUI_GENERAL],
	[API_PATHS.AC_SSH_GENERAL] =                _api_paths_str["0.3"][API_PATHS.AC_SSH_GENERAL],
	[API_PATHS.FIRSTBOOT] =                     _api_paths_str["0.3"][API_PATHS.FIRSTBOOT],
	[API_PATHS.TOPOLOGY] =                      "/topology/active/status"
}

--- Configs which use dm_device_id and dm_group_id options
local DEVMAN_CONFIGS = {
	{ cfg = "siteman_periodic_reboot", stype = "reboot_instance" },
	{ cfg = "siteman_ping_reboot", stype = "ping_reboot" },
	{ cfg = "siteman_wireless", stype = "wifi-iface" }
}

--- Warning: must be sorted in descending numeric order! (used for highest available version finding)
local api_versions_str = {"1.0", "1", "0.3", "0.2", "0.1"}

siteman_utils.api_versions_str = api_versions_str
siteman_utils.ERR_CODES = ERR_CODES
siteman_utils.ERR_STR = ERR_STR
siteman_utils.API_PATHS = API_PATHS
siteman_utils.JOB_STATUS = JOB_STATUS
siteman_utils.FW_UPDATE_STATUS = FW_UPDATE_STATUS
siteman_utils.FOTA_STATUS = FOTA_STATUS
siteman_utils.DEV_STATE = DEV_STATE
siteman_utils.JOB_ERR = JOB_ERR


function siteman_utils:get_status_str(codes_table, code)
	for key, value in pairs(codes_table) do
		if value == code then
			return key
		end
	end
end

---Forms error object for convenience
---@param err_code number
---@param err_str string
---@param http_code number?
---@return err_obj err
function siteman_utils:form_error(err_code, err_str, http_code)
	return { code = err_code, msg = err_str, http_code = http_code }
end

---Returns true if api_version is considered old (that means it doesn't support full functionality)
---@param api_version string
---@return boolean
function siteman_utils:old_version(api_version)
	local latest_version = api_versions_str[1]
	api_version = siteman_utils:_get_api_version(api_version)
	return api_version ~= latest_version
end

---Returns api version or throws error if it doesn't exist
---@param api_version string
function siteman_utils:_get_api_version(api_version)
	local valid_versions = {
		["1"] = true,
		["0.3"] = true,
		["0.2"] = true,
		["0.1"] = true
	}

	if not valid_versions[api_version] then
		return "1.0"
	end

	return api_version
end

---Returns api path based on api version
---@param api_path API_PATHS
---@param api_version "0.1"|"0.2"|"0.3"|"1.1"
---@param no_prefix boolean? if true doesn't add /api prefix
---@return string
function siteman_utils:get_api_path(api_path, api_version, no_prefix)
	api_version = self:_get_api_version(api_version)
	if type(api_version) == "number" then
		api_version = tostring(api_version)
	end
	local path = _api_paths_str[api_version][api_path]
	if not path then
		error("invalid api path (%s)" % tostring(api_path))
	end
	if no_prefix then
		return path
	else
		return "/api" .. path
	end
end

---Returns device's api path based on api version
---@param api_path API_PATHS
---@param dev_mac_or_id string Device's ID or MAC
---@param no_prefix boolean? if true doesn't add /api prefix
---@return string
function siteman_utils:get_api_path_by_dev_id(api_path, dev_mac_or_id, no_prefix)
	local api_version = siteman_utils:get_device_api_version(dev_mac_or_id)
	return self:get_api_path(api_path, api_version, no_prefix)
end

function siteman_utils:devman_enabled()
	return uci:get("siteman", "general", "enabled") == "1"
end

function siteman_utils:list_paired()
	local ap_list = {}
	uci:foreach("siteman_devices", "device", function(dev)
		if dev.mac then
			table.insert(ap_list, dev)
		end
	end)
	return ap_list
end

---@param flags device_props
---@return table?
function siteman_utils:get_device_cfg(flags)
	local keys = {".name", "mac", "jwt", "id"}
	flags[".name"] = flags[".name"] or flags.id
	for _, ap in ipairs(self:list_paired()) do
		for key in pairs(flags) do
			if flags[key] then
				local val1 = ap[key]
				local val2 = flags[key]
				if key == "mac" then
					val1 = self:strip_mac(ap[key])
					val2 = self:strip_mac(flags[key])
				end
				if val1 == val2 then
					return ap
				end
			end
		end
	end
end

---@param flags device_props
function siteman_utils:mac_from_flags(flags)
	if flags.mac and (#flags.mac == 12 or #flags.mac == 17) then return flags.mac end
	local device = self:get_device_cfg(flags)
	if not device then return nil end
	return device.mac
end

---Returns device's IPv4 using mdns scan
---@param flags device_props
function siteman_utils:get_device_ip(flags)
	-- temp theres a chance that i wont need this function at all in the future
	return nil
	-- local device = self:get_device(flags)
	-- return device and device.ip[#device.ip] or nil
end

---@param flags device_props
function siteman_utils:get_device(flags)
	local mac = self:mac_from_flags(flags)
	local device_status = self:device_status()
	for _, device in ipairs(device_status or {}) do
		if self:strip_mac(device.mac) == self:strip_mac(mac) then
			return device
		end
	end
	return nil
end

---Removes ":" from string
function siteman_utils:strip_mac(mac)
	return mac and string.gsub(mac, ":", "") or nil
end

---Adds ":" between every 2 chars
function siteman_utils:format_mac_address(mac)
	if mac:match(":") then
		return mac
	end
	local formatted_mac = ""
	for aa in mac:gmatch("..") do
		formatted_mac = formatted_mac .. aa .. ":"
	end
	formatted_mac = formatted_mac:sub(1, #formatted_mac - 1)
	return formatted_mac
end

function siteman_utils:device_api_call(params)
	local r, e = util.ubus("site_manager.device", "api", params)
	return r
end

---Convenient wrapper to handle jwt errors
---@param endpoint any
---@param res any
---@param err_obj err_obj?
---@return nil
function siteman_utils:check_request_errors(endpoint, res, err_obj)
	if err_obj then
		return endpoint:add_critical_error(err_obj.code, err_obj.msg, "authorization", err_obj.http_code)
	end
	if res.curl_code ~= curl.CODES.CURLE_OK then
		return endpoint:add_critical_error(ERR_CODES.CURL_ERROR,
			ERR_STR.CURL_ERROR .. (" (curl_code = %s)" % res.curl_code), "curl")
	end
	local body = res.body and json.parse(res.body) or res.body
	if type(body) == "table" and not body.success and body.errors[1].code == STD_CODES.INVALID_TOKEN then
		return endpoint:add_critical_error(ERR_CODES.AUTH_ERROR, ERR_STR.AUTH_ERROR, "authorization")
	end
end

function siteman_utils:wrap_endpoint_sync_logic(endpoint)
	function endpoint:get_devices_groups_to_sync(config, sid)
		self.dm_groups = self.dm_groups or {}
		self.dm_devices = self.dm_devices or {}
		local group_id = self:table_get(config, sid, "dm_group_id")
		local devices_id = self:table_get(config, sid, "dm_device_id")
		if group_id then
			self.dm_groups[group_id] = true
		else
			-- devices_id can be string or array
			for _, dev_id in ipairs((devices_id or {})[1] and devices_id or {devices_id}) do
				self.dm_devices[dev_id] = true
			end
		end
	end

	endpoint.DELETE_before_section_delete_hook_orig = endpoint.DELETE_before_section_delete_hook
	function endpoint:DELETE_before_section_delete_hook(...)
		self:get_devices_groups_to_sync(self.config, self.sid)
		self:DELETE_before_section_delete_hook_orig(...)
	end
	endpoint.PUT_after_data_hook_orig = endpoint.PUT_after_data_hook
	function endpoint:PUT_after_data_hook(...)
		self:get_devices_groups_to_sync(self.config, self.sid)
		self:PUT_after_data_hook_orig(...)
	end
	endpoint.POST_after_data_hook_orig = endpoint.POST_after_data_hook
	function endpoint:POST_after_data_hook(...)
		self:get_devices_groups_to_sync(self.config, self.sid)
		self:POST_after_data_hook_orig(...)
	end

	endpoint.before_response_hook_orig = endpoint.before_response_hook
	function endpoint:before_response_hook()
		self:before_response_hook_orig()
	end
end

---Adds all needed Site manager options, functions and logic for an existing endpoint
---@param endpoint any
---@return table endpoint Returns wrapped endpoint
function siteman_utils:wrap_endpoint(endpoint)

	function endpoint:require_devman_options()
		local devices = self:get_abs_value(self.main_config, self.sid, "dm_device_id")
		local group = self:get_abs_value(self.main_config, self.sid, "dm_group_id")
		local devices_present = devices and #devices ~= 0
		local group_present = group and #group ~= 0
		if devices_present and group_present then
			self:add_error(STD_CODES.INVALID_OPT, "'dm_device_id' or 'dm_group_id' option is required (can not use both at the same time)")
		end
	end
	endpoint.PUT_validate_section_hook_orig = endpoint.PUT_validate_section_hook
	endpoint.POST_validate_section_hook_orig = endpoint.POST_validate_section_hook
	function endpoint:PUT_validate_section_hook()
		self:require_devman_options()
		self:PUT_validate_section_hook_orig()
	end
	function endpoint:POST_validate_section_hook()
		self:require_devman_options()
		self:POST_validate_section_hook_orig()
	end

	self:wrap_endpoint_sync_logic(endpoint)

	local s = endpoint.sections[1]

		local opt_group = s:option("dm_group_id")
			function opt_group:validate(value)
				local groups = {}
				self:table_foreach("siteman_groups", "group", function(s)
					table.insert(groups, s[".name"])
				end)
				if #groups == 0 then return false, "No groups configured" end
				return self.dt:check_array(value, groups)
			end

		local opt_devices = s:option("dm_device_id", { list = true })
			function opt_devices:validate(value)
				local devices = {}
				self:table_foreach("siteman_devices", "device", function(s)
					table.insert(devices, s[".name"])
				end)
				if #devices == 0 then return false, "No devices paired" end
				local ok, err = self.dt:check_array(value, devices)
				if not ok then return false, err end

				local api_version = siteman_utils:get_device_api_version(value)
				if not api_version or siteman_utils:old_version(api_version) then -- old devices can't be added to group
					return false, "This device does not support synchronization. Please update it's firmware.", siteman_utils.ERR_CODES.OLD_DEVICE
				end
				return true
			end

	return endpoint
end

function siteman_utils:remove_group_from_configs(endpoint, group_id)
	for _, c in ipairs(DEVMAN_CONFIGS) do
		endpoint:table_foreach(c.cfg, c.stype, function(s)
			if s.dm_group_id == group_id then
				endpoint:table_set(c.cfg, s[".name"], "dm_group_id", "")
			end
		end)
	end
end

---Same as ubus, but waits 5 second for ubus object to come up, because devman often reloads after commit
function siteman_utils:devman_ubus(object, method, data, timeout)
	if not siteman_utils:devman_enabled() then
		uci:set("siteman", "general", "enabled", "1")
		uci:commit("siteman")
	end
	
	-- Check if ubus object exists first to avoid permission errors during startup
	local check = util.ubus(object)
	if not check then
		-- Object doesn't exist yet, wait for it
		util.exec("ubus -t 5 wait_for " .. util.shellquote(object) .. " 2>/dev/null")
	end
	
	local a, err, c, d, e = util.ubus(object, method, data, timeout)
	if err then
		-- Service not ready, wait for it and retry
		util.exec("ubus -t 5 wait_for " .. util.shellquote(object) .. " 2>/dev/null")
		return util.ubus(object, method, data, timeout)
	end
	return a, err, c, d, e
end

function siteman_utils:validate_duplicate(endpoint, opt_name, value)
	local ok = true
	endpoint:table_foreach(endpoint.config, endpoint.section_type, function(s)
		if s[".name"] ~= endpoint.sid and s[opt_name] == value then
			ok = false
			return false
		end
	end)
	if not ok then return false, "Name already used." end
	return true
end

---Polls job ubus status and returns it when finished 
---@param job_uuid string
---@param timeout number? Timeout in seconds
---@param verbose boolean?
---@return boolean|job_status
---@return err_obj?
function siteman_utils:job_status(job_uuid, timeout, verbose)
	timeout = timeout or math.huge
	while timeout > 0 do
		local res = siteman_utils:devman_ubus("site_manager.job", "status", { uuid = job_uuid, verbose = verbose })
		if not res or not res.jobs or #res.jobs == 0 then
			util.perror("site_manager error: empty job array")
			return false, siteman_utils:form_error(siteman_utils.ERR_CODES.DEVMAN_ERR, siteman_utils.ERR_STR.DEVMAN_ERR)
		end

		for _, job in ipairs(res.jobs) do
			local j = siteman_utils.JOB_STATUS
			if job.status == j.JOB_ERROR then
				util.perror("site_manager job error (%s)" % j.uuid)
				return false, siteman_utils:form_error(siteman_utils.ERR_CODES.DEVMAN_ERR, siteman_utils.ERR_STR.DEVMAN_ERR .. " (job error)")
			end

			if job.status ~= j.JOB_IN_PROGRESS and job.status ~= j.JOB_PENDING then
				if not job.error or #job.error == 0 then
					return job
				end
				for _, err in ipairs(job.error) do
					local dev_cfg = siteman_utils:get_device_cfg({ mac = job.device })
					err.device_mac = siteman_utils:format_mac_address(job.device)
					err.device_id = dev_cfg[".name"]
					err.device_name = dev_cfg.custom_name
				end
				return job
			end
		end
		nixio.nanosleep(1)
		timeout = timeout - 1
	end
	return false, siteman_utils:form_error(siteman_utils.ERR_CODES.JOB_TIMEOUT, siteman_utils.ERR_STR.JOB_TIMEOUT)
end

---Wrapper for `ubus call site_manager.device status`
---@param id_or_mac string[]|string|nil ID or MAC string or array. If nil, all devices status is returned.
---@return table?
---@return err_obj?
function siteman_utils:device_status(id_or_mac, verbose)
	local single_dev = type(id_or_mac) == "string"
	local id_or_mac_arr = single_dev and {id_or_mac} or id_or_mac
	if id_or_mac_arr then
		for i = 1, #id_or_mac_arr do
			id_or_mac_arr[i] = siteman_utils:strip_mac(id_or_mac_arr[i])
		end
	end

	local mac_arr = {}
	if not id_or_mac then
		mac_arr = nil
	else
		for _, d in ipairs(siteman_utils:list_paired()) do
			if util.contains(id_or_mac_arr, d.mac) or util.contains(id_or_mac_arr, d[".name"]) then
				mac_arr[#mac_arr+1] = d.mac
			end
		end
	end

	if mac_arr and #mac_arr ~= #id_or_mac_arr then
		return nil, self:form_error(ERR_CODES.DEVICE_NOT_FOUND, ERR_STR.DEVICE_NOT_FOUND)
	end

	local res = siteman_utils:devman_ubus("site_manager.device", "list", { mac = mac_arr, verbose = verbose })
	if not res or not res.devices then return nil, self:form_error(ERR_CODES.DEVMAN_ERR, ERR_STR.DEVMAN_ERR) end

	for _, d in ipairs(res.devices) do
		d.online = d.state == DEV_STATE.ONLINE
		d.syncing = d.operation_state == DEV_STATE.SYNCING or d.operation_state == DEV_STATE.INITIALIZING
		if verbose then
			d.sync_retry_count = math.huge
			d.sync_retry_max = 0
			d.sync_next_retry = math.huge
			for _, job in ipairs(d.jobs or {}) do
				if job.status == JOB_STATUS.JOB_PENDING or job.status == JOB_STATUS.JOB_IN_PROGRESS then
					if job.error and #job.error > 0 then
						if job.retry_count <= d.sync_retry_count then
							d.sync_retry_count = job.retry_count

							if d.sync_retry_max then
								if d.sync_retry_max and 5 >= d.sync_retry_max then
									d.sync_retry_max = job.retry_max
								end
							end
						end

						if job.delay and job.delay ~= 0 and job.delay < d.sync_next_retry then
							d.sync_next_retry = job.delay
						end
					end
				end
			end
			if d.sync_retry_count == math.huge then d.sync_retry_count = nil end
			if d.sync_retry_max == 0 then d.sync_retry_max = nil end
			if d.sync_next_retry == math.huge then
				d.sync_next_retry = nil
			else
				d.sync_next_retry = util.round(d.sync_next_retry / 1000)
			end
		end
	end

	return single_dev and res.devices[1] or res.devices
end

---Returns device's api version using ubus, or config if ubus fails
function siteman_utils:get_device_api_version(id_or_mac)
	return (siteman_utils:device_status(id_or_mac)or {}).api_version
		or (siteman_utils:get_device_cfg({ id = id_or_mac, mac = id_or_mac }) or {}).api_version
end

function siteman_utils:wait_for_devman_reload(timeout)
	uloop.init()
	local conn = ubus.connect()
	if not conn then
		error("Failed to connect to ubus")
	end

	util.exec("ubus -t 5 wait_for site_manager")

	conn:subscribe("site_manager", {
		notify = function(msg, name)
			if name == "device" and msg.reload then
				uloop.cancel()
			end
		end
	})

	local function timeout_fn()
		uloop.cancel()
	end
	local t = uloop.timer(timeout_fn)
	t:set(timeout)

	uloop.run()
end


return siteman_utils
