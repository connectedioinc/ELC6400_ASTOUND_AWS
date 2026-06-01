local module = {}

function module:endpoint(service, s, bundle, input_type)

	if #(bundle.all_modems or {}) > 1 then
		input_type.require["gsm"] = {}
		table.insert(input_type.require["gsm"], "gsm_modem_id")
	end

	local gsm_modem_id = s:option("gsm_modem_id")
		function gsm_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

end

return module