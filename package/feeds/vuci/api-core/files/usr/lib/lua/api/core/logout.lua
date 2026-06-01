local util = require("vuci.util")
local Base = require("api/BaseEndpoint")
local responder = require("api.responder")

local login_class = Base:new()

local function validate_force_post(method)
	if method ~= "POST" then
        responder.err_resp:new()
        :add_error(STD_CODES.INCORRECT_REQUEST, "HTTP method not supported for this endpoint, please use POST" , "Request")
        :code("501"):yield()
	end
end

function login_class:initialize_method()
    validate_force_post(self.request_method)
	self:logout()
end

function login_class:logout()
    util.ubus("session", "destroy", {
        ubus_rpc_session = self.user.sid,
    })

    local results = {
        success = true,
        data = {
            response = "Logout successful"
        }
    }

	local header = {}
	if self.request_info.HEADERS["x-csrf-protection"] then
		header[1] = "Set-Cookie: token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Strict; HttpOnly"
	end

	coroutine.yield(
		{
			header = header,
			payload = results,
			code = "200"
		})
end

return login_class