require("paths")
local lu = require("luaunit")
local responder = require("api/responder")

function test_construct_create_class_ok()
    local resp = responder.ok_resp:new()
    lu.assertIsTable(resp)
    lu.assertEquals(resp.http_code, "200")
end

function test_construct_create_class_err()
    local resp = responder.err_resp:new()
    lu.assertIsTable(resp)
    lu.assertEquals(resp.http_code, "422")
end

function test_construct_full_ok_msg()
    local resp = responder.ok_resp:new():set_data({hello = "world"}):code("69"):retrieve()
    lu.assertEquals(resp, {code="69", payload={data={hello="world"}, success=true}})
end

function test_construct_full_err_msg()
    local expected_res = {
        code="69",
        payload={
            errors={{code="1", error="err", section="sec", source="src", value="val"}},
            success=false
        }
    }
    local resp = responder.err_resp:new():add_error("1", "err", "src", "sec", "val"):code("69"):retrieve()
    lu.assertEquals(resp, expected_res)
end

function test_many_errors()
    local expected_errors = {
        {code="1", error="err1", section="sec1", source="src1", value="val1"},
        {code="2", error="err2", section="sec2", source="src2", value="val2"},
        {code="3", error="err3", section="sec3", source="src3", value="val3"},
        {code="4", error="err4", section="sec4", source="src4", value="val4"},
        {code="5", error="err5", section="sec5", source="src5", value="val5"},
    }
    local iterations = 5
    local resp = responder.err_resp:new()
    for i=1,iterations do
        local str = tostring(i)
        resp:add_error(str, "err"..str, "src"..str, "sec"..str, "val"..str)
    end
    lu.assertEquals(#resp.response.errors, iterations)
    lu.assertEquals(resp:retrieve().payload.errors, expected_errors)
end

function test_many_messages()
    local expected_msgs = {
        {code="1", message="err1", source="src1"},
        {code="2", message="err2", source="src2"},
        {code="3", message="err3", source="src3"},
        {code="4", message="err4", source="src4"},
        {code="5", message="err5", source="src5"}
    }
    local iterations = 5
    local resp = responder.ok_resp:new()
    for i=1,iterations do
        local str = tostring(i)
        resp:add_message(str, "err"..str, "src"..str)
    end
    lu.assertEquals(#resp.response.messages, iterations)
    lu.assertEquals(resp:retrieve().payload.messages, expected_msgs)
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )