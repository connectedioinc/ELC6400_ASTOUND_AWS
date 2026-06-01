local module = {}

function module:endpoint(service, s, bundle, input_type)

	input_type.require["iec60870"] = {"iec60870_segments"}

	local iec60870_filter = s:option("iec60870_filter")
		iec60870_filter.require = {
			client_id = {"iec60870_filter_client_id"},
			information_object_address = {"iec60870_filter_information_object_address"},
			common_address = {"iec60870_filter_common_address"}
		}
		function iec60870_filter:validate(value)
			return self.dt:check_array(value, {
				"all", "client_id", "information_object_address", "common_address"
			})
		end

	local iec60870_filter_client_id = s:option("iec60870_filter_client_id")
		function iec60870_filter_client_id:validate(value)
			local available_client_ids = {}
			self:table_foreach("iec60870_client", "client", function(client)
				table.insert(available_client_ids, client[".name"])
			end)
			return self.dt:check_array(value, available_client_ids)
		end

	local iec60870_filter_ioa = s:option("iec60870_filter_information_object_address")
		function iec60870_filter_ioa:validate(value)
			return self.dt:irange(value, 0, 2^24 - 1)
		end

	local iec60870_filter_ca = s:option("iec60870_filter_common_address")
		function iec60870_filter_ca:validate(value)
			return self.dt:irange(value, 1, 2^16 - 1)
		end

	local iec60870_segments = s:option("iec60870_segments")
		function iec60870_segments:validate(value)
			return self.dt:irange(value, 0, 64)
		end
end

return module
