local FunctionService = require("api/FunctionService")
local md = require("vuci.modem")
local util = require("vuci.util")

local SIMSwitchLog = FunctionService:new()

local SIM_SWITCH_LOG = {}
for info in md:info_iterator() do
    local status = util.ubus("sim_switch", "status", { modem_id = info.usb_id })
    if status and type(status.switch_log) == "table" then
        SIM_SWITCH_LOG[info.usb_id] = {}
        for _, v in ipairs(status.switch_log) do
            local is_esim = md:is_card_esim(info.usb_id, v.sim)
            local log_entry = {
                timestamp = v.timestamp,
                sim = v.sim,
                esim = is_esim and (v.esim and (v.esim + 1) or 1) or nil,
                triggered_rules = {},
            }
            for _, rule in ipairs(v.triggered_rules or {}) do
                table.insert(log_entry.triggered_rules, rule.id)
            end
            table.insert(SIM_SWITCH_LOG[info.usb_id], log_entry)
        end
    end
end

local function generate_log_entries(modem_id)
    local switch_log = SIM_SWITCH_LOG[modem_id]
    if not switch_log then
        return nil, "No log data found for modem"
    end
    return switch_log
end

function SIMSwitchLog:GET()
    local modem_id = self.sid
    local data = {}
    if modem_id then
        local ok, err = self.dt:check_modem(modem_id)
        if not ok then
            self:add_critical_error(STD_CODES.INVALID_SECTION, err, "URL", HTTP_STATUS_CODES.NOT_FOUND)
        end
        local log_data, err = generate_log_entries(modem_id)
        if not log_data then
            self:add_critical_error(STD_CODES.INVALID_SECTION, err, "LOG", HTTP_STATUS_CODES.NOT_FOUND)
        end
        data = log_data
    else
        for info in md:info_iterator() do
            local log_data, err = generate_log_entries(info.usb_id)
            if log_data then
                table.insert(data, {
                    modem = info.usb_id,
                    logs = log_data
                })
            else
                table.insert(data, {
                    modem = info.usb_id,
                    error = err,
                })
            end
        end
    end
    return self:ResponseOK(data)
end

return SIMSwitchLog