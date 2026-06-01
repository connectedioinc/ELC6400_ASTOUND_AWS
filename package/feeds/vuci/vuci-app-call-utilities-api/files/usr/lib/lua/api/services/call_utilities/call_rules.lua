local ConfigService = require("api/ConfigService")
local io = require("vuci.io")
local mdm = require("vuci.modem")
local board = require("vuci.board")
local util = require("vuci.util")
local all_modems = mdm:get_all_modems()

if mdm:modem_count() == 0 then
	return nil
else
	for _, modem in ipairs(all_modems) do
		if modem.id and not mdm:call_functionality_supported(modem.id) then
			return nil
		end
	end
end

local CallUtilities = ConfigService:new({
	anonymous = true
})

CallUtilities.ERR_CODES = {
	IO_PIN_USED = 1
}

function CallUtilities:get_actions()
	local actions = {
		"reboot",
		"send_status",
		"mobile"
	}

	if board:has_ios() then
		table.insert(actions, "dout")
	end

	if board:has_wifi() then
		table.insert(actions, "wifi")
	end

	if io:has_io("relay0", "relay") then
		table.insert(actions, "relay")
	end

	return actions
end

function CallUtilities:GET_TYPE_options()
	local p = require("vuci.param")
	self:ResponseOK({
		actions = self:get_actions(),
		params = p:get_params_by_service("call_rules")
	})
end

local opt_enabled

function CallUtilities:validate_section_hook()
	if self:get_abs_value(self.config, self.sid, "enabled") == "1" then
		local required_options = {"action", "allowed_phone"}
		local action = self:get_abs_value(self.config, self.sid, "action")
		local allowed_phone =  self:get_abs_value(self.config, self.sid, "allowed_phone")
		local status_sms =  self:get_abs_value(self.config, self.sid, "status_sms")
		if action == "send_status" or (action == "reboot" and status_sms == "1") then
			table.insert(required_options, "message")
		end
		if action and util.contains({"wifi", "mobile", "dout", "relay"}, action) then
			table.insert(required_options, "value")
		end
		if action == "dout" or action == "relay"  then
			local timeout =  self:get_abs_value(self.config, self.sid, "timeout")
			if timeout == "1" then
				table.insert(required_options, "seconds")
			end
			table.insert(required_options, "pin")
		end
		if allowed_phone == "single" then
			table.insert(required_options, "tel")
		end
		if allowed_phone == "group" then
			table.insert(required_options, "group")
		end
		opt_enabled.require = {["1"] = required_options}
	end
end

CallUtilities.PUT_validate_section_hook = CallUtilities.validate_section_hook
CallUtilities.POST_validate_section_hook = CallUtilities.validate_section_hook

local CallRules = CallUtilities:section("call_utils", "rule")

function CallRules:create_defaults(_)
	local action = self:get_abs_value(self.config, self.sid, "action") or self.current_data_block["action"]
	if action and action == "send_status" then
		return {
		message				= "Router name - %rn; WAN IPv4 - %wi; Data Connection state - %cs; Connection type - %ct; Signal strength - %ss;",
		allowed_phone		= "all"
		}
	end
	return {
		allowed_phone		= "all"
	}
end

	opt_enabled = CallRules:option("enabled")
		function opt_enabled:validate(value)
			local pin = self:get_abs_value(self.config, self.sid, "pin")
			local action = self:get_abs_value(self.config, self.sid, "action")

			if value == "1" and pin and action and io:is_scheduler_enabled(pin) and (action == "dout" or action == "relay") then
				return false, "Unable to enable. Output scheduler instance with '%s' pin is enabled" % pin, self.ERR_CODES.IO_PIN_USED
			end

			return self.dt:is_bool(value)
		end

	local opt_action = CallRules:option("action")
		-- Disabled till WebUI fixes its creation of empty configurations.
		-- opt_action.require = {
		--	 dout = {"pin"},
		--	 relay = {"pin"},
		--	 send_status = {"message"}
		-- }
		function opt_action:validate(value)
			return self.dt:check_array(value, self:get_actions())
		end

	local opt_value = CallRules:option("value")
		function opt_value:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_value:get(value)
			if value == "on" then return "1" end
			if value == "off" then return "0" end
		end
		function opt_value:set(value)
			if value == "1" then self:table_set(self.main_config, self.sid, "value", "on")
			elseif value == "0" then self:table_set(self.main_config, self.sid, "value", "off")
			else self:table_delete(self.main_config, self.sid, "value") end
		end

	local opt_write_config = CallRules:option("write_config")
		function opt_write_config:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_timeout = CallRules:option("timeout")
		function opt_timeout:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_seconds = CallRules:option("seconds")
		function opt_seconds:validate(value)
			return self.dt:range(value, 1, 999999)
		end

	local opt_status_sms = CallRules:option("status_sms")
		function opt_status_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_modem_id = CallRules:option("modem_id")
		function opt_modem_id:validate(value)
			if mdm:builtin_modems_count() > 1 then
				local options = {"both"}
				for _, modem in ipairs(mdm:get_all_modems()) do
					if modem["id"] then
						table.insert(options, modem["id"])
					end
				end
				return self.dt:check_array(value, options)
			end
			return self.dt:check_modem(value)
		end

	local opt_info_modem_id = CallRules:option("info_modem_id")
		function opt_info_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_send_modem_id = CallRules:option("send_modem_id")
		function opt_send_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_write_wifi = CallRules:option("write_wifi")
		function opt_write_wifi:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_write_mobile = CallRules:option("write_mobile")
		function opt_write_mobile:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_message = CallRules:option("message")
		function opt_message:validate(value)
			local modem_id = self:get_abs_value(self.config, self.sid, "send_modem_id")
			return require("vuci.util_tlt").validate_sms_message(value, modem_id)
		end

	local opt_pin = CallRules:option("pin")
		function opt_pin:validate(value)
			local action = self:get_abs_value(self.config, self.sid, "action")
			local enabled = self:get_abs_value(self.config, self.sid, "enabled")
			if action == "dout" then
				local pin = io:get_pin_obj(value)
				if pin == nil or pin.type ~= "gpio" or (pin.direction ~= "out" and pin.bi_dir ~= "1") then
					return false, "gpio dout pin not found"
				end
			elseif action == "relay" then
				if not io:has_io(value, "relay") then
					return false, "relay pin not found"
				end
			else
				return false, "action should be dout or relay for pin option"
			end
			if enabled == "1" and io:is_scheduler_enabled(value) then
				return false, "Unable to set pin. Output scheduler instance with this pin is enabled", self.ERR_CODES.IO_PIN_USED
			end
			return true
		end

	local opt_allowed_phone = CallRules:option("allowed_phone")
		-- Disabled till WebUI fixes its creation of empty configurations.
		-- opt_allowed_phone.require = { ["group"] = { "group"},  ["single"] = { "tel" }}
		function opt_allowed_phone:validate(value)
			return self.dt:check_array(value, {"all", "group", "single"})
		end

	local opt_tel = CallRules:option("tel")
		function opt_tel:validate(value)
			return self.dt:phonedigit(value)
		end

	local opt_group = CallRules:option("group")
		function opt_group:validate(value)
			local ok = false
			self:table_foreach("user_groups", "phone", function (s)
				if s.name == value then ok = true end
			end)
			if not ok then
				return false, "user group not found"
			end
			return true
		end

return CallUtilities
