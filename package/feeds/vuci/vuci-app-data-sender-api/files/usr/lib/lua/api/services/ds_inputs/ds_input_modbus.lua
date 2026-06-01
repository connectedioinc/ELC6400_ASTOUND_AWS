local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["modbus"] = {"modbus_segments"}

	local modbus_filter = s:option("modbus_filter")
		modbus_filter.require = {
			ip 		= {"modbus_filter_server_ip"},
			id 		= {"modbus_filter_server_id"},
			name 	= {"modbus_filter_request"}
		}
		function modbus_filter:validate(value)
			return self.dt:check_array(value, {"all", "id", "ip", "name"})
		end

	local modbus_filter_server_id = s:option("modbus_filter_server_id")
		modbus_filter_server_id.filter_option = true
		modbus_filter_server_id.list_length = 20
		function modbus_filter_server_id:validate(value)
			return self.dt:range(value, 0, 255)
		end

	local modbus_filter_server_ip = s:option("modbus_filter_server_ip")
		modbus_filter_server_ip.filter_option = true
		modbus_filter_server_ip.list_length = 20
		function modbus_filter_server_ip:validate(value)
			return self.dt:ip4addr(value)
		end

	local modbus_filter_request = s:option("modbus_filter_request")
		modbus_filter_request.filter_option = true
		modbus_filter_request.list_length = 20
		modbus_filter_request.maxlength = 64
		function modbus_filter_request:validate(value)
			return self.dt:string(value)
		end

	local modbus_segments = s:option("modbus_segments")
		function modbus_segments:validate(value)
			return self.dt:irange(value, 1, 64)
		end

	local modbus_object = s:option("modbus_object")
		function modbus_object:validate(value)
			return self.dt:is_bool(value)
		end

end
return module