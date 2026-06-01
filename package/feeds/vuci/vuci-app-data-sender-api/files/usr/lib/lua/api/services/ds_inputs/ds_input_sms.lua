local module = {}

function module:endpoint(service, s, bundle, input_type)
	if bundle.all_modems and #bundle.all_modems > 1 then
		input_type.require["sms"] = { "sms_modem_id" }
	end
	local sms_modem_id = s:option("sms_modem_id")
	function sms_modem_id:validate(value)
		return self.dt:check_modem(value)
	end
end

return module
