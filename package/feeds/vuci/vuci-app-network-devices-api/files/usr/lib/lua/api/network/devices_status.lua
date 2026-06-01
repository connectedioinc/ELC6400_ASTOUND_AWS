local FunctionService = require("api/FunctionService")
local devices_status = FunctionService:new()

local devices_lib = require("vuci.devices_status_lib"):new()

function devices_status:initialize_hook()
	local type_map = devices_lib:get_type_map()
	if self.type == "status" then
		self.sid = self.service_group
		self.service_group = self.type
		self.type = nil
		if self.sid then
			self._single = true
		end
	end
	if self.type and not type_map[self.type] then
		local available_types, index = "", 0
		for k in pairs(type_map) do
			local separator = ", "
			if index == 0 then
				separator = ""
			end
			available_types = available_types .. separator .. k
			index = index + 1
		end
		return self:add_critical_error(STD_CODES.INVALID_SECTION, string.format("Device type '%s' does not exist. Available types '[%s]'.", self.type, available_types), "Validation")
	end
end

function devices_status:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function devices_status:GET_TYPE_status()
	local valid_param = {
		["true"] = true,
		["false"] = true
	}
	if self.query_parameters.virtual and not valid_param[self.query_parameters.virtual] then
		return self:add_critical_error(
			STD_CODES.INVALID_QUERY,
			"Invalid value for 'virtual' query parameter. Valid values are 'true' or 'false'.",
			"Validation"
		)
	end
	local data, err = devices_lib:get_device_status(self.sid, self.type, self.query_parameters.virtual == 'true')
	if err then
		return self:add_critical_error(STD_CODES.INVALID_SECTION, err, "URL", "404")
	end
	return self:ResponseOK(data)
end

return devices_status
