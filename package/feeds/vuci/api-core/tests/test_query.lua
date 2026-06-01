require("paths")
local lu = require("luaunit")
local query = require("api/query")


function test_query_limit_2()
    local init_sections = {
        {}, {}, {}, {}
    }
    local filtered_sections = query:limit({limit = 2}, init_sections)
    lu.assertEquals(#filtered_sections, 2)
end

function test_query_limit_0()
    local init_sections = {
        {}, {}, {}, {}
    }
    local filtered_sections = query:limit({limit = 0}, init_sections)
    lu.assertEquals(#filtered_sections, 0)
end

function test_query_offset()
    local init_sections = {
        {name = "1"}, {name = "2"}, {name = "3"}, {name = "4"}
    }
    local function check_configurations(lim, off, length, first_val)
        local params = {
                limit = lim,
                offset = off
            }
        local filtered_sections = query:offset(params, init_sections)
        lu.assertEquals(#filtered_sections, length)
        lu.assertEquals(filtered_sections[1].name, first_val)
    end

    local configurations = {
        {lim = 4, off = 1, length = 3, first_val = "2"},
        {lim = 1, off = 1, length = 1, first_val = "2"},
        {lim = 1, off = 0, length = 1, first_val = "1"},
        {lim = 0, off = 0, length = 4, first_val = "1"},
        {lim = 1, off = 3, length = 1, first_val = "4"},
        {lim = 2, off = 2, length = 2, first_val = "3"},
    }
    for _ ,v in pairs(configurations) do
        check_configurations(v.lim, v.off, v.length, v.first_val)
    end
end

function test_query_filter_success_one_param()
    local init_sections = {
        val1 = "1"
    }
    local params = {
        val1 = "1"
    }
    local filtered_sections = {}
    query:query_filter(params, init_sections, filtered_sections)
    lu.assertEquals(#filtered_sections, 1)
end

function test_query_filter_success_two_params()
    local init_sections = {
        val1 = "1",
        val2 = "2"
    }
    local params = {
        val1 = "1",
        val2 = "2"
    }
    local filtered_sections = {}
    query:query_filter(params, init_sections, filtered_sections)
    lu.assertEquals(#filtered_sections, 1)
end

function test_query_filter_fail_one_param()
    local init_sections = {
        val1 = "1"
    }
    local params = {
        val1 = "1hjk"
    }
    local filtered_sections = {}
    query:query_filter(params, init_sections, filtered_sections)
    lu.assertEquals(#filtered_sections, 0)
end

function test_query_filter_fail_two_params()
    local init_sections = {
        val1 = "1",
        val2 = "3"
    }
    local params = {
        val1 = "1",
        val2 = "2"
    }
    local filtered_sections = {}
    query:query_filter(params, init_sections, filtered_sections)
    lu.assertEquals(#filtered_sections, 0)
end

function test_query_filter_empty()
    local init_sections = {}
    local params = {
        val1 = "1",
        val2 = "2"
    }
    local filtered_sections = {}
    query:query_filter(params, init_sections, filtered_sections)
    lu.assertEquals(#filtered_sections, 0)
end


function test_query_slice()
    local init_sections = {
        {name = "1", [".index"] = 1},
        {name = "2", [".index"] = 2},
        {name = "3", [".index"] = 3},
        {name = "4", [".index"] = 4}
    }
    local params = {
        limit = 3
    }
    local filtered_sections = query:query_slice(params, init_sections)
    lu.assertEquals(#filtered_sections, 3)
    lu.assertEquals(filtered_sections[#filtered_sections][".index"], 3)
    lu.assertEquals(filtered_sections[#filtered_sections].name, "3")
end

function test_query_slice_offset()
    local init_sections = {
        {name = "1", [".index"] = 1},
        {name = "2", [".index"] = 2},
        {name = "3", [".index"] = 3},
        {name = "4", [".index"] = 4}
    }
    local params = {
        offset = 1,
        limit = 3
    }
    local filtered_sections = query:query_slice(params, init_sections)
    lu.assertEquals(#filtered_sections, 3)
    lu.assertEquals(filtered_sections[#filtered_sections][".index"], 4)
    lu.assertEquals(filtered_sections[#filtered_sections].name, "4")
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )