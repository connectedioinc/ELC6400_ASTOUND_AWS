local util = require("vuci.util")
local utils = {}

utils.ERROR_CODES = {
	UNKNOWN = 20,
	REQUEST_FAILED = 21
}

local function transform_server(server)
	return {
		id = server.id,
		url = server.url,
		timeout = tonumber(server.timeout),
		security_mode = tonumber(server.security_mode) or 0,
		username = server.username,
		password = server.password,
		certificate = server.certificate,
		identity = tonumber(server.identity) or 0,
		application_uri = server.application_uri,
		key = server.key,
		tcl = server.tcl
	}
end

local function transform_server_node(server_node)
	return {
		ns = server_node.ns,
		type = server_node.type,
		id = server_node.node_id,

		node_id = server_node.id,
		server_id = server_node.server_id,
	}
end

local function transform_group(group)
	return {
		scheduling_type = tonumber(group.scheduling_type),
		period = tonumber(group.period),
		fail_mode = tonumber(group.fail_mode),
		fail_store = tonumber(group.fail_store),
		postfix = group.postfix,
		prefix = group.prefix,
		midfix = group.midfix,
		replacement = group.replacement,
	}
end

local function call_ubus_method(method_name, payload)
	local response = util.ubus("opcua_client.rpc", method_name, payload, 10 * 60)

	if not response then
		return nil, utils.ERROR_CODES.UNKNOWN
	end
	if response.error ~= 0 then
		return nil, utils.ERROR_CODES.REQUEST_FAILED, response.result
	end

	return response.result
end

function utils:test_server(server)
	return call_ubus_method("test_server", transform_server(server))
end

function utils:test_server_node(server, server_node)
	return call_ubus_method("test_server_node", {
		server_node = transform_server_node(server_node),
		server = transform_server(server)
	})
end

function utils:test_group_value(server, server_node, group_value)
	return call_ubus_method("test_value", {
		server_node = transform_server_node(server_node),
		server = transform_server(server),
		group_value = group_value,
	})
end

function utils:test_group(servers, server_nodes, group_values, group)
	local transformed_servers = {}
	for _, server in ipairs(servers) do
		table.insert(transformed_servers, transform_server(server))
	end

	local trasnformed_server_nodes = {}
	for _, server_node in ipairs(server_nodes) do
		table.insert(trasnformed_server_nodes, transform_server_node(server_node))
	end

	return call_ubus_method("test_value_group", {
		server_nodes = trasnformed_server_nodes,
		servers = transformed_servers,
		group = transform_group(group),
		group_values = group_values
	})
end

return utils
