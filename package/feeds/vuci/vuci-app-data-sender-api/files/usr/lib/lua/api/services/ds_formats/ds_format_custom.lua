local module = {}

function module:endpoint(service, s, bundle, format_type)

	local from_collection = bundle.d_utils.data_sender_service == "collection"

	format_type.require["custom"] = from_collection and {"format_str", "na_str"} or {"format_str", "na_str", "delimiter"}

	local format_str = s:option("format_str")
		function format_str:validate(value)
			return self.dt:string(value)
		end

	local na_str = s:option("na_str")
		na_str.maxlength = 64
		function na_str:validate(value)
			return self.dt:string(value)
		end

	if not from_collection then 
		local delimiter = s:option("delimiter")
			function delimiter:validate(value)
				return self.dt:max_bytes(value, 1)
			end
	end
	
end
return module