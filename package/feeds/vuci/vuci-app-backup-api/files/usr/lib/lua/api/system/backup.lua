local FunctionService = require("api/FunctionService")
local fs = require("nixio.fs")
local nixio = require("nixio")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local pac = require("vuci.package_checker")

local DEFAULT_TMP_PATH = "/var/run/uhttpd/default-config"
local DEFAULT_DATE_FILE = "/etc/default-config/config_date"
local DEFAULT_TAR_FILE = "/etc/default-config/config.tar.gz"

local BACKUP_VALIDATE_FILE = "/tmp/backup_validated"
local BACKUP_INFO_FILE = "/etc/backup/backup.info"

local TMP_BACKUP_DIR = "/tmp/"
local TMP_BACKUP_FILE = TMP_BACKUP_DIR .. "backup.tar.gz"
local TMP_BACKUP_ENCRYPTED_FILE = TMP_BACKUP_DIR .. "backup.tar.7z"
local TMP_BACKUP_ZIP_ENCRYPTED_FILE = TMP_BACKUP_DIR .. "backup.tar.zip"

local STATUS_CODES = {
	DEVICE_NOT_COMPATIBLE = 1,
	FIRMWARE_NEWER = 2,
	VALIDATION_FAILED = 3,
	SME_ENABLED = 4,
	NO_RESET_SUPPORT = 5,
	NO_DEFAULT_CONFIG = 6,
	NO_SEVENZIP_PACKAGE = 7,
	FILE_ENCRYPTED = 8,
	FILE_NOT_ENCRYPTED = 9,
	EXTENSION_INVALID = 10,
}

local backup = FunctionService:new()
backup.disable_service_group_check = true

function backup:initialize_hook()
	self.upload_actions = { "upload" }
	for _, value in pairs(self.upload_actions) do
		self.actions[value] = true
	end
end

local function rm_new_config_dir(sme)
	util.exec("rm -rf /tmp/new_config_dir")
	if sme then
		util.exec("rm -rf /ext/new_config_dir")
	end
end

local function mk_new_config_dir(sme)
	rm_new_config_dir(sme)

	if sme then
		fs.mkdir("/ext/new_config_dir")
		util.exec("ln -s /ext/new_config_dir /tmp/new_config_dir")
	else
		fs.mkdir("/tmp/new_config_dir")
	end
end

function backup:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function backup:GET_TYPE_status()
	local date = "-"
	local checksums = {
		md5 = "-",
		sha256 = "-"
	}
	if fs.access(DEFAULT_TAR_FILE) then
		local value = fs.readfile(DEFAULT_DATE_FILE)
		date = value and tostring(os.date("%m/%d/%Y %H:%M", value)) or "-"
	end
	if fs.access(BACKUP_INFO_FILE) then
		local md5, sha256 = fs.readfile(BACKUP_INFO_FILE):match("([%S]+)%c*([%S]+)")
		checksums.md5 = md5
		checksums.sha256 = sha256
	end
	if self.sid and self.sid == "default" then
		self:ResponseOK({ date = date })
	elseif self.sid and self.sid == "backup" then
		self:ResponseOK(checksums)
	else
		checksums.date = date
		self:ResponseOK(checksums)
	end
end

local function supports_reset()
	return (util.file_exec("/bin/df", { "/overlay" }) or {}).code == 0
end

local SettingsResetAction = backup:action("reset_settings", function (self, data)
	local response = {}
	if not supports_reset() then
		self:add_critical_error(
			STATUS_CODES.NO_RESET_SUPPORT,
			"Device do not support settings reset.",
			"Settings reset"
		)
	end
	local reboot_args = {}
	local reset_settings = {
		["system"] = function ()
			local res = util.ubus("rpc-sys-ext", "firstboot", { factory = false }) or {}
			if type(res) ~= "table" or tonumber(res.result) ~= 0 then
				self:ResponseError("Failed to reset system settings.")
			end
		end,
		["factory"] = function ()
			local res = util.ubus("rpc-sys-ext", "firstboot", { factory = true }) or {}
			if type(res) ~= "table" or tonumber(res.result) ~= 0 then
				self:ResponseError("Failed to reset factory settings.")
			end
		end,
		["user"] = function ()
			if not fs.access(DEFAULT_TAR_FILE) then
				self:add_critical_error(
					STATUS_CODES.NO_DEFAULT_CONFIG,
					"User's default configuration not found.",
					"Settings reset"
				)
			end
			fs.mkdirr(DEFAULT_TMP_PATH)
			util.exec("tar -zxf " .. DEFAULT_TAR_FILE .. " -C " .. DEFAULT_TMP_PATH .. " 'etc/config/network' 'etc/config/uhttpd'")
			local uci_cursor = require("uci").cursor(DEFAULT_TMP_PATH .. "/etc/config")
			local ipv4_addr, ipv6_addr = util_tlt.lan_ip(uci_cursor)
			if uci_cursor:get("uhttpd", "main", "enable_http") == "1" then
				response.http_port = uci_cursor:get("uhttpd", "main", "listen_http")
			end
			if uci_cursor:get("uhttpd", "main", "enable_https") == "1" then
				response.https_port = uci_cursor:get("uhttpd", "main", "listen_https")
			end
			response.lan_ip = ipv4_addr
			response.lan_ipv6 = ipv6_addr
			os.execute("rm -rf " .. DEFAULT_TMP_PATH)

			local res = util.ubus("rpc-sys-ext", "userdefaults", _, 300)
			if type(res) ~= "table" or tonumber(res.result) ~= 0 then
				self:ResponseError("Failed to reset user defaults.")
			end
			reboot_args = {"-c"}
		end
	}
	reset_settings[data.type]()
	local forked = util_tlt.fork_exec_fn(function()
		util.ubus("rc", "init", { name = "uhttpd", action = "stop" })
		-- ^ we disable web immediately to prevent frontend reconnecting before reboot
		util.ubus("rpc-sys", "reboot", { args = reboot_args, safe = true })
	end, { after_exit = true })
	if not forked then
		self:ResponseError("Failed to reboot device")
	end
	self:ResponseOK(response)
end)

	local opt_type = SettingsResetAction:option("type")
		opt_type.require = true
		function opt_type:validate(value)
			local available_types = { "system", "factory", "user" }
			return self.dt:check_array(value, available_types)
		end

local function create_date(self)
	if not fs.access("/etc/default-config") then
		fs.mkdir("/etc/default-config")
	end
	fs.writefile(DEFAULT_DATE_FILE, os.time())
	util.exec("/sbin/sysupgrade --create-backup %s 2>/dev/null" % DEFAULT_TAR_FILE)
	if fs.access(DEFAULT_TAR_FILE) then
		local value = fs.readfile(DEFAULT_DATE_FILE)
		local date = value and os.date("%m/%d/%Y %H:%M", value) or "-"
		self:ResponseOK({ date = date })
	end
	self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Config date file failed to create.", "Validation")
end

backup:action("create_default", create_date)

local function remove_date(self)
	if fs.access(DEFAULT_TAR_FILE) then
		if fs.unlink(DEFAULT_TAR_FILE) then
			fs.remove(DEFAULT_DATE_FILE)
		end
	end
	self:ResponseOK({ date = "" })
end

backup:action("remove_default", remove_date)

local function clear_tmp()
	fs.remove(TMP_BACKUP_FILE)
	fs.remove(TMP_BACKUP_ENCRYPTED_FILE)
	fs.remove(TMP_BACKUP_ZIP_ENCRYPTED_FILE)
end

local function generate_backup(self)
	local encrypt = self.arguments.data and self.arguments.data.encrypt == "1"
	local password = self.arguments.data and self.arguments.data.password
	local sme = false
	local backup_file = encrypt and TMP_BACKUP_ZIP_ENCRYPTED_FILE or TMP_BACKUP_FILE

	if fs.access("/bin/sme.sh") then
		sme = util.trim((util.ubus("rpc-format", "sme", { args = { "-t" } }) or {}).output or "") == "expanded"
	end
	mk_new_config_dir(sme)
	clear_tmp()

	local backup_cmd = "sysupgrade --create-backup " .. backup_file
	backup_cmd = encrypt and backup_cmd.." --password "..util.shellquote(password) or backup_cmd
	backup_cmd = backup_cmd.. " 2>/dev/null"
	util.exec(backup_cmd)

	if not fs.access(backup_file) then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Generation of backup failed.", "Validation")
	end

	local md5, sha256 = "-", "-"

	local res = util.file_exec("/usr/bin/md5sum", { backup_file }) or {}
	if res.stdout then
		md5 = res.stdout:match("^([^%s]+)")
	end

	res = util.file_exec("/usr/bin/sha256sum", { backup_file }) or {}
	if res.stdout then
		sha256 = res.stdout:match("^([^%s]+)")
	end

	local file_contents = md5 .. "\n" .. sha256
	fs.writefile(BACKUP_INFO_FILE, file_contents)

	return self:ResponseOK({ sha256 = sha256, md5 = md5})
