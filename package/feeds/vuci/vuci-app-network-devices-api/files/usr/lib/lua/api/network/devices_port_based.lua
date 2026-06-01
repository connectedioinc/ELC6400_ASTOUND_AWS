local fs = require("nixio.fs")
local board = require("vuci.board")

if not board:has_dsa() or not fs.access("/usr/lib/lua/api/network/vlan/port_based.lua") or board:is_X86() then
  return nil
end

local port_based = require("api/network/vlan/port_based")

function port_based:migrate_vlan() end

function port_based:update_bridge() end

return port_based
