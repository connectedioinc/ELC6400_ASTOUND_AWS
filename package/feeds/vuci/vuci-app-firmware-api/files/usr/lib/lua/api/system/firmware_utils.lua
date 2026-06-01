local FirmwareUtils = {}
local nixio = require("nixio")
local util = require("vuci.util")
local fs = require("nixio.fs")
local json = require("luci.jsonc")
local board = require("vuci.board")
local router_name = board:get_family_name()

function FirmwareUtils:new(o)
	o = o or {}
	self.__index = self

	-- Firmware types
	o.TYPE = {
		MODEM = "modem",
		DEVICE = "device"
	}

	-- Paths for various files
	o.PATH = {
		MODEM_FW_DIR	= "/storage/modemfw",
		MODEM			= "/storage/modemfw/modem_upgrade.bin",
		DEVICE			= "/tmp/firmware.img",
		DFOTA_UPDATES	= "/tmp/dfota_updates.json",
		DFOTA_STATUS	= "/tmp/dfota_status.json",
		FOTA_PID_FILE   = "/tmp/rut_fota.pid",
	}
	if board:is_gateway() and board:has_128mb_ram() then
		o.PATH.MODEM_FW_DIR = "/usr/local/modemfw"
		o.PATH.MODEM		= "/usr/local/modemfw/modem_upgrade.bin"
	end

	-- TRB160 doesn't have enough RAM to store firmware
	if router_name:match("^TRB16") then
		o.PATH.DEVICE = "/storage/fw/firmware.img"
	end

	-- Error codes for firmware responses
	o.ERROR_CODES = {
		VERIFY_FAILED = 1,
		UPDATE_IN_PROGRESS = 2,
		UPGRADE_FAILED = 3,
		NO_BACKUP_FILE = 4,
		NO_RESET_SUPPORT = 5,
		FIRMWARE_INFO_FAILED = 6,
		NO_FIRMWARE_FOUND = 7,
		NO_MODEM_FW_SUPPORT_FILE = 8,
		CAN_NOT_KEEP_SETTINGS = 9,
		MANUFACTURER_CHECK_FAILED = 10,
		MODEM_ONLINE_UPGRADE_FAILED = 11,
		MODEM_UPGRADE_STATUS_FAILED = 12,
		NO_MODEM_FW_SUPPORT_ONLINE = 13,
		FIRMWARE_UNSUPPORTED = 14,
		NO_INTERNET = 15,
		FOTA_DISABLED = 16,
		NO_UPDATE_IN_PROGRESS = 17,
	}

	setmetatable(o, self)
	return o
end

function FirmwareUtils:load_uci()
	local loaded_uci = require("vuci.uci").cursor()
	-- if testing environment, clear cache, so new uci modules are loaded everytime
	if os.getenv("LUA_TEST") == "true" then package.loaded["vuci.uci"] = nil end
	return loaded_uci
end

-- Calculates file md5 hash
---@param path string File path.
---@return string checksum File md5 hash.
function FirmwareUtils:md5sum(path)
	local md5_output = util.exec("md5sum %q" % path)
	if not md5_output then return "N/A" end
	return md5_output:match("^([^%s]+)")
end

-- Calculates file sha256 hash
---@param path string File path.
---@return string checksum File sha256 hash.
function FirmwareUtils:sha256sum(path)
	local sha256_output = util.exec("sha256sum %q" % path)
	if not sha256_output then return "N/A" end
	return sha256_output:match("^([^%s]+)")
end

-- Gets kernel version. Returns "N/A" if not available.
---@return string kernel_version Firmware kernel version.
function FirmwareUtils:kernel_version()
	local uname = nixio.uname() or {}
	return uname.release or "N/A"
end

-- Gets formated file size: 10 B, 25 KB etc. Returns false if it fails.
---@param path string File path
---@return string | boolean size File size or false if it fails.
function FirmwareUtils:file_size(path)
	if not fs.access(path) then return false end
	local bytes_size = fs.stat(path).size
	if bytes_size then
		local types = {"B", "KB", "MB", "GB", "TB"}
		for i = 1, 5 do
			if bytes_size > 1024 and i < 5 then
				bytes_size = bytes_size / 1024
			else
				return string.format("%.2f %s", bytes_size, types[i])
			end
		end
	end
	return false
end

-- Checks if device supports factory reset.
---@return boolean status Support status.
function FirmwareUtils:supports_reset()
	return (util.file_exec("/bin/df", { "/overlay" }) or {}).code == 0
end

-- Reads json file with error handling
---@param path string File path to read json data from
---@return table | nil json_data Parsed json data from file
function FirmwareUtils:read_json(path)
	local file_data = fs.readfile(path)
	if file_data and file_data ~= "" then
		return json.parse(file_data)
	end
	return false, "Failed to read json data."
end

function FirmwareUtils:delete_fw_file()
	local path = self.PATH.DEVICE
	local stat = nixio.fs.stat(path)
	local owner_name = stat and nixio.getpw(stat.uid) and nixio.getpw(stat.uid).name or nil

	if owner_name == "rut_fota" then
		util.ubus("rut_fota", "delete_firmware")
	else
		os.execute(string.format("rm -f %q", path))
	end
end

return FirmwareUtils