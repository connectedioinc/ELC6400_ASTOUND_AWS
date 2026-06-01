local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local dlms_utils = require("api.services.dlms_utils")
local query_parsing = require("api/query")
local api_utils = require("api/api_utils")

local DLMS = ConfigService:new({ increment_name = true })

function DLMS:initialize_hook()
	local cosem_group = self:table_get("dlms_client", self.binding)
	if not cosem_group or cosem_group['.type'] ~= "cosem_group" then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Section: %s for service does not exist", self.binding),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

local s = DLMS:section("dlms_client", "cosem")
function s:create_defaults()
	return {
		cosem_group = self.binding
	}
end
s.filter = function (self, options)
	return options.cosem_group == self.binding
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------
do
	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "name", "physical_device", "cosem_id" } }
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

	local name = s:option("name")
	function name:validate(value)
		local cosem_values = self:table_find_many(self.config, "cosem", {
			name = value,
			cosem_group = self:get_abs_value(self.config, self.sid, "cosem_group")
		})
		for _, cosem_value in ipairs(cosem_values) do
			if cosem_value[".name"] ~= self.sid then
				return false, "COSEM name is already in use"
			end
		end
		if string.find(value, "\"") then
			return false, "Value can not contain \""
		end
		return self.dt:string(value)
	end
	name.maxlength = 200

	local physical_device = s:option("physical_device", {list = true})
	function physical_device:validate(value)
		local devices = {}
		self:table_foreach("dlms_client", "physical_device", function(s)
			table.insert(devices, s[".name"])
		end)
		return  self.dt:check_array(value, devices)
	end

	local cosem_id = s:option("cosem_id")
	cosem_id.require = { ["7"] = { "entries" }}
	function cosem_id:validate(value)
		return dlms_utils:validate_cosem_id(value)
	end

	-- REMOVE_WITH_VERSION_UPGRADE: Remove option
	local obis = s:option("obis")
	obis.maxlength = 22
	function obis:validate(value)
		return dlms_utils:validate_obis(value)
	end
	function obis:set(value)
		if dlms_utils:validate_logical_name(value) then
			self:table_set(self.main_config, self.sid, "logical_name", value)
		elseif dlms_utils:validate_short_name(value) then
			self:table_set(self.main_config, self.sid, "short_name", value)
		end
	end
	function obis:get()
		local logical_name = self:table_get(self.main_config, self.sid, "logical_name")
		local short_name = self:table_get(self.main_config, self.sid, "short_name")
		return logical_name or short_name
	end

	local opt_logical_name = s:option("logical_name")
	function opt_logical_name:validate(value)
		return dlms_utils:validate_logical_name(value)
	end

	local opt_short_name = s:option("short_name")
	function opt_short_name:validate(value)
		return dlms_utils:validate_short_name(value)
	end

	local entries = s:option("entries")
	function entries:validate(value)
		return self.dt:irange(value, 1, 32767)
	end

	local attributes = s:option("attributes")
	function attributes:validate(value)
		local groups = {}
		local cosem_id_value = self:getter_wrapped_abs_value(self.config, self.sid, "cosem_id")
		if not dlms_utils.COSEM_ATTRIBUTE_GROUPS[cosem_id_value] then
			return false, "Incorrect COSEM id value"
		end
		for _, attribute_value in ipairs(dlms_utils.COSEM_ATTRIBUTE_GROUPS[cosem_id_value]) do
			groups[attribute_value] = true
		end
		local unique = {}
		local attribute_list = util.split(value, " ")
		for _, attr in ipairs(attribute_list) do
			if unique[attr] then
				return false, "Attributes must be unique"
			end
			if not groups[attr] then
				return false, "Incorrect COSEM class attribute provided"
			end
			unique[attr] = true
		end

		return self.dt:string()
	end
end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function DLMS:POST_validate_hook()
	local interfaces = self:table_count("dlms_client", "cosem", {
		cosem_group = self.binding
	})
	if interfaces >= 20 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 20 instances are allowed")
	end
end

function DLMS:validate_required_options()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local logical_name = self:get_abs_value(self.config, self.sid, "logical_name")
	local short_name = self:get_abs_value(self.config, self.sid, "short_name")
	local obis = self:get_abs_value(self.config, self.sid, "obis")
	if enabled == "1" and not (obis or logical_name or short_name) then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required options: logical_name or short_name", "enabled")
	end
	-- REMOVE_WITH_VERSION_UPGRADE: uncomment
	-- local physical_devices = self:get_abs_value(self.config, self.sid, "physical_device")
	-- if enabled == "1" and physical_devices and not (logical_name and short_name) then
	-- 	local use_ln_ref_to_option = {
	-- 		["0"] = { name = 'short_name', value = short_name },
	-- 		["1"] = { name = 'logical_name', value = logical_name },
	-- 	}
	-- 	local physical_device_map = {}
	-- 	for _, id in ipairs(physical_devices) do
	-- 		physical_device_map[id] = true
	-- 	end
	-- 	local missing_option_map = {}
	-- 	self:table_foreach(self.config, "physical_device", function (s)
	-- 		if physical_device_map[s[".name"]] then
	-- 			local use_ln_ref = s.use_ln_ref or "1"
	-- 			missing_option_map[use_ln_ref_to_option[use_ln_ref].name] = not use_ln_ref_to_option[use_ln_ref].value

	-- 			if missing_option_map["short_name"] and missing_option_map["logical_name"] then return false end -- break
	-- 		end
	-- 	end)

	-- 	if not api_utils:is_table_empty(missing_option_map) then
	-- 		local missing_options_str = table.concat(util.keys(missing_option_map), ", ")
	-- 		self:add_error(STD_CODES.INVALID_OPT, "Missing required options: " .. missing_options_str, "physical_device")
	-- 	end
	-- end
end
function DLMS:PUT_validate_section_hook()
	DLMS:validate_required_options()

	local cosem_id = self:get_abs_value(self.main_config, self.sid, "cosem_id")
	if cosem_id ~= "7" then
		self:table_delete(self.main_config, self.sid, "entries")
	end
end
DLMS.POST_validate_section_hook = DLMS.validate_required_options

function DLMS:DELETE_before_section_delete_hook()
	local cosem_group = self:get_abs_value(self.config, self.sid, "cosem_group")
	local values = 0
	self:table_foreach("dlms_client", "cosem", function (s)
		if s.cosem_group == cosem_group and s.enabled == "1" and self.sid ~= s[".name"] then
			values = values + 1
		end
	end)
	if values == 0 then
		self:table_set("dlms_client", cosem_group, "enabled", "0")
	end
end

function DLMS:validate_query_parameters(group_value_id)
	local params_to_check = {
		device = "string",
		attribute = "string"
	}
	query_parsing:validate_query_format(params_to_check, self)

	local query_params = self.query_parameters

	local device = nil
	if query_params.device then
		device = query_params.device

		local available_device_names = {}

		local group_value = self:table_get(self.main_config, group_value_id)
		if group_value and group_value[".type"] == "cosem" then
			for _, device_id in ipairs(group_value.physical_device) do
				local physical_device = self:table_get(self.main_config, device_id)
				if physical_device and physical_device.name then
					table.insert(available_device_names, physical_device.name)
				end
			end
		end

		local success, err = self.dt:check_array(query_params.device, available_device_names)
		if not success then
			self:add_error(STD_CODES.INVALID_QUERY, err, "device", nil, query_params.device)
		end
	end

	local attribute = nil
	if query_params.attribute then
		attribute = query_params.attribute

		local success, err = self.dt:uinteger(query_params.attribute)
		if not success then
			self:add_error(STD_CODES.INVALID_QUERY, err, "attribute", nil, query_params.attribute)
		end
	end

	self:return_if_error(400)

	return {
		attribute = attribute,
		device = device,
	}
end

function DLMS:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function DLMS:GET_TYPE_status()
	local group_value_id = self.sid

	if group_value_id == nil then
		return self:ResponseError("Group value id is required")
	end

	if self:table_get(self.main_config, "main", "enabled") ~= "1" then
		return self:ResponseError("Service is disabled")
	end

	local group_value = self:table_get(self.main_config, group_value_id)
	if not group_value or group_value[".type"] ~= "cosem" then
		return self:ResponseNotFound("Cosem not found")
	end

	if self.binding ~= group_value.cosem_group then
		return self:ResponseNotFound("Cosem not found")
	end

	if group_value.enabled ~= "1" then
		return self:ResponseError("Group value is disabled")
	end

	local group = self:table_get(self.main_config, self.binding)
	assert(group)

	if group.enabled ~= "1" then
		return self:ResponseError("Group is disabled")
	end

	local query = self:validate_query_parameters(group_value_id)

	local group_value_device_ids = group_value.physical_device

	if query.device then
		-- If the device query parameter is provided,
		-- the test request can be reduced to only fetch the specified device.
		--
		-- There is no need to run test request on devices, where the result won't be used.

		local physical_device = self:table_find(self.main_config, "physical_device", { name = query.device })
		assert(physical_device)
		group_value_device_ids = { physical_device[".name"] }
	end

	local devices = {}
	local device_ids = {}

	local connections = {}
	local connection_ids = {}
	for _, device_id in ipairs(group_value_device_ids) do
		local device = self:table_get(self.main_config, device_id)
		if device.enabled == "1" then
			local connection_id = device.connection
			local connection = self:table_get(self.main_config, connection_id)
			if connection.enabled == "1" then
				if util.insert_to_set(connection_ids, connection_id) then
					connection.id = connection_id
					table.insert(connections, connection)
				end

				if util.insert_to_set(device_ids, device_id) then
					device.id = device_id
					table.insert(devices, device)
				end
			end
		end
	end

	if #connections == 0 or #devices == 0 then
		self:ResponseNotFound("No enabled physical devices or connections")
	end

	local objects = {
		{
			name = group_value.name,
			short_name = group_value.short_name,
			logical_name = group_value.logical_name,
			devices = device_ids,
			cosem_id = group_value.cosem_id,
			entries = group_value.entries,
			attributes = group_value.attributes
		}
	}

	local result = dlms_utils.test_cosem_group(connections, devices, objects)
	if not result.result then
		self:add_critical_error(15, "DLMS service encountered an unexpected error.", "Cosem group")
	end
	if result.error ~= 0 then
		return self:ResponseError(result.result)
	end

	local group_value_result = result.result and result.result[group_value.name]

	if query.attribute then
		for device_name, device_result in pairs(group_value_result) do
			group_value_result[device_name] = device_result[query.attribute]
		end
	end

	if query.device then
		group_value_result = group_value_result[query.device] or ""
	end

	return self:ResponseOK(group_value_result)

end

return DLMS
