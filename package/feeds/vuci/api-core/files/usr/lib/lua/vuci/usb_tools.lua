local util = require "vuci.util"
local Device = {}

function Device:get_usb_devices()
    local dev_list = util.ubus("file", "exec", { command="ls", params={ "/dev/usb/" } }).stdout
    local devices = {}
    if dev_list then
        for s in dev_list:gmatch("[^\r\n]+") do
            table.insert(devices, "/dev/usb/" .. s)
        end
    end
    return devices
end

return Device