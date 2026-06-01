local module = {}

function module:endpoint(service, s, bundle, output_type)

	output_type.require["http"] = {"http_host"}

	local http_host = s:option("http_host")
		function http_host:validate(value)
			return self.dt:url(value)
		end

	local http_header = s:option("http_header", {list = true})
		function http_header:validate(value)
			return self.dt:string(value)
		end

	local http_tls = s:option("http_tls")
	http_tls.require = { ["1"] = { "http_cafile" } }
		function http_tls:validate(value)
			return self.dt:is_bool(value)
		end

	local http_device_files = s:option("http_device_files")
		function http_device_files:validate(value)
			return self.dt:is_bool(value)
		end

	s:option("http_cafile", {
		certificate = {
			service = "data_sender_output",
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			length_warnings = true,
			failsafe = true
		}
	})

	s:option("http_certfile", {
		certificate = {
			service = "data_sender_output",
			cert_types = { "certificates" },
			length_warnings = true,
			failsafe = true
		}
	})

	s:option("http_keyfile", {
		certificate = {
			service = "data_sender_output",
			cert_types = { "keys" },
			failsafe = true
		}
	})

end
return module