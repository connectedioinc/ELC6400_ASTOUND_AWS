local module = {}
local io = require("vuci.io")
local io_info = io:ioman_info()

function module:endpoint(service, s, bundle, input_type)

	input_type.require["impulse_counter"] = {"impulse_counter_segments"}

	local impulse_counter_filter = s:option("impulse_counter_filter")
		impulse_counter_filter.require = { 
			pin = {"impulse_counter_filter_pin"}
		}
		function impulse_counter_filter:validate(value)
			return self.dt:check_array(value, {"all", "pin"})
		end

	local impulse_counter_filter_pin = s:option("impulse_counter_filter_pin", { list = true })
		impulse_counter_filter_pin.filter_option = true
		function impulse_counter_filter_pin:validate(value)
			local io_input_options = {}
			for _, single_pin in ipairs(io_info) do
				if single_pin.type == "gpio" and (single_pin.direction == "in" or not single_pin.direction) and single_pin.counter_support ~= false then
					table.insert(io_input_options, single_pin.name)
				end
			end
			return self.dt:check_array(value, io_input_options)
		end
	
	local impulse_counter_filter_invert = s:option("impulse_counter_filter_invert")
		function impulse_counter_filter_invert:validate(value)
			return self.dt:is_bool(value)
		end

	local impulse_counter_segments = s:option("impulse_counter_segments")
		function impulse_counter_segments:validate(value)
			return self.dt:irange(value, 1, 64)
		end

	local impulse_counter_object = s:option("impulse_counter_object")
		function impulse_counter_object:validate(value)
			return self.dt:is_bool(value)
		end

end
return module