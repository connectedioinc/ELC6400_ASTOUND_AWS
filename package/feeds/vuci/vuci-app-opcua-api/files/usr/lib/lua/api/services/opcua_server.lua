local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local MAX_SERVERS = 10

local OpcuaServer = ConfigService:new({ increment_name = true })

local s = OpcuaServer:section("opcua_client", "server")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = {"timeout", "url" }}
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local ui_name = s:option("name")
	ui_name.cfg_require = true
		function ui_name:validate(value)
			local found = false
			self:table_foreach(self.config, "server", function(c)
				if c.name == value and c[".name"] ~= self.sid then found = true end
			end)
			if found then return false, "Name is already used." end
			return self.dt:uciname(value)
		end

	local application_uri = s:option("application_uri")
		function application_uri:validate(value)
			return self.dt:string(value)
		end
	local url = s:option("url")
		function url:validate(value)
			local proto, host = value:match("(%w+.%w+)://(.+)")
			if proto and host then
				local valid, err = self.dt:protourl(value)
				if not valid then return false, err end
				if proto == "http" or proto == "https" or proto == "opc.tcp" then
					return true
				end
			end
			return false, "Url with http, https or opc.tcp protocol must be defined."
		end

	local timeout = s:option("timeout")
		function timeout:validate(value)
			return self.dt:irange(value, 10, 3600000)
		end

	local identity = s:option("identity")
	identity.require = { ["1"] = { "username", "password" } }
		function identity:validate(value)
			return self.dt:range(value, 0, 1)
		end

	local security_mode = s:option("security_mode")
	security_mode.require = { ["1"] = { "application_uri", "certificate", "key" }, ["2"] = { "application_uri", "certificate", "key" } }
		function security_mode:validate(value)
			return self.dt:range(value, 0, 2)
		end

	local username = s:option("username")
		function username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local password = s:option("password", { sensitive = true })
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local certificate = s:option("certificate", { file = true })

	local key = s:option("key", { file = true })

	local tcl = s:option("tcl", { file = true, list = true })

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function OpcuaServer:GET_TYPE_status()
	local simplified_session_states = {
		[1] = { 0, 5 },
		[2] = { 1, 2 },
		[3] = { 3, 4 },
	}
	local simplified_channel_states = {
		[1] = { 0, 12 },
		[2] = { 1 },
		[3] = { 2, 5, 6, 7, 8, 9 },
		[4] = { 3, 4 },
		[5] = { 10, 11 },
	}
	local function get_simplified_state(simplified_table, state_code)
		for state_key, states in pairs(simplified_table) do
			for _, state in pairs(states) do
				if state == state_code  then
					return state_key
				end
			end
		end
		return nil
	end
	local connect_statuses = {
		["default"] = 1,
		[0x80AC0000] = 2,
		[0x80170000] = 3,
		[0x80140000] = 4,
		[0x80160000] = 5,
	}
	local res = {}

	local opcua_status = util.ubus("opcua_client.app", "status")
	if opcua_status then
		res.uptime = opcua_status.uptime
		res.servers = {}
		local server_statuses = {}
		for _, server_status in pairs(opcua_status.servers) do
			server_statuses[server_status.id] = server_status
		end
		local node_statuses = {}
		for _, node_status in pairs(opcua_status.server_nodes) do
			node_statuses[node_status.id] = node_status
		end
		self:table_foreach(self.main_config, "server", function (_s)
			if _s.enabled == "1" and server_statuses[_s[".name"]] then
				local server = server_statuses[_s[".name"]]
				if server.connect_status < 0 then
					local connect_status_hex = tonumber("0x" .. string.format("%X", server.connect_status))
					server.connect_status = connect_statuses[connect_status_hex] or connect_statuses["default"]
				else
					server.connect_status = nil
				end
				server.session_state = get_simplified_state(simplified_session_states, server.session_state)
				server.channel_state = get_simplified_state(simplified_channel_states, server.channel_state)
				server.server_nodes = {}
				self:table_foreach(self.main_config, "server_node_" .. _s[".name"], function (node_section)
					if node_statuses[node_section[".name"]] then
						table.insert(server.server_nodes, node_statuses[node_section[".name"]])
					end
				end)
				table.insert(res.servers, server)
			end
		end)
	end

	return self:ResponseOK(res)
end

-- End of status

function OpcuaServer:DELETE_before_section_delete_hook()
	local deleted_server_nodes = {}
	self:table_foreach(self.main_config, "server_node_" .. self.sid, function(s)
		table.insert(deleted_server_nodes, s[".name"])
		self:table_delete(self.main_config, s[".name"])
	end)
	self:table_foreach(self.config, "value_group", function(c)
		local single_group = c[".name"]
		self:table_foreach(self.config, "value_" .. single_group, function(s)
			if util.contains(deleted_server_nodes, s.server_node) then
				self:table_delete(self.config, s[".name"], "server_node")
				self:table_set(self.config, s[".name"], "enabled", "0")
			end
		end)
	end)
end

function OpcuaServer:POST_validate_section_hook()
	local servers = 0
	self:table_foreach(self.config, "server", function(c)
		servers = servers + 1
	end)
	if servers >= MAX_SERVERS then
		self:add_error(STD_CODES.CONF_ERROR, ("Server limit was reached (%d max)"):format(MAX_SERVERS))
	end
end

function OpcuaServer:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "opcua_client")
	return { path = path }
end

function OpcuaServer:test_server()
	local args = {
		url = self.arguments.data.url,
		timeout = tonumber(self.arguments.data.timeout),
		security_mode = tonumber(self.arguments.data.security_mode) or 0,
		username = self.arguments.data.username,
		password = self.arguments.data.password,
		certificate = self.arguments.data.certificate,
		identity = tonumber(self.arguments.data.identity) or 0,
		application_uri = self.arguments.data.application_uri,
		key = self.arguments.data.key,
		tcl = self.arguments.data.tcl
	}
	local test = util.ubus("opcua_client.rpc", "test_server", args)
	if not test then self:add_critical_error(1, "OPC UA service encountered an unexpected error.", "Request") end
	if test.error == 1 then self:add_critical_error(2, test.result, "Request") end
	return self:ResponseOK(test.result)
end

local test = OpcuaServer:action("test", OpcuaServer.test_server)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local _url = test:option("url")
	_url.require = true
		function _url:validate(value)
			return self.dt:protourl(value)
		end

	local _application_uri = test:option("application_uri")
		function _application_uri:validate(value)
			return self.dt:string(value)
		end

	local _identity = test:option("identity")
		function _identity:validate(value)
			return self.dt:range(value, 0, 1)
		end

	local _timeout = test:option("timeout")
	_timeout.require = true
		function _timeout:validate(value)
			return self.dt:range(value, 10, 3600000)
		end

	local _security_mode = test:option("security_mode")
		function _security_mode:validate(value)
			return self.dt:range(value, 0, 2)
		end

	local _username = test:option("username")
		function _username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local _password = test:option("password")
		function _password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local _cert = test:option("certificate")
		function _cert:validate(value)
			return self.dt:file_validation(value, { "/etc/vuci-uploads/" })
		end

	local _key = test:option("key")
		function _key:validate(value)
			return self.dt:file_validation(value, { "/etc/vuci-uploads/" })
		end

	local _tck = test:option("tcl", { skip_list_validation = true })
		function _key:validate(value)
			return self.dt:file_validation(value, { "/etc/vuci-uploads/" })
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return OpcuaServer
