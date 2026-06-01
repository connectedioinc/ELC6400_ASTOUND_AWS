local FunctionService = require("api/FunctionService")
local MWAN3 = FunctionService:new()

function MWAN3:GET_TYPE_status()
	local mwan = require("vuci.mwan").init()
	local rv = mwan:get_info()
	if rv and rv.interfaces then
		return self:ResponseOK(rv.interfaces)
	end
	self:ResponseError("Failed to get status")
end

return MWAN3
