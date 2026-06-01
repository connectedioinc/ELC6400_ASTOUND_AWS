local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["mbus"] = {"mbus_segments"}

	local mbus_filter = s:option("mbus_filter")
		mbus_filter.require = { 
			name = {"mbus_filter_name"}
		}
		function mbus_filter:validate(value)
			return self.dt:check_array(value, {"all", "name"})
		end

	local mbus_filter_name = s:option("mbus_filter_name")
		mbus_filter_name.filter_option = true
		mbus_filter_name.list_length = 10
		mbus_filter_name.maxlength = 64
		function mbus_filter_name:validate(value)
			return self.dt:string(value)
		end
	
	local mbus_filter_invert = s:option("mbus_filter_invert")
		function mbus_filter_invert:validate(value)
			return self.dt:is_bool(value)
		end

	local mbus_segments = s:option("mbus_segments")
		function mbus_segments:validate(value)
			return self.dt:irange(value, 1, 64)
		end

	local mbus_object = s:option("mbus_object")
		function mbus_object:validate(value)
			return self.dt:is_bool(value)
		end

	local mbus_db = s:option("mbus_db")
		function mbus_db:set(value)
			-- set is done in *_before_commit_hook because db location depends on flash_db
		end
		function mbus_db:get(value)
			local flash_db = service:table_get("mbus_client", "main", "flash_db")
			return flash_db ~= "1" and "/var/run/mbus_client/mbus_db" or "/usr/share/mbus_db"
		end
		function mbus_db:validate(value)
			return self.dt:check_array(value, { "/var/run/mbus_client/mbus_db", "/usr/share/mbus_db" })
		end
end
return module
