local module = {}

function module:endpoint(service, s, bundle, input_type)
	input_type.require["io"] = { "io_name" }
	local io_name = s:option("io_name")
	function io_name:validate(value)
		return self.dt:check_array(value, bundle.d_utils:get_io_pins())
	end
end

return module
