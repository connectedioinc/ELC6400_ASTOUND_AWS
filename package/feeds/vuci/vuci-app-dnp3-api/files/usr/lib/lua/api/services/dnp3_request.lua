local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local dnp3_utils = require("api.services.dnp3_utils")

local type_map = {
	tcp = "tcp_client"
}
if serial:check_device_serial() then
	type_map.serial = "serial_client"
end

local DNP3Request = ConfigService:new({increment_name = true})

function DNP3Request:initialize_hook()
	local parent_type = self:table_get("dnp3_client", self.binding)
	if not parent_type or type_map[self.type] ~= parent_type['.type'] then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Section: %s for service does not exist", self.binding),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

local s = DNP3Request:section("dnp3_client", "instance")

function s:create_defaults()
	return {
		client_id = self.binding
	}
end

function s:filter(options)
	if options["client_id"] == self.binding then
		return true
	end
	return false
end

	local index = s:option("index")
		function index:validate(value)
			return self.dt:irange(value, 0, 65535)
		end

	local count = s:option("count")
		function count:validate(value)
			local valid1, err1 = self.dt:irange(value, 0, 65535)
			if not valid1 then return false, err1 end
			local index = tonumber(self.arguments.data.index)
			if index and tonumber(value) < index then
				return false, 'End of the index must be greater or equal to the start. Values between 0 and 65535.'
			end
			return true
		end

	local data_type = s:option("data_type")
		function data_type:validate(value)
		return self.dt:check_array(value, {'1', '3', '20', '21', '30', '110', '40', '10'})
	end

    local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "index", "count" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

    local name = s:option("name")
		function name:validate(value)
			return self.dt:uciname(value)
		end

function DNP3Request:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function DNP3Request:GET_TYPE_status()
	if self:table_get(self.main_config, "global", "enabled") ~= "1" then
		return self:ResponseError("Service is disabled")
	end

	if self.sid ~= nil then
		local request = self:table_get(self.main_config, self.sid)
		if not request or request[".type"] ~= "instance" then
			return self:ResponseNotFound("Request not found")
		end

		if request.client_id ~= self.binding then
			return self:ResponseNotFound("Request not found")
		end

		if request.enabled ~= "1" then
			return self:ResponseError("Request is disabled")
		end

		local client = self:table_get(self.main_config, request.client_id)
		assert(client)

		if client.enabled ~= "1" then
			return self:ResponseError("Client is disabled")
		end

		local result, errcode
		if client[".type"] == "tcp_client" then
			result, errcode = dnp3_utils:send_tcp_request(client, request)
		elseif client[".type"] == "serial_client" then
			result, errcode = dnp3_utils:send_serial_request(client, request)
		else
			return self:ResponseError("Unknown client type")
		end

		if errcode then
			-- Use `ResponseOK` instead of `ResponseError` to match behavior of test requests
			-- Test requests use `ResponseOK` even when there is an error
			return self:ResponseOK("No response")
		end

		self:ResponseOK(result)
	else
		local result = {}

		local client_id = self.binding
		local client = self:table_get(self.main_config, client_id)
		if not client or client[".type"] ~= type_map[self.type] then
			return self:ResponseNotFound("Client not found")
		end

		if client.enabled ~= "1" then
			return self:ResponseError("Client is disabled")
		end

		local requests = self:table_find_many(
			self.main_config,
			"instance",
			{ client_id = client_id, enabled = "1" }
		)
		for _, request in ipairs(requests) do
			local request_result, errcode
			if self.type == "tcp" then
				request_result, errcode = dnp3_utils:send_tcp_request(client, request)
			elseif self.type == "serial" then
				request_result, errcode = dnp3_utils:send_serial_request(client, request)
			end

			if not errcode then
				result[request[".name"]] = request_result
			end
		end

		self:ResponseOK(result)
	end

end

return DNP3Request
