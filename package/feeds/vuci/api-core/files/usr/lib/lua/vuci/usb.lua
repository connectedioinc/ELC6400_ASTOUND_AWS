local util = require("vuci.util")
local nixio = require("nixio")
local json = require("luci.jsonc")

local usb = {}

local function has_file_recursively(dir, filename, max_depth)
	if max_depth <= 0 then
		return false
	end

	local dir_items = nixio.fs.dir(dir)
	if dir_items then
		for dir_item in dir_items do
			if dir_item == filename then
				return true
			end

			local item_path = dir .. "/" .. dir_item

			if has_file_recursively(item_path, filename, max_depth - 1) then
				return true
			end
		end
	end

	return false
end

local function list_block_devices()
	local result = {}

	for path in nixio.fs.glob("/sys/block/*") do
		if has_file_recursively(path, "io_timeout", 2) then
			local block_device = path:match("^/sys/block/(.+)$")
			table.insert(result, "/dev/" .. block_device)
		end
	end

	return result
end

local function string_starts_with(haystack, needle)
	if #haystack < #needle then
		return false
	end

	return haystack:sub(1, #needle) == needle
end

--- After readonly filesystem was implemented in 7.14,
--- /mnt became a symlink to /tmp (on 7.14) or /usr/local/mnt (from 7.15)
---
--- Because of this linux system utilities link `mount` will now return a mount
--- point like `/usr/local/mnt/sda1` instead of `/mnt/sda1`. So in WebUI we need
--- counteract this change by renaming `/usr/local/mnt/sda1` back to `/mnt/sda1` so
--- that API users that don't experience a breaking change.
---
--- Be mindful about what `path` you are passing to this function, because this
--- will only do a dumb find & replace. It will not check if the specified path
--- points to a mounted USB device.
function usb:fixup_mount_point(path)
	path = path:gsub("^/usr/local/mnt/", "/mnt/")
	path = path:gsub("^/usr/local/mnt$", "/mnt")

	return path
end

--- List mounted USB devices. This will include SD cards, USB flash drives and so on. 
---
--- If you only need available mount points, you can use `:mount_points()`. It will
--- always be a faster function, because it doesn't check the available space on that device.
function usb:mounts()
	if not nixio.fs.access("/bin/fmt-usb-msd.sh") then
		-- Device doesn't have USB support, so it will never have USB mounts
		return {}
	end

	if #list_block_devices() == 0 then
		-- Currently there are no USB devices inserted
		--
		-- This check is prefferable to do because it is quick,
		-- the `/bin/fmt-usb-msd.sh` script is slowish. It takes around ~1s to finish.
		return {}
	end

	local result = {}

	local exec_result = util.ubus("file", "exec", { command="/bin/fmt-usb-msd.sh", params={"devices"}})
	local devices = json.parse(util.trim(exec_result.stdout or ""))
	for _, device in pairs(devices) do
		table.insert(result, {
			fs = device["dev"],
			used = device["used"],
			available = device["available"],
			percent = device["used_percentage"],
			mountpoint = usb:fixup_mount_point(device["mountpoint"]),
			in_use = device["in_use"] or "-",
			system_format = device["fs"],
			description = device["description"],
			label = device["label"],
			type = device["type"] == "internal" and "sd" or device["type"],

			-- This option should left as set for compability reasons,
			-- because in previous versions it was set. 
			blocks = "",
		})
	end

	return result
end

--- Lists mount points of mounted USB devices.
--- This funciton is faster then `:mounts()`, because it doesn't fetch the additional info about a USB device.
---
--- This is useful for validating a path that a user provided is on a mounted USB device.
function usb:mount_points()
	local result = {}

	local mount_result = util.ubus("file", "exec", { command="mount" })
	if not mount_result or mount_result.code ~= 0 then
		return result
	end

	local block_devices = list_block_devices()

	for line in mount_result.stdout:gmatch("[^\n]+") do
		local device, mount_point, _, _ = line:match("^(.+) on (.+) type (.+) %((.+)%)$")
		if device then
			for _, block_device in ipairs(block_devices) do
				if string_starts_with(device, block_device) then
					table.insert(result, usb:fixup_mount_point(mount_point))
					break
				end
			end
		end
	end

	return result
end

return usb
