local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["dlms"]	= {"dlms_segments"}

	local dlms_filter = s:option("dlms_filter")
		dlms_filter.require = {
			name = {"dlms_filter_name"}
		}
		function dlms_filter:validate(value)
			return self.dt:check_array(value, {"all", "name"})
		end

	local dlms_filter_name = s:option("dlms_filter_name")
		dlms_filter_name.filter_option = true
		dlms_filter_name.list_length = 10
		dlms_filter_name.maxlength = 64
		function dlms_filter_name:validate(value)
			return self.dt:string(value)
		end

	local dlms_filter_invert = s:option("dlms_filter_invert")
		function dlms_filter_invert:validate(value)
			return self.dt:is_bool(value)
		end

	local dlms_segments = s:option("dlms_segments")
		function dlms_segments:validate(value)
			return self.dt:irange(value, 1, 64)
		end

	local dlms_object = s:option("dlms_object")
		function dlms_object:validate(value)
			return self.dt:is_bool(value)
		end

end
return module