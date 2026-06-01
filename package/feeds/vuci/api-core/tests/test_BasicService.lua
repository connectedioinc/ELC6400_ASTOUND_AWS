#!/usr/bin/env lua
package.path =  "../../tests/?.lua;" .. "../../tests/?.so;" .. package.path
require("paths")
local lu = require("luaunit")
local BasicService = require("api/BasicService")

local YIELDING_REPONSE = "yiealding function"

local function validate_error(response, err_msg, err_code, req_err_code, source)
    -- print(lu.prettystr(response))
    local err = response.payload.errors[1]
    lu.assertIsFalse(response.payload.success)
    lu.assertEquals(err.code, err_code)
    lu.assertEquals(err.error, err_msg)
    lu.assertEquals(err.source, source)
    lu.assertEquals(response.code, req_err_code)
end

local function validate_success(response, data, msg, code)
    local payload = response.payload
    lu.assertEquals(response.code, code)
    lu.assertEquals(payload.messages, msg)
    lu.assertEquals(payload.data.response, data)
    lu.assertIsTrue(payload.success)
end

function test_ResponseCreated()
    local testClass = BasicService:new()
    local func = coroutine.create(testClass.ResponseCreated)
    local data = "data"
    local message = {
        {
            code = "1",
            message = "message",
            source = "source"
        }
    }
	local _, response = coroutine.resume(func, testClass, data, message)
    validate_success(response, data, message, "201")
end

function test_ResponseOK()
    local testClass = BasicService:new()
    local func = coroutine.create(testClass.ResponseOK)
    local data = "data_value"
    local message = {
        {
            code = "1",
            message = "message",
            source = "source"
        }
    }
	local _, response = coroutine.resume(func, testClass, data, message)
    validate_success(response, data, message, "200")
end

function test_ResponseNotImplemented()
    local testClass = BasicService:new()
    local func = coroutine.create(testClass.ResponseNotImplemented)
    local error = "error_msg"
	local _, response = coroutine.resume(func, testClass, error)
    validate_error(response, error, 100, "501", "Request")
end

function test_ResponseNotFound()
    local testClass = BasicService:new()
    local func = coroutine.create(testClass.ResponseNotFound)
    local error = "error_msg"
	local _, response = coroutine.resume(func, testClass, error)
    validate_error(response, error, 122, "404", "Request")
end

function test_ResponseError_default()
    local testClass = BasicService:new()
    local func = coroutine.create(testClass.ResponseError)
    local error = "error_msg"
	local _, response = coroutine.resume(func, testClass, error)
    validate_error(response, error, 122, "422", "Request")
end

function test_ResponseError_custom()
    local testClass = BasicService:new()
    local func = coroutine.create(testClass.ResponseError)
    local code = 666
    local err_msg = "wow_custom"
    local src = "Best Request"
    local error = {
        code = code,
        error = err_msg,
        source = src
    }
	local _, response = coroutine.resume(func, testClass, error)
    validate_error(response, err_msg, code, "422", src)
end

function test_initialize_method_run_test()
    local testClass = BasicService:new()
    testClass.request_method = "POST"
    local func = coroutine.create(testClass.initialize_method)
	local succ, _ = coroutine.resume(func, testClass)
    lu.assertIsTrue(succ)
end

function test_initialize_method_undefined_method()
    local testClass = BasicService:new()
    testClass.request_method = "GLORP"
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    validate_error(response, string.format("%s not implemented", testClass.request_method), 100, "501", "Request")
end

local function init_custom_class(method)
    local testClass = BasicService:new()
    testClass.request_method = method
    testClass[method] = function ()
        coroutine.yield(YIELDING_REPONSE)
    end
    return testClass
end

function test_initialize_method_disabled_service_group_check()
    local testClass = init_custom_class("PUT")
    testClass.disable_service_group_check = true
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    lu.assertEquals(YIELDING_REPONSE, response)
end

function test_initialize_method_is_POST()
    local testClass = init_custom_class("POST")
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    lu.assertEquals(YIELDING_REPONSE, response)
end

function test_initialize_method_service_group_is_config()
    local testClass = init_custom_class("PUT")
    testClass.service_group = "config"
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    lu.assertEquals(YIELDING_REPONSE, response)
end

-- This checks the last "not implemented message" in the function
function test_initialize_method_failed_check()
    local testClass = init_custom_class("PUT")
    testClass.service_group = "gifnoc"
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    validate_error(response, string.format("%s not implemented", testClass.request_method), 100, "501", "Request")
end

local function init_custom_class_GET(service_group)
    local testClass = BasicService:new()
    testClass.request_method = "GET"
    testClass.service_group = service_group
    testClass["GET_TYPE_"..service_group] = function ()
        coroutine.yield(YIELDING_REPONSE)
    end
    return testClass
end

function test_initialize_method_GET_found()
    local testClass = init_custom_class_GET("config")
    testClass.flags = { global_settings = false }
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    lu.assertEquals(YIELDING_REPONSE, response)
end

function test_initialize_method_GET_found()
    local testClass = init_custom_class_GET("config")
    testClass.flags = { global_settings = false }
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    lu.assertEquals(YIELDING_REPONSE, response)
end

function test_initialize_method_GET_found_without_service_group()
    local testClass = init_custom_class("GET")
    testClass.flags = { global_settings = false }
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    lu.assertEquals(YIELDING_REPONSE, response)
end

function test_initialize_method_GET_found_with_service_group()
    local testClass = init_custom_class("GET")
    testClass.service_group = "aaaa"
    testClass.flags = { global_settings = false }
    local func = coroutine.create(testClass.initialize_method)
	local _, response = coroutine.resume(func, testClass)
    validate_error(response, string.format("Endpoint for '%s' not implemented.", testClass.service_group), 100, "501", "Request")
end

function test_MergeTables()
    local testClass = BasicService:new()
    local Table1 = { a = "1", b = "2", c = "3"}
    local Table2 = { d = "4", e = "5", f = "6"}
    local expected = { a = "1", b = "2", c = "3", d = "4", e = "5", f = "6"}
    lu.assertEquals(testClass:MergeTables(Table1, Table2), expected)
end

function test_MergeTables_overwrite()
    local testClass = BasicService:new()
    local Table1 = { a = "1", b = "2", c = "3"}
    local Table2 = { a = "4", e = "2", f = "6"}
    local expected = { a = "4", b = "2", c = "3", e="2", f = "6"}
    lu.assertEquals(testClass:MergeTables(Table1, Table2), expected)
end

function test_add_error_custom_sid()
    local testClass = BasicService:new()
    testClass.sid = "default_sid"
    local code = 1
    local error_msg = "hello"
    local source = "src"
    local custom_sid = "petras"
    testClass:add_error(code, error_msg, source, custom_sid)
    lu.assertEquals(#testClass.errors, 1)
    local retrieved_err = testClass.errors[1]
    lu.assertEquals(retrieved_err.code, code)
    lu.assertEquals(retrieved_err.error, error_msg)
    lu.assertEquals(retrieved_err.source, source)
    lu.assertEquals(retrieved_err.section, custom_sid)
end

function test_add_error_no_sid()
    local testClass = BasicService:new()
    testClass.sid = "default_sid"
    local code = 1
    local error_msg = "hello"
    local source = "src"
    testClass:add_error(code, error_msg, source)
    lu.assertEquals(#testClass.errors, 1)
    local retrieved_err = testClass.errors[1]
    lu.assertEquals(retrieved_err.code, code)
    lu.assertEquals(retrieved_err.error, error_msg)
    lu.assertEquals(retrieved_err.source, source)
    lu.assertEquals(retrieved_err.section, testClass.sid)
end

function test_add_critical_error()
    local testClass = BasicService:new()
    local err_func = coroutine.create(testClass.add_critical_error)
    local err_code = 100
    local err_msg = "crit_error"
    local err_src = "error_source"
    local http_code = "404"
	local _, response = coroutine.resume(err_func, testClass, err_code, err_msg, err_src, http_code)
    lu.assertEquals(response.critical, true)
    lu.assertEquals(#testClass.errors, 1)

    validate_error(response, err_msg, err_code, http_code, err_src)
end

function test_return_if_error_no_error()
    local testClass = BasicService:new()
    local err_func = testClass:return_if_error()
    lu.assertEquals(err_func, nil)
end

function test_return_if_error_with_error()
    local testClass = BasicService:new()
    local err_code = 100
    local err_msg = "crit_error"
    local err_src = "error_source"
    testClass:add_error(err_code, err_msg, err_src)
    local err_func = coroutine.create(testClass.return_if_error)
	local _, response = coroutine.resume(err_func, testClass)
    lu.assertEquals(response.critical, true)
    validate_error(response, err_msg, err_code, "422", err_src)
end

local function create_class_with_action()
    local testClass = BasicService:new()
    local function test()
        return "action response"
    end
    local action_key = "test_function"
    local test_action = testClass:action(action_key, test)
    return testClass, test_action
end

function test_POST_action_validate_no_options()
    local testClass, test_action = create_class_with_action()
    test_action:option("test")

    local err_func = coroutine.create(testClass.POST_action_validate)
	local _, response = coroutine.resume(err_func, testClass, test_action)
    lu.assertEquals(response.critical, true)
    validate_error(response, "No arguments provided for action", STD_CODES.NO_ACTION_ARGS, "422", "Validation")
end

-- validation succeeds, validation does not yield
function test_POST_action_validate_with_provided_option()
    local testClass, test_action = create_class_with_action()
    test_action:option("test")

    testClass.arguments.data = {}
    testClass.arguments.data["test"] = "test_value"

    local err_func = coroutine.create(testClass.POST_action_validate)
	local _, response = coroutine.resume(err_func, testClass, test_action)
    lu.assertEquals(response, nil)
end

-- validation succeeds, validation does not yield
function test_POST_action_validate_no_options_added()
    local testClass, test_action = create_class_with_action()

    local err_func = coroutine.create(testClass.POST_action_validate)
	local _, response = coroutine.resume(err_func, testClass, test_action)
    lu.assertEquals(response, nil)
end


local function validate_simple_error(err, err_msg, err_code, source)
    lu.assertEquals(err.code, err_code)
    lu.assertEquals(err.error, err_msg)
    lu.assertEquals(err.source, source)
end

function test_POST_action_validate_options_required_1()
    local testClass, test_action = create_class_with_action()
    local opt = test_action:option("test")
    opt.require = true

    testClass:POST_action_validate_options(test_action)
    lu.assertEquals(#testClass.errors, 1)
    validate_simple_error(testClass.errors[1], "Missing required option: " .. opt.api_key, STD_CODES.INVALID_OPT, opt.api_key)
end

function test_POST_action_validate_options_required_2()
    local testClass, test_action = create_class_with_action()
    local opt = test_action:option("test")
    opt.require = true

    local opt2 = test_action:option("test2")
    opt2.require = true

    testClass:POST_action_validate_options(test_action)
    lu.assertEquals(#testClass.errors, 2)
    validate_simple_error(testClass.errors[1], "Missing required option: " .. opt.api_key, STD_CODES.INVALID_OPT, opt.api_key)
    validate_simple_error(testClass.errors[2], "Missing required option: " .. opt2.api_key, STD_CODES.INVALID_OPT, opt2.api_key)
end

-- testing only one error as key values are not sorted so there is no guarantee
-- that the options will be read in the same order ar they were set
function test_POST_action_validate_options_invalid_options()
    local testClass, test_action = create_class_with_action()
    testClass.arguments.data = {}
    testClass.arguments.data["opt1"] = "test_value"

    testClass:POST_action_validate_options(test_action)
    lu.assertEquals(#testClass.errors, 1)
    validate_simple_error(testClass.errors[1], "Invalid option", STD_CODES.INVALID_OPT, "opt1")
end

function test_POST_action_validate_options_nested_options()
    local testClass, test_action = create_class_with_action()
    local opt = test_action:option("opt1")
    opt.list = true

    testClass.arguments.data = {}
    testClass.arguments.data["opt1"] = {{}}

    testClass:POST_action_validate_options(test_action)
    lu.assertEquals(#testClass.errors, 1)
    validate_simple_error(testClass.errors[1], "Nested arrays not supported.", STD_CODES.INVALID_OPT, opt.api_key)
end

function test_POST_action_validate_options_correct()
    local testClass, test_action = create_class_with_action()
    test_action:option("opt1")
    test_action:option("opt2")

    testClass.arguments.data = {}
    testClass.arguments.data["opt1"] = "hello"
    testClass.arguments.data["opt2"] = "hello"

    testClass:POST_action_validate_options(test_action)
    lu.assertEquals(#testClass.errors, 0)
end

function test_POST_action_validate_options_too_long()
    local testClass, test_action = create_class_with_action()
    local opt = test_action:option("opt1")
    opt.maxlength = 2

    testClass.arguments.data = {}
    testClass.arguments.data["opt1"] = "hello"

    testClass:POST_action_validate_options(test_action)
    lu.assertEquals(#testClass.errors, 1)
    validate_simple_error(testClass.errors[1], "Provided value is too long. Is 5 characters, but can be up to 2 characters", STD_CODES.INVALID_OPT, opt.api_key)
end

function test_POST_action_validate_options_too_short()
    local testClass, test_action = create_class_with_action()
    local opt = test_action:option("opt1")
    opt.minlength = 10

    testClass.arguments.data = {}
    testClass.arguments.data["opt1"] = "hello"

    testClass:POST_action_validate_options(test_action)
    lu.assertEquals(#testClass.errors, 1)
    validate_simple_error(testClass.errors[1], "Provided value is too short. Is 5 characters, but can not be shorter than 10 characters", STD_CODES.INVALID_OPT, opt.api_key)
end

function test_POST_action_validate_options_does_not_pass_value_validation()
    local testClass, test_action = create_class_with_action()
    local opt = test_action:option("opt1")

    testClass.arguments.data = {}
    testClass.arguments.data["opt1"] = "hello`"

    testClass:POST_action_validate_options(test_action)
    lu.assertEquals(#testClass.errors, 1)
    validate_simple_error(testClass.errors[1], "Value can not contain `,',\" or space.", STD_CODES.INVALID_OPT, opt.api_key)
end

function test_POST_action_happy_path()
    local testClass, test_action = create_class_with_action()

    testClass.sid = "test_function"
    local response = testClass:POST_action()
    lu.assertEquals(response, "action response")
    -- validate_simple_error(testClass.errors[1], "Value can not contain `,',\" or space.", STD_CODES.INVALID_OPT, opt.api_key)
end

function test_POST_action_no_sid()
    local testClass, test_action = create_class_with_action()

    local func = coroutine.create(testClass.POST_action)
	local _, response = coroutine.resume(func, testClass)
    validate_error(response, "No action provided. Available actions: [test_function]", 122, "404", "Request")
end

function test_POST_action_no_actions_assigned()
    local testClass = BasicService:new()
    testClass.sid = "action"

    local func = coroutine.create(testClass.POST_action)
	local _, response = coroutine.resume(func, testClass)
    validate_error(response, "Provided action is not available. Available actions: []", 122, "404", "Request")
end

function test_POST_action_incorrect_action_called()
    local testClass, _ = create_class_with_action()
    testClass.sid = "action"

    local func = coroutine.create(testClass.POST_action)
	local _, response = coroutine.resume(func, testClass)
    validate_error(response, "Provided action is not available. Available actions: [test_function]", 122, "404", "Request")
end

function test_UPLOAD_incorrect_path()
    local testClass = BasicService:new()
    testClass.service_group = "action"

    local func = coroutine.create(testClass.UPLOAD)
	local _, response = coroutine.resume(func, testClass)
    validate_error(response, "Incorrect upload path", 122, "422", "Request")
end

function test_UPLOAD_no_upload_logic()
    local testClass = BasicService:new()
    testClass.service_group = "config"

    local func = coroutine.create(testClass.UPLOAD)
	local _, response = coroutine.resume(func, testClass)
    validate_error(response, "File upload is not implemented", 100, "501", "Request")
end


local runner = lu.LuaUnit.new()
runner:setOutputType("text")
os.exit( runner:runSuite() )
