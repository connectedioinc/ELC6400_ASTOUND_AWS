require("paths")
require("api/standard_codes")
HTTP_STATUS_CODES = {
    METHOD_NOT_ALLOWED = "405",
    NOT_FOUND          = "404",
    BAD_REQUEST        = "400"
}
local lu = require("luaunit")
local delete_logic = require("api/delete_logic")

local function delete_logic_new()
    local instance = {}
    setmetatable(instance, { __index = delete_logic })
    instance.add_error = function(_, code, message, source)
        coroutine.yield({
            code = code,
            message = message,
            source = source
        })
    end
    instance.add_critical_error = function(_, code, message, source)
        coroutine.yield({
            code = code,
            message = message,
            source = source
        })
    end
    return instance
end

local function validate_error(response, err_msg, err_code, source)
    -- print(lu.prettystr(response))
    lu.assertEquals(response.code, err_code)
    lu.assertEquals(response.message, err_msg)
    lu.assertEquals(response.source, source)
end

function test_validate_multiple_data()
    local testClass = delete_logic_new()
    testClass.flags = {
        delete = true
    }
    testClass.arguments = {}
    testClass.arguments.data = {
        "test1",
        "test2"
    }
    local func = coroutine.create(testClass.DELETE_validate)
    local _, response = coroutine.resume(func, testClass)
    lu.assertEquals(response, nil)
end

function test_validate_multiple_data_empty()
    local testClass = delete_logic_new()
    testClass.flags = {
        delete = true
    }
    testClass.arguments = {}
    testClass.arguments.data = {}
    local func = coroutine.create(testClass.DELETE_validate)
    local _, response = coroutine.resume(func, testClass)
    validate_error(response, "Invalid data structure, only an array is acceptable", 107, "Validation")
end

function test_validate_multiple_data_array_required()
    local testClass = delete_logic_new()
    testClass.flags = {
        delete = true
    }
    testClass.arguments = {}
    testClass.arguments.data = {
        one = "test",
        two = "test2"
    }
    local func = coroutine.create(testClass.DELETE_validate)
    local _, response = coroutine.resume(func, testClass)
    validate_error(response, "Invalid data structure, only an array is acceptable", 107, "Validation")
end

function test_validate_multiple_data_not_provided()
    local testClass = delete_logic_new()
    testClass.flags = {
        delete = true
    }
    testClass.arguments = {}
    local func = coroutine.create(testClass.DELETE_validate)
    local _, response = coroutine.resume(func, testClass)
    validate_error(response, "Deletion of whole configuration is not allowed", 112, "Validation")
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )