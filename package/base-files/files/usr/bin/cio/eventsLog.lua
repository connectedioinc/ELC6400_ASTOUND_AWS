-- Version: 1.0
-- Date: 09/11/2023
-- CIO Script to read events log from /log/logs.db
-- @param table_name 
-- @param name
-- @param text
-- @param offset
-- @param size
-- @return json
-- /usr/bin/lua /usr/bin/cio/eventsLog.lua 'events' 'SIM Switch' 'SIM1' 0 10
--------------------------------------------------------------------------------------
local CONST_LIMIT = 10
local CONST_OFFSET = 0
local table_name = arg[1]
local name = arg[2]
local text = arg[3]
local offset = arg[4]
local size = arg[5]

function isNumeric(value)
    return tonumber(value) ~= nil
end

function get_db()
    local sqlite = require "lsqlite3"
    local db_path = "/log/log.db"
    local db = sqlite.open(db_path)
    return db
end

if not table_name or (string.upper(table_name) ~= 'EVENTS' and string.upper(table_name) ~= 'CONNECTIONS') then
    table_name = 'EVENTS'
end

if not isNumeric(offset) then
    offset = CONST_OFFSET
end

if not isNumeric(size) then
    size = CONST_LIMIT
end

if not name or name == '' then
    name = nil
end

if not text or text == '' then
    text = nil
end

function write_to_file(file_path, content)
    local file = io.open(file_path, "w")

    if file then
        file:write(content)
        file:close()
    end
end

function get_events()
    local db = get_db()

    local query = ("SELECT * FROM '%s' "):format(table_name)
    
    if name then
        query = query .. ("WHERE NAME='%s'"):format(name)
    end
    
    if text then
        if name then
            query = query .. (" AND TEXT LIKE '%%%s%%'"):format(text)
        else
            query = query .. ("WHERE TEXT LIKE '%%%s%%'"):format(text)
        end
    end
    
    query = query .. (" LIMIT %d OFFSET %d"):format(size, offset)
    
    local result_content = {}
    for row in db:nrows(query) do
        local row_data = {}
        for key, value in pairs(row) do
            row_data[key] = value
        end
        table.insert(result_content, row_data)
    end

    local json_result = require("cjson").encode(result_content)
    print(json_result)
    write_to_file('/tmp/eventlog.log', json_result)
    db:close()
end

get_events()
