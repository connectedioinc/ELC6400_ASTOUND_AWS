local FunctionService = require("api/FunctionService")
local md = require("vuci.modem")
local modem_count = md:modem_count()

if modem_count == 0 then
	return nil
end

local Scan = FunctionService:new()

function Scan:GET()
	local modem_id = self.sid
	local data = {}
	if modem_id then
		local ok, err = self.dt:check_modem(modem_id)
		if not ok then
			self:add_critical_error(STD_CODES.INVALID_SECTION, err, "URL", HTTP_STATUS_CODES.NOT_FOUND)
		end
		local scan_data = md:get_scan_cache(modem_id)
		data = {
			last_scan = scan_data and scan_data.last_scan or "N/A",
			operators = scan_data and md:format_operators(scan_data.operators) or {}
		}
	else
		for info in md:info_iterator() do
			local scan_data = md:get_scan_cache(info.usb_id)
			table.insert(data, {
				modem = info.usb_id,
				last_scan = scan_data and scan_data.last_scan or "N/A",
				operators = scan_data and md:format_operators(scan_data.operators) or {}
			})
		end
	end
	return self:ResponseOK(data)
end

return Scan