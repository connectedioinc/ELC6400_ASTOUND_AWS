local ConfigService = require("api/ConfigService")
local dnp3_utils = require("api.services.dnp3_utils")
local util = require("vuci.util")

local function name_validate(self, value)
    return self.dt:credentials_validate(value)
end

local function local_addr_validate(self, value)
    return self.dt:irange(value, 0, 65519)
end

local function remote_addr_validate(self, value)
    return self.dt:irange(value, 0, 65519)
end

local function timeout_validate(self, value)
    return self.dt:irange(value, 1, 60)
end

local function ip_validate(self, value)
    return self.dt:ipaddr(value)
end

local function port_validate(self, value)
    return self.dt:port(value)
end

local function test_request(self)
    local data = self.arguments.data
    dnp3_utils.validate_request_overlap(self, data, "dnp3_outstation")

    local result, errcode = dnp3_utils:send_tcp_request(data, data)

    if errcode then
        self:ResponseOK("Tests failed")
    else
        self:ResponseOK({
            data = result
        })
    end
end

local tcp = ConfigService:new({increment_name = true})
local tcp_action = tcp:action("test_request", test_request)

    local index = tcp_action:option("index")
    index.require = true
    function index:validate(value)
        return self.dt:irange(value, 0, 65535)
    end

    local count = tcp_action:option("count")
    count.require = true
        function count:validate(value)
            local valid1, err1 = self.dt:irange(value, 0, 65535)
            if not valid1 then return false, err1 end
            local index = tonumber(self.arguments.data.index)
            if index and tonumber(value) < index then
                return false, 'End of the index must be greater or equal to the start. Values between 0 and 65535.'
            end
            return true
        end

    local data_type = tcp_action:option("data_type")
    data_type.require = true
        function data_type:validate(value)
            return self.dt:check_array(value, {'1', '3', '20', '21', '30', '110', '40', '10'})
        end


    local local_addr = tcp_action:option("local_addr")
    local_addr.require = true
    local_addr.validate = local_addr_validate

    local remote_addr = tcp_action:option("remote_addr")
    remote_addr.require = true
    remote_addr.validate = remote_addr_validate

    local timeout = tcp_action:option("timeout")
    timeout.require = true
    timeout.validate = timeout_validate

    local ip = tcp_action:option("ip")
    ip.require = true
    ip.validate = ip_validate

    local port = tcp_action:option("port")
    port.require = true
    port.validate = port_validate

-- deletes instance requests
function tcp:DELETE_after_data_hook()
    self:table_foreach(self.main_config, "instance",
        function(s)
            if s.client_id == self.sid then
                self:table_delete(self.main_config, s['.name'])
            end
        end
    )
end

local s = tcp:section("dnp3_client", "tcp_client")

    local enabled = s:option("enabled")
    enabled.require = { ["1"] = { "name", "ip", "port", "local_addr", "remote_addr", "integrity_period", "timeout" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

    local save_to_flash = s:option("save_to_flash")
		function save_to_flash:validate(value)
			return self.dt:is_bool(value)
		end

	name = s:option("name")
    name.maxlength = 32
    name.validate = name_validate

	local_addr = s:option("local_addr")
    local_addr.validate = local_addr_validate

	remote_addr = s:option("remote_addr")
    remote_addr.validate = remote_addr_validate

	local integrity_period = s:option("integrity_period")
        function integrity_period:validate(value)
            return self.dt:irange(value, 1, 60)
        end

	timeout = s:option("timeout")
	timeout.validate = timeout_validate

	ip = s:option("ip")
	ip.validate = ip_validate

	port = s:option("port")
	port.validate = port_validate

-- STATUS

function tcp:GET_TYPE_status()
    local res = {}

    local dnp3_status = util.ubus("dnp3_client", "status")
    if dnp3_status then
        res.uptime = dnp3_status.uptime
        res.clients = {}
        local client_statuses = {}
        for _, client_status in pairs(dnp3_status.clients) do
            client_statuses[client_status.id] = client_status
        end
        self:table_foreach(self.main_config, "tcp_client", function(_s)
            if _s.enabled == "1" and client_statuses[_s[".name"]] then
                table.insert(res.clients, client_statuses[_s[".name"]])
            end
        end)
    end

    return self:ResponseOK(res)
end

-- End of status

function tcp:UPDATE_before_commit_hook()
	local local_address_lookup = {}
    self:table_foreach(self.config, "tcp_client", function(config)
		if not (config.ip and config.port and config.local_addr) then return end

		local key = config.ip..":"..config.port..":"..config.local_addr
		if local_address_lookup[key] then
			self:add_critical_error(
				STD_CODES.INVALID_STRUCT,
				("Current Local Address already set in the same layer."):format(),
				"Validation"
			)
		end
		local_address_lookup[key] = true
	end)
end
tcp.POST_before_commit_hook = tcp.UPDATE_before_commit_hook
tcp.PUT_before_commit_hook = tcp.UPDATE_before_commit_hook

return tcp
