local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local board = require("vuci.board")
local nixio = require("nixio")

if not board:has_usb() and not board:has_sd() then
	return nil
end

local function call_ubus(args)
	local response, err = util.ubus("rpc-format", "sme", { args = args }, 600)
	return response and response or nil
end

local function status()
	local status = call_ubus({"--operation"})
	return status and util.trim(status.output) or "Unknown error"
end

local memory = FunctionService:new()
local function check_expansion(self)
	while true do
		local expansion_status = status()
		if expansion_status == "success" or expansion_status == "reboot" then
		local util_tlt = require("vuci.util_tlt")
		local forked = util_tlt.fork_exec_fn(function()
			util.ubus("rc", "init", { name = "dropbear", action = "stop" })
			util.ubus("rc", "init", { name = "uhttpd", action = "stop" })
			util.ubus("rpc-sys", "reboot", { args = { "-w" }, safe = true })
		end, { after_exit = true })
		if not forked then
			self:ResponseError("Failed to reboot device")
		end
			return self:ResponseOK("Router will reboot to finish memory expansion action")
		end
		nixio.nanosleep(0, 100000000) -- Wait for 100ms
	end
end

local function expand(self)
	if info() then
		self:add_critical_error(2, "Memory expansion is already enabled.")
	end
	local data = self.arguments.data
	local response = call_ubus({"--expand", data.storage})
	if response and response.exit_code ~= "0" then
		self:ResponseError({ error = response.output, return_code = response.exit_code })
	end
	check_expansion(self)
end

local function disable_expansion(self)
	if not info() then
		self:add_critical_error(1, "Memory expansion is already disabled.")
	end
	local response = call_ubus({"--shrink"})
	if response and response.exit_code ~= "0" then
		self:ResponseError({ error = response.output, return_code = response.exit_code })
	end
	check_expansion(self)
end

function info()
	local response = call_ubus({"--status"})
	return response and util.trim(response.output) ~= "unexpanded" or false
end

function check_existance(mounted_devices, fs)
	local found = false
	local fs_array = {}

	for _, device in pairs(mounted_devices) do
		table.insert(fs_array, device.fs)
		if device.fs == fs then
			found = true
			break
		end
	end
	local msg = string.format("'%s' is not an available storage device. Mounted devices: [%s]",
		fs,
		table.concat(fs_array, ", ")
	)
	return found, msg
end

local disable_expansion = memory:action("disable_expansion", disable_expansion)

local change_action = memory:action("enable_expansion", expand)
	local storage = change_action:option("storage")
	storage.require = true
	function storage:validate(value)
		local usb_mod = require("vuci/usb")
		local mounted_devices = usb_mod:mounts()
		local found, msg = check_existance(mounted_devices, value)
		return found, msg
	end

function memory:GET_TYPE_status()
	self:ResponseOK({ expansion_job_status = status(), expansion_enabled = info() })
end

return memory
