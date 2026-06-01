local FunctionService = require("api/FunctionService")
local md = require("vuci.modem")
local modem_count = md:modem_count()

if modem_count == 0 then
	return nil
end

local SignalData = FunctionService:new()

local ERROR_CODES = {
	NO_DATA = 1,
}

function SignalData:GET()
	local modem_id = self.sid
	local data = {}
	if modem_id then
		local ok, err = self.dt:check_modem(modem_id)
		if not ok then
			self:add_critical_error(STD_CODES.INVALID_SECTION, err, "URL", HTTP_STATUS_CODES.NOT_FOUND)
		end
		local signal_db = md:get_signal_db(modem_id)
		if not signal_db then
			self:add_critical_error(ERROR_CODES.NO_DATA, "Signal data not found.", "signal")
		end
		data = signal_db
	else
		for info in md:info_iterator() do
			local signal_db = md:get_signal_db(info.usb_id)
			local entry = { modem = info.usb_id }
			if signal_db then
				entry.signal = signal_db
			else
				entry.error = "Signal data not found."
				entry.code = ERROR_CODES.NO_DATA
			end
			table.insert(data, entry)
		end
	end
	return self:ResponseOK(data)
end

return SignalData