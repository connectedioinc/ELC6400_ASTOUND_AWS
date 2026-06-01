require("paths")
local lu = require("luaunit")
local TableWrapper	= require("api/api_table_wrapper")

function test_table_section_anonymous()
    local testClass = TableWrapper:new()
    testClass:table_section("test_cfg", "test_type")
    lu.assertEquals(testClass.config_create_table["test_cfg"]["test_type"][1], {anonymous={}})
end

function test_table_section_anonymous_no_options()
    local testClass = TableWrapper:new()
    testClass:table_section("test_cfg", "test_type", nil, {})
    lu.assertEquals(testClass.config_create_table["test_cfg"]["test_type"][1], {anonymous={}})
end

function test_table_section_after_delete_1()
    local testClass = TableWrapper:new()
    testClass.config_delete_section_table = { test_cfg = { test_id = true } }
    testClass:table_section("test_cfg", "test_type", "test_id", {})
    lu.assertEquals(testClass.config_create_table["test_cfg"]["test_type"][1], {test_id={}})
    lu.assertEquals(testClass.config_delete_section_table["test_cfg"], {})
end

function test_table_section_after_delete_2()
    local testClass = TableWrapper:new()
    testClass.config_delete_section_table = { test_cfg = { test_id = true } }
    testClass:table_section("test_cfg", "test_type", "test_id", { test_option = "1" })
    lu.assertEquals(testClass.config_create_table["test_cfg"]["test_type"][1], { test_id = { test_option = "1" } })
    lu.assertEquals(testClass.config_delete_section_table["test_cfg"], {})
end

function test_table_section_after_delete_3()
    local testClass = TableWrapper:new()
    testClass.uci_configs = { test_cfg = { test_id = { test_option = "0", test_option1 = "3" } } }
    testClass.config_delete_section_table = { test_cfg = { test_id = true } }
    testClass.config_set_table = { test_cfg = { test_id = { test_option = "2" } } }
    testClass:table_section("test_cfg", "test_type", "test_id", { test_option = "1" })
    lu.assertEquals(testClass.config_create_table["test_cfg"]["test_type"][1], { test_id = { test_option = "1" } })
    lu.assertEquals(testClass.config_set_table, { test_cfg = { test_id = { test_option = "2", test_option1 = "" } } })
    lu.assertEquals(testClass.config_delete_section_table["test_cfg"], {})
end

function test_table_section_options()
    local testClass = TableWrapper:new()
    testClass:table_section("test_cfg", "test_type", "test_id", { test_option = "1" })
    lu.assertEquals(testClass.config_create_table["test_cfg"]["test_type"][1], {test_id={test_option="1"}})
end

function test_table_delete_after_set()
    local testClass = TableWrapper:new()
    testClass.config_set_table = { test_cfg = { test_id = { test_option = "1" } } }
    testClass:table_delete("test_cfg", "test_id")
    lu.assertEquals(testClass.config_set_table, { test_cfg = {} })
    lu.assertEquals(testClass.config_delete_section_table, { test_cfg = { test_id = true } })
end

function test_table_delete_option_after_set()
    local testClass = TableWrapper:new()
    testClass.config_set_table = { test_cfg = { test_id = { test_option = "1", test_option1 = "2" } } }
    testClass:table_delete("test_cfg", "test_id", "test_option1")
    lu.assertEquals(testClass.config_set_table, { test_cfg = { test_id = { test_option = "1", test_option1 = "" } } })
    lu.assertEquals(testClass.config_delete_section_table, {})
end

function test_table_delete_no_configs()
    local testClass = TableWrapper:new()
    testClass:table_delete("test_cfg", "test_id")
    lu.assertEquals(testClass.config_set_table, { test_cfg = {} })
    lu.assertEquals(testClass.config_delete_section_table, { test_cfg = { test_id = true } })
end

function test_table_delete_option_no_configs()
    local testClass = TableWrapper:new()
    testClass:table_delete("test_cfg", "test_id", "test_option")
    lu.assertEquals(testClass.config_set_table, { test_cfg = { test_id = { test_option = "" } } })
    lu.assertEquals(testClass.config_delete_section_table, {})
end

function test_table_set_errors()
    local testClass = TableWrapper:new()
    local ok, err = pcall(testClass.table_set)
    lu.assertStrContains(err, "Config not provided in table_set", testClass)
    local ok, err = pcall(testClass.table_set, testClass, "test_cfg")
    lu.assertStrContains(err, "Section not provided in table_set")
    local ok, err = pcall(testClass.table_set, testClass, "test_cfg", "test_id")
    lu.assertStrContains(err, "Option not provided in table_set")
    local ok, err = pcall(testClass.table_set, testClass, "test_cfg", "test_id", "test_option")
    lu.assertStrContains(err, "Value not provided in table_set")
end

function test_table_set_option()
    local testClass = TableWrapper:new()
    testClass:table_set("test_cfg", "test_id", "test_option", "2")
    lu.assertEquals(testClass.config_set_table, { test_cfg = { test_id = { test_option = "2" } } })
end

function test_table_set_empty_table()
    local testClass = TableWrapper:new()
    testClass:table_set("test_cfg", "test_id", "test_option", {})
    lu.assertEquals(testClass.config_set_table, { test_cfg = { test_id = { test_option = "" } } })
end

function test_table_set_after_delete()
    local testClass = TableWrapper:new()
    testClass.config_delete_section_table = { test_cfg = { test_id = true } }
    local ok, err = pcall(testClass.table_set, testClass, "test_cfg", "test_id", "test_option", "2")
    lu.assertStrContains(err, "Cannot set option value for deleted sections.")
end

function test_table_get_after_multiple_changes()
    local testClass = TableWrapper:new()
    testClass.uci_configs = { test_cfg = { test_id = { test_option = "1" }, test_id1 = { test_option = "1" } } }
    testClass.config_create_table = { test_cfg = { test_type = { [1] = { test_id2 = { test_option = "1" } } } } }
    testClass.config_set_table = { test_cfg = { test_id2 = { test_option = "2" } } }
    testClass.config_delete_section_table = { test_cfg = { test_id1 = true } }
    local result = testClass:table_get("test_cfg", "test_id")
    lu.assertEquals(result, { test_option = "1" })
    local result = testClass:table_get("test_cfg", "test_id", "test_option")
    lu.assertEquals(result, "1")
    local result = testClass:table_get("test_cfg", "test_id2", "test_option")
    lu.assertEquals(result, "2")
    local result = testClass:table_get("test_cfg", "test_id1", "test_option")
    lu.assertNil(result)
end

function test_merge_config_tables_after_create()
    local testClass = TableWrapper:new()
    testClass.config_create_table = { test_cfg = { test_type = { [1] = { test_id = { test_option = "1" } } } } }
    local expected = { test_cfg = { test_id = { [".name"] = "test_id", [".type"] = "test_type", test_option = "1" } } }
    lu.assertEquals(testClass:merge_config_tables(), expected)
end

function test_merge_config_tables_after_delete()
    local testClass = TableWrapper:new()
    testClass.uci_configs = { test_cfg = { test_id = { test_option = "1" }, test_id1 = { test_option = "1" } } }
    testClass.config_delete_section_table = { test_cfg = { test_id1 = true } }
    local expected = { test_cfg = { test_id = { test_option = "1" } } }
    lu.assertEquals(testClass:merge_config_tables(), expected)
end

function test_merge_config_tables_after_set()
    local testClass = TableWrapper:new()
    testClass.config_set_table = { test_cfg = { test_id = { test_option = "1" } } }
    local expected = { test_cfg = { test_id = { test_option = "1" } } }
    lu.assertEquals(testClass:merge_config_tables(), expected)
end

function test_merge_config_tables_after_multiple_changes_1()
    local testClass = TableWrapper:new()
    testClass.uci_configs = { test_cfg = { test_id = { test_option = "1" }, test_id1 = { test_option = "1" } } }
    testClass.config_create_table = { test_cfg = { test_type = { [1] = { test_id2 = { test_option = "1" } } } } }
    testClass.config_set_table = { test_cfg = { test_id1 = { test_option = "2" } } }
    local expected = {
        test_cfg = {
            test_id = { test_option = "1" },
            test_id1 = { test_option = "2" },
            test_id2 = { [".name"] = "test_id2", [".type"] = "test_type", test_option = "1" },
        }
    }
    lu.assertEquals(testClass:merge_config_tables(), expected)
end

function test_merge_config_tables_after_multiple_changes_2()
    local testClass = TableWrapper:new()
    testClass.uci_configs = { test_cfg = { test_id = { test_option = "1" }, test_id1 = { test_option = "1" } } }
    testClass.config_create_table = { test_cfg = { test_type = { [1] = { test_id2 = { test_option = "1" } } } } }
    testClass.config_set_table = { test_cfg = { test_id2 = { test_option = "2" } } }
    testClass.config_delete_section_table = { test_cfg = { test_id1 = true } }
    local expected = {
        test_cfg = {
            test_id = { test_option = "1" },
            test_id2 = { [".name"] = "test_id2", [".type"] = "test_type", test_option = "2" },
        }
    }
    lu.assertEquals(testClass:merge_config_tables(), expected)
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )
