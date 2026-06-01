local url_register = require("api.paths_register")
local auth = require("api/authentication")
local headers = require("api.headers")
local fs = require("nixio.fs")
local json = require("luci.jsonc")
local util = require("vuci.util")
local responder = require("api.responder")
local uci = require("vuci.uci")
local log = require("vuci/log")
local socket = require("socket")

local Request = require("api.request")

local lib = {}
lib.current_endpoint_methods = {}

-- DEPRECATED! Use `self:send_response`, it's the same
function lib:send_error(response, send)
	self:send_response(response, send)
	return false
end

-- DEPRECATED! Use `self:send_response_json`, it's the same
function lib:send_error_json(response, send)
	return self:send_response_json(response, send)
end

local whitelisted_routes = {
	["/login"] = true,
	["/bulk"] = true,
	["/unauthorized/status"] = true,
	["/site_manager/certificate/actions/download"] = true,
	["/refresh"] = true,
	["/jwt_login"] = true,
	["/logout"] = true,
}

local minimal_login_routes = {
	["/system/actions/change_password_firstlogin"] = "POST",
	["/ui/config/menu"] = "GET",
	["/users/acls/options"] = "GET",
	["/system/device/packages/status"] = "GET",
	["/session/status"] = "GET",

	["/system/config/general"] = "GET",
	["/system/device/status"] = "GET",
	["/password_policy/config"] = "GET",
}

-- parses paths and compares them to the available ones in the path index file.
-- if route exists but there is no adequate lua file - service is considered to be NOT installed
-- if there is no path then the request route is not correct - service does not exist
function lib:parse_path(token_struct, PATH_INFO, REQUEST_METHOD, local_call, bulk_acls)
	local file_not_found_error = responder.err_resp:new()
		:add_error(STD_CODES.INCORRECT_REQUEST, "Service does not exist in device" , "Request")
		:code("404"):retrieve()
	local route_not_found_error = responder.err_resp:new()
		:add_error(STD_CODES.INCORRECT_REQUEST, "Endpoint not implemented" , "Request")
		:code("404"):retrieve()
	local result_table, file_route = url_register.parse_url(PATH_INFO)

	if not result_table then
		return false, route_not_found_error, nil
	end
	if not file_route or not fs.access(file_route .. ".lua") then
		return false, file_not_found_error, nil
	end
	if not whitelisted_routes[PATH_INFO] and REQUEST_METHOD ~= "OPTIONS" then
		-- url bypass for fake versions
		local pattern = "^/v%d+/"
		if string.match(PATH_INFO, pattern) then
			PATH_INFO = string.gsub(PATH_INFO, pattern, "/")
		end
		local request_info = {
			path = PATH_INFO,
			http_method = REQUEST_METHOD
		}
		if not local_call then
			local authorized, err_msg, allowed_options, sensitive, password_change = auth:authenticate_token(token_struct, request_info, bulk_acls)
			result_table["sensitive"] = sensitive
			if allowed_options then
				result_table["allowed_options"] = allowed_options
			end
			if not authorized and err_msg then
				return false, responder.err_resp:new():add_error(err_msg.std_code, err_msg.message, "Authorization"):code(err_msg.http_code):retrieve(), nil
			end
			if minimal_login_routes[PATH_INFO] ~= REQUEST_METHOD and password_change then
				return false, responder.err_resp:new():add_error(password_change.std_code, password_change.message, "Authorization"):code("403"):retrieve(), nil
			end
		end
	end
	return true, result_table, file_route
end

-- delegates resonses depending on returned parameters
-- if critical error returns immediately
-- if file send the file
-- if no success means there is a lua or other code error - returns a 500  server error
-- otherwise it is a successful response
-- FIXME use reponse constructor
function lib:respond_request(endpoint_result, send, file_path, local_call)
	assert(type(endpoint_result) == "table")
	local co_error = endpoint_result.success
	local response = endpoint_result.response

	if not response then
		return nil
	end

	if response and response.critical then
		local response_construct = responder.err_resp:new():code(tostring(response.code))
		for _, err in pairs(response.payload.errors) do
			response_construct:add_error(err.code, err.error, err.source, err.section, err.value)
		end
		return response_construct:retrieve()
	end

	-- coroutine fails, due to error
	if not co_error then
		if endpoint_result.traceback then
			util.perror(endpoint_result.traceback)
		end

		if type(response) == "string" then
			-- Compiled lua will obfuscate error line and file
			local error_message = response:gsub("^(.-):(%d+):", "%2:"):gsub("^0:", "")
			if type(file_path) == "string" then
				error_message = file_path .. ":" .. error_message
			end
			log:insert_eventslog({
				table = "system", sender = "API",
				priority = "err", text = error_message
			})
		end
		return responder.err_resp:new()
			:add_error(STD_CODES.CODE_ERROR, response , "Lua")
			:code("500")
			:retrieve()
	end

	if response.file then
		if local_call then
			return self:send_file_json(response.file.path, response.file.remove_after_send)
		end
		return self:send_file(response.file.path, response.file.name, response.file.file_type, send, response.file.remove_after_send, response.file.content)
	end
	return { header = response.header, payload = response.payload, code = response.code or "200" }
