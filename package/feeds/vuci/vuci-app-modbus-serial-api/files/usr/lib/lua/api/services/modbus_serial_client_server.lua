local modbus_utils = require("vuci.modbus_utils")
local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local ModbusSerialClientServer = ConfigService:new({ increment_name = true })

local s = ModbusSerialClientServer:section("modbus_client", "rtu_server")
function s:create_defaults()
	return {
		server_id = "1",
		timeout = "1",
		frequency = "period",
		period = "60"
	}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "name", "rtu_device", "skip_on_many_tmos", "frequency" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 200

	local server_id = s:option("server_id")
	server_id.cfg_require = true
		function server_id:validate(value)
			return self.dt:irange(value, 0, 255)
		end

	local period = s:option("period")
		function period:validate(value)
			return self.dt:irange(value, 1, 99999)
		end

	local no_timeouts = s:option("skip_on_many_tmos")
		function no_timeouts:validate(value)
			return self.dt:irange(value, 0, 10)
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

	local serial_device = s:option("rtu_device")
	serial_device.cfg_require = true
		function serial_device:validate(value)
			local serial_device_options = {}
			self:table_foreach(self.config, "rtu_device", function(c)
				table.insert(serial_device_options, c[".name"])
			end)
			return self.dt:check_array(value, serial_device_options)
		end

	local timeout = s:option("timeout")
		function timeout:validate(value)
			return self.dt:irange(value, 1, 60)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function ModbusSerialClientServer:GET_TYPE_status()
	local res = {}

	local client_status = util.ubus("modbus_client.app", "status")
	if client_status then
		res.uptime = client_status.uptime
		res.modbus_devices = {}
		local alarm_statuses = {}
		for _, alarm_status in pairs(client_status.alarms) do
			alarm_statuses[alarm_status.id] = alarm_status
		end
		local request_statuses = {}
		for _, request_status in pairs(client_status.requests) do
			request_statuses[request_status.id] = request_status
		end
		self:table_foreach(self.main_config, "rtu_server", function(_s)
			if _s.enabled == "1" then
				local modbus_device = { id = _s[".name"], alarms = {}, requests = {} }
				self:table_foreach(self.main_config, "alarm_" .. _s[".name"], function (alarm_section)
					if alarm_section.enabled == "1" and alarm_statuses[alarm_section[".name"]] then
						table.insert(modbus_device.alarms, alarm_statuses[alarm_section[".name"]])
					end
				end)
				self:table_foreach(self.main_config, "request_" .. _s[".name"], function (request_section)
					if request_section.enabled == "1" and request_statuses[request_section[".name"]] then
						table.insert(modbus_device.requests, request_statuses[request_section[".name"]])
					end
				end)
				table.insert(res.modbus_devices, modbus_device)
			end
		end)
	end

	return self:ResponseOK(res)
end

-- End of status

function ModbusSerialClientServer:DELETE_before_section_delete_hook()
	modbus_utils:cleanup_server(self, self.sid)
end

return ModbusSerialClientServer
