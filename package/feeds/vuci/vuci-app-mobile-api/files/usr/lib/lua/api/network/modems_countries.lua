local md = require("vuci.modem")
local FunctionService = require("api/FunctionService")
local ModemCountries = FunctionService:new()

function ModemCountries:GET()
	if self.sid == "status" then
		return self:ResponseOK(md:get_apn_countries())
	end
	self:ResponseNotImplemented(
		("Endpoint for '%s' not implemented."):format(self.service_group)
	)
end

return ModemCountries