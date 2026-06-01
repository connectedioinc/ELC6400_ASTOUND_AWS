local FunctionService = require("api.FunctionService")
local modbus_utils = require("vuci.modbus_utils")
local nixio_fs = require("nixio.fs")

local DatabaseStatus = FunctionService:new()

function DatabaseStatus:GET_TYPE_status()
	local db_path = self.query_parameters.db_path
	if db_path == nil then
		db_path = modbus_utils:get_db_path()
	else
		local success, errmsg = self.dt:check_array(db_path, modbus_utils:available_db_paths())
		if not success then
			self:add_critical_error(STD_CODES.INVALID_QUERY, errmsg, "db_path")
		end
	end
	db_path = modbus_utils:convert_legacy_path(db_path)

	local size_in_pages = 0

	local db_size = nixio_fs.stat(db_path, "size")
	if db_size then
		size_in_pages = math.floor(db_size / 4096)
	end

	self:ResponseOK({
		size_in_pages = tostring(size_in_pages)
	})
end

return DatabaseStatus
