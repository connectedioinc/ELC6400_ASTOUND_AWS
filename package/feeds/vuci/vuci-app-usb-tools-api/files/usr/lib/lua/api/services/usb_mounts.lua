local FunctionService = require("api/FunctionService")
local usb_mod = require("vuci/usb")
local board = require("vuci.board")
if not board:has_usb() and not board:has_sd() then
    return nil
end

local USBMounts = FunctionService:new()

function USBMounts:GET_TYPE_options()
  local mounted_devices = usb_mod:mounts()
  self:ResponseOK(mounted_devices)
end

return USBMounts
