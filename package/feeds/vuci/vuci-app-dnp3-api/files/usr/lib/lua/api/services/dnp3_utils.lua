local universal_gateway_utils = require("vuci.universal_gateway_utils")
local util = require("vuci.util")
local utils = {}

utils.DB_LOCATION_RAM_OLD = "/tmp/dnp3.db"
utils.DB_LOCATION_RAM = "/var/run/dnp3_client/dnp3.db"
utils.DB_LOCATION_FLASH_OLD = "/usr/share/dnp3.db"
utils.DB_LOCATION_FLASH = "/usr/share/dnp3_client/dnp3.db"

utils.DB_LOCATION_MAP = {
	[utils.DB_LOCATION_RAM_OLD] = utils.DB_LOCATION_RAM,
	[utils.DB_LOCATION_FLASH_OLD] = utils.DB_LOCATION_FLASH,
	[utils.DB_LOCATION_RAM] = utils.DB_LOCATION_RAM_OLD,
	[utils.DB_LOCATION_FLASH] = utils.DB_LOCATION_FLASH_OLD
}
utils.ERROR_CODES = {
	NO_RESPONSE = 20,
	FAILED_OVERLAP_VALIDATION = 21,
}
local TAG_ERR_CODES = {
	OVERLAPPING = 10,
}

---@return table? fixed_data fixed ubus data order and format
---@return number? error_code error code if any error occurred
local function process_ubus_test_response(response)
	if response == nil or #response.data == 0 then
		return nil, utils.ERROR_CODES.NO_RESPONSE
	end

	local function format_response_value(v)
		return "'"..tostring(v).."'"
	end

	local fixed_data = {}
	for _, res in ipairs(response.data) do
		local formatted_response = format_response_value(res.time)..", "
			..format_response_value(res.flags)..", "
			..format_response_value(res.data_type)..", "
			..format_response_value(res.index)..", "
			..format_response_value(res.value)
		table.insert(fixed_data, formatted_response)
	end
	return fixed_data
end

function utils:send_tcp_request(client, request)
	local response = util.ubus("dnp3_client.rpc", "tcp.test", {
		-- General client options
		local_addr = tonumber(client.local_addr),
		remote_addr = tonumber(client.remote_addr),
		timeout = tonumber(client.timeout),

		-- TCP client options
		ip = client.ip,
		port = tonumber(client.port),

		-- Request options
		name = "test",
		data_type = tonumber(request.data_type),
		index = tonumber(request.index),
		count = tonumber(request.count),
	})

	return process_ubus_test_response(response)
end

function utils:send_serial_request(client, request)
	local response = util.ubus("dnp3_client.rpc", "serial.test", {
		-- General client options
		local_addr = tonumber(client.local_addr),
		remote_addr = tonumber(client.remote_addr),
		timeout = tonumber(client.timeout),

		-- Serial client options
		device = client.device,
		baudrate = tonumber(client.baudrate),
		databits = tonumber(client.databits),
		flowcontrol = client.flowcontrol,
		parity = client.parity,
		stopbits = tonumber(client.stopbits),
		time_duration = tonumber(client.time_duration),

		-- Request options
		name = "test",
		data_type = tonumber(request.data_type),
		index = tonumber(request.index),
		count = tonumber(request.count),
	})

	return process_ubus_test_response(response)
end

-----------------------------------------------START OF TAG SPECIFIC UTILS---------------------------------------------------------------------------

local GROUP_DATA_BYTES = {
	["1"] = 1,
	["3"] = 1,
	["20"] = 4,
	["30"] = 4,
	["110"] = 1,
	["40"] = 2,
	["10"] = 1
}
local VARIATIONS_BY_GROUP = {['1'] = {'0'}, ['3'] = {'0'}, ['20'] = {'0'}, ['30'] = {'1', '2', '3', '4', '5', '6'}, ['110'] = {'0'}, ['40'] = {'1', '2', '3', '4'}, ['10'] = {'0'}}

utils.ADDRESS_RANGE = {1000, 65535}

---@param section table outstation tag section object
---@return boolean
function utils.has_ethernet_outstation(section)
	return section.outstation_dev_id == "dnp3_outstation"
end

