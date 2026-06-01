local FunctionService = require("api/FunctionService")
local md = require("vuci.modem")
local util = require("vuci.util")
local uci = require("vuci.uci")

local SIMSwitchStatus = FunctionService:new()

local SIM_SWITCH_STATUS = {}
for info in md:info_iterator() do
    local status = util.ubus("sim_switch", "status", { modem_id = info.usb_id })
    if status and type(status.rule_status) == "table" then
        for _, v in ipairs(status.rule_status) do
            table.insert(SIM_SWITCH_STATUS, {
                id = v.cfg,
                type = v.id,
                fail_count = v.fail_count or 0,
                max_fail = v.max_fail or 0,
                triggered = v.triggered
            })
        end
    end
end

local function get_sim_switch_status(config_id)
    if config_id and not uci:get("sim_switch", config_id) then
        return nil, "Invalid SIM switch configuration ID"
    end
    local data_set = {}
    for _, status in pairs(SIM_SWITCH_STATUS) do
        if not config_id or status.id == config_id then
            data_set[status.id] = data_set[status.id] or { rules = {} }
            table.insert(data_set[status.id].rules, {
                type = status.type,
                max_fail = status.max_fail,
                fail_count = status.fail_count,
                triggered = status.triggered
            })
        end
    end
    local data = {}
    for id, rules in pairs(data_set) do
        table.insert(data, { id = id, rules = rules.rules })
    end
    if not config_id then
        -- Sort the data based on the UCI order
        local order = uci:get("sim_switch") or {}
        table.sort(data, function(val_a, val_b)
            local a, b = val_a.id, val_b.id
            if not a or not b then return false end
            if not order[a] or not order[b] then return false end
            return (order[a][".index"] or 0) < (order[b][".index"] or 0)
        end)
    end
    return config_id and data[1] or data
end

function SIMSwitchStatus:GET()
    local config_id = self.sid
    local data, err = get_sim_switch_status(config_id)
    if not data then
        self:add_critical_error(STD_CODES.INVALID_SECTION, err, "URL", HTTP_STATUS_CODES.NOT_FOUND)
    end
    return self:ResponseOK(data)
end

return SIMSwitchStatus