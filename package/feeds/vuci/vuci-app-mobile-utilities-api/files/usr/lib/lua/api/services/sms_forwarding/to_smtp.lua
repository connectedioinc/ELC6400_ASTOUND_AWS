local ConfigService = require("api/ConfigService")
local mdm = require("vuci.modem")

if mdm:modem_count() == 0 then
	return nil
end

local SMSForwarding = ConfigService:new({
	create = false,
	delete = false
})

local opt_enabled

function SMSForwarding:validate_section_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if enabled == "1" then
		local required_options = {"mode", "subject", "email_name", "recipemail"}
		local mode = self:get_abs_value(self.config, self.sid, "mode")
		if mode == "list_number" then
			table.insert(required_options, "tel")
		end
		if mode == "user_group" then
			table.insert(required_options, "group")
		end
		opt_enabled.require = {["1"] = required_options}
	end
end

SMSForwarding.PUT_validate_section_hook = SMSForwarding.validate_section_hook

local ToSMTP = SMSForwarding:section("sms_gateway", "fwd")
function ToSMTP:filter(s)
	return s[".name"] == "to_smtp"
end

	opt_enabled = ToSMTP:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_every_sms = ToSMTP:option("every_sms")
		function opt_every_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_delete_sms = ToSMTP:option("delete_sms")
		function opt_delete_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_sender_num = ToSMTP:option("sender_num")
		function opt_sender_num:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_subject = ToSMTP:option("subject")
	opt_subject.maxlength = 256
		function opt_subject:validate(value)
			return self.dt:fieldvalidation(value, '^[a-zA-Z0-9!@#$%&*+/=?^_`{|}~. -]+$')
		end

	local opt_email_name = ToSMTP:option("email_name")
		function opt_email_name:validate(value)
			local ok = false
			self:table_foreach("user_groups", "email", function (s)
				if s.name == value then ok = true end
			end)
			return ok, "user group not found"
		end

	local opt_recipemail = ToSMTP:option("recipemail", {list = true})
		function opt_recipemail:validate(value)
			return self.dt:email(value)
		end

	local opt_mode = ToSMTP:option("mode")
		function opt_mode:validate(value)
			return self.dt:check_array(value, {
				"everyone", "list_number", "user_group"
			})
		end
		function opt_mode:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if value == "everyone" or value == "user_group" then
				-- Remove data that is no longer required
				self:table_delete(self.config, self.sid, "tel")
			end
		end

	local opt_tel = ToSMTP:option("tel", {list = true})
		function opt_tel:validate(value)
			return self.dt:phonedigit(value)
		end

	local opt_group_name = ToSMTP:option("group")
		function opt_group_name:validate(value)
			local ok = false
			self:table_foreach("user_groups", "phone", function (s)
				if s.name == value then ok = true end
			end)
			return ok, "user group not found"
		end

return SMSForwarding