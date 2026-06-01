local util = require("vuci.util")
local headers = require("api.headers")
local disp_common = require("api.dispatcher_common")
local responder = require("api.responder")
local auth = require("api/authentication")
local fs = require "nixio.fs"
local nixio = require "nixio"

local FormDataParser = require("api.formdata_parser")
local Request = require("api.request")

-- init refresh token db if the "api.RefreshToken" module exists
do
	local ok, RefreshToken = pcall(require, "api.RefreshToken")
	if ok then
		RefreshToken:init_db()
	end
end

local REQUEST_CONTENT_TYPES = {
	JSON      = "application/json",
	MULTIPART = "multipart/form-data",
	EMPTY     = ""
}

-- caches jwt package check, so validation for every request can be quicker
local is_jwt = pcall(require, "api.jwt")

local lib = {}

local CORS_HEADER = "Access-Control-Allow-Origin: *"
local STRICT_TRANSPORT_SECURITY_HEADER = "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload"

function lib:load_endpoint(REQUEST_INFO, REQUEST_METHOD, PATH_INFO, bulk, local_call)
	local result, result_table, file_path = disp_common:parse_path(REQUEST_INFO.token_struct, PATH_INFO, REQUEST_METHOD, local_call)
	if not result then return nil, result_table end

	local endpoint, error = disp_common:get_endpoint(file_path)
	if not endpoint then return nil, error end

	-- FIXME too many arguments
	disp_common:populate_endpoint(REQUEST_INFO, endpoint, result_table, bulk, local_call)

	return endpoint, result_table, file_path
end

function lib:request_logic(sender, file_path, endpoint, REQUEST_METHOD, BODY, local_call, multipart_struct)
	-- FIXME too many arguments
	disp_common:partial_populate_endpoint(endpoint, BODY, REQUEST_METHOD, multipart_struct)
	local endpoint_result = endpoint:init_endpoint()
	return disp_common:respond_request(endpoint_result, sender, file_path, local_call)
end

-- parses content type for validation
-- for now supports JSON and multipart for file uploading
-- returns type, and true successfull
function lib:parse_content_type(content_type)
	if content_type:sub(1, #REQUEST_CONTENT_TYPES.JSON) == REQUEST_CONTENT_TYPES.JSON then
		return REQUEST_CONTENT_TYPES.JSON, true
	elseif content_type:sub(1, #REQUEST_CONTENT_TYPES.MULTIPART) == REQUEST_CONTENT_TYPES.MULTIPART then
		return REQUEST_CONTENT_TYPES.MULTIPART, true
	elseif content_type == "" then
		return REQUEST_CONTENT_TYPES.EMPTY, true
	end
	return REQUEST_CONTENT_TYPES.EMPTY, false
end


local whitelisted_routes = {
	["/login"] = true,
	["/jwt_login"] = true,
	["/refresh"] = true,
}

-- general validations required for sanity of the request
-- checks content types, http verbs and existance of body if it is always required
-- FIXME dispatcher should not check login endpoint, this is because there is no way
-- to tell the dispatcher that the endpoint can be used without authorization
-- paths_index should be extended to include such flags
function lib:validate_request(info, local_call)
	if info.PATH_INFO == "/unauthorized/status" or info.PATH_INFO == "/site_manager/certificate/actions/download" or info.REQUEST_METHOD == "OPTIONS" then
		return nil
	end

	if not local_call then
		local is_whitelisted = whitelisted_routes[info.PATH_INFO]
		local was_basic_auth_used = info.token_struct and info.token_struct.basic_auth

		-- Don't need to do validation checks for basic auth,
		-- because they were already checked during `Request.init_from_env` in `lib:handle_request`
		-- TODO: Move basic auth and token auth validation checks to be in a single place.
		if not was_basic_auth_used then
			if not is_whitelisted and not info.token_struct or
				(info.token_struct and not info.token_struct.token) then
				return responder.err_resp:new()
					:add_error(STD_CODES.LOGIN_FAILED, "Missing bearer token", "Authorization")
					:code("401"):retrieve()
			end

			if not is_whitelisted and not is_jwt and (not info.token_struct or
				(info.token_struct and info.token_struct.type == auth.token_types.jwt)) then
				return responder.err_resp:new()
					:add_error(STD_CODES.LOGIN_FAILED, "Incorrect bearer token", "Authorization")
					:code("401"):retrieve()
			end

			if info.bearer_token_type == auth.token_types.jwt and not whitelisted_routes[info.PATH_INFO] and
				#info.token_struct.token:split(".") ~= 3 then
				return responder.err_resp:new()
					:add_error(STD_CODES.LOGIN_FAILED, "Incorrect bearer token", "Authorization")
					:code("401"):retrieve()
			end
		end
	end

	if info.PATH_INFO == "" or info.PATH_INFO == "/" then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "Endpoint not specified" , "Request")
			:code("404"):retrieve()
	end

	if string.find(info.PATH_INFO, "//+") then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "Invalid endpoint structure" , "Request")
			:code("404"):retrieve()
	end

	if info.CONTENT_TYPE == "" and info.REQUEST_METHOD == "PUT" then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "Content type must be provided" , "Request")
			:code("400"):retrieve()
	end

	if not headers.SUPPORTED_HTTP_METHODS[info.REQUEST_METHOD] then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "HTTP method not supported. Supported methods: [POST, PUT, GET, DELETE]" , "Request")
			:code("501"):retrieve()
	end

	if info.REQUEST_METHOD == "PUT" and info.CONTENT_LENGTH and tonumber(info.CONTENT_LENGTH) <= 0 then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "Missing request body" , "Request")
			:code("404"):retrieve()
	end

	return nil
