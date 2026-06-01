local util = require("vuci.util")
local Base = require("api/BaseEndpoint")
local responder = require("api.responder")

local session = Base:new()

local function validate_force_get(method)
	if method ~= "GET" then
		responder.err_resp:new()
		:add_error(STD_CODES.INCORRECT_REQUEST, "HTTP method not supported for this endpoint, please use GET" , "Request")
		:code("501"):yield()
	end
end

function session:initialize_method()
	validate_force_get(self.request_method)
	self:session()
end

function session:session()
	local access = util.ubus("session", "access", {
		ubus_rpc_session = self.user.sid,
	})
	local res = false
	if access then
		res = true
	end

	local results = {
		success = true,
		data = {
			username = self.user.username,
			active = res
		}
	}

	coroutine.yield(
		{
			payload = results,
			code = "200"
		})
end

return session
