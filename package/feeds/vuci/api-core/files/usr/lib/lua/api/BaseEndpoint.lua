local Base = {}

-- Basic endpoint implementation
-- works as a driver for any type of endpoint
function Base:new()
	local o = {}
	self.__index = self
	setmetatable(o, self)

	function o:init_endpoint()
		local endpoint_coroutine = coroutine.create(self.initialize_method)
		local success, response = coroutine.resume(endpoint_coroutine, self)

		local traceback = nil
		if not success then
			traceback = debug.traceback(endpoint_coroutine, response)
		end

		return {
			success = success,
			response = response,
			traceback = traceback
		}
	end

	return o

end

return Base
