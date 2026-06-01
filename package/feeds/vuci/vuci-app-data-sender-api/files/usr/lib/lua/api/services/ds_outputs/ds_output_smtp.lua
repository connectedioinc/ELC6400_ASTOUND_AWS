local module = {}

function module:endpoint(service, s, bundle, output_type)
	output_type.require["smtp"] = { "smtp_recipients", "smtp_subject", "smtp_account" }
	local smtp_recipients = s:option("smtp_recipients", { list = true })
	function smtp_recipients:validate(value)
		return self.dt:email(value)
	end

	local smtp_subject = s:option("smtp_subject")
	function smtp_subject:validate(value)
		return self.dt:fieldvalidation(value, "^[a-zA-Z0-9!@#$%%&*+-/=?^_`{|}~. ]+$")
	end

	local smtp_account = s:option("smtp_account")
	function smtp_account:validate(value)
		local smtp_users = {}
		self:table_foreach("user_groups", "email", function(s)
			if s.name then
				table.insert(smtp_users, s.name)
			end
		end)
		return self.dt:check_array(value, smtp_users)
	end
end

return module
