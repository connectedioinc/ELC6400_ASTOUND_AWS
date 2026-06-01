local util = require("vuci.util")
local Base = require("api/BaseEndpoint")
local responder = require("api.responder")
local uci = require "vuci.uci".cursor()

local login_class = Base:new()

-- TODO refresh token with normal statelles sessions and rotation after full api migration
-- TODO secret destruction, secret saving in cookie

-- special endpoints, as login or bulk, require a POST verb
-- this function is a simple wrapper used for such validation
local function validate_force_post(method)
	if method ~= "POST" then
        responder.err_resp:new()
        :add_error(STD_CODES.INCORRECT_REQUEST, "HTTP method not supported for this endpoint, please use POST" , "Request")
        :code("501"):yield()
	end
end

function login_class:is_blocked()
    local entries = util.ubus("ip_block", "show", { type = "ip", blocked = true }) or {}
    for _, value in ipairs(entries.ips or {}) do
        if value.ip == self.request_info.REMOTE_ADDR and value.port == self.request_info.SERVER_PORT then
            return true
        end
    end
    return false
end

function login_class:wait_for_lock()
    while true do
        local lock_handle = io.open(self.lock_file, "r")
        if not lock_handle then break end
        local timestamp = lock_handle:read("*n")
        lock_handle:close()
        if not timestamp or not tonumber(timestamp) then break end
        -- request cancelled will leave lock, need to unlock
        if os.time() - tonumber(timestamp) >= 15 then
            self:release_lock()
            break
        end
        os.execute("sleep 1")
    end
end

function login_class:acquire_lock(lock_file)
    self.lock_file = lock_file
    self:wait_for_lock()
    local lock_handle = io.open(self.lock_file, "w")
    if not lock_handle then return end
    lock_handle:write(os.time())
    lock_handle:close()
end

function login_class:release_lock()
    os.remove(self.lock_file)
end

function login_class:add_critical_error(code, message, source, http_code)
    self:release_lock()
    responder.err_resp:new()
        :add_error(code, message, source)
        :code(http_code):yield()
end

function login_class:initialize_method()
    validate_force_post(self.request_method)
	self:login()
end

function login_class:login()
    self:acquire_lock("/tmp/lock/api_login.lock")
    local data = self.arguments
    if not data or not data.username or not data.password then
        self:add_critical_error(STD_CODES.UNAUTHORIZED, "Username and/or password is missing" , "Authorization", "400")
    end
    
    if type(data.username) ~= "string" or type(data.password) ~= "string" then
        self:add_critical_error(STD_CODES.UNAUTHORIZED, "Username and/or password must be a string" , "Authorization", "400")
    end

    if self:is_blocked() then
        self:add_critical_error(STD_CODES.UNAUTHORIZED, "Login failed" , "Authorization", "401")
    end

    local timeout = uci:get("vuci", "main", "api_session_timeout") or 300
    local logged_in = util.ubus("session", "login", {
        username = data.username,
        password = data.password,
        timeout = tonumber(timeout)
    }) or nil
	local err_message = "Invalid username and/or password! Please try again."

    if not logged_in then
        util.log_connection_webui(data.username, false, self.request_info)
        self:add_critical_error(STD_CODES.UNAUTHORIZED, err_message, "Authorization", "401")
    end

	local read_perm = uci:get("rpcd", logged_in.data.group, "read")
	local write_perm = uci:get("rpcd", logged_in.data.group, "write")
	if read_perm and write_perm and data.username ~= "admin" and #read_perm == 1 and read_perm[1] == "!superuser" and #write_perm == 1 and write_perm[1] == "!superuser" then
        self:add_critical_error(
            STD_CODES.UNAUTHORIZED,
            err_message,
            "Authorization",
            "401"
        )
	end

    -- logged_in.jwt_token = jwt.generateJWTToken(data.username, logged_in.ubus_rpc_session)
    util.log_connection_webui(data.username, true, self.request_info)

    local payload = {
        success = true,
        data = {
            username = data.username,
            group = logged_in.data.group,
            token = logged_in.ubus_rpc_session,
            expires = logged_in.expires
        }
    }
    self:release_lock()

	local header = {}
	if self.request_info.HEADERS["x-csrf-protection"] then
		header[1] = "Set-Cookie: token=" .. payload.data.token .. "; Path=/; SameSite=Strict; HttpOnly"
		payload.data.token = nil
	end

	coroutine.yield(
		{
			header = header,
			payload = payload,
			code = "200"
		})
end

return login_class