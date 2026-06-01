require("paths")
local lu = require("luaunit")
local auth = require("api/authentication")

mocker("vuci.util",
    {
        ubus = function(obj, method, args)
            if obj == "session" then
                if args.ubus_rpc_session == "bad" then
                    return {
                        access = false
                    }
                elseif  args.ubus_rpc_session == "no_session" then
                    return nil
                else
                    return {
                        access = true
                    }
                end
            end
        end
    }
)

function test_parse_token_no_token()
    local token = auth:parse_token_header()
    lu.assertNil(token)
end

function test_parse_token_incorrect_token()
    local token = auth:parse_token_header({ authorization = "sdasdasdasdaasddas" })
    lu.assertNil(token)
end

function test_parse_token_correct_token()
    local token_val = "asd123"
    local auth_header =  { authorization = "Bearer " ..token_val }
    local expected = {token = token_val, type = "rpcd"}
    local token = auth:parse_token_header(auth_header)
    lu.assertEquals(token, expected)
end

function test_authenticate_rpcd_correct()
    local info = {
        http_method = "PUT",
        path = "api"
    }
    local token_struct = {
        token = "aaa",
        type = "rpcd"
    }
    local token = auth:authenticate_rpcd(token_struct, info)
    lu.assertEquals(token, true)
end

function test_authenticate_rpcd_no_session()
    local info = {
        http_method = "PUT",
        path = "api"
    }
    local token_struct = {
        token = "no_session",
        type = "rpcd"
    }
    local token = auth:authenticate_rpcd(token_struct, info)
    lu.assertEquals(token, false)
end

function test_authenticate_rpcd_no_access()
    local info = {
        http_method = "PUT",
        path = "api"
    }
    local token_struct = {
        token = "bad",
        type = "rpcd"
    }
    local token = auth:authenticate_rpcd(token_struct, info)
    lu.assertEquals(token, false)
end


function test_authenticate_token_bulk_get_allowed()
    local info = {
        http_method = "GET",
        path = "api/test"
    }
    local token_struct = {
        token = "aaa",
        type = "rpcd"
    }
    local bulk_acls = {
        skip_auth = true,
        bulk_acl_results = {
            ["api/test/:read"] = true,
            ["api/test/:write"] = false
        }
    }
    local ok = auth:authenticate_token(token_struct, info, bulk_acls)
    lu.assertEquals(ok, true)
end

function test_authenticate_token_bulk_post_denied()
    local info = {
        http_method = "POST",
        path = "api/test"
    }
    local token_struct = {
        token = "aaa",
        type = "rpcd"
    }
    local bulk_acls = {
        skip_auth = true,
        bulk_acl_results = {
            ["api/test/:read"] = true,
            ["api/test/:write"] = false
        }
    }
    local ok = auth:authenticate_token(token_struct, info, bulk_acls)
    lu.assertEquals(ok, false)
end

function test_authenticate_token_bulk_post_allowed()
    local info = {
        http_method = "POST",
        path = "api/test"
    }
    local token_struct = {
        token = "aaa",
        type = "rpcd"
    }
    local bulk_acls = {
        skip_auth = true,
        bulk_acl_results = {
            ["api/test/:read"] = false,
            ["api/test/:write"] = true
        }
    }
    local ok = auth:authenticate_token(token_struct, info, bulk_acls)
    lu.assertEquals(ok, true)
end

function test_authenticate_token_bulk_fallback()
    local info = {
        http_method = "CUSTOM",
        path = "api/test"
    }
    local token_struct = {
        token = "aaa",
        type = "rpcd"
    }
    local bulk_acls = {
        skip_auth = true,
        bulk_acl_results = {
            ["api/test/:read"] = true,
            ["api/test/:write"] = false
        }
    }
    local ok = auth:authenticate_token(token_struct, info, bulk_acls)
    lu.assertEquals(ok, true)
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )