require("paths")
local lu = require("luaunit")
local json = require("json")
local dispatcher = require("api/dispatcher_lib")
local Request = require("api/request")
require("api/standard_codes")

local json_wrapped = {
    parse = function(...)
        return json.parse(...), nil
    end
}

local function validate_error(response, msg, code, source)
    local err = response.payload.errors[1]
    lu.assertEquals(err.code, code)
    lu.assertEquals(err.error, msg)
    lu.assertEquals(err.source ,source)
end

function test_get_boundry_incorrect_content_type()
    local content_type =  "aaa"
    local boundary = Request.get_formdata_boundary(content_type)
    lu.assertNil(boundary)
end

function test_get_boundry_incorrect_content_type_spaces()
    local content_type = "multipart/form-data; boundary=--------------------------307374218681091482452945 someinfo"
    local boundary = Request.get_formdata_boundary(content_type)
    lu.assertNil(boundary)
end

function test_get_boundry_missing_boundry()
    local content_type =  "multipart/form-data; b"
    local boundary = Request.get_formdata_boundary(content_type)
    lu.assertNil(boundary)
end

function test_get_boundry_correct()
    local content_type =  "multipart/form-data; boundary=--------------------------307374218681091482452945"
    local boundary = Request.get_formdata_boundary(content_type)
    lu.assertEquals(boundary, "--------------------------307374218681091482452945")
end

function test_parse_content_type_missing()
    local content_type =  ""
    local res_type, err = dispatcher:parse_content_type(content_type)
    lu.assertEquals(res_type, "")
    lu.assertTrue(err)
end

function test_parse_content_type_json()
    local content_type =  "application/json"
    local res_type, err = dispatcher:parse_content_type(content_type)
    lu.assertEquals(res_type, "application/json")
    lu.assertTrue(err)
end

function test_parse_content_type_multipart()
    local content_type =  "multipart/form-data; boundary=--------------------------307374218681091482452945"
    local res_type, err = dispatcher:parse_content_type(content_type)
    lu.assertEquals(res_type, "multipart/form-data")
    lu.assertTrue(err)
end

function test_parse_content_type_malformed()
    local content_type =  "multdsfsfsdffsd"
    local res_type, err = dispatcher:parse_content_type(content_type)
    lu.assertEquals(res_type, "")
    lu.assertFalse(err)
end

--  -------------------------- 

-- always accessible as router uses this route for initial info display in login
function test_validate_request_info_path()
    local info = Request.init{
        REQUEST_METHOD = "GET",
        PATH_INFO = "/unauthorized/status",
        CONTENT_LENGTH = "10"
    }
    local err = dispatcher:validate_request(info)
    lu.assertNil(err)
end

-- login must pass without problem as it does not require any additional validations
function test_validate_request_login()
    local info = Request.init{
        PATH_INFO =  "/login",
        REQUEST_METHOD = "GET"
    }
    local err = dispatcher:validate_request(info)
    lu.assertNil(err)
end

function test_validate_request_no_bearer()
    local info = Request.init{
        PATH_INFO =  "/route",
        REQUEST_METHOD = "GET"
    }
    local err = dispatcher:validate_request(info)
    lu.assertIsTable(err)
    validate_error(err, "Missing bearer token", STD_CODES.LOGIN_FAILED, "Authorization")
end

function test_validate_request_no_path()
    local info = Request.init{
        PATH_INFO =  "",
        REQUEST_METHOD = "GET",
        token_struct = {token = "token", type = "rpcd"}
    }
    local err = dispatcher:validate_request(info)
    lu.assertIsTable(err)
    validate_error(err, "Endpoint not specified", STD_CODES.INCORRECT_REQUEST, "Request")
end

function test_validate_request_no_bearerToken()
    local info = Request.init{
        PATH_INFO =  "",
        REQUEST_METHOD = "GET",
    }
    local err = dispatcher:validate_request(info)
    lu.assertIsTable(err)
    validate_error(err, "Missing bearer token", STD_CODES.LOGIN_FAILED, "Authorization")
end

-- out of all requests PUT must have a body and in turn content type
function test_validate_request_no_content_type_for_put()
    local info = Request.init{
        PATH_INFO = "/pont",
        REQUEST_METHOD = "PUT",
        CONTENT_LENGTH = "10",
        CONTENT_TYPE = "",
        token_struct = {token = "token", type = "rpcd"}
    }
    local err = dispatcher:validate_request(info)

    lu.assertIsTable(err)
    validate_error(err, "Content type must be provided",  STD_CODES.INCORRECT_REQUEST, "Request")
end

function test_validate_request_unsupported_http_method()
    local info = Request.init{
        PATH_INFO = "/pont",
        REQUEST_METHOD = "PATCH",
        CONTENT_LENGTH = "10",
        CONTENT_TYPE = "",
        token_struct = {token = "token", type = "rpcd"}

    }
    local err = dispatcher:validate_request(info)

    lu.assertIsTable(err)
    validate_error(err, "HTTP method not supported. Supported methods: [POST, PUT, GET, DELETE]",  STD_CODES.INCORRECT_REQUEST, "Request")
end


function test_validate_request_no_body_for_put()
    local info = Request.init{
        PATH_INFO = "/pont",
        REQUEST_METHOD = "PUT",
        CONTENT_TYPE = "adf",
        token_struct = {token = "token", type = "rpcd"},
        CONTENT_LENGTH = "0"
    }
    local err = dispatcher:validate_request(info)

    lu.assertIsTable(err)
    validate_error(err, "Missing request body",  STD_CODES.INCORRECT_REQUEST, "Request")
end

-- TODO finish tests, when dispatcher common works
-- function test_handle_request()
--     local body = '{"data": "labas"}'
--     local headers = {
--         authorization = "Bearer bear"
--     }
--     local env = {
--         CONTENT_TYPE = "application/json",
--         REQUEST_METHOD = "POST",
--         SERVER_ADDR = "192.168.1.1",
--         SERVER_PORT = "80",
--         REMOTE_ADDR = "1.1.1.1",
--         headers = headers,
--         CONTENT_LENGTH = #body,
--         PATH_INFO = "/info",
--         QUERY_STRING = "",
--         HTTPS = "off"
--     }
--     local function sender(msg)
--         print(msg)
--     end

--     local function reader()
--         return body
--     end

--     local res = dispatcher:handle_request(sender, json_wrapped, reader, env)

-- end


local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )
