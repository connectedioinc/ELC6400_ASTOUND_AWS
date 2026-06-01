local module = {}

function module:endpoint(service, s, bundle, output_type)
	output_type.require["socket"] = { "soc_address", "soc_port" }
	local soc_address = s:option("soc_address")
	function soc_address:validate(value)
		return self.dt:host(value)
	end

	local soc_port = s:option("soc_port")
	function soc_port:validate(value)
		return self.dt:port(value)
	end

	local soc_udp = s:option("soc_udp")
	function soc_udp:validate(value)
		return self.dt:is_bool(value)
	end

	local soc_timeout = s:option("soc_timeout")
	function soc_timeout:validate(value)
		return self.dt:irange(value, 0, 120)
	end
end

return module
