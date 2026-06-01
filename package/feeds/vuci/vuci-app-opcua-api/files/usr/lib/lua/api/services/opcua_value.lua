local ConfigService = require("api/ConfigService")
local opcua_utils = require("api.services.opcua_utils")

local MAX_VALUES_PER_GROUP = 50

local OpcuaValue = ConfigService:new({ increment_name = true })

function OpcuaValue:initialize_hook()
	if self:table_get(self.config, self.binding, ".type") ~= "value_group" then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Parent section is not a value group.", "Validation")
	end
end

local s = OpcuaValue:section("opcua_client", function(self) return "value_" .. self.binding end)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------
do
	local enabled = s:option("enabled")
	enabled.require = { ["1"] = {"server_node" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local ui_name = s:option("name")
	ui_name.cfg_require = true
		function ui_name:validate(value)
			local found = false
			self:table_foreach(self.config, "value_" .. self.binding, function(c)
				if c.name == value and c[".name"] ~= self.sid then found = true end
			end)
			if found then return false, "Name is already used." end
			return self.dt:uciname(value)
		end

	local prefix = s:option("prefix")
		function prefix:validate(value)
			return self.dt:string(value)
		end

	local postfix = s:option("postfix")
		function postfix:validate(value)
			return self.dt:string(value)
		end

	local replacement = s:option("replacement")
		function replacement:validate(value)
			return self.dt:string(value)
		end

	local server_node = s:option("server_node")
		function server_node:validate(value)
			local server_node_options = {}
			local servers = {}
			self:table_foreach(self.config, "server", function(c)
				table.insert(servers, c[".name"])
			end)
			for _, server in ipairs(servers) do
				self:table_foreach(self.config, "server_node_" .. server, function(n)
					table.insert(server_node_options, n[".name"])
				end)
			end
			return self.dt:check_array(value, server_node_options)
		end
end
-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function OpcuaValue:POST_validate_section_hook()
	local values = self:table_count(self.config, "value_" .. self.binding)
	if values >= MAX_VALUES_PER_GROUP then
		self:add_error(STD_CODES.CONF_ERROR, ("Group value limit was reached (%d max)"):format(MAX_VALUES_PER_GROUP))
		return false
	end
end

function OpcuaValue:test_value()
	local data = self.arguments.data
	if type(data.server_node) ~= "string" then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Value must be a string", "Validation")
	end

	local server_node = self:table_get(self.main_config, data.server_node)
	server_node.node_id = server_node.id
	server_node.id = nil

	local server_id = server_node[".type"]:match("^server_node_(.*)$")
	local server    = self:table_get(self.main_config, server_id)

	local result, errcode, errmsg = opcua_utils:test_group_value(
		server,
		server_node,
		{
			prefix = data.prefix,
			postfix = data.postfix,
			replacement = data.replacement,
		}
	)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	self:ResponseOK(result)
end

local test = OpcuaValue:action("test", OpcuaValue.test_value)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local _prefix = test:option("prefix")
		function _prefix:validate(value)
			return self.dt:string()
		end

	local _postfix = test:option("postfix")
		function _postfix:validate(value)
			return self.dt:string()
		end

	local _replacement = test:option("replacement")

	local _server_node = test:option("server_node")
	_server_node.require = true
		function _server_node:validate(value)
			local server_node_options = {}
			local servers = {}
			self:table_foreach(self.config, "server", function(s)
				table.insert(servers, s[".name"])
			end)
			for _, server in ipairs(servers) do
				self:table_foreach(self.config, "server_node_" .. server, function(n)
					table.insert(server_node_options, n[".name"])
				end)
			end
			return self.dt:check_array(value, server_node_options)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function OpcuaValue:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function OpcuaValue:GET_TYPE_status()
	local group_value_id = self.sid

	if group_value_id == nil then
		return self:ResponseError("Group value id is required")
	end

	if self:table_get(self.main_config, "main", "enabled") ~= "1" then
		return self:ResponseError("Service is disabled")
	end

	local group_value = self:table_get(self.main_config, group_value_id)
	if not group_value or group_value[".type"] ~= ("value_%s"):format(self.binding) then
		return self:ResponseNotFound("Group value not found")
	end

	if group_value.enabled ~= "1" then
		return self:ResponseError("Group value is disabled")
	end

	local group = self:table_get(self.main_config, self.binding)
	assert(group)
	if group.enabled ~= "1" then
		return self:ResponseNotFound("Group is disabled")
	end

	local server_node = self:table_get(self.main_config, group_value.server_node)
	assert(server_node)

	server_node.node_id = server_node.id
	server_node.id = nil

	local server_id = server_node[".type"]:match("^server_node_(.*)$")
	local server = self:table_get(self.main_config, server_id)
	assert(server)

	if server.enabled ~= "1" then
		return self:ResponseError("Server is disabled")
	end

	local result, errcode, errmsg = opcua_utils:test_group_value(server, server_node, group_value)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	self:ResponseOK(result)
end

return OpcuaValue
