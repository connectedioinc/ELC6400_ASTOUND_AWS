local FunctionService = require("api/FunctionService")
local md = require("vuci.modem")
local modem_count = md:modem_count()

if modem_count == 0 then
	return nil
end

local APNS = FunctionService:new()

function APNS:GET()
	local modem_id = self.sid
	local data = {}
	if modem_id then
		local ok, err = self.dt:check_modem(modem_id)
		if not ok then
			self:add_critical_error(STD_CODES.INVALID_SECTION, err, "URL", HTTP_STATUS_CODES.NOT_FOUND)
		end
		local apn_data, err, code = md:get_apn_list(modem_id)
		if not apn_data then
			self:add_critical_error(code, err, "APN")
		end
		data = apn_data
	else
		for info in md:info_iterator() do
			local apn_data, err, code = md:get_apn_list(info.usb_id, info)
			if not err then
				table.insert(data, {
					modem = info.usb_id,
					apns = apn_data
				})
			else
				table.insert(data, {
					modem = info.usb_id,
					error = err,
					code = code
				})
			end
		end
	end
	return self:ResponseOK(data)
end

return APNS