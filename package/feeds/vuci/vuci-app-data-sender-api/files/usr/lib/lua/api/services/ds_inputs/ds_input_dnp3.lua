local dnp3_utils = require("api.services.dnp3_utils")
local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["dnp3"] = {"dnp3_segments"}

	local dnp3_filter = s:option("dnp3_filter")
		dnp3_filter.require = {
			address = {"dnp3_filter_address"},
			ip 		= {"dnp3_filter_ip"}
		}
		function dnp3_filter:validate(value)
			return self.dt:check_array(value, {"all", "address", "ip"})
		end

	local dnp3_filter_address = s:option("dnp3_filter_address")
		dnp3_filter_address.filter_option = true
		dnp3_filter_address.list_length = 10
		function dnp3_filter_address:validate(value)
			return self.dt:irange(value, 0, 65519)
		end

	local dnp3_filter_ip = s:option("dnp3_filter_ip")
		dnp3_filter_ip.filter_option = true
		dnp3_filter_ip.list_length = 10
		function dnp3_filter_ip:validate(value)
			return self.dt:ipaddr(value)
		end

	local dnp3_segments = s:option("dnp3_segments")
		function dnp3_segments:validate(value)
			return self.dt:irange(value, 1, 64)
		end

	local dnp3_object = s:option("dnp3_object")
		function dnp3_object:validate(value)
			return self.dt:is_bool(value)
		end

	local dnp3_db = s:option("dnp3_db")
		function dnp3_db:validate(value)
			return self.dt:check_array(value, { dnp3_utils.DB_LOCATION_RAM_OLD, dnp3_utils.DB_LOCATION_FLASH_OLD })
		end
		function dnp3_db:set(value)
			self:table_set(self.main_config, self.sid, self.api_key, dnp3_utils.DB_LOCATION_MAP[value])
		end
		function dnp3_db:get(value)
			return dnp3_utils.DB_LOCATION_MAP[value]
		end
end
return module
