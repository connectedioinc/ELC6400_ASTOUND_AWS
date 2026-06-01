local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["bluetooth"]	= {"bl_segments"}

	local bl_filter = s:option("bl_filter")
		bl_filter.require = {
			mac		= {"bl_filter_mac"},
			name	= {"bl_filter_name"}
		}
		function bl_filter:validate(value)
			return self.dt:check_array(value, {"all", "mac", "name"})
		end

	local bl_filter_device_mac = s:option("bl_filter_mac")
		bl_filter_device_mac.filter_option = true
		bl_filter_device_mac.list_length = 10
		function bl_filter_device_mac:validate(value)
			return self.dt:macaddr(value)
		end

	local bl_filter_device_name = s:option("bl_filter_name")
		bl_filter_device_name.filter_option = true
		bl_filter_device_name.maxlength = 64
		bl_filter_device_name.list_length = 10
		function bl_filter_device_name:validate(value)
			return self.dt:string(value)
		end

	local bl_segments = s:option("bl_segments")
		function bl_segments:validate(value)
			return self.dt:irange(value, 1, 64)
		end

	local bl_object = s:option("bl_object")
		function bl_object:validate(value)
			return self.dt:is_bool(value)
		end
	end

return module