local headers = require("api.headers")
local util = require("vuci.util")
require("api/standard_codes")
local auth = {}

-- Helper for path normalization (strip query params, ensure trailing slash)
local function normalize_path(path)
	if type(path) == "string" then
		local qpos = path:find("?", nil, true)
		if qpos then
			path = path:sub(1, qpos - 1)
		end
		if path:sub(#path, #path) ~= "/" then
			path = path .. "/"
		end
	end
	return path
end

auth.token_types = {
	rpcd = "rpcd",
	jwt = "jwt"
}

local error_messages = {
	[1] = { message = "Unauthorized", http_code = "403", std_code = STD_CODES.UNAUTHORIZED },
	[2] = { message = "Expired bearer token", http_code = "401", std_code = STD_CODES.INVALID_TOKEN },
	[3] = { message = "Malformed or incorrect token", http_code = "401", std_code = STD_CODES.INVALID_TOKEN },
}

-- Bulk ACL check for multiple endpoints, skipping per-endpoint session lookup
function auth:authenticate_bulk_rpcd(token_struct, endpoint_paths)
	-- Prepare batch checks for all endpoints (read/write)
	local checks = {}
	for _, path in ipairs(endpoint_paths) do
		local complete_path = normalize_path(path)
		table.insert(checks, { object = complete_path, ["function"] = "read" })
		table.insert(checks, { object = complete_path, ["function"] = "write" })
	end
	local r = util.ubus("session", "access", {
		ubus_rpc_session = token_struct.token,
		scope = "api",
		checks = checks
	})
	if not r or not r.results then
		return nil, error_messages[2]
	end
	-- Return a table mapping endpoint:function to access (true/false)
	return r.results, nil
end

local function parse_basic_auth_header(header, env)
	local uci = require("vuci.uci").cursor()
	if not header or not header.authorization then return nil end
	if header.authorization:sub(1,6) ~= "Basic " then return nil end
	local token_array = util.split(header.authorization, " ")
	if token_array[1] ~= "Basic" or not token_array[2] or token_array[2] == "" then return nil end
	local decoded = util.frombase64(token_array[2])
	if not decoded then return nil end
	local separator = decoded:find(":", nil, true)
	if not separator then return nil end
	local http_basic_enabled = uci:get("uhttpd", "main", "enable_basic_auth") == "1"
	if not http_basic_enabled then
		return { error = "HTTP Basic Authorization is disabled", basic_auth = true }
	end
	local username = decoded:sub(1, separator-1)
	local password = decoded:sub(separator+1)
	local logged_in = util.ubus("session", "login", {
		username = username,
		password = password,
		basic = true
	}) or nil
	util.log_connection_webui(username, logged_in~=nil, env)
	if logged_in and logged_in.data and logged_in.acls then
		return {
			username = logged_in.data.username,
			group = logged_in.data.group,
			acls = logged_in.acls,
			basic_auth = true
		}
	end
	return { error = "Invalid username and/or password! Please try again.", basic_auth = true }
end

-- Parses header and returns pure session token or basic auth credentials
function auth:parse_token_header(header, cookie, env)
	local basic_auth_struct = parse_basic_auth_header(header, env)
	if basic_auth_struct then
		return basic_auth_struct
	end
	local token_part
	if header and header["x-csrf-protection"] and cookie and cookie.token then
		token_part = cookie.token
	end
	if not token_part then
		if not header or not header.authorization then return nil end
		local token_array = util.split(header.authorization, " ")
		if token_array[1] ~= 'Bearer' then return nil end
		if not token_array[2] or token_array[2] == "" then return nil end
		token_part = token_array[2]
	end
	local token_type = self.token_types.rpcd
	if token_part:sub(1,4) == self.token_types.jwt .. "-" then
		token_type = self.token_types.jwt
		token_part = token_part:sub(5,#token_part)
	end

	return {token = token_part, type = token_type}
end

function auth:authenticate_jwt(token_struct)
	local jwt = require("api.jwt")
	local jwt_validation = jwt.validateToken(token_struct.token)
	if not jwt_validation then return false, error_messages[3] end

	return true
end

function auth:load_sensitive_flag(group)
	local uci = require("vuci.uci").cursor()
	return uci:get("rpcd", group, "hide_sensitive") == "1"
end

function auth:load_force_password_change(username)
	local expired = util.password_expired(username)
	if not expired then
		return false
		--- Uncomment on API version increase
		-- local uci = require("vuci.uci").cursor()
		-- if uci:get("vuci", "main", "firstlogin") ~= "1" then return false end
		-- return {
		--     message = "You haven't changed the default password for this device. Please change your password using \"/system/actions/change_password_firstlogin\" endpoint.",
		--     std_code = STD_CODES.FIRST_LOGIN
		-- }
	end
	return {
		message = "Your password has reached its expiry date. Please change your password using \"/system/actions/change_password_firstlogin\" endpoint.",
		std_code = STD_CODES.EXPIRED_PASSWORD
	}
end

function auth:load_session_values(values)
	local session = util.ubus("session", "get", {
		ubus_rpc_session = values.token,
		keys = values.keys
	})
	if session and session.values then
		return session.values
	end
	return nil
end

function auth:authenticate_rpcd(token_struct, request_info, session)
	local password_change = false
	local sensitive = false
	if session and session.username then
		password_change = self:load_force_password_change(session.username)
	end
	if session and session.group then
		sensitive = self:load_sensitive_flag(session.group)
	end
	local functionType = headers.SUPPORTED_HTTP_METHODS[request_info.http_method]
	local complete_path = nil
	if request_info.path:sub(#request_info.path, #request_info.path) ~= "/" then
		complete_path = request_info.path .. "/"
	else
		complete_path = request_info.path
	end
	local r = util.ubus("session", "access", {
		ubus_rpc_session = token_struct.token,
		scope = "api",
		object = complete_path,
		["function"] = functionType
	})
	if not r then
		return false, error_messages[2]
	end
	-- OPTIONS call isn't bound by rpcd read/write functions, it supports both
	-- Adding a second check for some rare cases where endpoint only supports write operations
	if request_info.http_method == "OPTIONS" and not r.access then
		r = util.ubus("session", "access", {
			ubus_rpc_session = token_struct.token,
			scope = "api",
			object = complete_path,
			["function"] = "write"
		})
	end
	if not r.access then
		if functionType ~= "read" then
			return false, error_messages[1]
		end

		local e = util.ubus("session", "access", {
			ubus_rpc_session = token_struct.token,
			scope = "exceptions",
			object = complete_path
		})
		if not e then
			return false, error_messages[2]
		end
		local obj = e[complete_path .. "*"]
		if obj and #obj~=0 then
			return true, nil,  obj, sensitive, password_change
		else
			return false, error_messages[1]
		end
	end
	return true, nil, nil, sensitive, password_change
end

local function check_basic_auth_acl(token_struct, request_info)
	local complete_path = normalize_path(request_info.path)
	local method = request_info.http_method:lower()
	local acl_map = {
		get = "read",
		post = "write",
		put = "write",
		delete = "write"
	}
	local acl_key = acl_map[method]
	local access = false
	if token_struct.acls["api"] then
		for api_path, perms in pairs(token_struct.acls["api"]) do
			if complete_path:match(api_path) then
				for _, perm in ipairs(perms) do
					if perm == acl_key then access = true break end
				end
			end
		end
	end
	if access then
		return true, nil, nil, false, false
	else
		return false, error_messages[1]
	end
end

function auth:authenticate_token(token_struct, request_info, bulk_acls)
	if token_struct.type == self.token_types.jwt then
		return self:authenticate_jwt(token_struct)
	end
	-- Basic Auth: check ACLs directly
	if token_struct.basic_auth and token_struct.acls then
		return check_basic_auth_acl(token_struct, request_info)
	end
	local session = self:load_session_values({
		token = token_struct.token,
		keys = { "username", "group" }
	})

	-- Bulk mode: skip regular check and use provided ACLs
	if bulk_acls and bulk_acls.skip_auth and bulk_acls.bulk_acl_results then
		local sensitive = false
		local complete_path = normalize_path(request_info.path)
		local method = request_info.http_method:lower()
		local acl_map = {
			get = ":read",
			post = ":write",
			put = ":write",
			delete = ":write"
		}
		local acl_key = acl_map[method]
		local access, exceptions
		if acl_key then
			access = bulk_acls.bulk_acl_results[complete_path .. acl_key]
			if not access then
				local opts = bulk_acls.bulk_acl_results[complete_path .. "*"]
				if type(opts) == "table" then
					access = true
					exceptions = opts
				end
			end
		else
			-- fallback: allow if either is true
			access = bulk_acls.bulk_acl_results[complete_path .. ":read"] or bulk_acls.bulk_acl_results[complete_path .. ":write"]
		end
		if session and session.group then
			sensitive = self:load_sensitive_flag(session.group)
		end
		if access then
			return true, nil, exceptions, sensitive, false
		else
			return false, error_messages[1]
		end
	end
	return self:authenticate_rpcd(token_struct, request_info, session)
end

return auth