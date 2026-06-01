
require("paths")
local lu = require("luaunit")
local base = require("api/BaseEndpoint")

function test_new()
    local endpoint = base:new()
    lu.assertIsTable(endpoint)
end

function test_init_success()
    local func_result = "result"
    local endpoint = base:new()
    endpoint.initialize_method = function()
        return func_result
    end
    local result = endpoint:init_endpoint()
    lu.assertIsTrue(result.success)
    lu.assertEquals(result.response, func_result)
end

function test_init_failure()
    local func_result = "error msg"
    local endpoint = base:new()
    endpoint.initialize_method = function()
        error(func_result)
    end
    local result = endpoint:init_endpoint()
    lu.assertIsFalse(result.success)
    lu.assertStrContains(result.response, func_result)
end


local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )
