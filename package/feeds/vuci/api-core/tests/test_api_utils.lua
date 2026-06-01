require("paths")
local lu = require("luaunit")
local api_utils = require("api/api_utils")

function test_is_table_empty_empty()
    local t = {}
    local res = api_utils:is_table_empty(t)
    lu.assertIsTrue(res)
end

function test_is_table_empty_array()
    local t = {"1", "2"}
    local res = api_utils:is_table_empty(t)
    lu.assertIsFalse(res)
end

function test_is_table_empty_key_values()
    local t = {a = "1", b = "2"}
    local res = api_utils:is_table_empty(t)
    lu.assertIsFalse(res)
end

function test_is_table_empty_nil()
    local t = nil
    local res = api_utils:is_table_empty(t)
    lu.assertIsTrue(res)
end

function test_is_table_empty_number()
    local t = 1
    lu.assertError(api_utils.is_table_empty, api_utils, t)
end

function test_is_array()
    local t = {"1", "2"}
    local res = api_utils:is_array(t)
    lu.assertIsTrue(res)
end

function test_is_array_table()
    local t = {a = "1", b = "2"}
    local res = api_utils:is_array(t)
    lu.assertIsFalse(res)
end

function test_is_array_nil()
    local t = nil
    local res = api_utils:is_array(t)
    lu.assertIsFalse(res)
end

function test_is_array_number()
    local t = 1
    local res = api_utils:is_array(t)
    lu.assertIsFalse(res)
end

function test_is_array_empty_table()
    local t = {}
    local res = api_utils:is_array(t)
    lu.assertIsFalse(res)
end

function test_table_length_array()
    local t = {"1", "2"}
    local res = api_utils:table_length(t)
    lu.assertEquals(res, 2)
end

function test_table_length_table()
    local t = {a = "1", b = "2"}
    local res = api_utils:table_length(t)
    lu.assertEquals(res, 2)
end

function test_table_length_empty_table()
    local t = {}
    local res = api_utils:table_length(t)
    lu.assertEquals(res, 0)
end

function test_table_length_nil()
    local t = nil
    lu.assertError(api_utils.table_length, api_utils, t)
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )