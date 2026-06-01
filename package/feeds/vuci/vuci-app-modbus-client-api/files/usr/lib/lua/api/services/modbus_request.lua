local ConfigService = require("api/ConfigService")
local modbus_utils = require("vuci.modbus_utils")
local api_utils = require("api/api_utils")
local util = require("vuci.util")

local ModbusTcpClientRequest = ConfigService:new({ increment_name = true })

local s = ModbusTcpClientRequest:section("modbus_client", function(self) return "request_" .. self.binding end)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local name = s:option("name")
		function name:validate(value)
			local exists = false
			self:table_foreach(self.config, "request_" .. self.binding, function(s)
				if s["name"] == value and s[".name"] ~= self.sid then exists = true end
			end)
			if exists then return false, "Name is already used in configuration" end
			return self.dt:uciname(value)
		end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local data_type = s:option("data_type")
		function data_type:validate(value)
			local f_code = self:get_abs_value(self.config, self.sid, "function")
			return self.dt:check_array(value, modbus_utils:get_data_types(f_code, true))
		end

	local _function = s:option("function")
		function _function:validate(value)
			return self.dt:check_array(value, modbus_utils:get_all_functions())
		end

	local first_reg = s:option("first_reg")
		function first_reg:validate(value)
			return self.dt:irange(value, 1, 65536)
		end

	local reg_count = s:option("reg_count")
	reg_count.require = { "function", "data_type" }
		function reg_count:validate(value)
			local func = self:get_abs_value(self.config, self.sid, "function")
			local d_type = self:get_abs_value(self.config, self.sid, "data_type")
			return modbus_utils:validate_value(func, value, d_type)
		end

	local no_brackets = s:option("no_brackets")
		function no_brackets:validate(value)
			return self.dt:is_bool(value)
		end

	local store_on_change_only = s:option("store_on_change_only")
		function store_on_change_only:validate(value)
			return self.dt:is_bool(value)
		end

	local broadcast = s:option("broadcast")
		function broadcast:validate(value)
			local func = self:get_abs_value(self.config, self.sid, "function")
			if value == "1" and not util.contains(modbus_utils.write_functions, func) then
				return false, "Broadcast can only be used with write function."
			end
			return self.dt:is_bool(value)
		end

	local store_tolerance = s:option("store_tolerance")
		function store_tolerance:validate(value)
			local func = self:get_abs_value(self.config, self.sid, "function")
			local d_type = self:get_abs_value(self.config, self.sid, "data_type")
			local store_on_change = self:get_abs_value(self.config, self.sid, "store_on_change_only")

			local ret, msg = modbus_utils:is_tolerance_applicable(func, d_type, store_on_change)
			if not ret then
				return false, "Tolerance is not applicable: " .. msg
			end

			return modbus_utils:validate_tolerance_value(d_type, value)
		end

	local store_tolerance_timeout = s:option("store_tolerance_timeout")
		function store_tolerance_timeout:validate(value)
			local func = self:get_abs_value(self.config, self.sid, "function")
			local d_type = self:get_abs_value(self.config, self.sid, "data_type")
			local store_on_change = self:get_abs_value(self.config, self.sid, "store_on_change_only")

			local ret, msg = modbus_utils:is_tolerance_applicable(func, d_type, store_on_change)
			if not ret then
				return false, "Tolerance is not applicable: " .. msg
			end

			return self.dt:irange(value, 1, 65536)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function ModbusTcpClientRequest:test_request()
	local req_args = self.arguments.data
	modbus_utils.validate_request_overlap(self, req_args, "modbus")

	local result, err = modbus_utils:send_tcp_test(req_args, req_args)

	if err == modbus_utils.TEST_ERROR.TIMEOUT then
		self:add_critical_error(2, "Test request timed out.")
	elseif err == modbus_utils.TEST_ERROR.UNKNOWN then
		self:add_critical_error(1, "Modbus encountered an unexpected error.", "Device")
	end

	return self:ResponseOK(result)
end

local test = ModbusTcpClientRequest:action("test_request", ModbusTcpClientRequest.test_request)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local device_ip = test:option("dev_ipaddr")
	device_ip.require = true
		function device_ip:validate(value)
			return self.dt:host(value)
		end

	local port = test:option("port")
	port.require = true
		function port:validate(value)
			return self.dt:port(value)
		end

	local timeout = test:option("timeout")
	timeout.require = true
		function timeout:validate(value)
			return self.dt:range(value, 1, 30)
		end

	local server_id = test:option("server_id")
	server_id.require = true
		function server_id:validate(value)
			return self.dt:range(value, 0, 255)
		end

	local __function = test:option("function")
	__function.require = true
		function __function:validate(value)
			return self.dt:check_array(value, modbus_utils:get_all_functions())
		end

	local _first_reg = test:option("first_reg")
	_first_reg.require = true
		function _first_reg:validate(value)
			return self.dt:range(value, 1, 65536)
		end

	local _reg_count = test:option("reg_count")
	_reg_count.require = true
		function _reg_count:validate(value)
			local args = self.arguments.data
			local func = args["function"]
			local d_type = args.data_type
			return modbus_utils:validate_value(func, value, d_type)
		end

	local _data_type = test:option("data_type")
	_data_type.require = true
		function _data_type:validate(value)
			local func = self.arguments.data["function"]
			return self.dt:check_array(value, modbus_utils:get_data_types(func))
		end

	local _no_brackets = test:option("no_brackets")
	_no_brackets.require = true
		function _no_brackets:validate(value)
			return self.dt:is_bool(value)
		end

	local _broadcast = test:option("broadcast")
		function _broadcast:validate(value)
			local func = self.arguments.data["function"]
			if value == "1" and not util.contains(modbus_utils.write_functions, func) then
				return false, "Broadcast can only be used with write function."
			end
			return self.dt:is_bool(value)
		end

	local delay = test:option("delay")
		function delay:validate(value)
			return self.dt:irange(value, 0, 999)
		end
-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function ModbusTcpClientRequest:before_commit_hook()
	if self.request_method == "PUT" then
		self:add_message(1, "Updating request options may invalidate configurations in data sources.")
	elseif self.request_method == "DELETE" then
		self:add_message(1, "Deleting request may cause reference loss if they are used in data sources.")
	end
end
ModbusTcpClientRequest.PUT_before_commit_hook = ModbusTcpClientRequest.before_commit_hook
ModbusTcpClientRequest.DELETE_before_commit_hook = ModbusTcpClientRequest.before_commit_hook

function ModbusTcpClientRequest:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function ModbusTcpClientRequest:GET_TYPE_status()
	-- Endpoint structure really differs from other endpoints if we ever raise the version need to update this
	-- using name to filter instead of id, because the regular status endpoint returns sections with names not with ids
	-- names are unique in Modbus requests
	local client_id = self.binding
	local client = self:table_get("modbus_client", client_id)
	if client[".type"] ~= "tcp_server" then
		return self:ResponseNotFound("Modbus TCP device not found")
	end

	if client.enabled ~= "1" then
		return self:ResponseError("Modbus TCP device is disabled")
	end

	-- I am assuming that if all of the configurations are enabled, they are valid.

	local result = {}
	self:table_foreach("modbus_client", "request_" .. client_id, function(request)
		if request.enabled ~= "1" or (self.sid and self.sid ~= request.name) then
			return true -- continue
		end

		local request_result, err = modbus_utils:send_tcp_test(client, request)
		if request_result then
			assert(request_result.result ~= nil)
			if request_result.error == 0 then
				result[request.name] = { data = request_result.result }
			else
				result[request.name] = { error = request_result.result }
			end
		else
			result[request.name] = {
				error = modbus_utils:test_error_code_to_string(err)
			}
		end
	end)
	result = self.sid and result[self.sid] or result
	if api_utils:is_table_empty(result) then return self:ResponseNotFound("Valid enabled requests not found") end
	return self:ResponseOK(result)
end

return ModbusTcpClientRequest
