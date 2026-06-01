local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local dlms_utils = require("api.services.dlms_utils")
local query_parsing = require("api/query")

local FoundParameters = FunctionService:new()

function FoundParameters:GET_TYPE_status()
	local params_to_check = {
		limit = "number",
		offset = "number",
		search = "string",
		devices = "string"
	}
	query_parsing:validate_query_format(params_to_check, self)

	local limit = self.query_parameters.limit
	local offset = self.query_parameters.offset
	local search = self.query_parameters.search
	local devices_query = self.query_parameters.devices

	local db = dlms_utils:open_db()
	db:busy_timeout(5000)

	local bind_params = {}
	local cosem_attribute_groups = dlms_utils.COSEM_ATTRIBUTE_GROUPS
	cosem_attribute_groups['15'] = nil
	local cosem_class_codes = util.keys(cosem_attribute_groups)
	local concatenated_class_codes = table.concat(cosem_class_codes, ",")
	local where = string.format(" WHERE cosem_class_id IN (%s)", concatenated_class_codes)
	if devices_query then
		local devices = {}
		if devices_query:find("[,]") then
			devices = util.split(devices_query, ",")
			for _, device in ipairs(devices) do
				local valid, err = self.dt:uinteger(device)
				if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "devices") end
			end
		else
			local valid, err = self.dt:uinteger(devices_query)
			if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "devices") end
			table.insert(devices, devices_query)
		end

		where = where .. " AND physical_device_id IN (" .. string.rep("?,", #devices):sub(1, -2) .. ")"
		for i, device in ipairs(devices) do
			bind_params[#bind_params + 1] = device
		end
	end

	if search then
		local valid_obis = dlms_utils:validate_obis(search)
		local valid_cosem = dlms_utils:validate_cosem_id(search)
		if not valid_obis and not valid_cosem then
			self:add_critical_error(STD_CODES.INVALID_QUERY, "Invalid search parameter: value must be a valid COSEM ID or a valid OBIS code", "search")
		end
		where = where .. " AND (obis LIKE ? OR cosem_class_id LIKE ?)"
		bind_params[#bind_params + 1] = "%" .. search .. "%"
		bind_params[#bind_params + 1] = "%" .. search .. "%"
	end

	local pagination = ''
	if limit then
		local valid, err = self.dt:uinteger(limit)
		if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "limit") end
		pagination = pagination .. " LIMIT ?"
		bind_params[#bind_params + 1] = limit
		if offset then
			local valid, err = self.dt:uinteger(offset)
			if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "offset") end
			pagination = pagination .. " OFFSET ?"
			bind_params[#bind_params + 1] = offset
		end
	end

	local parameters_query = "SELECT physical_device_id, short_name, cosem_class_id, obis FROM association_view"
	local groupby = " GROUP BY physical_device_id, obis, cosem_class_id ORDER BY CAST(cosem_class_id as INT) ASC"
	parameters_query = parameters_query .. where .. groupby .. pagination
	local found_parameters = db:select(parameters_query, bind_params)

	local total_query = "SELECT COUNT(*) AS total FROM"
	total_query = total_query .. " (SELECT COUNT(*) FROM association_view" .. where .. groupby .. ") AS agg"
	local total_rows = db:select(total_query, bind_params)
	local total = #total_rows > 0 and total_rows[1].total or 0

	local payload = { found_parameters, { total = total } }

	db:close()

	self:ResponseOK(payload)
end

function FoundParameters:ResponseOK(data)
	coroutine.yield(
		{
			payload = {
				success = true,
				data = data[1],
				metadata = data[2],
			},
			code = "200"
		})
end

return FoundParameters
