local module = {}

function module:endpoint(service, s, bundle, input_type)
	-- input_type.require["modbus_alarm"] = {}

	local modbus_alarm_filter = s:option("modbus_alarm_filter")
		modbus_alarm_filter.require = {
			server_id = { "modbus_alarm_filter_server_id" },
			alarm_id  = { "modbus_alarm_filter_alarm_id" },
			register  = { "modbus_alarm_filter_register" }
		}
		function modbus_alarm_filter:validate(value)
			return self.dt:check_array(value, { "all", "server_id", "alarm_id", "register" })
		end

	local modbus_alarm_filter_server_id = s:option("modbus_alarm_filter_server_id")
		modbus_alarm_filter_server_id.filter_option = true
		modbus_alarm_filter_server_id.list_length = 10
		function modbus_alarm_filter_server_id:validate(value)
			return self.dt:irange(value, 0, 255)
		end

	local modbus_alarm_filter_alarm_id = s:option("modbus_alarm_filter_alarm_id")
		modbus_alarm_filter_alarm_id.filter_option = true
		modbus_alarm_filter_alarm_id.list_length = 10
		function modbus_alarm_filter_alarm_id:validate(value)
			return self.dt:uciname(value)
		end

	local modbus_alarm_filter_register = s:option("modbus_alarm_filter_register")
		modbus_alarm_filter_register.filter_option = true
		modbus_alarm_filter_register.list_length = 10
		function modbus_alarm_filter_register:validate(value)
			return self.dt:irange(value, 1, 65536)
		end
end

return module
