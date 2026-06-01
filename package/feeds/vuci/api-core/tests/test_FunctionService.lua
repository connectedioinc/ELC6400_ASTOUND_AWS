require("paths")
local lu = require("luaunit")
local FunctionService = require("api/FunctionService")

local function run_coroutine(func, self)
    local endpoint_coroutine = coroutine.create(func)
	local success, response = coroutine.resume(endpoint_coroutine, self)
    return success, response
end

local function contruct_expected_response(code, err_code, msg, src, critical)
    return {
        code = code,
        critical = critical,
        payload = {
            success = false,
            errors = {
                {
                    code = err_code,
                    error = msg,
                    source = src
                }
            }
        }
    }
end

function test_service_creation()
    local service = FunctionService:new()
    lu.assertIsTable(service)
end

function test_post_no_actions()
    local service = FunctionService:new()
    local success, response = run_coroutine(service.POST, service)
    lu.assertIsTrue(success)
    lu.assertIsTable(response)
    lu.assertEquals(response, contruct_expected_response("501", 100, "POST not implemented", "Request"))
end

function test_post_no_action_provided()
    local service = FunctionService:new()
    service.actions = {"action"}
    local success, response = run_coroutine(service.POST, service)
    lu.assertIsTrue(success)
    lu.assertIsTable(response)
    lu.assertEquals(response, contruct_expected_response("422", 101, "No action provided", "Validation", true))
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )