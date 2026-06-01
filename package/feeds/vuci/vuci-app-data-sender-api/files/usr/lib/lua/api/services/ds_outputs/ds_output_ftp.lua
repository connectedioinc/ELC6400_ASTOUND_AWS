local module = {}

function module:endpoint(service, s, bundle, output_type)
	local fixed_ftp_mode_message = "The value must be an integer, and it should be between %s and %s. Select -1 to upload on every %s."
	output_type.require["ftp"] = { "ftp_host", "ftp_port" }

	local ftp_host = s:option("ftp_host")
	function ftp_host:validate(value)
		return self.dt:host(value)
	end

	local ftp_username = s:option("ftp_username")
	function ftp_username:validate(value)
		return self.dt:string(value)
	end

	local ftp_password = s:option("ftp_password", { sensitive = true })
	ftp_password.maxlength = 512
	function ftp_password:validate(value)
		return self.dt:credentials_validate(value)
	end

	local ftp_port = s:option("ftp_port")
	function ftp_port:validate(value)
		return self.dt:port(value)
	end

	local ftp_file_name = s:option("ftp_file_name")
	function ftp_file_name:validate(value)
		return self.dt:string(value)
	end

	local ftp_dir = s:option("ftp_dir")
	function ftp_dir:validate(value)
		return self.dt:string(value)
	end

	local ftp_buff_size = s:option("ftp_buff_size")
	function ftp_buff_size:validate(value)
		return self.dt:irange(value, 1, 1024 * 1024 * 10)
	end

	local ftp_overflow = s:option("ftp_overflow")
	function ftp_overflow:validate(value)
		return self.dt:is_bool(value)
	end

	local ftp_mode = s:option("ftp_mode")
	ftp_mode.require = {
		interval = { "ftp_interval" },
		fixed = { "ftp_hour", "ftp_minute", "ftp_day" }
	}
	function ftp_mode:validate(value)
		return self.dt:check_array(value, { "interval", "fixed" })
	end

	local ftp_interval = s:option("ftp_interval")
	function ftp_interval:validate(value)
		return self.dt:irange(value, 1, 3600)
	end

	local ftp_hour = s:option("ftp_hour")
	function ftp_hour:validate(value)
		return self.dt:irange(value, -1, 23), string.format(fixed_ftp_mode_message, -1, 23, "hour")
	end

	local ftp_minute = s:option("ftp_minute")
	function ftp_minute:validate(value)
		return self.dt:irange(value, -1, 59), string.format(fixed_ftp_mode_message, -1, 59, "minute")
	end

	local ftp_day = s:option("ftp_day")
	function ftp_day:validate(value)
		if self.dt:irange(value, 1, 31) or value == "-1" then return true end
		return false, string.format(fixed_ftp_mode_message, 1, 31, "day")
	end

	local ftp_cwd = s:option("ftp_cwd")
	function ftp_cwd:validate(value)
		return self.dt:check_array(value, { "multicwd", "nocwd", "cwd" })
	end
end

return module
