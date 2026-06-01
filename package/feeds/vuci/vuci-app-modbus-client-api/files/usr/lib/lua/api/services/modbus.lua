local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local modbus_utils = require("vuci.modbus_utils")

local ModbusTcpClient = ConfigService:new({ increment_name = true })

local s = ModbusTcpClient:section("modbus_client", "tcp_server")
function s:create_defaults()
	return {
		server_id = "1",
		port = "502",
		timeout = "5",
		frequency = "period",
		period = "60"
	}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "dev_ipaddr", "frequency" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local display_name = s:option("name")
	display_name.maxlength = 32
		function display_name:validate(value)
			return self.dt:default_validation(value)
		end

	local server_id = s:option("server_id")
	server_id.cfg_require = true
		function server_id:validate(value)
			return self.dt:irange(value, 0, 255)
		end

	local device_ip = s:option("dev_ipaddr")
		function device_ip:validate(value)
			return self.dt:host(value)
		end

	local port = s:option("port")
	port.cfg_require = true
		function port:validate(value)
			return self.dt:port(value)
		end

	local period = s:option("period")
		function period:validate(value)
			return self.dt:irange(value, 1, 99999)
		end

	local timeout = s:option("timeout")
		function timeout:validate(value)
			return self.dt:irange(value, 1, 30)
		end

	local reconnect = s:option("reconnect")
	reconnect.require = { ["0"] = { "skip_on_many_tmos" } }
		function reconnect:validate(value)
			return self.dt:is_bool(value)
		end

	local no_timeouts = s:option("skip_on_many_tmos")
		function no_timeouts:validate(value)
			return self.dt:irange(value, 0, 10)
		end

	local delay = s:option("delay")
		function delay:validate(value)
			return self.dt:irange(value, 0, 999)
		end

	local frequency = s:option("frequency")
	frequency.require = { ["period"] = { "period" }, ["schedule"] = { "schedule" } }
		function frequency:validate(value)
			return self.dt:check_array(value, { "period", "schedule" })
		end

	local schedule = s:option("schedule", { list = true })
	schedule.list_length = 255
		function schedule:validate(value)
			return modbus_utils:validate_schedule(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function ModbusTcpClient:GET_TYPE_status()
	local res = {}

	local client_status = util.ubus("modbus_client.app", "status")
	if client_status then
		res.uptime = client_status.uptime
		res.tcp_servers = {}
		local alarm_statuses = {}
		for _, alarm_status in pairs(client_status.alarms) do
			alarm_statuses[alarm_status.id] = alarm_status
		end
		local request_statuses = {}
		for _, request_status in pairs(client_status.requests) do
			request_statuses[request_status.id] = request_status
		end
		self:table_foreach(self.main_config, "tcp_server", function(_s)
			if _s.enabled == "1" then
				local tcp_server = { id = _s[".name"], alarms = {}, requests = {} }
				self:table_foreach(self.main_config, "alarm_" .. _s[".name"], function (alarm_section)
					if alarm_section.enabled == "1" and alarm_statuses[alarm_section[".name"]] then
						table.insert(tcp_server.alarms, alarm_statuses[alarm_section[".name"]])
					end
				end)
				self:table_foreach(self.main_config, "request_" .. _s[".name"], function(request_section)
					if request_section.enabled == "1" and request_statuses[request_section[".name"]] then
						table.insert(tcp_server.requests, request_statuses[request_section[".name"]])
					end
				end)
				table.insert(res.tcp_servers, tcp_server)
			end
		end)
	end

	return self:ResponseOK(res)
end

-- End of status

function ModbusTcpClient:DELETE_before_section_delete_hook()
	self:table_foreach(self.main_config, "request_" .. self.sid, function(r)
		self:table_delete(self.main_config, r[".name"])
	end)
	self:table_foreach(self.main_config, "alarm_" .. self.sid, function(a)
		self:table_delete(self.main_config, a[".name"])
	end)
end

return ModbusTcpClient
