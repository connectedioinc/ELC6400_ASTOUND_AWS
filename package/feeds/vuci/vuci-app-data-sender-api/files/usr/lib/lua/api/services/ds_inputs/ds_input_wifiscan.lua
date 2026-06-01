local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["wifiscan"] = {"wifi_segments"}

	local wifi_filter = s:option("wifi_filter")
		wifi_filter.require = {
			name = {"wifi_filter_name"},
			mac = {"wifi_filter_mac"},
			signal = {"wifi_filter_signal"}
		}
		function wifi_filter:validate(value)
			return self.dt:check_array(value, {"all", "name", "mac", "signal"})
		end
 
	local wifi_filter_name = s:option("wifi_filter_name")
		wifi_filter_name.filter_option = true
		wifi_filter_name.list_length = 10
		wifi_filter_name.maxlength = 64
		function wifi_filter_name:validate(value)
			return self.dt:string(value)
		end

	local wifi_filter_mac = s:option("wifi_filter_mac")
		wifi_filter_mac.filter_option = true
		wifi_filter_mac.list_length = 10
		function wifi_filter_mac:validate(value)
			return self.dt:macaddr(value)
		end

	local wifi_filter_signal = s:option("wifi_filter_signal")
		wifi_filter_signal.filter_option = true
		wifi_filter_signal.list_length = 10
		function wifi_filter_signal:validate(value)
			return self.dt:irange(value, -100, -1)
		end

	local wifi_segments = s:option("wifi_segments")
		function wifi_segments:validate(value)
			return self.dt:irange(value, 1, 64)
		end

	local wifi_object = s:option("wifi_object")
		function wifi_object:validate(value)
			return self.dt:is_bool(value)
		end
end
return module