local FunctionService = require("api/FunctionService")
local FirmwareUtils = require("api.system.firmware_utils"):new()
local nixio = require("nixio")
local fs = require("nixio.fs")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local ModemFirmware = require("api.system.firmware_modem")
local md = require("vuci.modem")
local json = require "luci.jsonc"
local uci = require("vuci.uci").cursor()
local pac = require("vuci.package_checker")

local Firmware = FunctionService:new()
Firmware.disable_service_group_check = true

function Firmware:initialize_hook()
	self.upload_actions = { "upload_device_firmware", "upload_modem_firmware" }
	for _, value in pairs(self.upload_actions) do
		self.actions[value] = true
	end
end

-- Gets firmware version. Returns "N/A" if not available.
---@return string firmware_version Firmware version.
function Firmware:version()
	local data = fs.readfile("/etc/version")
	return data and util.trim(data) or "N/A"
end

-- Gets firmware build date. Returns "N/A" if not available.
---@return string build_date Firmware build date.
function Firmware:build_date()
	local data = fs.readfile("/etc/firmware-date")
	if data then
		local date_num = tonumber(data)
		if date_num then
			return os.date("%Y-%m-%d %H:%M:%S", date_num)
		end
	end
	return "N/A"
end

-- Gets firmware updates from the server. Returns table with updates or N/A if it fails.
---@return string | table updates update data or N/A
function Firmware:updates()
	local _, err = util.ubus("rut_fota", "fw_info")
	if not err then
		local info = util.ubus("rut_fota", "get_info")
		if info then
			local data = {
				version = "N/A",
				date = "N/A",
				stable_version = "N/A",
				stable_date = "N/A",
				size = tostring(info.fw_size ~= "" and info.fw_size or -1),
				stable_size = tostring(info.fw_stable_size ~= "" and info.fw_stable_size or -1),
			}

			if info.fw == "Fw_newest" then
				data.version = "newest"
				data.size = "0"
			elseif info.fw and info.fw ~= "" and data.size ~= "-1" then
				data.version = info.fw
				data.date = info.fw_date and info.fw_date ~= "" and info.fw_date or data.date
			end

			if info.fw_stable == "Fw_newest" then
				data.stable_version = "newest"
				data.stable_size = "0"
			elseif info.fw_stable and info.fw_stable ~= "" and data.stable_size ~= "-1" then
				data.stable_version = info.fw_stable
				data.stable_date = info.fw_stable_date and info.fw_stable_date ~= "" and info.fw_stable_date or data.stable_date
			end

			if data.date ~= "N/A" then
				-- Remove time from date
				local date_split = util.split(data.date, " ")
				data.date = date_split[1]
			end

			if data.stable_date ~= "N/A" then
				-- Remove time from stable_date
				local stable_date_split = util.split(data.stable_date, " ")
				data.stable_date = stable_date_split[1]
			end

			return data
		end
	end
	return "N/A"
end

-- Verifies firmware file.
---@param path string Firmware file path.
---@return table | nil information Verification information.
---@return string | nil error Error message.
function Firmware:verify(path)
	if not fs.access(path) then
		return nil, "Firmware file not found in the device."
	end
	local ok = util.file_exec("/usr/libexec/validate_firmware_image", { path })
	if not ok or ok.code ~= 0 or ok.stdout == "" or (ok.stderr and string.find(ok.stderr, "Failed to parse message data")) then
		return nil, "Firmware verification failed."
	end
	local result = json.parse(ok.stdout)
	if not result then
		return nil, "Firmware verification failed."
	end
	return result
end

-- Checks if download of firmware is running.
---@return boolean status Download status.
function Firmware:update_started()
	local process = util.ubus("rut_fota", "get_process")
	
	if fs.access(FirmwareUtils.PATH.FOTA_PID_FILE) and process then
		local percents = tonumber(process.percents)
		-- If download is running (progress > 0 and not finished, not failed)
		if percents and percents > 0 and percents ~= 100 and process.process ~= "failed" then
			return true
		end
	end
	return false
end

-- Updates device with firmware file.
---@param path string Firmware file path.
---@param keep_settings boolean Set to keep settings. Defaults to true.
---@return boolean status Upgrade status.
---@return string | nil error Error message.
function Firmware:start_upgrade(path, keep_settings, suppress_validation)
	if self:update_started() then
		return false, "Firmware download in progress."
	end

	local firmware_info, err = self:verify(path)
	if not firmware_info then return false, err end

	if not firmware_info.hw_support and not suppress_validation then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.UPGRADE_FAILED,
			"Firmware is not supported by this device.",
			"Validation", "422"
		)
	end

	if not firmware_info.valid and not suppress_validation then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.UPGRADE_FAILED,
			"Firmware is not valid.",
			"Validation", "422"
		)
	end

	if not firmware_info.allow_backup and keep_settings then
        self:add_critical_error(
			FirmwareUtils.ERROR_CODES.CAN_NOT_KEEP_SETTINGS,
			"Can not keep settings when downgrading the firmware.",
			"Validation", "422"
		)
    end

	local params = {}
	if firmware_info.allow_backup and not keep_settings then
		table.insert(params, "-n")
	end
	if suppress_validation then
		table.insert(params, "-F")
	end
	table.insert(params, path)

	local forked = util_tlt.fork_exec_fn(function ()
		util.ubus("rc", "init", { name = "dropbear", action = "stop" })
		util.ubus("rc", "init", { name = "uhttpd", action = "stop" })

		nixio.exec("/sbin/sysupgrade", unpack(params))
	end, { after_exit = true })

	if not forked then
		return false, "Failed to start upgrade."
	end

	return true
end

-- Verifies and gets info of firmware file that is in the device.
---@param path string Firmware file path.
---@return boolean, string | table fw_info Firmware info table or false and error message.
function Firmware:firmware_info(path)
	if not fs.access(path) then
		return false, "Firmware file not found in the device."
	end

	local firmware_data = {
		sha256 = FirmwareUtils:sha256sum(path),
		md5 = FirmwareUtils:md5sum(path),
		size = FirmwareUtils:file_size(path) or "0"
	}

	local firmware_info, err = self:verify(path)
	if not firmware_info then return false, tostring(err) end

	firmware_data.newer = firmware_info.is_downgrade and "0" or "1"
	firmware_data.fw_version = firmware_info.fw_version or "-"
	firmware_data.allow_backup = firmware_info.allow_backup and "1" or "0"
	firmware_data.valid = firmware_info.valid and "1" or "0"
	firmware_data.hw_support = firmware_info.hw_support and "1" or "0"
	firmware_data.authorized = firmware_info.tests.fwtool_signature and "1" or "0"
	firmware_data.message_code = tostring(firmware_info.tests.fwtool_last_error or 0)
	firmware_data.passwd_warning = firmware_info.password_warning and "1" or "0"

	return firmware_data, nil
end

function Firmware:start_download(fw_type)
	if self:update_started() or fs.access(FirmwareUtils.PATH.FOTA_PID_FILE) then
		return false
	end
	-- indicate download as started since forking may take time
	util.ubus("rut_fota.internal", "set_process", { process = "started", percents = 0 })
	local arguments = {}
	if fw_type then
		arguments[fw_type] = true
	end
	util.fork_ubus("rut_fota", "download_fw", arguments, 300)
	return true
end

------

function Firmware:GET_TYPE_device()
	if self.sid == "status" and not self.type then
		self:ResponseOK({
			version = self:version(),
			kernel_version = FirmwareUtils:kernel_version(),
			build_date = self:build_date()
		})
	end
	if self.sid == "updates" and self.type == "status" then
		self:check_internet_connection()
		self:ResponseOK({
			device = self:updates()
		})
	end
	if self.sid == "progress" and self.type == "status" then
		local process = util.ubus("rut_fota", "get_process")
		if process and process.percents then
			process.percents = tostring(process.percents)
		end
		self:ResponseOK(process or "N/A")
	end
	self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
end

function Firmware:GET_TYPE_modem()
	if self.sid == "status" and not self.type then
		self:ResponseOK({
			modems = ModemFirmware:version() or {}
		})
	end
	if self.sid == "updates" and self.type == "status" then
		self:check_modem_online_upgrade_support()
		self:check_internet_connection()
		self:ResponseOK({
			modems = ModemFirmware:updates()
		})
	end
	if self.sid == "progress" and self.type == "status" then
		self:check_modem_online_upgrade_support()
		local update_status = FirmwareUtils:read_json(FirmwareUtils.PATH.DFOTA_STATUS)
		if update_status and update_status.status then
			if type(update_status.modems) == "table" then
				for k, modem in pairs(update_status.modems) do
					update_status.modems[k].id = modem.usb_id
					update_status.modems[k].usb_id = nil -- Disabled as it sends usb_id in id
					update_status.modems[k].forced = update_status.modems[k].forced and "1" or "0"
				end
			end
			self:ResponseOK(update_status)
		end
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.MODEM_UPGRADE_STATUS_FAILED,
			"Failed to get modem firmware upgrade status.",
			"DFOTA updates"
		)
	end
	self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
end

------
function Firmware:check_modem_file_upgrade_support()
	if pac.is_installed("dfota") then
        self:add_critical_error(
            FirmwareUtils.ERROR_CODES.NO_MODEM_FW_SUPPORT_FILE,
            "Modem firmware upgrade from file is not supported on this device."
        )
    end
end

function Firmware:check_modem_online_upgrade_support()
	if not pac.is_installed("dfota") then
        self:add_critical_error(
            FirmwareUtils.ERROR_CODES.NO_MODEM_FW_SUPPORT_ONLINE,
            "Online modem firmware upgrade is not supported on this device."
        )
    end
end

function Firmware:check_internet_connection()
	local enabled = uci:get("rut_fota", "config", "enabled")
	if enabled ~= "1" then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.FOTA_DISABLED,
			"FOTA is disabled."
		)
	end

	local host = uci:get("rut_fota", "config", "communication_host")
	local port = uci:get("rut_fota", "config", "communication_port")

	if not host or not port then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_INTERNET,
			"No internet connection."
		)
	end

	local socket = require("socket")
	local r, w = nixio.pipe()

	local timeout = 1

	local sleep_pid = nixio.fork()
	if sleep_pid == 0 then
		nixio.exec("/bin/sleep", tostring(timeout))
	end

	local dns_pid = nixio.fork()
	if dns_pid == 0 then
		r:close()
		local ip = socket.dns.toip(host)
		if ip then
			w:write(ip)
		end
		w:close()
		os.exit()
	end
	w:close()

	while true do
		local finished_pid  = nixio.waitpid()
		if finished_pid == sleep_pid then
			nixio.kill(dns_pid, 9)
			break
		end

		if finished_pid == dns_pid then
			break
		end
	end

	local ip = r:read(1024)
	r:close()

	if not ip or ip == "" then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_INTERNET,
			"No internet connection."
		)
	end

	local con = socket.tcp()
	con:settimeout(timeout)

	local result = con:connect(ip, tonumber(port))
	if not result then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_INTERNET,
			"No internet connection."
		)
	end
	con:close()
end
------

-- For verifying device firmware file
Firmware:action("verify", function (self) -- Device
	local info, err = self:firmware_info(FirmwareUtils.PATH.DEVICE)
	if not info then
		self:add_critical_error(FirmwareUtils.ERROR_CODES.VERIFY_FAILED, err, "Verification", "422")
	end
	self:ResponseOK(info)
end)

-- For verifying modem firmware file
Firmware:action("verify_modem", function (self)
    self:check_modem_file_upgrade_support()
	local info, err = ModemFirmware:firmware_info(FirmwareUtils.PATH.MODEM)
	if not info then
		self:add_critical_error(FirmwareUtils.ERROR_CODES.VERIFY_FAILED, err, "Verification", "422")
	end
	self:ResponseOK(info)
end)

local original_POST_action_validate = Firmware.POST_action_validate
function Firmware:POST_action_validate(action)
	-- Remove action argument validation to not increase API version
	if action and action.action_key == "fota_download" then
		return
	end
	original_POST_action_validate(self, action)
end

-- For downloading device firmware from the server
local download = Firmware:action("fota_download", function (self, data)
	self:check_internet_connection()
	local stable = uci:get("rut_fota", "config", "latest") ~= "1"
	if data and data.type then
		stable = data.type == "stable"
	end
	local info = util.ubus("rut_fota", "get_info")
	if not info then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_FIRMWARE_FOUND,
			"No update is available.",
			"Download", "422"
		)
	end
	if not stable and (not info.fw or info.fw == "" or info.fw == "Fw_newest") then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_FIRMWARE_FOUND,
			"No update is available.",
			"Download", "422"
		)
	end
	if stable and (not info.fw_stable or info.fw_stable == "" or info.fw_stable == "Fw_newest") then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_FIRMWARE_FOUND,
			"No update is available.",
			"Download", "422"
		)
	end

	if self:start_download(data and data.type) then
		return self:ResponseOK()
	else
		return self:add_critical_error(
			FirmwareUtils.ERROR_CODES.UPDATE_IN_PROGRESS,
			"Update or download already in progress.",
			"Download", "422"
		)
	end
end)
local download_type = download:option("type")
	function download_type:validate(value)
		local allowed = { "stable", "latest" }
		return self.dt:check_array(value, allowed)
	end

Firmware:action("fota_cancel", function (self)
	if not self:update_started() and not fs.access(FirmwareUtils.PATH.FOTA_PID_FILE) then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_UPDATE_IN_PROGRESS,
			"No update in progress.",
			"Cancel", "422"
		)
	end

	util.ubus("rut_fota", "cancel_download")
	self:ResponseOK()
end)

-- For updating TAP devices
local upgrade_action = Firmware:action("unattended_upgrade", function(self, data)
	local internet_connection = tonumber(util.exec("ping -c 1 1.1.1.1 &> /dev/null ; echo $?")) == 0
	if not internet_connection then
		return self:add_critical_error(
			STD_CODES.INCORRECT_REQUEST,
			"No internet connection."
		)
	end

	local err_msg = "Unattended firmware upgrade failed"
	local keep_settings = data and data.keep_settings and data.keep_settings ~= "0" or false
	if not self:start_download() then
		return self:add_critical_error(
			FirmwareUtils.ERROR_CODES.UPDATE_IN_PROGRESS,
			"Update or download already in progress.",
			"Download", "422"
		)
	end
	self:check_internet_connection()
	util.fork_ubus("rut_fota", "download_fw", nil, 300)
	self:ResponseOK("Download started.")
	while true do
		nixio.nanosleep(1)
		local process = util.ubus("rut_fota", "get_process")
		if process and process.process == "succeeded" then
			local info, err = self:firmware_info(FirmwareUtils.PATH.DEVICE)
			if not info or not info.valid or not info.authorized then return end
			local ok, _ = self:start_upgrade(FirmwareUtils.PATH.DEVICE, keep_settings)
			if not ok then
				util.perror(err_msg)
				return self:add_critical_error(FirmwareUtils.ERROR_CODES.UPGRADE_FAILED, err_msg, "Upgrade")
			end
			return self:ResponseOK("Update started successfully")
		elseif process and process.process == "failed" then
			util.perror(err_msg)
			return self:add_critical_error(FirmwareUtils.ERROR_CODES.UPGRADE_FAILED, err_msg, "Upgrade")
		end
	end
end)

local upgrade_keep_settings = upgrade_action:option("keep_settings")
	function upgrade_keep_settings:validate(value)
		return self.dt:is_bool(value)
	end

-- For upgrading modem from the server
local DownloadModemAction = Firmware:action("fota_download_modem", function (self, data)
	self:check_modem_online_upgrade_support()
	self:check_internet_connection()
	local modem_id = data.modem and md:get_ubus_modem_object(data.modem) or nil
	local ok = util.ubus("rpc-dfota", "update", { modem = modem_id })
	if type(ok) == "table" and ok.status == 0 then self:ResponseOK() end
	self:add_critical_error(
		FirmwareUtils.ERROR_CODES.MODEM_ONLINE_UPGRADE_FAILED,
		"Failed to start online modem upgrade.",
		"Online upgrade", "422"
	)
end)

	local opt_modem = DownloadModemAction:option("modem")
		function opt_modem:validate(value)
			return self.dt:check_modem(value)
		end

-- For upgrading device firmware
local UpgradeAction = Firmware:action("upgrade", function (self, data)
	local ok, err = self:start_upgrade(
		FirmwareUtils.PATH.DEVICE,
		data.keep_settings ~= "0",
		data.suppress_validation == "1"
	)
	if not ok then
		self:add_critical_error(FirmwareUtils.ERROR_CODES.UPGRADE_FAILED, err, "Upgrade", "422")
	end
	self:ResponseOK()
end)

	local opt_keep_settings = UpgradeAction:option("keep_settings")
		function opt_keep_settings:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_suppress_validation = UpgradeAction:option("suppress_validation")
		function opt_suppress_validation:validate(value)
			return self.dt:is_bool(value)
		end

-- For upgrading modem firmware
Firmware:action("upgrade_modem", function (self)
	self:check_modem_file_upgrade_support()
	local ok, err = ModemFirmware:start_upgrade(FirmwareUtils.PATH.MODEM)
	if not ok then
		self:add_critical_error(FirmwareUtils.ERROR_CODES.UPGRADE_FAILED, err, "Upgrade", "422")
	end
	self:ResponseOK()
end)

-- DEPRECATED
-- For factory reseting device
local FactoryResetAction = Firmware:action("factory_reset", function (self, data)
	local response = {}
	if not FirmwareUtils:supports_reset() then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_RESET_SUPPORT,
			"Device do not support factory reset.",
			"Factory reset", "404"
		)
	end
	local reboot_args = {}
	if data.user_defaults == "1" then
		local temp_path = "/var/run/uhttpd/default-config"
		local tar_file = "/etc/default-config/config.tar.gz"
		if not fs.access(tar_file) then
			self:add_critical_error(
				FirmwareUtils.ERROR_CODES.NO_BACKUP_FILE,
				"User backup file not found.",
				"Factory reset", "404"
			)
		end

		fs.mkdirr(temp_path)
		util.exec("tar -zxf " .. tar_file .. " -C " .. temp_path .. " 'etc/config/network'")
		local uci_cursor = require("uci").cursor(temp_path .. "/etc/config")
		local ipv4_addr = util_tlt.lan_ip(uci_cursor)
		response.lan_ip = ipv4_addr
		os.execute("rm -rf " .. temp_path)

		local res = util.ubus("rpc-sys-ext", "userdefaults")
		if type(res) ~= "table" or tonumber(res.result) ~= 0 then
			self:add_critical_error(
				FirmwareUtils.ERROR_CODES.NO_RESET_SUPPORT,
				"Failed to reset device.",
				"Factory reset"
			)
		end
		reboot_args = {"-c"}
	else
		local res = util.ubus("rpc-sys-ext", "firstboot", { factory = false }) or {}
		if type(res) ~= "table" or tonumber(res.result) ~= 0 then
			self:add_critical_error(
				FirmwareUtils.ERROR_CODES.NO_RESET_SUPPORT,
				"Failed to reset device.",
				"Factory reset"
			)
		end
	end
	local forked = util_tlt.fork_exec_fn(function()
		util.ubus("rpc-sys", "reboot", { args = reboot_args, safe = true })
	end, { after_exit = true })
	if not forked then
		self:add_critical_error(
			FirmwareUtils.ERROR_CODES.NO_RESET_SUPPORT,
			"Failed to reboot device.",
			"Factory reset"
		)
	end
	self:ResponseOK(response)
end)

	local opt_user_defaults = FactoryResetAction:option("user_defaults")
		function opt_user_defaults:validate(value)
			return self.dt:is_bool(value)
		end
-----

function Firmware:POST_action_init_hook()
	if self.type then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented", "Request", "404")
	end
	if self.sid and util.contains(self.upload_actions, self.sid) then
		self:ResponseError("Unsupported payload format. Ensure the request body is in form-data format.")
	end
end

function Firmware:UPLOAD_validate_path()
	if self.type then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented", "Request", "404")
	end
	if self.service_group ~= "actions" then
		self:ResponseNotImplemented(string.format("%s not implemented", self.request_method))
	end

	local available_actions = {}
	for key, _ in pairs(self.actions) do
		table.insert(available_actions, key)
	end

	if not self.sid then
		self:ResponseNotFound(string.format("No action provided. Available actions: [%s]",
			table.concat(available_actions, ", ")))
	elseif not util.contains(self.upload_actions, self.sid) and util.contains(available_actions, self.sid) then
		self:ResponseError("Unsupported payload format. Ensure the request body is in JSON format.")
	elseif not util.contains(self.upload_actions, self.sid) then
		self:ResponseNotFound(string.format("Provided action is not available. Available actions: [%s]",
					table.concat(available_actions, ", ")))
	end
end

function Firmware:upload_cleanup(fw_path)
	if fw_path and fs.access(fw_path) then fs.unlink(fw_path) end
end

function Firmware:UPLOAD_path()
	local paths = {"/tmp"}
	if self.sid == "upload_" .. FirmwareUtils.TYPE.DEVICE .. "_firmware" then
		local dir = fs.dirname(FirmwareUtils.PATH.DEVICE)
		if not dir:match("^/tmp") then
			table.insert(paths, dir)
		end
	elseif self.sid == "upload_" .. FirmwareUtils.TYPE.MODEM .. "_firmware" then
		table.insert(paths, FirmwareUtils.PATH.MODEM_FW_DIR)
	end
	return paths
end

function Firmware:UPLOAD_init()
	FirmwareUtils:delete_fw_file()
	os.execute(string.format("rm -fr %s", FirmwareUtils.PATH.MODEM))
	-- clear cache
	util.ubus("rpc-sys-ext", "drop_caches", { type = "3" })

	local upload_path
	if self.sid == "upload_" .. FirmwareUtils.TYPE.DEVICE .. "_firmware" then
		upload_path = FirmwareUtils.PATH.DEVICE

	elseif self.sid == "upload_" .. FirmwareUtils.TYPE.MODEM .. "_firmware" then
		if not fs.access(FirmwareUtils.PATH.MODEM_FW_DIR) then
			fs.mkdirr(FirmwareUtils.PATH.MODEM_FW_DIR)
		end
		upload_path = FirmwareUtils.PATH.MODEM
	end

	local function handle_request(upload_request)
		local fw_file = upload_request.files[1]
		fw_file.location = upload_path

		if fw_file.size > 1024*1024*128 then
			return self:get_file_upload_too_large_error()
		end

		return true
	end

	return {
		handle_request = handle_request,
		on_failed = function ()
			self:upload_cleanup(upload_path)
		end

	}
end

function Firmware:UPLOAD_after_upload_hook(upload_request)
	local upload_path = upload_request.files[1].location

	local function add_critical_error(...)
		self:upload_cleanup(upload_path)
		self:add_critical_error(...)
	end

	local form_data = upload_request.parameters

	if self.sid == "upload_" .. FirmwareUtils.TYPE.DEVICE .. "_firmware" then
		util.set_file_permissions(upload_path, "rut_fota", 0666)

		local suppress_validation = form_data.suppress_validation == "1"
		if form_data.force_upgrade == "1" then
			local ok, err = self:start_upgrade(upload_path, form_data.keep_settings ~= "0", suppress_validation)
			if not ok then
				add_critical_error(FirmwareUtils.ERROR_CODES.UPGRADE_FAILED, err, "Upgrade", "422")
			end
			self:ResponseOK()
		end

		local fw_info, err = self:firmware_info(upload_path)
		if not fw_info then
			add_critical_error(
				FirmwareUtils.ERROR_CODES.FIRMWARE_INFO_FAILED,
				err,
				"Firmware info"
			)
		end

		local msg_code
		if fw_info.hw_support ~= "1" and not suppress_validation then
			msg_code = FirmwareUtils.ERROR_CODES.FIRMWARE_UNSUPPORTED
		elseif fw_info.valid ~= "1" and not suppress_validation then
			msg_code = tonumber(fw_info.message_code)
		end
		if msg_code then
			return add_critical_error(
				msg_code,
				"Invalid file uploaded",
				"Validation"
			)
		end
		self:ResponseOK(fw_info)
	elseif self.sid == "upload_" .. FirmwareUtils.TYPE.MODEM .. "_firmware" then
		if form_data.force_upgrade == "1" then
			local ok, err = ModemFirmware:start_upgrade(upload_path)
			if not ok then
				add_critical_error(FirmwareUtils.ERROR_CODES.UPGRADE_FAILED, err, "Upgrade", "422")
			end
			self:ResponseOK()
		end

		local fw_info, err = ModemFirmware:firmware_info(upload_path)
		if not fw_info then
			add_critical_error(
				FirmwareUtils.ERROR_CODES.FIRMWARE_INFO_FAILED,
				err,
				"Firmware info"
			)
		end
		self:ResponseOK(fw_info)
	end
	add_critical_error(
		STD_CODES.INVALID_SECTION,
		"Missing firmware type.",
		"Upload"
	)
end

-------

Firmware:action("delete_device_firmware", function (self)
	if fs.access(FirmwareUtils.PATH.DEVICE) then
		FirmwareUtils:delete_fw_file()
		os.execute("rm -f /tmp/sysupgrade.*")
		self:ResponseOK("Device firmware deleted successfully.")
	end

	self:add_critical_error(
		FirmwareUtils.ERROR_CODES.NO_FIRMWARE_FOUND,
		"Firmware file not found in the device.",
		"Firmware Delete", "404"
	)
end)

Firmware:action("delete_modem_firmware", function (self)
	self:check_modem_file_upgrade_support()

	--- Workaroundish way, modem_update should clean on its own...
	for file in fs.dir("/tmp") do
		if file:match("^modem_update%-") then
			os.execute("rm -rf /tmp/"..file)
			break
		end
	end

	if fs.access(FirmwareUtils.PATH.MODEM) then
		fs.unlink(FirmwareUtils.PATH.MODEM)
		self:ResponseOK("Modem firmware deleted successfully.")
	end

	self:add_critical_error(
		FirmwareUtils.ERROR_CODES.NO_FIRMWARE_FOUND,
		"Firmware file not found in the device.",
		"Firmware Delete", "404"
	)
end)

return Firmware
