local FunctionService = require("api/FunctionService")
local fs = require("nixio.fs")

local HotspotLogs = FunctionService:new()

function HotspotLogs:GET_TYPE_status()
    local sqlite = require "vuci.sqlite".init()
    local db_path = "/var/run/chilli/hotspot.db"
    if not fs.access(db_path) then
        db_path = "/etc/chilli/hotspot.db"
    end
    local data, log = {}, {}
    local db = sqlite.database({ path = db_path })
    data = db:select(
        "SELECT username, ip, mac, input_octets, output_octets, sessiontime, start_time, terminate_cause, session FROM statistics;"
    )
    db:close()

    for i, v in ipairs(data) do
        log[i] = {
            username = v.username,
            ip = v.ip,
            mac = v.mac,
            input_octets = tostring(v.input_octets),
            output_octets = tostring(v.output_octets),
            sessiontime = tostring(v.sessiontime),
            start_time = v.start_time and os.date("%x %X", v.start_time) or "-",
            terminate_cause = tostring(v.terminate_cause),
            session = tostring(v.session)
        }
    end
    return self:ResponseOK(log)
end

return HotspotLogs
