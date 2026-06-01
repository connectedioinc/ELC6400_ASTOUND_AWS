require("paths")
local lu = require("luaunit")
local board = require("vuci.board")

board.__reset()

local function load_paths_module(is_switch)
    board.__reset()
    board.__set_hw_flag("switch", is_switch or false)
    package.loaded["api/paths_register"] = nil
    return require("api/paths_register")
end

local function parse_default(url)
    return load_paths_module(false).parse_url(url)
end

local function parse_switch(url)
    return load_paths_module(true).parse_url(url)
end

function test_parse_url_empty()
    local res = parse_default("")
    lu.assertIsNil(res)
end

function test_parse_url_random()
    local res = parse_default("sfsafsafasdf")
    lu.assertIsNil(res)
end

function test_parse_url_correct()
    local key_vals, file_route = parse_default("/unauthorized/status")
    lu.assertIsTable(key_vals)
    lu.assertEquals(file_route, "/usr/local/usr/lib/lua/api/core/base_info")
end

function test_parse_url_correct_short_slash()
    local key_vals, file_route = parse_default("/unauthorized/status/")
    lu.assertIsTable(key_vals)
    lu.assertEquals(file_route, "/usr/local/usr/lib/lua/api/core/base_info")
end

function test_parse_url_correct_with_url_vars_2()
    local key_vals, file_route = parse_default("/wireguard/config")
    lu.assertEquals(key_vals.service_group, "config")
    lu.assertEquals(file_route, "/usr/local/usr/lib/lua/api/services/wireguard")
end

function test_parse_url_correct_with_url_vars()
    local key_vals, file_route = parse_default("/wireguard/bind/peers/config/sad")
    lu.assertEquals(key_vals.service_group, "config")
    lu.assertEquals(key_vals.binding, "bind")
    lu.assertEquals(key_vals.sid, "sad")
    lu.assertEquals(file_route, "/usr/local/usr/lib/lua/api/services/wireguard_peer")
end

function test_parse_url_correct_with_url_vars_with_slash()
    local key_vals, file_route = parse_default("/wireguard/bind/peers/config/sad/")
    lu.assertEquals(key_vals.service_group, "config")
    lu.assertEquals(key_vals.binding, "bind")
    lu.assertEquals(key_vals.sid, "sad")
    lu.assertEquals(file_route, "/usr/local/usr/lib/lua/api/services/wireguard_peer")
end

function test_parse_url_correct_with_url_vars_with_slash_2()
    local key_vals, file_route = parse_default("/wireguard/config/")
    lu.assertEquals(key_vals.service_group, "config")
    lu.assertEquals(file_route, "/usr/local/usr/lib/lua/api/services/wireguard")
end

function test_parse_url_correct_slash()
    local key_vals, file_route = parse_default("/unauthorized/status/")
    lu.assertIsTable(key_vals)
    lu.assertEquals(file_route, "/usr/local/usr/lib/lua/api/core/base_info")
end

function test_parse_url_version_prefix()
    local key_vals, file_route = parse_default("/v1/unauthorized/status")
    lu.assertIsTable(key_vals)
    lu.assertEquals(file_route, "/usr/local/usr/lib/lua/api/core/base_info")
end

function test_parse_url_switch_does_not_prefix()
    local key_vals, file_route = parse_switch("/unauthorized/status")
    lu.assertIsTable(key_vals)
    lu.assertEquals(file_route, "/usr/lib/lua/api/core/base_info")
end

function test_parse_url_switch_service_without_local_prefix()
    local key_vals, file_route = parse_switch("/wireguard/config")
    lu.assertEquals(key_vals.service_group, "config")
    lu.assertEquals(file_route, "/usr/lib/lua/api/services/wireguard")
end

local runner = lu.LuaUnit.new()
os.exit(runner:runSuite())
