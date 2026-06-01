local Request = {}
Request.__index = Request

local util = require("vuci.util")
local auth = require("api.authentication")
local api_utils = require("api.api_utils")
local json = require("luci.jsonc")
local responder = require("api.responder")
local fs = require("nixio.fs")
local FormDataParser = require("api.formdata_parser")
local FormDataBlock = require("api.formdata_block")
local check_reserved_space = require("vuci.util_tlt").check_reserved_space
local get_mount_point = require("vuci.util_tlt").get_mount_point

local CONTENT_TYPE_JSON = "application/json"
local CONTENT_TYPE_FORM_DATA = "multipart/form-data"

local ERROR_CODES = {
	JSON_TOO_LARGE = 1,
	BODY_NOT_JSON = 2,
	AUTHENTICATION = 3,
	MALFORMED_CONTENT_TYPE = 4,
	FORMDATA_TOO_LARGE = 5,
	PARSE_FORMDATA = 6,
	INVALID_BODY = 7,
	FILE_NOT_FOUND = 8,
}
Request.ERROR_CODES = ERROR_CODES

-- used for json requests and NOT for multipart files
local MAX_JSON_REQUEST_SIZE_KB = 100
local MAX_JSON_REQUEST_SIZE = MAX_JSON_REQUEST_SIZE_KB * 1024

local FORMDATA_AVAILABLE_RAM_RESERVE = 1024 * 1024 * 3 -- 3MiB

function Request.init(opts)
	local self = setmetatable({}, Request)

	-- TODO: Remove uppercase names
	-- Will take a bit of time to double check that nothing breaks

	assert(opts.CONTENT_TYPE == nil or type(opts.CONTENT_TYPE) == "string")
	self.CONTENT_TYPE = opts.CONTENT_TYPE or ""

	assert(opts.PATH_INFO == nil or type(opts.PATH_INFO) == "string")
	self.PATH_INFO = opts.PATH_INFO or ""

	assert(opts.CONTENT_LENGTH == nil or type(opts.CONTENT_LENGTH) == "string")
	self.CONTENT_LENGTH = opts.CONTENT_LENGTH

	assert(type(opts.REQUEST_METHOD) == "string")
	self.REQUEST_METHOD = opts.REQUEST_METHOD

	assert(opts.token_struct == nil or type(opts.token_struct) == "table")
	self.token_struct = opts.token_struct

	return self
end

function Request.init_from_env(env, body_stream)
	assert(type(env) == "table")

	local self = Request.init{
		CONTENT_TYPE = env.CONTENT_TYPE,
		CONTENT_LENGTH = env.CONTENT_LENGTH,
		PATH_INFO = env.PATH_INFO,
		REQUEST_METHOD = env.REQUEST_METHOD
	}

	-- TODO: Remove uppercase names
	-- Will take a bit of time to double check that nothing breaks
	self.SERVER_ADDR      = env.SERVER_ADDR
	self.SERVER_PORT      = env.SERVER_PORT
	self.REMOTE_ADDR      = env.REMOTE_ADDR
	self.HTTPS            = env.HTTPS
	self.HEADERS          = env.headers

	self.QUERY            = Request.parse_query_string(env.QUERY_STRING)
	self.cookie_struct    = Request.parse_cookie_header(env.headers.cookie)

	self.token_struct = auth:parse_token_header(env.headers, self.cookie_struct, self)
	if self.token_struct and self.token_struct.basic_auth and self.token_struct.error then
		return nil, { code = ERROR_CODES.AUTHENTICATION, reason = self.token_struct.error }
	end

	self.formdata_blocks = nil

	if env.INTERNAL then
		self.body = env.BODY or ""
		self.remove_uploaded_file = env.DELETE_SOURCE
	else
		self.body_stream = body_stream
		assert(body_stream ~= nil)
	end

	return self
end

function Request:parse_body_as_json()
	local body
	if self.body_stream then
		body = Request.read_all_from_stream(self.body_stream, MAX_JSON_REQUEST_SIZE)
		if body == nil then
			return nil, { code = ERROR_CODES.JSON_TOO_LARGE }
		end

	elseif self.body then
		body = self.body
		if #body > MAX_JSON_REQUEST_SIZE then
			return nil, { code = ERROR_CODES.JSON_TOO_LARGE }
		end

	else
		assert(false, "Unreachable")
	end

	local json_str = (body and body ~= "") and body or "{}"
	local json_object, err = json.parse(json_str)
	if err then
		return nil, { code = ERROR_CODES.BODY_NOT_JSON, reason = err }
	end

	return json_object
