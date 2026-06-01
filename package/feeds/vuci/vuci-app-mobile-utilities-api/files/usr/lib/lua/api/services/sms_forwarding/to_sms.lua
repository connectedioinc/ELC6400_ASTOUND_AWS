local ConfigService = require("api/ConfigService")
local all_modems = require("vuci.modem"):get_all_modems()
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
		local required_options = {"mode", "fwd_number"}
		local mode = self:get_abs_value(self.config, self.sid, "mode")
		if mode == "list_number" then
			table.insert(required_options, "tel")
		end
		if mode == "user_group" then
			table.insert(required_options, "group")
		end
		if #all_modems > 1 then
			table.insert(required_options, "send_modem_id")
		end
		opt_enabled.require = {["1"] = required_options}
	end
end

SMSForwarding.PUT_validate_section_hook = SMSForwarding.validate_section_hook

local ToSMS = SMSForwarding:section("sms_gateway", "fwd")
function ToSMS:filter(s)
	return s[".name"] == "to_sms"
end

	opt_enabled = ToSMS:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_every_sms = ToSMS:option("every_sms")
		function opt_every_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_delete_sms = ToSMS:option("delete_sms")
		function opt_delete_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_sender_num = ToSMS:option("sender_num")
		function opt_sender_num:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_send_modem_id = ToSMS:option("send_modem_id")
		function opt_send_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_mode = ToSMS:option("mode")
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

	local opt_tel = ToSMS:option("tel", {list = true})
		function opt_tel:validate(value)
			return self.dt:phonedigit(value)
		end

	local opt_group_name = ToSMS:option("group")
		function opt_group_name:validate(value)
			local ok = false
			self:table_foreach("user_groups", "phone", function (s)
				if s.name == value then ok = true end
			end)
			return ok, "user group not found"
		end

	local opt_fwd_number = ToSMS:option("fwd_number", {list = true})
		function opt_fwd_number:validate(value)
			return self.dt:phonedigit(value)
		end

return SMSForwarding