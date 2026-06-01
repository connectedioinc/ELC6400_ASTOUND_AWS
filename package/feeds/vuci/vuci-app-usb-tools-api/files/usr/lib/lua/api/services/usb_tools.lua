local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local usb_mod = require("vuci/usb")
local board = require("vuci.board")

if not board:has_usb() and not board:has_sd() then
    return nil
end

local function is_memory_expansion(devices, fs)
    for _, device in pairs(devices) do
        if device.in_use == "memexp" and device.fs == fs then
            return true
        end
    end
    return false
end

local function check_existance(self, mounted_devices, fs)
    local found = false
    local fs_array = {}
    for _, device in pairs(mounted_devices) do
        table.insert(fs_array, device.fs)
        if device.fs == fs then
            found = true
            break
        end
    end
    if not found then
        self:ResponseError({
            source = "Validation",
            code = 103,
            error = string.format("'%s' is not mounted. Mounted device: [%s]",
                fs,
                table.concat(fs_array, ", ")
            )
        })
    end
end

local function safe_remove(self)
    local data = self.arguments.data
    local mounted_devices = usb_mod:mounts()
    local memory_expansion = is_memory_expansion(mounted_devices, data.fs)
    check_existance(self, mounted_devices, data.fs)
    if memory_expansion then
        util.ubus("rpc-format", "sme", { args = {"--shrink"} }, 600)
    else
        util.ubus("rc", "init", { name = "samba", action = "stop" })
        util.ubus("rpc-format", "format", { args = {"unmount", data.fs} })
        util.ubus("rc", "init", { name = "samba", action = "start" })
    end
    self:ResponseOK()
end

local function format(self)
    local data = self.arguments.data
    local mounted_devices = usb_mod:mounts()
    check_existance(self, mounted_devices, data.fs)
    for _, device in pairs(mounted_devices) do
        if device.in_use and device.in_use ~= "-" and device.fs == data.fs then
            self:ResponseError({
                source = "Validation",
                code = 103,
                error = string.format("'%s' is in use and cannot be formatted",
                    data.fs
                )
            })
        end
    end
    local res = 0
    res = util.ubus("rpc-format", "format", {args={"exfat", data.fs}})
    if res and res.exit_code == "0" then self:ResponseOK() end
    self:add_critical_error(1, "Formatting failed.")
end

local flags = {
    delete = false,
    create = false,
    general_section = function (self)
        return self.uci:get_all("fstab", "@global[0]")[".name"]
    end
}

local usb = ConfigService:new(flags)

local remove_action = usb:action("safe_remove", safe_remove)
remove_action:option("fs").require = true

local remove_action = usb:action("format", format)
remove_action:option("fs").require = true

local s = usb:section("fstab", "global")
    local auto_sync = s:option("auto_sync")
        function auto_sync:validate(value)
            return self.dt:is_bool(value)
        end

    local auto_mount = s:option("auto_mount")
        function auto_mount:validate(value)
            return self.dt:is_bool(value)
        end

    local mount_flags_nosuid = s:option("mount_flags_nosuid")
        function mount_flags_nosuid:validate(value)
            return self.dt:is_bool(value)
        end

    local mount_flags_nodev = s:option("mount_flags_nodev")
        function mount_flags_nodev:validate(value)
            return self.dt:is_bool(value)
        end

    local mount_flags_noexec = s:option("mount_flags_noexec")
        function mount_flags_noexec:validate(value)
            return self.dt:is_bool(value)
        end

return usb