end

local function add_encryption_options(action)
	local password = action:option("password")
	if action.action_key ~= "apply" then
		function password:validate(value)
			local valid, err = self.dt:root_password(value)
			if not valid then return valid, err end
			return self.dt:default_validation(value)
		end
	end
	local opt_encrypt = action:option("encrypt")
	function opt_encrypt:validate(value)
		local valid, msg = self.dt:is_bool(value)
		if not valid then return false, msg end
		if value ~= "1" then return true end
		if not self.arguments.data.password or #self.arguments.data.password < 1 then
			return false,"Missing required field: password"
		end
		return valid, msg
	end
end
add_encryption_options(backup:action("generate", generate_backup))

backup:action("download", function (self)
	local uci = require("vuci.uci").cursor()
	local hostname = uci:get("system", "system", "hostname")
	hostname = hostname and "-" .. hostname or ""
	if fs.access(TMP_BACKUP_FILE) then
		return self:File(TMP_BACKUP_FILE, "backup%s-%s.tar.gz" % { hostname, os.date("%Y-%m-%d") }, nil, true)
	elseif fs.access(TMP_BACKUP_ENCRYPTED_FILE) then
		return self:File(TMP_BACKUP_ENCRYPTED_FILE, "backup%s-%s.tar.7z" % { hostname, os.date("%Y-%m-%d") }, nil, true)
	elseif fs.access(TMP_BACKUP_ZIP_ENCRYPTED_FILE) then
		return self:File(TMP_BACKUP_ZIP_ENCRYPTED_FILE, "backup%s-%s.tar.zip" % { hostname, os.date("%Y-%m-%d") }, nil, true)
	else
		return self:ResponseNotFound("Backup not found.")
	end
end)

local function get_archive_type(filename)
	if string.match(filename, "%.zip$") then
		return "zip"
	elseif string.match(filename, "%.7z$") then
		return "7z"
	elseif string.match(filename, "%.gz$") then
		return "gz"
	end
	return nil
end

local function get_package_sme(file, encrypted, password)
	local cat_command = "tar xz -Of "..file.." etc/config/fstab"
	local archive = get_archive_type(file)
	if encrypted and archive == "zip" then
		local sme = false
		local tmp_location = "/tmp/validate_backup"
		fs.mkdirr(tmp_location)
		util.exec("minizip -x -o -s -d " .. tmp_location .. " -p "..util.shellquote(password).." " .. file)

		local filename = fs.basename(file):gsub("%.zip$", "")
		if fs.access(tmp_location.."/"..filename) then
			sme = tonumber(util.exec("tar x -Of "..tmp_location.."/"..filename.." etc/config/fstab | grep -q -E \"option +sme +'1'\"; echo $?")) == 0
		end
		util.exec("rm -rf " .. tmp_location)
		return sme
	elseif encrypted and archive == "7z" then
		cat_command = "7zr e "..file.." -p"..util.shellquote(password).." -so"
	elseif encrypted then
		return false
	end

    return tonumber(util.exec(cat_command .. " | grep -q -E \"option +sme +'1'\"; echo $?")) == 0
end

local function get_package_size(file, encrypted, password)
	local archive = get_archive_type(file)
	if encrypted and archive == "zip" then
		return util.exec("minizip -l -p "..util.shellquote(password).." "..file.." | tail -1 | awk '{print ($2 / 1024) + 40}'")
	elseif encrypted and archive == "7z" then
		return util.exec("7zr l "..file.." -p"..util.shellquote(password).." | tail -1 | awk '{print ($3 / 1024) + 40}'")
	elseif encrypted then
		return 0
	end

	return util.exec("zcat " .. file .. " | wc -c | awk '{print ($1 / 1024) + 40 }'")
end

local function test_package_password(file, password)
	local archive = get_archive_type(file)
	if archive == "zip" then
		return util.file_exec("/usr/bin/minizip", {"-l", "-p", password, file}).code == 0
	elseif archive == "7z" then
		local exec_path = "/usr/bin/7zr"
		if not fs.access(exec_path) then exec_path = "/usr/local" .. exec_path end
		return util.file_exec(exec_path, {"t", file, "-p"..password}).code == 0
	end
	return false
