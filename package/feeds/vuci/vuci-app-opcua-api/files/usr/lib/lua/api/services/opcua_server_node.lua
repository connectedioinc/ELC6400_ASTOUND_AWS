local ConfigService = require("api/ConfigService")
local opcua_utils = require("api.services.opcua_utils")

local MAX_NODES_PER_SERVER = 50

local OpcuaServerNode = ConfigService:new({ increment_name = true })

function OpcuaServerNode:initialize_hook()
	if self:table_get(self.config, self.binding, ".type") ~= "server" then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Parent section is not a server.", "Validation")
	end
end

local s = OpcuaServerNode:section("opcua_client", function(self) return "server_node_" .. self.binding end)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local ui_name = s:option("name")
	ui_name.cfg_require = true
		function ui_name:validate(value)
			local found = false
			self:table_foreach(self.config, "server_node_" .. self.binding, function(c)
				if c.name == value and c[".name"] ~= self.sid then found = true end
			end)
			if found then return false, "Name is already used." end
			return self.dt:uciname(value)
		end

	local namespace = s:option("ns")
		function namespace:validate(value)
			return self.dt:irange(value, 0, 65535)
		end

	local type = s:option("type")
		function type:validate(value)
			return self.dt:range(value, 0, 3)
		end

	local node_id = s:option("node_id")
		function node_id:validate(value)
			local current_type = self:get_abs_value(self.main_config, self.sid, "type")
			if current_type == "0" then
				return self.dt:range(value, 0, 4294967295)
			elseif current_type == "1" then
				return self.dt:string()
			elseif current_type == "2" then
				return self.dt:guid(value)
			elseif current_type == "3" then
				return self.dt:base64(value)
			end
			return false, "Option type is missing."
		end
		function node_id:set(value)
			self:table_set(self.config, self.sid, "id", value)
		end
		function node_id:get(_)
			return self:table_get(self.config, self.sid, "id") or nil
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- Remove this and add cfg_require for these when WebUI fixes their things
function OpcuaServerNode:PUT_validate_section_hook()
	local ns = self:get_abs_value(self.main_config, self.sid, "ns")
	local tp = self:get_abs_value(self.main_config, self.sid, "type")
	local id = self.current_data_block["node_id"] or self:table_get(self.main_config, self.sid, "id")
	if not ns then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required option: ns", ns)
	end
	if not tp then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required option: type", tp)
	end
	if not id or id == "" then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required option: node_id", id)
	end
end

function OpcuaServerNode:POST_validate_section_hook()
	local nodes = 0
	self:table_foreach(self.config, "server_node_" .. self.binding, function(s)
		nodes = nodes + 1
	end)
	if nodes >= MAX_NODES_PER_SERVER then
		self:add_error(STD_CODES.CONF_ERROR, ("Server node limit was reached (%d max)"):format(MAX_NODES_PER_SERVER))
		return false
	end
end

function OpcuaServerNode:test_server_node()
	local server = self:table_get(self.main_config, self.binding)
	local server_node = self.arguments.data
	local _, errcode, errmsg = opcua_utils:test_server_node(server, server_node)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	return self:ResponseOK("OK")
end

local test = OpcuaServerNode:action("test", OpcuaServerNode.test_server_node)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local id_ns_index = test:option("ns")
	id_ns_index.require = true
		function id_ns_index:validate(value)
			return self.dt:range(value, 0, 65535)
		end

	local id_type = test:option("type")
	id_type.require = true
		function id_type:validate(value)
			return self.dt:range(value, 0, 3)
		end

	local id_data = test:option("node_id")
	id_data.require = true
		function id_data:validate(value)
			if self.arguments.data.type == "0" then
				return self.dt:range(value, 0, 4294967295)
			elseif self.arguments.data.type == "1" then
				return self.dt:string()
			elseif self.arguments.data.type == "2" then
				return self.dt:guid(value)
			elseif self.arguments.data.type == "3" then
				return self.dt:base64(value)
			end
			return false, "Option type is missing."
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function OpcuaServerNode:DELETE_before_commit_hook()
	local value_groups = {}
	self:table_foreach(self.config, "value_group", function(c)
		table.insert(value_groups, c[".name"])
	end)
	for _, single_group in ipairs(value_groups) do
		local group_values = self:table_find_many(self.config, "value_" .. single_group, { server_node = self.sid })
		for _, c in ipairs(group_values) do
			self:table_delete(self.config, c[".name"], "server_node")
			self:table_set(self.config, c[".name"], "enabled", "0")
		end
	end
end

function OpcuaServerNode:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function OpcuaServerNode:GET_TYPE_status()
	if self.sid == nil then
		return self:ResponseError("Request id is required")
	end

	if self:table_get(self.main_config, "main", "enabled") ~= "1" then
		return self:ResponseError("Service is disabled")
	end

	local server_node = self:table_get(self.main_config, self.sid)
	if not server_node or server_node[".type"] ~= ("server_node_%s"):format(self.binding) then
		return self:ResponseNotFound("Server node not found")
	end

	server_node.node_id = server_node.id
	server_node.id = nil

	local server = self:table_get(self.main_config, self.binding)
	assert(server)

	if server.enabled ~= "1" then
		return self:ResponseError("Server is disabled")
	end

	local result, errcode, errmsg = opcua_utils:test_server_node(server, server_node)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	return self:ResponseOK(result)
end

return OpcuaServerNode
