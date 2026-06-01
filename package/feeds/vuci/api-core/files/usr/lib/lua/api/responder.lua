local builder = {}

function builder:new(o)
	o = o or {}
	self.__index = self
    o.response = {}
    o.http_code = "0"
    o.resp_class = nil
	setmetatable(o, self)
	return o
end

function builder:add_message(code, message, source)
    if not self.response.messages then
        self.response.messages = {}
    end
    local msg = {
		code = code,
		message = message,
		source = source and source or nil
	}
	table.insert(self.response.messages, msg)
    return self
end

function builder:code(code)
    self.http_code = code
    return self
end

function builder:retrieve()
    return { payload = self.response, code = self.http_code }
end

function builder:retrieve_response()
    return self.response
end

-- Although generaly would be inccorect to implement such method
-- but in this thightly coupled scenario
-- this one method will save code lines and make things more clear
-- retreive and yield should be used exclusively 
function builder:yield()
    coroutine.yield(self:retrieve())
end
-------------------------------OK Class------------------------------------------------

local ok_resp_class = builder:new()

function ok_resp_class:new(o)
	o = o or {}
	self.__index = self
    o.response = {
        success = true,
        data = {}
    }
    o.http_code = "200"
	setmetatable(o, self)
	return o
end

function ok_resp_class:set_data(data)
    self.response.data = data
    return self
end

-------------------------------Err Class------------------------------------------------


local err_resp_class = builder:new()

function err_resp_class:new(o)
	o = o or {}
	self.__index = self
    o.response = {
        success = false,
        errors = {}
    }
    o.http_code = "422"
	setmetatable(o, self)
	return o
end

function err_resp_class:add_error(code, error, source, section, value)
    local err = {
        code = code,
        error = error,
        source = source or nil,
        section = section or nil,
        value = value or nil,
    }
    table.insert(self.response.errors, err)
    return self
end

return { ok_resp = ok_resp_class, err_resp = err_resp_class }