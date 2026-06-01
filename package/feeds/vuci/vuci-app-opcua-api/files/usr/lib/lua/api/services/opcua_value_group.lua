local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local opcua_utils = require("api.services.opcua_utils")

local MAX_VALUE_GROUPS = 20

local OpcuaValueGroup = ConfigService:new({ increment_name = true })

local s = OpcuaValueGroup:section("opcua_client", "value_group")

function s:create_defaults()
	-- TEMP | till we add more scheduling types
	return {
		scheduling_type = "0",
		period = "60"
	}
end
-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "scheduling_type", "fail_mode" }}
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local ui_name = s:option("name")
	ui_name.cfg_require = true
		function ui_name:validate(value)
			local found = false
			self:table_foreach(self.config, "value_group", function(c)
				if c.name == value and c[".name"] ~= self.sid then found = true end
			end)
			if found then return false, "Name is already used." end
			return self.dt:uciname(value)
		end

	local scheduling_type = s:option("scheduling_type")
		scheduling_type.require = { ["0"] = { "period" } }
		function scheduling_type:validate(value)
			return self.dt:range(value, 0, 0)
		end

	local period = s:option("period")
		function period:validate(value)
			return self.dt:irange(value, 1, 86400)
		end

	local fail_mode = s:option("fail_mode")
	fail_mode.require = { ["1"] = { "fail_store" },
	                      ["2"] = { "fail_store" } }
		function fail_mode:validate(value)
			return self.dt:range(value, 0, 2)
		end

	local fail_store = s:option("fail_store")
		function fail_store:validate(value)
			return self.dt:is_bool(value)
		end

	local replacement = s:option("replacement")
		function replacement:validate(value)
			return self.dt:string(value)
		end

	local prefix = s:option("prefix")
		function prefix:validate(value)
			return self.dt:string(value)
		end

	local midfix = s:option("midfix")
		function midfix:validate(value)
			return self.dt:string(value)
		end

	local postfix = s:option("postfix")
		function postfix:validate(value)
			return self.dt:string(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function OpcuaValueGroup:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function OpcuaValueGroup:service_status()
	local res = {}

	local opcua_status = util.ubus("opcua_client.app", "status")
	if opcua_status then
		res.value_groups = {}
		local group_statuses = {}
		for _, group_status in pairs(opcua_status.value_groups) do
			group_statuses[group_status.id] = group_status
		end
		local value_statuses = {}
		for _, value_status in pairs(opcua_status.values) do
			value_statuses[value_status.id] = value_status
		end
		self:table_foreach(self.main_config, "value_group", function(_s)
			if _s.enabled == "1" and group_statuses[_s[".name"]] then
				local value_group = group_statuses[_s[".name"]]
				value_group.values = {}
				self:table_foreach(self.main_config, "value_" .. _s[".name"], function(value_section)
					if value_section.enabled == "1" and value_statuses[value_section[".name"]] then
						table.insert(value_group.values, value_statuses[value_section[".name"]])
					end
				end)
				table.insert(res.value_groups, value_group)
			end
		end)
	end

	return self:ResponseOK(res)
end

function OpcuaValueGroup:cosem_group_status(group_id)
	if self:table_get(self.main_config, "main", "enabled") ~= "1" then
		return self:ResponseError("Service is disabled")
	end

	local group = self:table_get(self.main_config, group_id)
	if not group or group[".type"] ~= "value_group" then
		return self:ResponseNotFound("Group not found")
	end

	if group.enabled ~= "1" then
		return self:ResponseError("Group is disabled")
	end

	local group_values = {}

	local server_nodes = {}
	local server_node_ids = {}

	local servers = {}
	local server_ids = {}

	for _, group_value in ipairs(self:table_find_many(self.main_config, ("value_%s"):format(group_id))) do
		if group_value.enabled == "1" then
			local server_node_id = group_value.server_node
			local server_node = self:table_get(self.main_config, server_node_id)
			assert(server_node)

			local server_id = server_node[".type"]:match("^server_node_(.+)$")
			assert(server_id)
			local server = self:table_get(self.main_config, server_id)
			assert(server)

			if server.enabled == "1" then
				table.insert(group_values, group_value)

				if util.insert_to_set(server_ids, server_id) then
					server.id = server[".name"]
					table.insert(servers, server)
				end

				if util.insert_to_set(server_node_ids, server_node_id) then
					server_node.node_id = server_node.id
					server_node.id = server_node[".name"]
					server_node.server_id = server_id
					table.insert(server_nodes, server_node)
				end
			end
		end
	end

	local result, errcode, errmsg = opcua_utils:test_group(servers, server_nodes, group_values, group)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	self:ResponseOK(result)
end

function OpcuaValueGroup:GET_TYPE_status()
	if self.sid == nil then
		return self:service_status()
	else
		return self:cosem_group_status(self.sid)
	end
end

-- End of status

function OpcuaValueGroup:DELETE_before_section_delete_hook()
	self:table_foreach(self.main_config, "value_" .. self.sid, function(s)
		self:table_delete(self.main_config, s[".name"])
	end)
end

function OpcuaValueGroup:POST_validate_section_hook()
	local groups = 0
	self:table_foreach(self.config, "value_group", function(c)
		groups = groups + 1
	end)
	if groups >= MAX_VALUE_GROUPS then
		self:add_error(STD_CODES.CONF_ERROR, ("Value group limit was reached (%d max)"):format(MAX_VALUE_GROUPS))
		return false
	end
end

function OpcuaValueGroup:test_value_group()
	local data = self.arguments.data

	local group_values = {}
	local server_node_ids = {}
	local server_nodes = {}
	local server_ids = {}
	local servers = {}

	for _, group_value_id in ipairs(data.values) do
		local group_value = self:table_get(self.main_config, group_value_id)
		assert(group_value)
		local server_node_id = group_value["server_node"]

		local server_node = self:table_get(self.main_config, server_node_id)
		assert(server_node)
		local server_id = server_node[".type"]:match("^server_node_(.*)$")

		if util.insert_to_set(server_ids, server_id) then
			local server = self:table_get(self.main_config, server_id)
			assert(server)
			server.id = server_id
			table.insert(servers, server)
		end

		if util.insert_to_set(server_node_ids, server_node_id) then
			server_node["node_id"] = server_node[".name"]
			server_node["server_id"] = server_id
			table.insert(server_nodes, server_node)
		end

		table.insert(group_values, group_value)
	end

	local group = {
		prefix = data.prefix,
		midfix = data.midfix,
		postfix = data.postfix,
		fail_mode = tonumber(data.fail_mode),
		replacement = data.replacement,
	}

	local result, errcode, errmsg = opcua_utils:test_group(servers, server_nodes, group_values, group)

	if errcode == opcua_utils.ERROR_CODES.UNKNOWN then
		self:add_critical_error(1, "OPC UA Client service encountered an unexpected error.", "Request")
	elseif errcode == opcua_utils.ERROR_CODES.REQUEST_FAILED then
		self:add_critical_error(2, errmsg or "ERROR", "Request")
	end

	return self:ResponseOK(result)
end

function OpcuaValueGroup:list_group_values()
	local value_ids = {}
	self:table_foreach(self.main_config, "value_group", function(value_group)
		local value_group_id = value_group['.name']
		self:table_foreach(self.main_config, "value_" .. value_group_id, function(c)
			table.insert(value_ids, c[".name"])
		end)
	end)
	return value_ids
end


local test = OpcuaValueGroup:action("test", OpcuaValueGroup.test_value_group)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local _prefix = test:option("prefix")
		function _prefix:validate(value)
			return self.dt:string()
		end

	local _midfix = test:option("midfix")
		function _midfix:validate(value)
			return self.dt:string()
		end

	local _postfix = test:option("postfix")
		function _postfix:validate(value)
			return self.dt:string()
		end

	local failmode = test:option("fail_mode")
	failmode.require = true
		function failmode:validate(value)
			return self.dt:range(value, 0, 2)
		end

	local _replacement = test:option("replacement")

	local values = test:option("values", { list = true })
	values.require = true
		function values:validate(value)
			return self.dt:check_array(value, self:list_group_values())
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return OpcuaValueGroup
