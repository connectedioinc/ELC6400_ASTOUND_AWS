local module = {}

function module:endpoint(service, s, bundle, output_type)
	output_type.require["sms"] = { "sms_recipient_format" }

	if bundle.all_modems and #bundle.all_modems > 1 then
		table.insert(output_type.require["sms"], "sms_modem_id")
	end

	local sms_recipient_format = s:option("sms_recipient_format")
	sms_recipient_format.require = {
		single = { "sms_phone" },
		group = { "sms_group" }
	}
	function sms_recipient_format:validate(value)
		return self.dt:check_array(value, { "single", "group" })
	end

	local sms_phone = s:option("sms_phone")
	function sms_phone:validate(value)
		return self.dt:phonedigit(value)
	end

	local sms_group = s:option("sms_group")
	function sms_group:validate(value)
		local groups = {}
		self:table_foreach("user_groups", "phone", function(s)
			if s.name then
				table.insert(groups, s.name)
			end
		end)
		return self.dt:check_array(value, groups)
	end

	local sms_modem_id = s:option("sms_modem_id")
	function sms_modem_id:validate(value)
		return self.dt:check_modem(value)
	end
end

return module