--- Uncomment when tag size option is needed for dnp3 tags
---@param service table section instance
-- function utils.validate_tag_size(service)
-- 	local opt_tag_type = service:get_abs_value(service.config, service.sid, "tag_type")
-- 	if universal_gateway_utils.is_tag_size_fixed(opt_tag_type) then return end

-- 	local opt_tag_size = service:get_abs_value(service.config, service.sid, "tag_size")
-- 	local opt_dnp3_group = service:get_abs_value(service.config, service.sid, "dnp3_group")
-- 	if not opt_tag_size or not GROUP_DATA_BYTES[opt_dnp3_group] then return end

-- 	local total_size_of_registers = GROUP_DATA_BYTES[opt_dnp3_group] * (utils.ADDRESS_RANGE[2] - utils.ADDRESS_RANGE[1])
-- 	local valid, msg = service.dt:irange(opt_tag_size, 1, total_size_of_registers)
-- 	if not valid then
-- 		service:add_error(STD_CODES.INVALID_OPT, msg, "tag_size")
-- 	end
-- end

---@param service table section instance
function utils.validate_dnp3_index(service)
	local tag_bytes = universal_gateway_utils.get_tag_bytes(service, nil, nil, true)
	local opt_dnp3_index = service:get_abs_value(service.config, service.sid, "dnp3_index")
	local opt_dnp3_group = service:get_abs_value(service.config, service.sid, "dnp3_group")
	if not opt_dnp3_index or not GROUP_DATA_BYTES[opt_dnp3_group] or not tag_bytes then return end

	local count = math.ceil(tag_bytes / GROUP_DATA_BYTES[opt_dnp3_group]) - 1
	local valid, msg = service.dt:irange(opt_dnp3_index, utils.ADDRESS_RANGE[1], math.max(utils.ADDRESS_RANGE[2] - count, utils.ADDRESS_RANGE[1]))
	if not valid then
		service:add_error(STD_CODES.INVALID_OPT, msg, "dnp3_index")
	end
end

---@param group string dnp group number
---@return table? variations
function utils.get_variations_by_group(group)
	return VARIATIONS_BY_GROUP[group]
end

---@param service table section instance
function utils.validate_dnp3_group(service)
	local dnp3_group = service:get_abs_value(service.config, service.sid, "dnp3_group")
	local tag_type = service:get_abs_value(service.config, service.sid, "tag_type")
	local tag_permissions = service:get_abs_value(service.config, service.sid, "tag_permissions")
	if not dnp3_group or not tag_type or not tag_permissions then return end

	local available_groups
	if tag_permissions == "w" or tag_permissions == "rw" then
		available_groups = { "40", "10" }
	elseif tag_type == "binary" then
		available_groups = { "1", "3", "10", "20" }
	elseif tag_type == "string" then
		available_groups = { "110" }
	else
		available_groups = { "1", "3", "20", "30", "110", "40", "10" }
	end
	local valid_group, msg = service.dt:check_array(dnp3_group, available_groups)
	if not valid_group then
		service:add_error(STD_CODES.INVALID_OPT, msg, "dnp3_group")
	end

	local opt_dnp3_variation = service:get_abs_value(service.config, service.sid, "dnp3_variation")
	if valid_group and opt_dnp3_variation then
		local variations = utils.get_variations_by_group(dnp3_group)
		if not service.dt:check_array(opt_dnp3_variation, variations) then
			service:add_error(STD_CODES.INVALID_OPT, "dnp3_variation is incompatible with the current dnp3_group", "dnp3_group")
		end
	end
end

local function get_occupied_register_range(dnp3_index, dnp3_group, tag_bytes)
	local count = math.ceil(tag_bytes / GROUP_DATA_BYTES[dnp3_group]) - 1
	local reg_start = tonumber(dnp3_index)
	local reg_end = reg_start + count
	return { reg_start, reg_end }
end

---Checks if there is register number overlap between given tag and other tag sections
--- @param service table config service instance
--- @param section_type "dnp3_serial_outstation" | "dnp3_outstation" which section to check against
--- @param tag_options {tag_permissions: 'r' | 'w' | 'rw', dnp3_group: string, tag_source?: string}
--- @param register_range table {start, end}
--- @param check_itself boolean
--- @return string?
local function find_overlapped_tag_name(service, section_type, tag_options, register_range, check_itself)
	local overlapped_tag_name = nil
	service:table_foreach("dnp3_outstation", "tag", function(_s)
		local skip_self = not check_itself and (_s[".name"] == service.sid)
		local section_connection_filter = section_type == "dnp3_outstation" and _s.outstation_dev_id == "dnp3_outstation" or section_type == "dnp3_serial_outstation" and _s.outstation_dev_id ~= "dnp3_outstation"
		local is_perms_non_overlapping = _s.tag_permissions == tag_options.tag_permissions
		local source_filter  = not tag_options.tag_source or _s.tag_source == tag_options.tag_source
		if _s.enabled == "1" and not skip_self and _s.dnp3_group == tag_options.dnp3_group and section_connection_filter and is_perms_non_overlapping and source_filter then
			local other_tag_bytes = universal_gateway_utils.get_tag_bytes(service, _s[".name"], "dnp3_outstation", true)
			local other_register_range = get_occupied_register_range(_s.dnp3_index, _s.dnp3_group, other_tag_bytes)
			if (register_range[1] <= other_register_range[2] and other_register_range[1] <= register_range[2]) then
				overlapped_tag_name = _s.tag_name
				return false
			end
		end
	end)
	return overlapped_tag_name
end

---Validates objects overlaps between dnp objects
--- @param self table config service instance
--- @param section_type "dnp3_serial_outstation" | "dnp3_outstation" which section to check against
function utils.validate_register_overlap(self, section_type)
	if section_type ~= "dnp3_serial_outstation" and section_type ~= "dnp3_outstation" then
		error('section_type must be: "dnp3_serial_outstation", "dnp3_outstation"')
	end

	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if opt_enabled ~= "1" then return end

	local tag_bytes = universal_gateway_utils.get_tag_bytes(self, nil, nil, true)
	local opt_tag_permissions = self:table_get(self.config, self.sid, "tag_permissions")
	local opt_dnp3_group = self:get_abs_value(self.config, self.sid, "dnp3_group")
	local opt_dnp3_index = self:get_abs_value(self.config, self.sid, "dnp3_index")

	local register_range = get_occupied_register_range(opt_dnp3_index, opt_dnp3_group, tag_bytes)
	local tag_options = {
		dnp3_group = opt_dnp3_group,
		tag_permissions = opt_tag_permissions,
	}
	local overlapped_tag_name = find_overlapped_tag_name(self, section_type, tag_options, register_range, false)
	if overlapped_tag_name then
		self:add_error(utils.ERROR_CODES.FAILED_OVERLAP_VALIDATION, "Object range overlaps with object '" .. overlapped_tag_name .. "'. Try changing these options: tag_type or tag_size, dnp3_group, dnp3_index", "Validation")
	end
end

---Validates if request is overlapping with tags in dnp3 outstations
--- @param service table service instance
--- @param request_config table test request options
--- @param section_type "dnp3_serial_outstation" | "dnp3_outstation" which section to check against
function utils.validate_request_overlap(service, request_config, section_type)
	if section_type ~= "dnp3_serial_outstation" and section_type ~= "dnp3_outstation" then
		error('section_type must be: "dnp3_serial_outstation", "dnp3_outstation"')
	end

	if request_config.data_type == '21' then return end -- unavailable type in data sources
	-- fix type if called from an action endpoint
	request_config.data_type = tostring(request_config.data_type)

	local req_bytes = GROUP_DATA_BYTES[request_config.data_type] or 1
	local req_range = get_occupied_register_range(request_config.index, request_config.data_type, req_bytes)
	local req_permissions = util.contains({"40", "10"}, request_config.data_type) and "w" or "r"
	local tag_options = {
		dnp3_group = request_config.data_type,
		tag_source = "dnp3_client",
		tag_permissions = req_permissions,
	}
	local overlapped_reg_name = find_overlapped_tag_name(service, section_type, tag_options, req_range, true)
	if overlapped_reg_name then
		service:add_critical_error(TAG_ERR_CODES.OVERLAPPING, "Request range overlaps with object '" .. overlapped_reg_name .. "'.", "Validation")
	end
end

-----------------------------------------------END OF TAG SPECIFIC UTILS-----------------------------------------------------------------------------

return utils