end

function Request:parse_body_as_form_data()
	if self.formdata_blocks then
		return self.formdata_blocks
	end

	if self.body_stream then
		local available_ram = FormDataParser.get_available_ram_space()

		local boundary = Request.get_formdata_boundary(self.CONTENT_TYPE)
		if not boundary then
			return nil, { code = ERROR_CODES.MALFORMED_CONTENT_TYPE }
		end

		local expected_content_length = tonumber(self.CONTENT_LENGTH)
		assert(type(expected_content_length) == "number")

		local too_large = false
		local storage_path
		for _, path in ipairs(self.storage_paths) do
			if path:match("^/tmp") then
				too_large = expected_content_length > (available_ram - FORMDATA_AVAILABLE_RAM_RESERVE)
			else
				local mount_point = get_mount_point(path) or "/overlay"
				too_large = not check_reserved_space(expected_content_length / 1024, mount_point)
			end

			if not too_large then
				storage_path = path
				break
			end
		end

		local formdata_parser = FormDataParser.new(FORMDATA_AVAILABLE_RAM_RESERVE, "--" .. boundary, io.stdin, storage_path)
		if too_large then
			return nil, { code = ERROR_CODES.FORMDATA_TOO_LARGE }
		end

		self.formdata_blocks = {}
		local ok, err = formdata_parser:parse_blocks(expected_content_length, self.formdata_blocks)
		if not ok then
			return nil, { code = ERROR_CODES.PARSE_FORMDATA, reason = err }
		end

		return self.formdata_blocks

	elseif self.body then
		local body = self:parse_body_as_json()
		if body == nil or type(body.data) ~= "table" or api_utils:is_table_empty(body.data) then
			return nil, { code = ERROR_CODES.INVALID_BODY }
		end

		if not fs.access(body.data.file) then
			return nil, { code = ERROR_CODES.FILE_NOT_FOUND }
		end

		local data = body.data

		self.formdata_blocks = {}
		table.insert(
			self.formdata_blocks,
			FormDataBlock.init_regular("option", data.option or "temp_option")
		)

		for key, value in pairs(data) do
			if key ~= "option" and key ~= "file" then
				table.insert(
					self.formdata_blocks,
					FormDataBlock.init_regular(key, value)
				)
			end
		end

		local file_block = FormDataBlock.init_file(fs.basename(data.file), data.file)
		assert(file_block ~= nil)
		file_block.file_is_temporary = self.remove_uploaded_file
		table.insert(
			self.formdata_blocks,
			file_block
		)

		return self.formdata_blocks
	else
		assert(false, "Unreachable")
	end
end

function Request.error_to_response(err)
	assert(type(err) == "table")

	if err.code == Request.ERROR_CODES.JSON_TOO_LARGE then
		return responder.err_resp:new()
			:add_error(
				STD_CODES.NO_SPACE,
				("Request is too big. Requests bigger than %sKB are not parsed."):format(MAX_JSON_REQUEST_SIZE_KB),
				"Request"
			)
			:code("413"):retrieve()

	elseif err.code == Request.ERROR_CODES.BODY_NOT_JSON then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, err.reason, "JSON body")
			:code("400"):retrieve()

	elseif err.code == Request.ERROR_CODES.AUTHENTICATION then
		return responder.err_resp:new()
			:add_error(STD_CODES.LOGIN_FAILED, err.reason, "Authorization")
			:code("401"):retrieve()

	elseif err.code == ERROR_CODES.MALFORMED_CONTENT_TYPE then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "Content type not supported or malformed.", "Request")
			:code("400"):retrieve()

	elseif err.code == Request.ERROR_CODES.FORMDATA_TOO_LARGE then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "Request is too large", "Upload")
			:code("400"):retrieve()

	elseif err.code == Request.ERROR_CODES.PARSE_FORMDATA then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, err.reason, "Upload")
			:code("400"):retrieve()

	elseif err.code == Request.ERROR_CODES.INVALID_BODY then
		return responder.err_resp:new()
			:add_error(
				STD_CODES.INCORRECT_REQUEST,
				"Invalid or empty 'data' object in request body.",
				"Request"
			)
			:code("400"):retrieve()

	elseif err.code == Request.ERROR_CODES.FILE_NOT_FOUND then
		return responder.err_resp:new()
			:add_error(
				STD_CODES.INCORRECT_REQUEST,
				"Initial file doesn't exist.",
				"Request"
			)
			:code("400"):retrieve()

	else
		assert(false, "Unreachable")

	end
end

local function hex_to_char(x)
	return string.char(tonumber(x, 16))
end

local function unescape(url)
	return url:gsub("%%(%x%x)", hex_to_char)
end

local function parse_query_key_value_pair(text)
	local chunks = util.split(text, "=")

	-- only parse correct query key value pairs
	-- incorrect ones are simply ignored
	if #chunks < 2 then
		return nil, nil
	end

	local key = unescape(chunks[1])
	if key == "" then
		return nil, nil
	end

	local value = unescape(chunks[2])

	return key, value
end

function Request.parse_query_string(query_string)
	if not query_string or query_string == "" then
		return {}
	end

	local params = {}
	for _, key_value_pair in ipairs(util.split(query_string, "&")) do
		local key, value = parse_query_key_value_pair(key_value_pair)
		if key and value then
			if params[key] then
				if type(params[key]) ~= "table" then
					params[key] = { params[key] }  -- Convert existing value to a table
				end
				table.insert(params[key], value)
			else
				params[key] = value
			end
		end
	end

	-- TODO: Why is `api_utils:is_table_empty` needed? Investigate
	if api_utils:is_table_empty(params) then
		return {}
	end

	return params
end

function Request.parse_cookie_header(cookie_bundle_string)
	if not cookie_bundle_string or cookie_bundle_string == "" then
		return nil
	end

	local params = {}
	for _, v in ipairs(util.split(cookie_bundle_string, "; ")) do
		local chunks = util.split(v, "=")
		-- TODO: Shouldn't there be validation to see if `#chunks == 2`?
		-- Needs further investigation.
		local key = chunks[1]
		local value = chunks[2]
		if key and key ~= "" and value and value ~= "" then
			params[key] = value
		end
	end

	if api_utils:is_table_empty(params) then
		return nil
	end

	return params
end

function Request.read_all_from_stream(io_stream, max_size)
	-- this type of accumulation is faster than simply appending the string
	-- https://www.lua.org/pil/11.6.html "String Buffers"
	local file_read_size = 2^13 -- 8Kb buffer
	local size = 0

	-- Use string buffer for efficient string concatenation
	local string_buffer = {}
	while true do
		local block = io_stream:read(file_read_size)
		if not block or block == "" then
			break
		end

		size = size + #block
		if size > max_size then
			return nil
		end

		table.insert(string_buffer, block)
	end

	return table.concat(string_buffer)
end

local function split_once(text, needle)
	local needle_start, needle_end = text:find(needle)
	if needle_start and needle_end then
		local lhs = text:sub(1, needle_start-1)
		local rhs = text:sub(needle_end+1)
		return lhs, rhs
	end
end

-- Specification for formdata boundary format: https://www.rfc-editor.org/rfc/rfc2046#section-5.1.1
--
-- Excerpt from specification:
-- >
-- > boundary := 0*69<bchars> bcharsnospace
-- >
-- > bchars := bcharsnospace / " "
-- >
-- > bcharsnospace := DIGIT / ALPHA / "'" / "(" / ")" /
-- >                  "+" / "_" / "," / "-" / "." /
-- >                  "/" / ":" / "=" / "?"
-- >
--
function Request.get_formdata_boundary(content_type)
	local type_lhs, type_rhs = split_once(content_type, ";")
	if not type_lhs or not type_rhs then
		return nil
	end

	if type_lhs ~= CONTENT_TYPE_FORM_DATA then
		return nil
	end

	type_rhs = util.trim(type_rhs)
	local boundry_key = "boundary="
	if type_rhs:find(boundry_key) ~= 1 then
		return nil
	end

	-- TODO: Update validations for the allowed boundary strings to strictly match specification

	local boundary = type_rhs:sub(#boundry_key + 1)
	if boundary:find(" ") then
		-- TODO: This should not be an error, boudary strings are allowed to have spaces.
		-- Refer to specification
		return nil
	end

	-- Remove surrounding quotes if present, required by rfc2046
	if boundary:sub(1,1) == '"' and boundary:sub(-1) == '"' then
		boundary = boundary:sub(2, -2)
	end

	return boundary
end

return Request