end

-- rudamentary function to match file types to files, when sending them to a client
-- can be easily expanded if needed
function lib:find_file_type(name)
	local extension = name:match("%..*")
	if extension then
		extension = extension:sub(2, #name)
	end
	if extension == "tar.gz" then
		return "application/x-targz"
	elseif extension == "tar.zip" or extension == "zip" then
		return "application/x-zip-compressed"
	elseif extension == "tar.7z" or extension == "7z" then
		return "application/x-7z-compressed"
	elseif extension == "txt" then
		return "text/plain"
	end
	return "application/octet-stream"
end

-- reads provided path and send it to client if the file exists
function lib:send_file(path, name, file_type, send, delete_after_send, content)

	local function send_headers()
		send(string.format("Status: %s\r\n", headers.HTTP_HEADERS["200"]))
		send(string.format("Content-Type: %s\r\n", file_type and file_type or self:find_file_type(name)))
		send(string.format("Content-Disposition: attachment; filename=\"%s\"\r\n\r\n", name))
	end
	if path and fs.access(path) then
		send_headers()
		local file = io.open(path, "r")
		local buffer
		repeat
			buffer = file:read(headers.WRITE_BUFFER)
			if buffer then
				send(buffer)
			end
		until not buffer or #buffer <= 0
		file:close()
		if delete_after_send then
			fs.unlink(path)
		end
	elseif content then
		send_headers()
		send(content)
	else
		return responder.err_resp:new()
			:add_error(STD_CODES.FILE_NOT_FOUND, "File not found" , "Request")
			:code("404")
			:retrieve()
	end
end

local function generate_random_string(length)
	local charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

	local symbols = {}
	for _ = 1, length do
		local index = math.random(#charset)
		table.insert(symbols, charset:sub(index, index))
	end
	return table.concat(symbols)
end

-- Be careful of TOCTOU bugs when using this function!
-- This is NOT atomic.
local function generate_unique_filename(folder, name_length, max_attempts)
	for _ = 1, max_attempts do
		local path = folder .. "/" .. generate_random_string(name_length)
		if not fs.access(path) then
			return path
		end
	end

	return nil
end

-- reads provided path and returns file metadata and content as JSON if the file exists
function lib:send_file_json(path, delete_after_send)
	if not fs.access(path) then
		return responder.err_resp:new()
			:add_error(STD_CODES.FILE_NOT_FOUND, "File not found" , "Request")
			:code("404")
			:retrieve()
	end

	if delete_after_send then
		local download_folder = "/tmp/vuci-downloads"
		local success = fs.mkdirr(download_folder)
		assert(success)

		math.randomseed(math.floor(socket.gettime()))
		local temporary_path = generate_unique_filename(download_folder, 8, 10)
		if temporary_path == nil then
			return responder.err_resp:new()
				:add_error(STD_CODES.CODE_ERROR, "Failed to create a unique filename" , "Request")
				:code("400")
				:retrieve()
		end

		-- TODO: Remove this if check when it's guarenteed that all files which will be downloaded will have
		-- the correct permissions, so that API could move that file.
		-- Eventually failing to `fs.move` the file should become an error condition.
		if fs.move(path, temporary_path) then
			path = temporary_path
		end
	end

	return {
		code = "200",
		payload = {
			path = path,
			temporary = delete_after_send
		}
	}
end

--wrapper for a basic response
function lib:send_response(response, send)
	send(string.format("Status: %s\r\n", headers.HTTP_HEADERS[response.code]))
	if type(response.header) == "table" then
		for _, text in ipairs(response.header) do
			send(string.format(text .. "\r\n"))
		end
	end
	send("Content-Type: application/json\r\n\r\n")
	send(json.stringify(response.payload))
end

function lib:send_response_json(response)
	return json.stringify({
		http_code = tonumber(response.code),
		http_body = response.payload
	})
end

--wrapper for preflight response
function lib:send_preflight_response(send)
	send("Status: 204 No Content\r\n")
	send(string.format("Access-Control-Allow-Methods: %s\r\n", table.concat(lib.current_endpoint_methods, ", ")))
	send("Access-Control-Allow-Headers: Content-Type, Authorization\r\n")
	send("Access-Control-Max-Age: 86400\r\n")
	send("\r\n")
end

-- tries to load an endpoint
-- FIXME init endpoints with new, so tables are not cached through require
function lib:get_endpoint(file_path)
	-- Deletes cached module
	if file_path and package.loaded[file_path] then
		package.loaded[file_path] = nil
	end
	local endpoint = require(file_path)
	if not endpoint or type(endpoint) == "boolean" then
		return nil, responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, "Endpoint not implemented" , "Request")
			:code("404"):retrieve()
	end
	return endpoint, nil
end

local function get_user_username_rpcd(sid)
	local r = util.ubus("session", "get", {
		ubus_rpc_session = sid
	})
	if not r then return nil end
	return r.values and r.values.username or nil, r.values and r.values.group or nil
end

local function populate_user_info(endpoint, request_info, local_call)
	endpoint.user = {}
	-- requests is done internally through /sbin/api and there is no user
	if local_call or not request_info.token_struct then
		endpoint.user.username = "root"
		endpoint.user.group = "root"
		endpoint.user.sid = nil
		return
	end
	if request_info.token_struct.basic_auth then
		endpoint.user.username = request_info.token_struct.username
		endpoint.user.group = request_info.token_struct.group
	elseif request_info.token_struct.type == auth.token_types.rpcd then
		endpoint.user.username, endpoint.user.group = get_user_username_rpcd(request_info.token_struct.token)
		endpoint.user.sid = request_info.token_struct.token
	else
		local jwt = require("api.jwt")
		local _, payload, _ = jwt.decryptToken(request_info.token_struct.token)
		endpoint.user.jwt = true
		if payload and payload.tab then
			endpoint.user.username = payload.tab.username
			endpoint.user.group = payload.tab.group
		end
		endpoint.user.sid = nil
	end

	-- for uci logging with user details
	if endpoint.user.username then
		uci:set_session_username(endpoint.user.username)
	end
	local request_headers = endpoint.request_info.HEADERS
	if not request_info.token_struct.basic_auth and request_headers["referer"] then
		local page_name = request_headers["referer"]:gsub("^http[s]?://[^/]+", "")
		page_name = page_name:gsub("^" .. request_headers["host"], "")
		local access_res = util.ubus("session", "access", {
			ubus_rpc_session = endpoint.user.sid,
			scope = "access-group",
			object = page_name:sub(2),
			["function"] = "read"
		})
		if access_res and access_res.access then
			uci:set_page_name(page_name)
		end
	end
end

-- sets class variables for the endpoint.
-- provides information about the nature of the request and the route
function lib:populate_endpoint(RI, endpoint, result_table, bulk, local_call)
	endpoint.query_parameters = RI.QUERY
	-- FIXME there might be duplication of info as self.arguments are simply parsed Request info body
	endpoint.request_info     = RI
	populate_user_info(endpoint, RI, local_call)
	if local_call then endpoint.local_call = true end
	if bulk then endpoint.bulk = true end
	if result_table.sid then
		endpoint._single = true
	else
		endpoint._single = false
	end
	for arg, value in pairs(result_table) do
		endpoint[arg] = value
	end
end

function lib:partial_populate_endpoint(endpoint, BODY, REQUEST_METHOD, multipart_struct)
	endpoint.arguments = BODY
	endpoint.request_method = REQUEST_METHOD
	-- for now scoping is like this for multipart_struct
	endpoint.parser = function (user_callbacks)
		return require("api.file_upload")(user_callbacks, multipart_struct)
	end
	if REQUEST_METHOD == "OPTIONS" then
		lib.current_endpoint_methods = self:collect_available_methods(endpoint)
	end
end

function lib:collect_available_methods(self)
	local methods_map = {
		config = { "GET", "POST", "PUT", "DELETE" },
		actions = { "POST" }
	}
	local available_methods = methods_map[self.service_group] or { "GET" }

	if self.flags and self.flags.global_settings then
		available_methods = { "GET", "PUT" }
	elseif self.bulk then
		available_methods = { "POST" }
	end

	return available_methods
end

-- DEPRECATED! Use `Request.parse_cookie_header` directly
function lib:parse_cookie_header(cookies)
	return Request.parse_cookie_header(cookies)
end

-- basic query parser that constructs a table of keys and values
-- DEPRECATED! Use `Request.parse_query_string` directly
function lib:parse_query(query)
	return Request.parse_query_string(query)
end

return lib
