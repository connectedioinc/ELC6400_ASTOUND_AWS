local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["opcua"] = {"opcua_segments"}

	local opcua_filter = s:option("opcua_filter")
		opcua_filter.require = { 
			name = {"opcua_filter_name"}
		}
		function opcua_filter:validate(value)
			return self.dt:check_array(value, {"all", "name"})
		end

	local opcua_filter_name = s:option("opcua_filter_name")
		opcua_filter_name.filter_option = true
		opcua_filter_name.list_length = 10
		opcua_filter_name.maxlength = 64
		function opcua_filter_name:validate(value)
			return self.dt:string(value)
		end
	
	local opcua_filter_invert = s:option("opcua_filter_invert")
		function opcua_filter_invert:validate(value)
			return self.dt:is_bool(value)
		end

	local opcua_segments = s:option("opcua_segments")
		function opcua_segments:validate(value)
			return self.dt:irange(value, 1, 64)
		end

	local opcua_object = s:option("opcua_object")
		function opcua_object:validate(value)
			return self.dt:is_bool(value)
		end

end
return module