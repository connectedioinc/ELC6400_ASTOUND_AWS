local ConfigService = require("api/ConfigService")
local all_modems = require("vuci.modem"):get_all_modems()
local mdm = require("vuci.modem")

if mdm:modem_count() == 0 then
	return nil
end

local SMSGateway = ConfigService:new({
	create = false,
	delete = false
})

local opt_enabled

function SMSGateway:validate_section_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if enabled == "1" then
		local required_options = {"mode", "msg"}
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

SMSGateway.PUT_validate_section_hook = SMSGateway.validate_section_hook

local AutoReply = SMSGateway:section("sms_gateway", "fwd")
function AutoReply:filter(s)
	return s[".name"] == "reply"
end
	opt_enabled = AutoReply:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_every_sms = AutoReply:option("every_sms")
		function opt_every_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_delete_sms = AutoReply:option("delete_sms")
		function opt_delete_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_send_modem_id = AutoReply:option("send_modem_id")
		function opt_send_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_mode = AutoReply:option("mode")
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

	local opt_tel = AutoReply:option("tel", {list = true})
		function opt_tel:validate(value)
			return self.dt:phonedigit(value)
		end

	local opt_group_name = AutoReply:option("group")
		function opt_group_name:validate(value)
			local ok = false
			self:table_foreach("user_groups", "phone", function (s)
				if s.name == value then ok = true end
			end)
			if not ok then
				return false, "user group not found"
			end
			return true
		end

	local opt_msg = AutoReply:option("msg")
		function opt_msg:validate(value)
			local modem_id = self:get_abs_value(self.config, self.sid, "send_modem_id")
			return require("vuci.util_tlt").validate_sms_message(value, modem_id)
		end

return SMSGateway