end

local function close_file_descriptor(fd, dev_null_mode)
	-- file:close() doesn't work so nixio.dup needs to be used a workaround.
	-- Standard lua library doesn't allow closing stdin and stdout
	local read_dev_null = io.open("/dev/null", dev_null_mode)
	nixio.dup(read_dev_null, fd)
end

local function launch_upload_watcher(storage_paths)
	local child_pid = nixio.fork()
	if child_pid > 0 then return end

	close_file_descriptor(nixio.stdout, "r")
	close_file_descriptor(nixio.stdin, "w")

	local parent_pid = nixio.getppid()
	if parent_pid ~= 1 then
		-- Wait until parent process stops
		while nixio.kill(parent_pid, 0) do
			nixio.nanosleep(1, 0)
		end
	end

	-- Cleanup any temporary files from form data parser
	for _, filename in ipairs(FormDataParser.list_temporary_files(storage_paths, parent_pid)) do
		if fs.access(filename) then
			fs.remove(filename)
		end
	end

	os.exit(0)
end

function lib:execute_request(sender, REQUEST_INFO, local_call)
	local err

	-- TODO: Remove global variable
	CONTENT_LENGTH = REQUEST_INFO.CONTENT_LENGTH
	CONTENT_TYPE = REQUEST_INFO.CONTENT_TYPE

	-- Validate base request
	err = self:validate_request(REQUEST_INFO, local_call)
	if err then
		return err
	end

	-- TODO: Shouldn't there be error checking for `self:parse_content_type`?
	local content_type = self:parse_content_type(REQUEST_INFO.CONTENT_TYPE)

	local request_body = {}
	local request_method = REQUEST_INFO.REQUEST_METHOD
	local multipart_struct = {}

	if request_method == "PUT" and content_type == REQUEST_CONTENT_TYPES.EMPTY then
		return responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "Content type not supported or malformed.", "Request")
			:code("400"):retrieve()
	end

	local endpoint, result_table, file_path = self:load_endpoint(
		REQUEST_INFO,
		request_method,
		REQUEST_INFO.PATH_INFO,
		false,
		local_call
	)
	if not endpoint then
		return result_table
	end

	if content_type == REQUEST_CONTENT_TYPES.MULTIPART then
		if request_method ~= "POST" then
			return responder.err_resp:new()
				:add_error(STD_CODES.INCORRECT_REQUEST, "Files can only be uploaded through a POST" , "Request")
				:code("400"):retrieve()
		end

		request_method = "UPLOAD"

		REQUEST_INFO.storage_paths = endpoint:UPLOAD_path()

		-- The watcher is required for cleaning up when an upload is cancelled
		-- It is impossible to detect if an upload was cancelled without using another process,
		-- because the main process gets killed/stopped immediately without warning.
		-- TODO: Update uhttpd to allow for a graceful shutdown
		if not local_call then
			launch_upload_watcher(REQUEST_INFO.storage_paths)
		end

		local formdata_blocks
		formdata_blocks, err = REQUEST_INFO:parse_body_as_form_data()
		if not formdata_blocks then
			return Request.error_to_response(err)
		end

		multipart_struct.formdata_blocks = REQUEST_INFO.formdata_blocks

	else
		if content_type == REQUEST_CONTENT_TYPES.JSON then
			request_body, err = REQUEST_INFO:parse_body_as_json()
			if not request_body then
				return Request.error_to_response(err)
			end
		end

		-- TODO: Don't these headers need to always be sent? Even for multipart content type.
		-- Needs further investigation.
		sender(CORS_HEADER .. "\r\n")
		if REQUEST_INFO.HTTPS == "on" then
			sender(STRICT_TRANSPORT_SECURITY_HEADER .. "\r\n")
		end
	end

	local response, result = self:request_logic(
		sender,
		file_path,
		endpoint,
		request_method,
		request_body,
		local_call,
		multipart_struct
	)
	if response then
		if request_method == "OPTIONS" and result ~= false then
			disp_common:send_preflight_response(sender)
		else
			return response
		end
	end

	-- TODO: What should be done if endpoint doesn't generate a response?
	-- Should a `assert(false, "Unreachable")` be used here?
end

function lib:handle_request(sender, body_stream, env)
	-- TODO: Remove `local_call`, any environment specific logic should be handled through `REQUEST_INFO`.
	-- Instead of hardcoding edge cases all through the API Core
	local local_call = env.INTERNAL ~= nil

	local REQUEST_INFO, err = Request.init_from_env(env, body_stream)
	if not REQUEST_INFO then
		return Request.error_to_response(err)
	end

	local response = lib:execute_request(sender, REQUEST_INFO, local_call)

	if REQUEST_INFO.formdata_blocks then
		FormDataParser.cleanup_form_blocks(REQUEST_INFO.formdata_blocks)
	end

	return response
end

return lib
