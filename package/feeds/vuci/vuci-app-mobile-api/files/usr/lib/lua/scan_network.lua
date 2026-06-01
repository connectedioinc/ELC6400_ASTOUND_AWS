#!/usr/bin/lua

-- TODO: remove this file after migration to API
if not arg[1] then
    io.stderr:write("error: missing 'modem_id' argument\n")
    os.exit(1)
end

local modem_id = arg[1]
-- local parser = require "tlt_parser_lua"
local fs = require "nixio.fs"
local json = require "luci.jsonc"
local call = { modem = modem_id }
-- local results = parser:scan_network(call)
print(json.stringify(results))
