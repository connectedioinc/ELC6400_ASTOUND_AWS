require("paths")
local lu = require("luaunit")
local section_logic = require("api/section_logic")

function test__get_section_type_string()
    local config = "fake"
    local section_type = "fake_section"
    local sec = section_logic:new({}, config, section_type, nil)
    local resp = sec:_get_section_type()
    lu.assertEquals(resp, section_type)
end

function test__get_section_type_func()
    local config = "fake"
    local section_type = "fake_section"
    local sec = section_logic:new({}, config, function() return section_type end, nil)
    local resp = sec:_get_section_type()
    lu.assertEquals(resp, section_type)
end

function test__filter_pass()
    local config = "fake"
    local section_type = "fake_section"
    local sec = section_logic:new({}, config, section_type, nil)
    local resp = sec:_filter({[".type"] = section_type})
    lu.assertIsTrue(resp)
end

function test__filter_fail()
    local config = "fake"
    local section_type = "fake_section"
    local sec = section_logic:new({}, config, section_type, nil)
    local resp = sec:_filter({[".type"] = "other"})
    lu.assertIsFalse(resp)
end

function test_create_option()
    local config = "fake"
    local section_type = "fake_section"
    local sec = section_logic:new({}, config, section_type, nil)
    local opt = sec:option("opt_key")
    lu.assertIsTable(opt)
    lu.assertEquals(#sec.options, 1)
    lu.assertNotIsNil(sec.options[1]["opt_key"])
end


local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )