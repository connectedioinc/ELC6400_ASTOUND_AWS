local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local api_utils = require("api/api_utils")

local OpcuaServer = ConfigService:new({
	create = false,
	delete = false
})

local opcua_server = OpcuaServer:section("opcua_server", "opcua_server")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

local enabled = opcua_server:option("enabled")
enabled.require = { ["1"] = {"port"} }
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

local port = opcua_server:option("port")
	function port:validate(value)
		return self.dt:port(value)
	end
	
local encryption = opcua_server:option("encryption")
encryption.require = { ["1"] = { "application_uri", "certificate", "key" } }
	function encryption:validate(value)
			return self.dt:is_bool(value)
	end
	
local application_uri = opcua_server:option("application_uri")
	function application_uri:validate(value)
		return self.dt:string(value)
	end

local opt_disable_default_nodes = opcua_server:option("default_nodes_enabled")
	function opt_disable_default_nodes:validate(value)
		return self.dt:is_bool(value)
	end

local certificate = opcua_server:option("certificate", { file = true })

local key = opcua_server:option("key", { file = true })

local tcl = opcua_server:option("tcl", { file = true, list = true })

local disable_unencrypted_access = opcua_server:option("disable_unencrypted_access")
	function disable_unencrypted_access:validate(value)
			return self.dt:is_bool(value)
	end

-- STATUS

function OpcuaServer:GET_TYPE_status()
	local res = util.ubus("opcua-server", "status") or {}
	local opcua_service = util.ubus("service", "list", { name = "opcua_server" })
	if api_utils:is_table_empty(res) and opcua_service and opcua_service.opcua_server and opcua_service.opcua_server.instances then
		for _, instance in pairs(opcua_service.opcua_server.instances) do
			if instance.command[1] == "/usr/bin/opcua_server" then
				res.error_code = instance.exit_code
				break
			end
		end
	end
	return self:ResponseOK(res)
end

-- End of status

function OpcuaServer:validate_link_aggregation()
	local enabled = self:get_abs_value(self.config, "opcua_server", "enabled")
	if enabled ~= "1" then
		return
	end

	self:table_foreach("network", "device", function(_s)
		if _s[".name"] and _s[".name"]:find("bond") and _s["ports"] then
			self:add_critical_error(STD_CODES.CONF_ERROR, "OPCUA server configuration cannot be modified because link aggregation is enabled.", "Validation")
		end
	end)
	local port = self:get_abs_value(self.config, "opcua_server", "port")
	if not port then return self:add_error(STD_CODES.INVALID_OPT, "Missing required option", "port") end
	if port == "" then return self:add_error(STD_CODES.INVALID_OPT, "Option cannot be empty", "port") end
end

function OpcuaServer:has_enabled_server_nodes_with_string_id()
	local result = false
	self:table_foreach(self.config, "server_node", function(server_node)
		if server_node.enabled == "1" and server_node.node_id_type == "string" then
			result = true
			return false -- break
		end
	end)
	return result
end

function OpcuaServer:validate_string_id_type()
	local default_nodes_enabled = self:get_abs_value(self.config, self.sid, "default_nodes_enabled")
	if default_nodes_enabled == nil then
		default_nodes_enabled = "1"
	end

	if default_nodes_enabled == "1" and self:has_enabled_server_nodes_with_string_id() then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"All server nodes which use string node ID type must be disabled to enable default server nodes",
			"Validation"
		)
	end
end

function OpcuaServer:UPDATE_validate_section_hook()
	self:validate_link_aggregation()
	self:validate_string_id_type()
end
OpcuaServer.PUT_validate_section_hook = OpcuaServer.UPDATE_validate_section_hook
OpcuaServer.POST_validate_section_hook = OpcuaServer.UPDATE_validate_section_hook

function OpcuaServer:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "opcua_server")
	return { path = path }
end

return OpcuaServer
