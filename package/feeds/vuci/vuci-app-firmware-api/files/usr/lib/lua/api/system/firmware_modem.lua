local FirmwareUtils = require("api.system.firmware_utils"):new()
local mdm = require("vuci.modem")
local fs = require("nixio.fs")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")

local ModemFirmware = {}
ModemFirmware.__index = ModemFirmware

-- Gets Modem firmware versions. Returns nil if no modems found.
---@return table | nil modem_list Modem firmwares and types.
function ModemFirmware:version()
	local modem_list = mdm:get_all_modems()
	if #modem_list > 0 then
		local modems = {}
		for _, modem in ipairs(modem_list) do
			if modem.id and modem.name then
				local version, cfg_version = mdm:get_fw_version(modem.id)
				table.insert(modems, {
					id = modem.id,
					type = modem.name,
					version = version,
					cfg_version = cfg_version
				})
			end
		end
		return modems
	end
	return nil
end

-- Verifies modem firmware file.
---@param path string Firmware file path.
---@return boolean status Verification status.
---@return string | nil error Error message.
function ModemFirmware:verify(path)
	if not fs.access(path) then
		return false, "Modem firmware file not found in the device."
	end
	local ok = util.ubus("file", "exec", {
		command = "/usr/bin/modem_upgrade",
		params = {
			"--check", "--file", path
		}
	})
	if ok and ok.code == 0 then
		return true
	end
	fs.unlink(path) -- remove modem fw if it fails to verify as it is not required
	return false, "Modem firmware validation failed."
end

-- Verifies and gets info of firmware file that is in the device.
---@param path string Firmware file path.
---@return boolean, string | table fw_info Firmware info table or false and error message.
function ModemFirmware:firmware_info(path)
	local valid, err = self:verify(path)
	if not valid then return valid, err end

	return {
		sha256 = FirmwareUtils:sha256sum(path),
		md5 = FirmwareUtils:md5sum(path),
		size = FirmwareUtils:file_size(path) or "0",
	}
end

-- Gets modem firmware updates from the server. Returns table with updates or N/A if it fails.
---@return string | table updates update data or N/A
function ModemFirmware:updates()
	util.ubus("rpc-dfota", "export_updates")
	local update_data = FirmwareUtils:read_json(FirmwareUtils.PATH.DFOTA_UPDATES)
	if not update_data or update_data.response == false then return "N/A" end
	local updates = {}
	if update_data.modems then
		for _, modem in ipairs(update_data.modems) do
			if modem.id then
				local has_update = modem.manufacturer == true and modem.update_exists == true
				table.insert(updates, {
					id = modem.usb_id,
					update_exists = has_update and "1" or "0"
				})
			end
		end
	end
	return updates
end

-- Starts modem upgrade using provided file
---@param path string Modem firmware file
---@return boolean status Modem upgrade status.
---@return nil | string error Error message.
function ModemFirmware:start_upgrade(path)
	local valid, err = self:verify(path)
	if not valid then return valid, err end

	local ok = util.ubus("file", "exec", {
		command = "/usr/bin/modem_upgrade",
		params = {
			"--file", path
		}
	})
	fs.unlink(path) -- Remove modem fw file after fail/success
	if ok and ok.code == 0 then
		if not util_tlt.fork_exec_fn(function()
			util.ubus("rpc-sys", "reboot", { args = { "-m" }, safe = true })
		end, { after_exit = true }) then
			return false, "Failed to reboot device"
		end
		return true
	end
	return false, "Modem upgrade failed."
end

return ModemFirmware