require("paths")
local lu = require("luaunit")
local dispatcher = require("api/dispatcher_common")
require("api/standard_codes")
local fs_mock = require("nixio.fs")

mocker("vuci/log",
    {
        insert_eventslog = function (message) end
    }
)

function test_respond_request_no_response()
    local res = dispatcher:respond_request({
        success = false,
        response = nil
    })
    lu.assertIsNil(res)
end

function test_respond_request_success()
    local response = {
        code = "69",
        payload = {
            success = true,
            data = {
                hello = "world"
            },
            messages = {
                code = "1",
                msg = "msg",
                source = "source"
            }
        }
    }

    local res = dispatcher:respond_request({
        success = true,
        response = response
    })
    lu.assertEquals(res, response)
end

function test_respond_request_coroutine_fails()
    local response = "some error"
    local res = dispatcher:respond_request({
        success = false,
        response = response
    })

    local expected_result = {
        code = "500",
        payload = {
            success = false,
            errors = {
                {
                    code = 999,
                    source = "Lua",
                    error = "some error"
                }
            }
        }
    }
    lu.assertEquals(res, expected_result)
end


function test_respond_request_critical()
    local response = {
        code = "69",
        critical = true,
        payload = {
            success = false,
            errors = {
                {
                    code = "1",
                    error = "err",
                    source = "src"
                }
            }
        }
    }
    local res = dispatcher:respond_request({
        success = false,
        response = response
    })

    local expected_result = {
        code = "69",
        payload = {
            success = false,
            errors = response.payload.errors
        }
    }
    lu.assertEquals(res, expected_result)
end

-- this is a simple test of accessing the code branch for respond_request function
-- more intricate testing of `send_file` function will be done separately
function test_respond_request_file_not_found()
    local response = {
        file = {
            path = "",
            name = "name.exe",
            type = "spaghetti"
        },
    }
    local res = dispatcher:respond_request({
        success = true,
        response = response
    })

    lu.assertEquals(res, {
        code = "404",
        payload = {
            success = false,
            errors = {
                {
                    error = "File not found",
                    source= "Request"
                }
            }
        }
    })
end

local function create_file(path, content)
    local file = io.open(path, "w")
    file:write(content)
    file:close()
    fs_mock._files[path] = content
end

function test_send_file()
    local name = "test_file.txt"
    local path = "/tmp/" .. name
    create_file(path, "file_contents")
    local accum = ""
    local function sender(msg)
        accum = accum .. msg
    end
    local res = dispatcher:send_file(path, name, nil, sender, true)
    lu.assertEquals(accum, "Status: 200 OK\r\nContent-Type: text/plain\r\nContent-Disposition: attachment; filename=\"test_file.txt\"\r\n\r\nfile_contents")
    lu.assertIsNil(res)
end

function test_parse_query_missing()
    local query =  ""
    local tab = dispatcher:parse_query(query)
    lu.assertEquals(#tab, 0)
end

function test_parse_query_malformed()
    local query =  "q="
    local tab = dispatcher:parse_query(query)
    lu.assertEquals(#tab, 0)
end

function test_parse_query_malformed_with_ampersand()
    local query =  "q=&"
    local tab = dispatcher:parse_query(query)
    lu.assertEquals(#tab, 0)
end

function test_parse_query_correct_one_argument()
    local query =  "q=q"
    local tab = dispatcher:parse_query(query)
    lu.assertEquals(tab.q, "q")
end

function test_parse_query_correct_two_arguments()
    local query =  "q=q&b=b"
    local tab = dispatcher:parse_query(query)
    lu.assertEquals(tab.q, "q")
    lu.assertEquals(tab.b, "b")
end

function test_parse_query_correct_two_arguments_incorrect_one()
    local query =  "q=q&c=&b=b"
    local tab = dispatcher:parse_query(query)
    lu.assertEquals(tab.q, "q")
    lu.assertEquals(tab.b, "b")
    lu.assertEquals(tab.c, "")
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )
