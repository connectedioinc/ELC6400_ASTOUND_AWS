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
		local required_options = {"verify_cert", "method", "url", "message_name", "mode"}
		local sender_num = self:get_abs_value(self.config, self.sid, "sender_num")
		local mode = self:get_abs_value(self.config, self.sid, "mode")
		if sender_num == "1" then
			table.insert(required_options, "number_name")
		end
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

local ToHTTP = SMSForwarding:section("sms_gateway", "fwd")
function ToHTTP:filter(s)
	return s[".name"] == "to_http"
end

	opt_enabled = ToHTTP:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_every_sms = ToHTTP:option("every_sms")
		function opt_every_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_delete_sms = ToHTTP:option("delete_sms")
		function opt_delete_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_sender_num = ToHTTP:option("sender_num")
		function opt_sender_num:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_number_name = ToHTTP:option("number_name")
		opt_number_name.maxlength = 16

	local opt_message_encode_b64 = ToHTTP:option("message_encode_b64")
		function opt_message_encode_b64:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_verify_cert = ToHTTP:option("verify_cert")
		function opt_verify_cert:validate(value)
			return self.dt:check_array(value, {
				"ignore", "verify"
			})
		end

	local opt_method = ToHTTP:option("method")
		function opt_method:validate(value)
			return self.dt:check_array(value, {
				"post", "get"
			})
		end

	local opt_url = ToHTTP:option("url")
		function opt_url:validate(value)
			return self.dt:url(value)
		end

	local opt_message_name = ToHTTP:option("message_name")
		opt_message_name.maxlength = 16

	local extra_name1 = ToHTTP:option("extra_name1")
	extra_name1.maxlength = 64

	local extra_value1 = ToHTTP:option("extra_value1")
	extra_value1.maxlength = 64

	local extra_name2 = ToHTTP:option("extra_name2")
	extra_name2.maxlength = 64

	local extra_value2 = ToHTTP:option("extra_value2")
	extra_value2.maxlength = 64

	local opt_mode = ToHTTP:option("mode")
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

	local opt_tel = ToHTTP:option("tel", {list = true})
		function opt_tel:validate(value)
			return self.dt:phonedigit(value)
		end

	local opt_group_name = ToHTTP:option("group")
		function opt_group_name:validate(value)
			local ok = false
			self:table_foreach("user_groups", "phone", function (s)
				if s.name == value then ok = true end
			end)
			return ok, "user group not found"
		end

return SMSForwarding