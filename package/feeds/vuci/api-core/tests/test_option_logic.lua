require("paths")
local lu = require("luaunit")
local option_logic = require("api/option_logic")

mocker("nixio.fs",
    {
        stat = function (value)
            return {size = 10}
        end
    }
)

function test_new_option()
    local opt = option_logic:new({}, "key", {})
    lu.assertIsTable(opt)
end

function test__get()
    local opt_key = "key"
    local opt = option_logic:new({}, opt_key, {})
    opt.query_parameters = {}
    local value = "VAL"
    local sid = "sid_form_ice_age"
    local resp_table = {}
    opt:_get(value, sid, resp_table)
    lu.assertEquals(resp_table[opt_key], value)
end

function test__get_file()
    local opt_key = "file_10"
    local opt = option_logic:new({}, opt_key, {file = true})
    opt.query_parameters = {}
    local value = "VAL"
    local sid = "sid_form_ice_age"
    local resp_table = {}
    opt:_get(value, sid, resp_table)
    lu.assertEquals(resp_table[opt_key], value)
    lu.assertEquals(resp_table[opt_key..":file_size"], 10)
end

function test__get_list_single()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    opt.query_parameters = {}
    local value = "VAL"
    local sid = "sid_form_ice_age"
    local resp_table = {}
    opt:_get(value, sid, resp_table)
    lu.assertEquals(resp_table[opt_key], {value})
end

function test__get_list_multi()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    opt.query_parameters = {}
    local value = {"VAL", "PAL"}
    local sid = "sid_form_ice_age"
    local resp_table = {}
    opt:_get(value, sid, resp_table)
    lu.assertEquals(resp_table[opt_key], value)
end

-- function test__get_value()
--     local opt_key = "key"
--     local opt = option_logic:new({}, opt_key, {})
--     opt.current_data_block = {}
--     local value = "VAL"
--     local resp_table = {}
--     opt:_get_value(opt_key)
--     -- lu.assertEquals(resp_table[opt_key], value)
-- end

function test_validate_list_empty()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    local value = ""
    local resp, msg = opt:validate_list(value)
    lu.assertIsTrue(resp)
    lu.assertIsNil(msg)
end

function test_validate_list_empty_table()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    local value = {}
    local resp, msg = opt:validate_list(value)
    lu.assertIsTrue(resp)
    lu.assertIsNil(msg)
end

function test_validate_list_option_not_list()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {})
    local value = {}
    local resp, msg = opt:validate_list(value)
    lu.assertIsFalse(resp)
    lu.assertEquals(msg, "Option does not accept an array")
end

function test_validate_list_option_is_object()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    local value = {}
    value["1"] = "val1"
    value["2"] = "val2"
    value["a3"] = "val3"
    local resp, msg = opt:validate_list(value)
    lu.assertIsFalse(resp)
    lu.assertEquals(msg, "Option only accepts arrays")
end

function test_validate_list_loo_long()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    opt.list_length = 1
    local value = {"val1", "val2"}
    local resp, msg = opt:validate_list(value)
    lu.assertIsFalse(resp)
    lu.assertEquals(msg, string.format("Provided array of length %s exceeds allowed limit of %s values", #value, opt.list_length))
end

function test_validate_list_loo_short()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    opt.min_list_length = 3
    local value = {"val1", "val2"}
    local resp, msg = opt:validate_list(value)
    lu.assertIsFalse(resp)
    lu.assertEquals(msg, string.format("Provided array of length %s is less than the minimum required length of %s values", #value, opt.min_list_length))
end

function test_validate_list_option_allow_duplicates()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    opt.allow_duplicates = true
    local value = {"val1", "val2", "val1", "val2"}
    local resp, msg = opt:validate_list(value)
    lu.assertIsTrue(resp)
    lu.assertIsNil(msg)
end

function test_validate_list_option_disallow_duplicates_permutations()
    local opt_key = "list"
    local opt = option_logic:new({}, opt_key, {list = true})
    local value_array = {
        {"val1", "val1", "val2", "val2"},
        {"val1", "val2", "", "val1", "val2"},
        {"val1", "val2", "val1", "val2", "val3"},
        {"val1", "val2", "val1", "val2"},
        {"val1", "val2", "val1", "val2", "val2", "val2", "val2", "val2", "val2", "val2"},
    }
    for k, v in pairs(value_array) do
        local resp, msg = opt:validate_list(v)
        lu.assertIsFalse(resp)
        lu.assertEquals(msg, "No duplicate values allowed. Found duplicate values [val1, val2].")
    end
end

function test__general_validate_valid()
    local opt_key = "single"
    local opt = option_logic:new({}, opt_key, {})
    opt.dt = {}
    opt.dt.MAX_LENGTH_DEFAULT = 4086
    local value = "hello"
    local resp, msg = opt:_general_validate(value)
    lu.assertIsNil(resp)
    lu.assertIsNil(msg)
end

function test__general_validate_readonly()
    local opt_key = "single"
    local opt = option_logic:new({}, opt_key, {})
    opt.readonly = true
    local value = "hello"
    local resp, msg = opt:_general_validate(value)
    lu.assertIsFalse(resp)
    lu.assertEquals(msg, "Option is readonly")
end

function test__general_validate_empty_cfg_require()
    local opt_key = "single"
    local opt = option_logic:new({}, opt_key, {})
    opt.cfg_require = true
    local value = ""
    local resp, msg = opt:_general_validate(value)
    lu.assertIsFalse(resp)
    lu.assertEquals(msg, "Option can not be empty")
end

function test__general_validate_empty()
    local opt_key = "single"
    local opt = option_logic:new({}, opt_key, {})
    local value = ""
    local resp, msg = opt:_general_validate(value)
    lu.assertIsTrue(resp)
    lu.assertIsNil(msg)
end

-- runs but does not really test anything
function test_validate_requires()
    local opt_key = "single"
    local opt = option_logic:new({}, opt_key, {})
    opt.require = { ["1"] = "hello"}
    local value = "halo"
    local resp, msg = opt:validate_requires(value)
    lu.assertIsNil(resp)
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )