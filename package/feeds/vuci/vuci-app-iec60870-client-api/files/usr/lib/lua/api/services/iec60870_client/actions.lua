local FunctionService = require("api.FunctionService")
local utils = require("api.services.iec60870_client.utils")
local util = require("vuci.util")

local schema_validator = require("api.schema_validator")
local schema_object = schema_validator.schema_object
local schema_string = schema_validator.schema_string
local schema_string_required = schema_validator.schema_string_required
local schema_list = schema_validator.schema_list

local Actions = FunctionService:new()

function Actions:GET_TYPE_status()
	local result, err = utils.service_status()
	if not result then
		self:add_critical_error(err, ("Failed to get service status: %s"):format(err))
	end

	return self:ResponseOK(util.table_to_json_object(result))
end

function Actions:POST_action_validate_options()
	return true -- Validation will occur inside `:action()`
end

Actions:action("test_information_objects", function(self, data)
	local schema = schema_object{
		connection_type = schema_string_required(function(value)
			local available_types = { "iec104" }
			-- TODO: Uncomment this when application supports serial
			-- if board:has_serial() then
			-- 	table.insert(available_types, "iec101")
			-- end
			return self.dt:check_array(value, available_types)
		end),
		information_objects_selection = schema_string_required(function(value)
			return self.dt:is_bool(value)
		end),
		information_objects = schema_list(
			schema_string(function(value) return utils.validate_io_triplet(value) end),
			function(ctx) return ctx:get("information_objects_selection") == "0" end
		),
		common_addresses = schema_list(
			schema_string(function(value) return self.dt:irange(value, 1, 2^16 - 1) end),
			function(ctx) return ctx:get("information_objects_selection") == "1" end
		),
		timeout = schema_string(function(value)
			return self.dt:irange(value, 1, 60)
		end),

		-- TCP options
		ip = {
			format = function(value) return self.dt:ip4addr(value) end,
			required = function(ctx) return ctx:get("connection_type") == "iec104" end
		},
		port = {
			format = function(value) return self.dt:port(value) end,
			required = function(ctx) return ctx:get("connection_type") == "iec104" end
		}
	}

	local ctx = schema_validator.ValidatorContext.new()
	ctx:validate_by_schema(self, data, schema)
	self:return_if_error(422)

	local result, err = utils.test_information_objects(data)
	if err then
		self:add_critical_error(1, ("Failed to test information objects: %s"):format(err))
	end

	return self:ResponseOK(result)
end)

Actions:action("list_information_objects", function(self, data)
	local schema = schema_object{
		connection_type = schema_string_required(function(value)
			local available_types = { "iec104" }
			-- TODO: Uncomment this when application supports serial
			-- if board:has_serial() then
			-- 	table.insert(available_types, "iec101")
			-- end
			return self.dt:check_array(value, available_types)
		end),
		common_address = schema_string_required(function(value)
			return self.dt:irange(value, 1, 2^16 - 1)
		end),

		-- TCP options
		ip = {
			format = function(value) return self.dt:ip4addr(value) end,
			required = function(ctx) return ctx:get("connection_type") == "iec104" end
		},
		port = {
			format = function(value) return self.dt:port(value) end,
			required = function(ctx) return ctx:get("connection_type") == "iec104" end
		}
	}

	local ctx = schema_validator.ValidatorContext.new()
	ctx:validate_by_schema(self, data, schema)
	self:return_if_error(422)

	local result, err = utils.list_information_objects(data)
	if err then
		self:add_critical_error(1, ("Failed to list information objects: %s"):format(err))
	end

	return self:ResponseOK(result)
end)

return Actions
