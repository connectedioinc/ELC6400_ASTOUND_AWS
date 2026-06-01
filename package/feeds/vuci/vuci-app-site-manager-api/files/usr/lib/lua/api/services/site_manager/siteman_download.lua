local FunctionService = require("api/FunctionService")
local fs = require("nixio.fs")

local devman = FunctionService:new()

devman:action("download", function (self)
	if fs.access("/etc/siteman/certs/ca.crt") then
		return self:File("/etc/siteman/certs/ca.crt", "ca.crt")
	else
		return self:ResponseError("CA certificate not found.")
	end
end)

return devman