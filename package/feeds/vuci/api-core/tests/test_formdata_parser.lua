---@diagnostic disable: lowercase-global
require("paths")
local lu = require("luaunit")
require("api/standard_codes")

local poll_flags = {
    ["in"]  = 1,
    ["pri"] = 2,
    ["out"] = 4,
    ["err"] = 8,
    ["hup"] = 16,
    ["nval"] = 32
}

local function bitand(a, b)
    local result = 0
    local bitval = 1
    while a > 0 and b > 0 do
      if a % 2 == 1 and b % 2 == 1 then -- test the rightmost bits
          result = result + bitval      -- set the current bit
      end
      bitval = bitval * 2 -- shift left
      a = math.floor(a/2) -- shift right
      b = math.floor(b/2)
    end
    return result
end

mocker("nixio", {
    getpid = function()
        return 12345
    end,
    poll_flags = function (...)
        local flags = 0
        for i=1, select("#", ...) do
            flags = flags + poll_flags[select(i, ...)]
        end
        return flags
    end,
    poll = function(fds, timeout)
        assert(#fds == 1)
        if #fds[1].fd.__text_to_provide == 0 then
            fds[1].revents = poll_flags["hup"]
        else
            fds[1].revents = poll_flags["in"]
        end

        return 1
    end,
    bit = {
        band = bitand,
        check = function(a, b)
            return bitand(a, b) == b
        end
    }
})

mocker("vuci.util", {
    ubus = function (path, method)
        local ret
        if path == "system" and method == "info" then
            ret = {
                memory = {
                    free = 10000000,
                    available = 10000000
                }
            }
        end
        return ret
    end
})

local FormDataParser = require("api/formdata_parser")

local function new_io_interface(text_to_provide)
    local stdin = {}
    stdin.__text_to_provide = text_to_provide

    stdin.read = function(self, buffer)
        local new_text = stdin.__text_to_provide:sub(1, buffer)
        stdin.__text_to_provide = stdin.__text_to_provide:sub(buffer, #stdin.__text_to_provide)
        return new_text
    end

    stdin.setvbuf = function(self, mode, size)
    end

    return stdin
end

-- example request

-- ------WebKitFormBoundaryoEQhPlnbTEBWJAt9
-- Content-Disposition: form-data; name="option"

-- firmware
-- ------WebKitFormBoundaryoEQhPlnbTEBWJAt9
-- Content-Disposition: form-data; name="file"; filename="RUTX_T_F5871_00.07.03.266_WEBUI.bin"
-- Content-Type: application/octet-stream

-- content
-- ------WebKitFormBoundaryoEQhPlnbTEBWJAt9--

-- boundry can be anything as long as it starts with two dashes
local function helper_construct_multipart(boundry, file_table, file_name, file_content)
    local body = ""
    -- options
    for name, val in pairs(file_table) do
        body = body .. boundry .. "\r\n"
        body = body .. string.format('Content-Disposition: form-data; name="%s"\r\n', name)
        body = body .. "Content-Type: text/html\r\n"
        body = body .. "\r\n"
        body = body .. val .. "\r\n"
    end
    -- file
    if file_name then
        body = body .. boundry .. "\r\n"
        body = body .. string.format('Content-Disposition: form-data; name="file"; filename="%s"\r\n', file_name)
        body = body .. "\r\n"
        body = body .. file_content .. "\r\n"
    end

    -- boundries end with two dashes
    body = body .. boundry .. "--\r\n"
    return body
end

local function helper_init_request()
    local boundry = "--boundry"
    local text = "hello there, General Kenobi"

    local multipart_request = helper_construct_multipart(boundry, {}, "awesome.txt", text)
    local io_interface = new_io_interface(multipart_request)

    local form_blocks = {}
    local formdata_parser = FormDataParser.new(0, boundry, io_interface)
    local ok, err = formdata_parser:parse_blocks(#multipart_request, form_blocks)
    if not ok then
        return text, nil, err
    else
        return text, form_blocks
    end
end

local function read_file(path)
    local file = io.open(path, "rb")
    if not file then return nil end
    local content = file:read("*a")
    file:close()
    return content
end

function test_parser_simple_request()
    local text, form_blocks, err = helper_init_request()
    lu.assertIsTable(form_blocks)
    lu.assertIsNil(err)

    -- tmp_location is returned only so outside functions can delete the failed upload
    lu.assertIsString(form_blocks[1].content_filename)
    -- content must be the same
    lu.assertEquals(read_file(form_blocks[1].content_filename), text)

    FormDataParser.cleanup_form_blocks(form_blocks)
end

function test_parser_request_values()
    local additional_values = {
        opt1 = "value1",
        opt2 = "value2",
        opt3 = "value3",
    }

    local boundry = "--boundry"
    local text = "hello there, General Kenobi"

    local form_blocks = {}
    local multipart_request = helper_construct_multipart(boundry, additional_values, "awesome.txt", text)
    local io_interface = new_io_interface(multipart_request)
    local formdata_parser = FormDataParser.new(0, boundry, io_interface)
    local ok, err = formdata_parser:parse_blocks(#multipart_request, form_blocks)
    lu.assertIsTrue(ok)
    lu.assertIsNil(err)

    for name, additional_value in pairs(additional_values) do
        for _, form_block in ipairs(form_blocks) do
            if form_block.content_disposition.name == name then
                lu.assertEquals(additional_value, form_block.content)
                break
            end
        end
    end

    FormDataParser.cleanup_form_blocks(form_blocks)
end

function test_parser_incorrect_upload_request()
    local form_blocks = {}
    local multipart_request = "--boundry \n stuff \r\n --boundry--"
    local io_interface = new_io_interface(multipart_request)
    local formdata_parser = FormDataParser.new(0, "--boundry", io_interface)
    local ok, err = formdata_parser:parse_blocks(#multipart_request, form_blocks)
    lu.assertIsFalse(ok)
    lu.assertIsString(err)

    FormDataParser.cleanup_form_blocks(form_blocks)
end

-- boundries do not match
function test_parser_malformed_request()
    local form_blocks = {}
    local multipart_request = "--boun \n stuff \r\n --boundry--"
    local io_interface = new_io_interface(multipart_request)
    local formdata_parser = FormDataParser.new(0, "--boundry", io_interface)
    local ok, err = formdata_parser:parse_blocks(#multipart_request, form_blocks)
    lu.assertIsFalse(ok)
    lu.assertIsString(err)

    FormDataParser.cleanup_form_blocks(form_blocks)
end

function test_file_not_provided()
    local form_blocks = {}
    local boundry = "--boundry"
    local multipart_request = helper_construct_multipart(boundry, {val="val"}, nil, nil)
    local io_interface = new_io_interface(multipart_request)
    local formdata_parser = FormDataParser.new(0, "--boundry", io_interface)
    local ok, err = formdata_parser:parse_blocks(#multipart_request, form_blocks)
    lu.assertIsTrue(ok)
    lu.assertIsNil(err)

    FormDataParser.cleanup_form_blocks(form_blocks)
end

local runner = lu.LuaUnit.new()
os.exit(runner:runSuite() )
