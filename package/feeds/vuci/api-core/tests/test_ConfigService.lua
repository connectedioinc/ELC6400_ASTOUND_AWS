require("paths")
local lu = require("luaunit")
local ConfigService = require("api/ConfigService")

local function validate_error(response, err_msg, err_code, req_err_code, source)
    local err = response.payload.errors[1]
    lu.assertIsFalse(response.payload.success)
    lu.assertEquals(err.code, err_code)
    lu.assertEquals(err.error, err_msg)
    lu.assertEquals(err.source, source)
    lu.assertEquals(response.code, req_err_code)
end

function test_get_abs_value_request_option()
    local testClass = ConfigService:new()
    testClass.arguments.data = {
        {
            id = "cfg0305fa",
            test_option = "option value"
        }
    }
    local response = testClass:getter_wrapped_abs_value("test_service", "cfg0305fa", "test_option")
    lu.assertEquals(response, "option value")
end

function test_get_abs_value_custom_get()
    local testClass = ConfigService:new()
    testClass.sections = {
        {
            options = {
                {
                    test_option = {
                        get = function()
                            return "option value"
                        end
                    }
                }
            }
        }
    }
    local response = testClass:getter_wrapped_abs_value("test_service", "cfg0305fa", "test_option")
    lu.assertEquals(response, "option value")
end

-- local function validate_error(response, msg, code, source, section)
--     local err = response.payload.errors[1]
--     lu.assertEquals(err.code, code)
--     lu.assertEquals(err.error, msg)
--     lu.assertEquals(err.source, source)
--     if section then
--         lu.assertEquals(err.section, section)
--     end
-- end

-- function test_parent_exists_binding()
--     local conf = {
--         test_name = {
--             [".name"] = "test_name",
--             [".type"] = "test_type"
--         },
--     }

--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig("test_config", conf)
--     testClass.binding = "test_name"
--     testClass.main_config = "test_config"
--     lu.assertEquals(testClass:parent_exists(), nil)
-- end

-- function test_parent_not_exists_binding()
--     local conf = {
--         test_name = {
--             [".name"] = "test_name",
--             [".type"] = "test_type"
--         },
--     }

--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig("test_config", conf)
--     testClass.binding = "test_name_not_exist"
--     testClass.main_config = "test_config"
--     local func = coroutine.create(testClass.parent_exists)
-- 	local success, response = coroutine.resume(func, testClass)
--     lu.assertTrue(success)
--     lu.assertIsTable(response)
--     validate_error(response, "Parent section 'test_name_not_exist' does not exist", STD_CODES.INVALID_SECTION, "UCI")
-- end

-- function test_exists()
--     local conf = {
--         test_name = {
--             [".name"] = "test_name",
--             [".type"] = "test_type"
--         },
--     }

--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig("test_config", conf)
--     testClass:section("test_config", "test_type")
--     testClass.sid = "test_name"
--     testClass:initialize_tables_config()

--     lu.assertEquals(testClass:Exists(), nil)
-- end

-- function test_not_exists()
--     local conf = {
--         test_name = {
--             [".name"] = "test_name",
--             [".type"] = "test_type"
--         },
--     }

--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig("test_config", conf)
--     testClass:section("test_config", "test_type")
--     testClass.sid = "test_name2"
--     testClass:initialize_tables_config()

--     local func = coroutine.create(testClass.Exists)
-- 	local success, response = coroutine.resume(func, testClass)
--     lu.assertTrue(success)
--     lu.assertIsTable(response)
--     validate_error(response, "Section: test_name2 for service does not exist", STD_CODES.INVALID_SECTION, "UCI", "test_name2")
-- end

-- function test_PUT_validate_section_exists()
--     local conf = {
--         test_name = {
--             [".name"] = "test_name",
--             [".type"] = "test_type"
--         },
--     }

--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig("test_config", conf)
--     testClass:section("test_config", "test_type")
--     testClass.sid = "test_name"
--     testClass:initialize_tables_config()

--     lu.assertEquals(testClass:PUT_validate_section(), nil)
-- end

-- function test_PUT_validate_section_not_exists()
--     local conf = {
--         test_name = {
--             [".name"] = "test_name",
--             [".type"] = "test_type"
--         },
--     }

--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig("test_config", conf)
--     testClass:section("test_config", "test_type")
--     testClass.sid = "test_name2"
--     testClass:initialize_tables_config()

--     local func = coroutine.create(testClass.PUT_validate_section)
-- 	local success, response = coroutine.resume(func, testClass)

--     lu.assertTrue(success)
--     lu.assertIsTable(response)
--     validate_error(response, "Section: test_name2 for service does not exist", STD_CODES.INVALID_SECTION, "UCI", "test_name2")
-- end

-- function test__get_config()
--     local conf = {
--         test_name = {
--             [".name"] = "test_name",
--             [".type"] = "test_type"
--         },
--     }
--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig("test_config", conf)
--     lu.assertEquals(testClass:_get_config("test_config"), nil)
-- end

-- function test_table_get()
--     local test_opt, test_config, test_name, test_type =
--     "test_value", "test_config", "test_name", "test_type"
--     local conf = {
--         test_name = {
--             [".name"] = test_name,
--             [".type"] = test_type,
--             test_opt = test_opt
--         },
--     }
--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig(test_config, conf)
--     lu.assertEquals(testClass:table_get(test_config, test_name, "test_opt"), test_opt)
-- end

-- function test_table_get_fail()
--     local test_opt, test_config, test_name, test_type =
--     "test_value", "test_config", "test_name", "test_type"
--     local conf = {
--         test_name = {
--             [".name"] = test_name,
--             [".type"] = test_type,
--             test_opt = test_opt
--         },
--     }
--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig(test_config, conf)
--     lu.assertEquals(testClass:table_get(test_config, test_name, "test_opt2"), nil)
-- end

-- function test_table_get_deleted_section()
--     local test_opt, test_config, test_name, test_type =
--     "test_value", "test_config", "test_name", "test_type"
--     local conf = {
--         test_name = {
--             [".name"] = test_name,
--             [".type"] = test_type,
--             test_opt = test_opt
--         },
--     }
--     local testClass = ConfigService:new()
--     testClass.t_func.config_delete_section_table[test_config] = {}
--     testClass.t_func.config_delete_section_table[test_config][test_name] = true
--     testClass.uci:MockConfig(test_config, conf)
--     lu.assertEquals(testClass:table_get(test_config, test_name, "test_opt"), nil)
-- end

-- function test_table_get_receive_request_value()
--     local test_opt, test_config, test_name, test_type =
--     "test_opt", "test_config", "test_name", "test_type"
--     local conf = {
--         test_name = {
--             [".name"] = test_name,
--             [".type"] = test_type,
--             test_opt = test_opt
--         },
--     }
--     local testClass = ConfigService:new()
--     testClass.t_func.config_set_table[test_config] = {}
--     testClass.t_func.config_set_table[test_config][test_name] = {}
--     testClass.t_func.config_set_table[test_config][test_name][test_opt] = "new_value"
--     testClass.uci:MockConfig(test_config, conf)
--     lu.assertEquals(testClass:table_get(test_config, test_name, test_opt), "new_value")
-- end


-- function test_table_foreach_after_delete()
--     local test_opt, test_config, test_name, test_type =
--     "test_opt", "test_config", "test_name", "test_type"
--     local conf = {
--         test_name = {
--             [".name"] = test_name,
--             [".type"] = test_type,
--             test_opt = test_opt
--         },
--         test_name2 = {
--             [".name"] = test_name.."2",
--             [".type"] = test_type,
--             test_opt = test_opt
--         },
--     }
--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig(test_config, conf)
--     testClass:table_delete(test_config, test_name.."2")
--     local section_count = 0
--     testClass:table_foreach(test_config, test_type, function (s)
--         section_count = section_count + 1
--     end)
--     lu.assertEquals(section_count, 1)
-- end

-- function test_table_foreach_after_section_creation()
--     local test_opt, test_config, test_name, test_type =
--     "test_opt", "test_config", "test_name", "test_type"
--     local conf = {
--         test_name = {
--             [".name"] = test_name,
--             [".type"] = test_type,
--             test_opt = test_opt
--         }
--     }
--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig(test_config, conf)
--     testClass:table_section(test_config, test_type, "new", { test_opt = "test_opt2", [".index"] = 1 })
--     local section_count = 0
--     testClass:table_foreach(test_config, test_type, function (s)
--         section_count = section_count + 1
--     end)
--     lu.assertEquals(section_count, 2)
-- end

-- function test_table_get_after_section_creation()
--     local test_opt, test_config, test_name, test_type =
--     "test_opt", "test_config", "test_name", "test_type"
--     local conf = {
--         test_name = {
--             [".name"] = test_name,
--             [".type"] = test_type,
--             test_opt = test_opt
--         }
--     }
--     local testClass = ConfigService:new()
--     testClass.uci:MockConfig(test_config, conf)
--     testClass:table_section(test_config, test_type, "new", { test_opt = "test_opt2"})
--     local new_section = testClass:table_get(test_config, "new")
--     lu.assertEquals(new_section, { [".name"] = "new", [".type"] = test_type, test_opt = "test_opt2"})
-- end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )
