local FunctionService = require("api.FunctionService")
local util = require("vuci.util")
local Validators = require("api.Validations")
local schema_validator = require("api.schema_validator")
local schema_object = schema_validator.schema_object
local schema_list = schema_validator.schema_list
local schema_string = schema_validator.schema_string
local schema_string_required = schema_validator.schema_string_required
local opcua_utils = require("api.services.opcua_utils")

local GlobalActions = FunctionService:new()

local server_schema = schema_object{
	url = schema_string_required(function(value)
		local proto, host = value:match("(%w+.%w+)://(.+)")
		if proto and host then
			local valid, err = Validators:protourl(value)
			if not valid then return false, err end
			if proto == "http" or proto == "https" or proto == "opc.tcp" then
				return true
			end
		end
		return false, "Url with http, https or opc.tcp protocol must be defined."
	end),
	application_uri = schema_string(function(value)
		return Validators:string(value)
	end),
	identity = schema_string(function(value)
		return Validators:range(value, 0, 1)
	end),
	timeout = schema_string_required(function(value)
		return Validators:range(value, 10, 3600000)
	end),
	security_mode = schema_string(function(value)
		return Validators:range(value, 0, 2)
	end),
	username = {
		format = function(value) return Validators:credentials_validate(value) end,
		required = function(ctx) return ctx:get("identity") == "1" end
	},
	password = {
		format = function(value) return Validators:credentials_validate(value) end,
		required = function(ctx) return ctx:get("identity") == "1" end
	},
	certificate = {
		format = function(value) return Validators:file_validation(value, { "/etc/vuci-uploads/" }) end,
		required = function(ctx) return ctx:get("security_mode") == "2" end
	},
	key = {
		format = function(value) return Validators:file_validation(value, { "/etc/vuci-uploads/" }) end,
		required = function(ctx) return ctx:get("security_mode") == "2" end
	},
	tcl = schema_list(
		schema_string(function(value) return Validators:file_validation(value, { "/etc/vuci-uploads/" }) end)
	)
}

local server_node_schema = schema_object{
	ns = schema_string_required(function(value)
		return Validators:irange(value, 0, 65535)
	end),
	type = schema_string_required(function(value)
		return Validators:range(value, 0, 3)
	end),
	node_id = schema_string_required(function(value, ctx)
		local current_type = ctx:get("type")
		if current_type == "0" then
			return Validators:range(value, 0, 4294967295)
		elseif current_type == "1" then
			return Validators:string()
		elseif current_type == "2" then
			return Validators:guid(value)
		elseif current_type == "3" then
			return Validators:base64(value)
		end

		return true
	end)
}

local value_schema = schema_object{
	prefix = { },
	postfix = { },
	replacement = { },
}

local value_group_schema = schema_object{
	fail_mode = schema_string_required(function(value)
		return Validators:range(value, 0, 2)
	end),
	prefix = { },
	postfix = { },
	midfix = { },
	replacement = { },
}

function GlobalActions:POST_action_validate_options(action)
	local schema

	if action.action_key == "test_server" then
		schema = server_schema
	elseif action.action_key == "test_server_node" then
		schema = schema_object{
			server = server_schema,
			server_node = server_node_schema
		}
	elseif action.action_key == "test_group_value" then
		schema = schema_object{
			server = server_schema,
			server_node = server_node_schema,
			group_value = value_schema
		}
	elseif action.action_key == "test_group" then
		local server_with_id_schema = util.clone(server_schema, true)
		server_with_id_schema.options.id = {
			required = true
		}

		local server_node_with_id_schema = util.clone(server_node_schema, true)
		server_node_with_id_schema.options.server_id = { required = true }
		server_node_with_id_schema.options.id = { required = true }

		local value_with_id_schema = util.clone(value_schema, true)
		value_with_id_schema.options.server_node = { required = true }

		schema = schema_object{
			servers = schema_list(server_with_id_schema),
			server_nodes = schema_list(server_node_with_id_schema),
			group_values = schema_list(value_with_id_schema),
			group = value_group_schema
		}
		schema.options.servers.required = true
		schema.options.server_nodes.required = true
		schema.options.group_values.required = true
	end

	local ctx = schema_validator.ValidatorContext.new()

	local data = self.arguments.data or {}
	return ctx:validate_by_schema(self, data, schema)
end

GlobalActions:action("test_server", function(self, data)
	local result, errcode, errmsg = opcua_utils:test_server(data)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	return self:ResponseOK(result)
end)

GlobalActions:action("test_server_node", function(self, data)
	local _, errcode, errmsg = opcua_utils:test_server_node(
		data.server,
		data.server_node
	)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	return self:ResponseOK("OK")
end)

GlobalActions:action("test_group_value", function(self, data)
	local result, errcode, errmsg = opcua_utils:test_group_value(
		data.server,
		data.server_node,
		data.group_value
	)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	return self:ResponseOK(result)
end)

GlobalActions:action("test_group", function(self, data)
	local result, errcode, errmsg = opcua_utils:test_group(
		data.servers,
		data.server_nodes,
		data.group_values,
		data.group
	)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	return self:ResponseOK(result)
end)

return GlobalActions
