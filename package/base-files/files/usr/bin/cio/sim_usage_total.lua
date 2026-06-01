--Version : 2.0
--Date :12/05/2026
--Updated to use UBUS instead of SQLite to avoid locking issues
---------------------------------------------------------------

local json = require "luci.jsonc"

-- Arguments
local sim = arg[1]
local us_rx_tx = arg[2]

-- Default values
if (sim == nil or (sim ~= '1' and sim ~= '2')) then
    sim = '1'
end

if (us_rx_tx == nil or (us_rx_tx ~='rx' and us_rx_tx ~= 'tx')) then
    us_rx_tx = 'rx'
end

-- Function to poll ubus
function get_usage_from_ubus(sim_index)
    local cmd = string.format("ubus call mdcollect get '{\"sim\": %s}'", sim_index)
    local handle = io.popen(cmd)
    if not handle then return nil end
    
    local result = handle:read("*a")
    handle:close()

    if result == "" then return nil end
    return json.parse(result)
end

local final_usage = 0
local max_retries = 5

for i = 1, max_retries do
    local usage_data = get_usage_from_ubus(sim)

    -- Check if data exists, contains our key, and the value is greater than 0
    if usage_data and usage_data[us_rx_tx] then
        local val = tonumber(usage_data[us_rx_tx])
        if val and val > 0 then
            final_usage = math.floor(val)
            break -- Exit the loop.
        end
    end

    -- If we reach here, data was 0, nil, or invalid. 
    -- Wait 1 second before the next attempt
    if i < max_retries then
        os.execute("sleep 1")
    end
end

-- If the loop finishes without 'break', final_usage remains 0
print(final_usage)

