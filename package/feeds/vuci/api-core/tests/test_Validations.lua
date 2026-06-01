require("paths")
local lu = require("luaunit")
local v = require("api.Validations")
local json = require("json")

local function convert_name_to_func(name)
    return name:gsub(" ", "_")
end

-- lazy solution to find validation case file if test is run from file location or fron test "runner"
local case_file_fd = io.open("../../tests/validation_cases.json") or io.open("./validation_cases.json")
if not case_file_fd then
    error("Validation case file not found")
    return
end
local case_file = case_file_fd:read("*all")
local parsed_cases = json.parse(case_file)
if not parsed_cases then
    error("Failed to parse validation cases")
    return
end

for validator, body in pairs(parsed_cases.validators) do
    if not v[validator] then
        print("Validator does not exist: " .. validator)
    else
        for _, case in pairs(body.cases) do
            _G["test_"..validator.."_" .. convert_name_to_func(case.name)] = function ()
                local msg = string.format([[

      Validator: "%s"
      Case name: "%s"
Case test value: "%s"]], tostring(validator), tostring(case.name), tostring(case.test_value))
                if case.args then
                    lu.assertEquals(v[validator](v, case.test_value, unpack(case.args)), case.result, msg)
                else
                    lu.assertEquals(v[validator](v, case.test_value), case.result, msg)
                end
            end
        end
    end
end

local runner = lu.LuaUnit.new()
os.exit( runner:runSuite() )