end

local function apply_backup(self)
	local encrypt = self.arguments.data and self.arguments.data.encrypt == "1"
	local password = self.arguments.data and self.arguments.data.password
	local uci = require("vuci.uci").cursor()
	local sme = false
	local backup_file
	if encrypt and fs.access(TMP_BACKUP_ENCRYPTED_FILE) then
		backup_file = TMP_BACKUP_ENCRYPTED_FILE
	elseif encrypt and fs.access(TMP_BACKUP_ZIP_ENCRYPTED_FILE) then
		backup_file = TMP_BACKUP_ZIP_ENCRYPTED_FILE
	elseif not encrypt and fs.access(TMP_BACKUP_FILE) then
		backup_file = TMP_BACKUP_FILE
	else
		self:ResponseError("Backup file does not exist.")
	end
	if not fs.access(BACKUP_VALIDATE_FILE) then
		self:ResponseError("Backup must first be validated using the validate_backup action")
	end
	if encrypt and not test_package_password(backup_file, password) then
		self:ResponseError("Invalid password provided.")
	end
	local package_size = get_package_size(backup_file, encrypt, password)
	local backup_sme = get_package_sme(backup_file, encrypt, password)
	local free_space, _, err = util_tlt.check_reserved_space(tonumber(package_size))
	if not free_space then return self:add_critical_error(STD_CODES.FILE_MAX_SIZE, err) end
	if fs.access("/bin/sme.sh") then
		sme = util.trim((util.ubus("rpc-format", "sme", { args = { "-t" } }) or {}).output or "") == "expanded"
	end
	if not sme and backup_sme then return self:add_critical_error(STATUS_CODES.SME_ENABLED, "Selected backup file has memory expansion enabled.") end

	local args = { "-r" , backup_file }
	if encrypt then
		table.insert(args, "--password")
		table.insert(args, password)
	end

	if util.file_exec("/sbin/sysupgrade", args).code ~= 0 then
		self:ResponseError("Failed to apply backup.")
	end

	rm_new_config_dir(sme)

	local ipv4_addr, ipv6_addr = util_tlt.lan_ip()

	local http_port, https_port
	if uci:get("uhttpd", "main", "enable_http") == "1" then
		http_port = uci:get("uhttpd", "main", "listen_http")
	end
	if uci:get("uhttpd", "main", "enable_https") == "1" then
		https_port = uci:get("uhttpd", "main", "listen_https")
	end

	local forked = util_tlt.fork_exec_fn(function ()
		util.ubus("rc", "init", { name = "dropbear", action = "stop" })
		util.ubus("rc", "init", { name = "uhttpd", action = "stop" })

		util.ubus("rpc-sys", "reboot", { args = { "-c" }, safe = true })
	end, { after_exit = true })
	if not forked then
		self:ResponseError("Failed to apply backup.")
	end
	self:ResponseOK({
		lan_ipv4 = ipv4_addr,
		lan_ipv6 = ipv6_addr,
		http_port = http_port,
		https_port = https_port
	})
end
add_encryption_options(backup:action("apply", apply_backup))

backup:action("delete", function (self)
	local sme = false
	if fs.access("/bin/sme.sh") then
		sme = util.trim((util.ubus("rpc-format", "sme", { args = { "-t" } }) or {}).output or "") == "expanded"
	end
	rm_new_config_dir(sme)
	if fs.access(TMP_BACKUP_FILE) or fs.access(TMP_BACKUP_ENCRYPTED_FILE) or fs.access(TMP_BACKUP_ZIP_ENCRYPTED_FILE) then
		clear_tmp()
	else
		self:ResponseNotFound("Backup not found.")
	end
	self:ResponseOK({ md5 = "-", sha256 = "-" })
end)

function backup:POST_action_init_hook()
	if self.sid and util.contains(self.upload_actions, self.sid) then
		self:ResponseError("Unsupported payload format. Ensure the request body is in form-data format.")
	end
end

function backup:UPLOAD_validate_path()
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

function backup:UPLOAD_init()
	clear_tmp()
	os.remove(BACKUP_VALIDATE_FILE)
	local function handle_request(upload_request)
		for _, file in ipairs(upload_request.files) do
			local type = get_archive_type(file.filename)
			if type == "7z" then
				file.location = TMP_BACKUP_ENCRYPTED_FILE
			elseif type == "zip" then
				file.location = TMP_BACKUP_ZIP_ENCRYPTED_FILE
			elseif type == "gz" then
				file.location = TMP_BACKUP_FILE
			else
				return false, {
					code = STATUS_CODES.EXTENSION_INVALID,
					error = "File extension is incorrect.",
					source = "filename"
				}
			end
		end

		local encrypt = upload_request.parameters.encrypt
		local password = upload_request.parameters.password
		if encrypt then
			local valid, msg = self.dt:is_bool(encrypt)
			if not valid then
				return false, {
					code = STD_CODES.INVALID_OPT,
					error = msg,
					source = "encrypt"
				}
			end
			if encrypt == "1" and (not password or password == "") then
				return false, {
					code = STD_CODES.INVALID_OPT,
					error = "Missing required field: password",
					source = "password"
				}
			end
		end

		return true
	end

	return { handle_request = handle_request }
end

function backup:UPLOAD_after_upload_hook(upload_request)
	local v_table = upload_request.parameters
	local backup_file = upload_request.files[1].location

	fs.chmod(backup_file, 644)

	local function add_critical_error(...)
		clear_tmp()
		self:add_critical_error(...)
	end

	local md5, sha256 = "-", "-"
	local sme = false
	local result = 3
	local encrypt = v_table.encrypt == "1"
	local password = v_table.encrypt == "1" and v_table.password

	local backup_type = get_archive_type(backup_file)
	if not encrypt and (backup_type == "zip" or backup_type == "7z") then
		add_critical_error(STATUS_CODES.FILE_ENCRYPTED, "Backup file is encrypted.")
	elseif encrypt and backup_type == "gz" then
		add_critical_error(STATUS_CODES.FILE_NOT_ENCRYPTED, "Backup file is not encrypted.")
	elseif encrypt and backup_type == "7z" and not pac.is_installed("7zip") then
		add_critical_error(STATUS_CODES.NO_SEVENZIP_PACKAGE, "7zip must be installed to decrypt this backup file.")
	end

	if fs.access("/bin/sme.sh") then
		sme = util.trim((util.ubus("rpc-format", "sme", { args = { "-t" } }) or {}).output or "") == "expanded"
	end
	mk_new_config_dir(sme)
	if fs.access(backup_file) then
		if encrypt and not test_package_password(backup_file, password) then
			add_critical_error(STD_CODES.UNAUTHORIZED, "Invalid password provided.")
		end
		local uci = require("uci").cursor()
		uci:set("rut_fota", "config", "fw_info", "N/A")
		uci:commit("rut_fota")

		-- validate backup size
		local package_size = get_package_size(backup_file, encrypt, password)
		local backup_sme = get_package_sme(backup_file, encrypt, password)
		local free_space, _, err = util_tlt.check_reserved_space(tonumber(package_size))
		if not free_space then return add_critical_error(STD_CODES.FILE_MAX_SIZE, err) end
		if not sme and backup_sme then return add_critical_error(STATUS_CODES.SME_ENABLED, "Selected backup file has memory expansion enabled.") end

		local params = { "-V", "-r", backup_file }
		if encrypt then
			table.insert(params, "--password")
			table.insert(params, password)
		end

		local res = util.file_exec("/sbin/sysupgrade", params) or {}
		result = res.code or 3
		if result == 0 then
			res = util.file_exec("/usr/bin/md5sum", { backup_file }) or {}
			if res.stdout then
				md5 = res.stdout:match("^([^%s]+)")
			end

			res = util.file_exec("/usr/bin/sha256sum", { backup_file }) or {}
			if res.stdout then
				sha256 = res.stdout:match("^([^%s]+)")
			end
			io.open(BACKUP_VALIDATE_FILE, "w"):close()
		else
			rm_new_config_dir(sme)
			clear_tmp()
		end
	else
		clear_tmp()
	end

	if result == 1 then
		self:add_critical_error(
			STATUS_CODES.DEVICE_NOT_COMPATIBLE,
			"The selected backup file is not compatible with this device, please choose another file."
		)
	elseif result == 2 then
		self:add_critical_error(
			STATUS_CODES.FIRMWARE_NEWER,
			"The selected backup file was generated on a device with a newer firmware version, please choose a backup file with the same or older firmware version."
		)
	elseif result == 3 then
		self:add_critical_error(
			STATUS_CODES.VALIDATION_FAILED,
			"Validation failed. File is invalid or not found."
		)
	end

	return { md5 = md5, sha256 = sha256 }
end

return backup
