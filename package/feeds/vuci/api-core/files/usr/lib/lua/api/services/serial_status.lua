local FunctionService = require("api/FunctionService")
local serial = require("vuci.serial")
local board = require("vuci.board")

local SerialStatus = FunctionService:new()

function SerialStatus:GET_TYPE_status()
	local uci = require("vuci.uci").cursor()
	local function uci_foreach(...) return uci:foreach(...) end
	local function uci_get_value(...) return uci:get(...) end
	return self:ResponseOK(serial:get_all_devices_status(uci_foreach, uci_get_value))
end

function SerialStatus:GET_TYPE_options()
	local devices = serial:get_devices(true)
	local option_table = {}
	for key, value in pairs(devices) do
		table.insert(option_table,
		{ 
			device = value,
			baudrate = serial:get_baudrates(value),
			databits = serial:get_databits(value),
			parity = serial:get_parity(value),
			flowcontrol = serial:get_flowcontrol(value),
			stopbits = serial:get_stopbits(value)
		})
	end
	return self:ResponseOK(option_table)
end

if board:has_serial() or board:has_mbus() then
	return SerialStatus
else
	return nil
end
