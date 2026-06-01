local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local util = require("vuci.util")
local json = require("luci.jsonc")
local dlms_utils = require("api.services.dlms_utils")
local Validators = require("api.Validations")

local schema_validator = require("api.schema_validator")
local schema_object = schema_validator.schema_object
local schema_list = schema_validator.schema_list
local schema_string = schema_validator.schema_string
local schema_string_required = schema_validator.schema_string_required

local DLMS = ConfigService:new({ increment_name = true })

local s = DLMS:section("dlms_client", "cosem_group")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------
	local opt_enabled = s:option("enabled")
	opt_enabled.require = { ["1"] = { "name", "interval" } }
	function opt_enabled:validate(value)
		return self.dt:is_bool(value)
	end

	local name = s:option("name")
	name.maxlength = 200
	function name:validate(value)
		return self.dt:default_validation(value)
	end

	local interval = s:option("interval")
	function interval:validate(value)
		return self.dt:irange(value, 1, 4294967295)
	end

	-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

	-- STATUS

	function DLMS:STATUS_sid_exists()
		return true -- Validation of sid is done in :GET_TYPE_status()
	end

	function DLMS:service_status()
		local res = dlms_utils.get_service_status()
		return self:ResponseOK(res)
	end

	function DLMS:cosem_group_status(group_id)
		if self:table_get(self.main_config, "main", "enabled") ~= "1" then
			return self:ResponseError("Service is disabled")
		end

		local cosem_group = self:table_get(self.main_config, group_id)
		if not cosem_group or cosem_group[".type"] ~= "cosem_group" then
			return self:ResponseNotFound("Cosem group not found")
		end

		if cosem_group.enabled ~= "1" then
			return self:ResponseError("Cosem group is disabled")
		end

		local objects = {}

		local devices = {}
		local device_ids = {}

		local connections = {}
		local connection_ids = {}

		local group_values = self:table_find_many(self.main_config, "cosem", { cosem_group = group_id })
		for _, group_value in ipairs(group_values) do
			if group_value.enabled == "1" then
				local used_group_device_ids = {}
				for _, device_id in ipairs(group_value.physical_device) do
					local device = self:table_get(self.main_config, device_id)
					if device.enabled == "1" then
						local connection_id = device.connection
						local connection = self:table_get(self.main_config, connection_id)
						if connection.enabled == "1" then
							table.insert(used_group_device_ids, device_id)

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

				if #used_group_device_ids > 0 then
					table.insert(objects, {
						name = group_value.name,
						short_name = group_value.short_name,
						logical_name = group_value.logical_name,
						devices = used_group_device_ids,
						cosem_id = group_value.cosem_id,
						entries = group_value.entries,
						attributes = group_value.attributes
					})
				end
			end
		end

		if #objects == 0 then
			self:ResponseNotFound("No enabled group values, physical devices or connections")
		end

		local result = dlms_utils.test_cosem_group(connections, devices, objects)
		if not result.result then
			self:add_critical_error(15, "DLMS service encountered an unexpected error.", "Cosem group")
		end
		if result.error ~= 0 then
			return self:ResponseError(result.result)
		end

		return self:ResponseOK(result.result)
	end

	function DLMS:GET_TYPE_status()
		if self.sid == nil then
			return self:service_status()
		else
			return self:cosem_group_status(self.sid)
		end
	end

	-- End of status

	function DLMS:POST_validate_hook()
		local interfaces = self:table_count("dlms_client", "cosem_group")
		if interfaces >= 10 then
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 10 instances are allowed")
		end
	end

	function DLMS:DELETE_before_section_delete_hook()
		self:table_foreach(self.main_config, "cosem", function(r)
			if self.sid == r.cosem_group then
				self:table_delete(self.main_config, r[".name"])
			end
		end)
	end

-------------- Test function ---------------------
do
	local function find_by_id(objects, id)
		for _, object in ipairs(objects) do
			if object.id == id then
				return object
			end
		end
	end

	function DLMS:test()
		local given_devices = self.arguments.data.devices or {}
		local given_connections = self.arguments.data.connections or {}

		local group_values = {}
		local connections = {}
		local devices = {}

		local needed_devices = {}
		for _, group_value in ipairs(self.arguments.data.object) do
			local enabled = tonumber(group_value.enabled)
			if enabled then
				table.insert(group_values, group_value)
				for _, device in ipairs(group_value.devices) do
					util.insert_to_set(needed_devices, device)
				end
			end
		end

		local needed_connections = {}
		for _, device_id in ipairs(needed_devices) do
			local device = find_by_id(given_devices, device_id)
			if not device then
				device = self:table_get(self.main_config, device_id)
				device.id = device[".name"]
			end

			table.insert(devices, device)
			util.insert_to_set(needed_connections, device.connection)
		end

		for _, connection_id in ipairs(needed_connections) do
			local connection = find_by_id(given_connections, connection_id)
			if not connection then
				connection = self:table_get(self.main_config, connection_id)
				connection.id = connection[".name"]
			end

			table.insert(connections, connection)
		end

		local test = dlms_utils.test_cosem_group(connections, devices, group_values)

		if not test then self:add_critical_error(15, "DLMS service encountered an unexpected error.", "Cosem group") end
		test = test or {}
		if self.arguments.data.pretty == "1" then
			return self:ResponseOK(test)
		else
			return self:ResponseOK(json.stringify(test))
		end
	end

	local test = DLMS:action("test", DLMS.test)

	function DLMS:POST_action_validate_options()
		local data = self.arguments.data or {}

		local schema_group_value = schema_object{
			-- TODO: Remove this option for API v2, because it is not used
			id = { },
			-- TODO: Remove this option for API v2, because it is not used
			enabled = schema_string(function(value)
				return Validators:is_bool(value)
			end),

			name = { required = true },

			devices = schema_list({ }, true),
			-- TODO: Remove this option for API v2, because it is not used
			obis = { required = false },
			logical_name = schema_string(function(value)
				return dlms_utils:validate_logical_name(value)
			end),
			short_name = schema_string(function(value)
				return dlms_utils:validate_short_name(value)
			end),
			cosem_id = schema_string_required(function(value)
				return dlms_utils.COSEM_ATTRIBUTE_GROUPS[value] ~= nil, "COSEM object COSEM ID is incorrect"
			end),
			attributes = {
				type = "list",
				item_schema = schema_string(function(value, ctx)
					local cosem_id = ctx:get("cosem_id")
					local attribute_group = dlms_utils.COSEM_ATTRIBUTE_GROUPS[cosem_id]
					return attribute_group ~= nil and util.contains(attribute_group, value), "COSEM object attribute is incorrect"
				end),
				format = function(value)
					local attribute_counter = {}
					for _, attribute in ipairs(value) do
						attribute_counter[attribute] = (attribute_counter[attribute] or 0) + 1
						if attribute_counter[attribute] > 1 then
							return false, "COSEM object attributes must be unique"
						end
					end
					return true
				end
			},
			entries = schema_string(function(value)
				return Validators:uinteger(value)
			end)
		}

		local function get_connection_type(connection_id)
			for _, connection in ipairs(data.connections or {}) do
				if connection.id == connection_id then
					return connection.connection_type
				end
			end

			return self:table_get(self.config, connection_id, "connection_type")
		end

		local schema_device = schema_object{
			id = { required = true },
			name = { required = true },
			connection = { required = true },
			server_addr_type = schema_string_required(function(value)
				return Validators:check_array(value, { "0", "1" })
			end),
			server_addr = schema_string_required(function(value, ctx)
				local address_type = ctx:get("server_addr_type") or "0"
				if address_type == "0" then
					return Validators:irange(value, 0, 16383)
				elseif address_type == "1" then
					return Validators:uinteger(value)
				end
			end),
			log_server_addr = schema_string_required(function(value)
				return Validators:irange(value, 0, 16383)
			end),
			client_addr = schema_string_required(function(value)
				return Validators:irange(value, 0, 16383)
			end),
			access_security = schema_string_required(function(value)
				return self.dt:check_array(value, dlms_utils.available_access_security)
			end),
			password = {
				required = function(ctx)
					local access_security = ctx:get("access_security")
					return access_security and util.contains({ "1", "2", "3", "4", "6" }, access_security)
				end
			},
			use_ln_ref = schema_string(function(value)
				return Validators:is_bool(value)
			end),
			interface = schema_string(function(value, ctx)
				local connection_id = ctx:get("connection")
				local connection_type = get_connection_type(connection_id)
				local options = dlms_utils.get_available_device_interfaces(connection_type)
				return Validators:check_array(value, options)
			end),
			transport_security = schema_string(function(value)
				return Validators:check_array(value, {"0", "16", "32", "48"})
			end),
			authentication_key = {
				required = function(ctx)
					return ctx:get("access_security") == "5" or ctx:get("transport_security") == "16" or ctx:get("transport_security") == "48"
				end
			},
			block_cipher_key = {
				required = function(ctx)
					local access_security = ctx:get("access_security")
					local transport_security = ctx:get("transport_security")
					return access_security == "5" or transport_security == "32" or transport_security == "48"
				end
			},
			invocation_counter = {
				required = function(ctx)
					return ctx:get("access_security") == "16"
				end
			},
			dedicated_key = { }
		}

		local function is_connection_tcp(ctx)
			return ctx:get("connection_type") == "0"
		end

		local function is_connection_serial(ctx)
			return ctx:get("connection_type") == "1"
		end

		local schema_connection = schema_object{
			id = {
				required = true
			},
			connection_type = schema_string_required(function(value)
				return self.dt:check_array(value, { "0", "1" })
			end),
			address = {
				format = function(value)
					return Validators:ipaddr(value)
				end,
				required = is_connection_tcp
			},
			port = {
				format = function(value)
					return Validators:port(value)
				end,
				required = is_connection_tcp
			},

			device = {
				format = function(value)
					if value:find("usb") then
						return true
					end
					return Validators:check_array(value, serial:get_devices(true))
				end,
				required = is_connection_serial
			},
			baudrate = {
				format = function(value, ctx)
					local device = ctx:get("device")
					return Validators:check_array(value, serial:get_baudrates(device))
				end,
				required = is_connection_serial
			},
			databits = {
				format = function(value, ctx)
					local device = ctx:get("device")
					return Validators:check_array(value, serial:get_databits(device))
				end,
				required = is_connection_serial
			},
			stopbits = {
				format = function(value, ctx)
					local device = ctx:get("device")
					return Validators:check_array(value, serial:get_stopbits(device))
				end,
				required = is_connection_serial
			},
			flowcontrol = {
				format = function(value, ctx)
					local device = ctx:get("device")
					return Validators:check_array(value, serial:get_flowcontrol(device))
				end,
				required = is_connection_serial
			},
			parity = {
				format = function(value, ctx)
					local device = ctx:get("device")
					return Validators:check_array(value, serial:get_parity(device))
				end,
				required = is_connection_serial
			},
		}

		local schema = schema_object{
			pretty = schema_string(function(value)
				return Validators:is_bool(value)
			end),
			object = schema_list(schema_group_value, true),
			connections = schema_list(schema_connection),
			devices = schema_list(schema_device)
		}

		local ctx = schema_validator.ValidatorContext.new()

		if not ctx:validate_by_schema(self, data, schema) then
			return false
		end

		local given_devices = data.devices or {}
		for _, group_value in pairs(data.object or {}) do
			for _, device_id in ipairs(group_value.devices) do
				local is_given = find_by_id(given_devices, device_id)
				local is_in_config = self:table_get(self.main_config, device_id)
				if not is_given and not is_in_config then
					self:add_error(STD_CODES.INVALID_OPT, ("Device with id '%s' not found"):format(device_id))
					return false
				end
			end
		end

		local given_connections = data.connections or {}
		for _, device in pairs(given_devices) do
			local is_given = find_by_id(given_connections, device.connection)
			local is_in_config = self:table_get(self.main_config, device.connection)
			if not is_given and not is_in_config then
				self:add_error(STD_CODES.INVALID_OPT, ("Connection with id '%s' not found"):format(device.connection))
				return false
			end
		end

		local active_connections = 0
		for _, group_value in pairs(data.object) do
			for _, device_id in pairs(group_value.devices) do
				local is_given = find_by_id(given_devices, device_id)
				if not is_given then
					local conn = self:get_abs_value(self.main_config, device_id, "connection")
					local conn_active = self:get_abs_value(self.config, conn, "enabled")
					if conn_active == "1" then
						active_connections = active_connections + 1
					end
				else
					active_connections = active_connections + 1
				end
			end
		end

		if active_connections == 0 then
			self:add_critical_error(16, "No DLMS connections enabled.", "Cosem group")
		end

		return true
	end

	local object = test:option("object")
	object.require = true
end

return DLMS
