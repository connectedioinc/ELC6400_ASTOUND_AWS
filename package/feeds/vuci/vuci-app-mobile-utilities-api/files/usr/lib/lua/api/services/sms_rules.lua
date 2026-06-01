local ConfigService = require("api/ConfigService")
local mdm = require("vuci.modem")
local fs = require("nixio.fs")
local util = require("vuci.util")
local io_info = require("vuci.io"):ioman_info()
local sys = require("vuci.sys")
local nixio = require("nixio")
local board = require("vuci.board")
local io = require("vuci.io")
local pkg = require("vuci.package_checker")
local util_tlt = require("vuci.util_tlt")

local modems = mdm:get_all_modems()
local modem_count = #modems
if modem_count == 0 then
	return nil
end

local SMSUtilities = ConfigService:new({
	anonymous = true
})

SMSUtilities.ERR_CODES = {
	IO_PIN_USED = 1,
}

local actions_with_response = {
	reboot = true,
	mobile = true,
	change_mobile_settings = true,
	reset_conn = true,
	vpn = true,
	change_profile = true,
	ssh_access = true,
	web_access = true,
	ip_unblock = true,
	firstboot = true,
	userdefaults = true,
	fw_upgrade = true,
	uci = true,
	rms_action = true,
	exec = true,
	config_reload = true,
	api = true,
	io_set = true,
	switch_sim = true,
	wol = true,
	data_usage_reset = true,
	wifi = true,
	esim_change = true,
	esim_install = true,
	rms_connect = true,
	gps = true,
}

function SMSUtilities:get_actions()
	local actions = {
		"reboot",
		"send_status",
		"vpnstatus",
		"mobile",
		"change_mobile_settings",
		"reset_conn",
		"list_of_profile",
		"vpn",
		"change_profile",
		"ssh_access",
		"web_access",
		"ip_unblock",
		"firstboot",
		"userdefaults",
		"fw_upgrade",
		"monitoring_status",
		"uci",
		"rms_status",
		"rms_action",
		"rms_connect",
		"more",
		"exec",
		"config_reload",
		"api"
	}

	if board:has_ios() then
		table.insert(actions, "io_set")
	end

	for _, v in pairs(mdm:get_all_modems()) do
		if v.sim_count > 1 then
			table.insert(actions, "switch_sim")
			break
		end
	end

	if board:has_gps() then
		table.insert(actions, "gps")
		table.insert(actions, "gps_coordinates")
	end

	if fs.access("/etc/config/etherwake") and board:get_default_lan_ifname() and board:has_ethernet() then
		table.insert(actions, "wol")
	end

	if pkg.is_installed("quota_limit") then
		table.insert(actions, "data_usage_reset")
		table.insert(actions, "data_limit")
	end

	if board:has_wifi() then
		table.insert(actions, "wifi")
	end

	if board:has_esim() then
		table.insert(actions, "esim_list")
		table.insert(actions, "esim_change")
		table.insert(actions, "esim_install")
	end

	return actions
end

function SMSUtilities:GET_TYPE_options()
	local p = require("vuci.param")
	self:ResponseOK({
		actions = self:get_actions(),
		params = p:get_params_by_service("sms_rules")
	})
end

function SMSUtilities:before_response_hook()
	for _, data in ipairs(self.response_table[1] and self.response_table or {self.response_table}) do
		if data.authorization == "local" then
			if data.password then
				data["password:set"] = "1"
				data.password = nil
			else
				data["password:set"] = "0"
			end
		end
	end
end

local opt_enabled

function SMSUtilities:validate_section_hook()
	local opt_enable = self:get_abs_value(self.config, self.sid, "enabled") or self.current_data_block["enabled"]
	if opt_enable == "1" then
		local required_options = {"authorization", "allowed_phone", "smstext", "action"}
		local allowed_phone = self:get_abs_value(self.config, self.sid, "allowed_phone")
		local action = self:get_abs_value(self.config, self.sid, "action")
		local status_sms = self:get_abs_value(self.config, self.sid, "status_sms")
		local authorization = self:get_abs_value(self.config, self.sid, "authorization")
		local opt_io = self:get_abs_value(self.config, self.sid, "io")
		if io:is_scheduler_enabled(opt_io) then
			self:add_error(STD_CODES.INVALID_OPT, "Unable to enable. Output scheduler instance with '%s' pin is enabled" % opt_io, "enabled")
		end
		if allowed_phone == "single" then
			table.insert(required_options, "tel")
		end
		if allowed_phone == "group" then
			table.insert(required_options, "group")
		end
		if authorization == "local" then
			local opt_password = self:getter_wrapped_abs_value(self.config, self.sid, "password")
			if not opt_password then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: password", "enabled")
			end
		end
		if action then
			if self:get_abs_value(self.config, self.sid, "to_other_phone") == "1" then
				if util.contains({"reboot", "send_status", "vpnstatus", "list_of_profile", "monitoring_status", "iostatus", "uci", "rms_status", "gps_coordinates"}, action) then
					table.insert(required_options, "to_number")
				end
			end
			if action == "change_mobile_settings" and modem_count == 1 and mdm:get_sim_count(modems[1].id) > 1 then
				table.insert(required_options, "simcard")
			end
			if action == "send_status" or action == "iostatus" then
				table.insert(required_options, "message")
			end
			if status_sms == "1" and action == "reboot" then
				table.insert(required_options, "message")
			end
			if action == "wol" then
				table.insert(required_options, "mac")
			end
			if action == "exec" then
				table.insert(required_options, "script")
			end
			if action == "io_set" then
				if self:get_abs_value(self.config, self.sid, "timeout") == "1" then
					table.insert(required_options, "seconds")
				end
				table.insert(required_options, "io")
			end
			if util.contains({"mobile", "wifi", "vpn", "gps", "rms_action", "io_set"}, action) then
				table.insert(required_options, "value")
			end
		end
		opt_enabled.require = {["1"] = required_options}
	end
end

SMSUtilities.PUT_validate_section_hook = SMSUtilities.validate_section_hook
SMSUtilities.POST_validate_section_hook = SMSUtilities.validate_section_hook

local s = SMSUtilities:section("sms_utils", "rule")
function s:create_defaults()
	return {
		authorization = self.current_data_block.authorization or "password",
		allowed_phone = self.current_data_block.allowed_phone or "all"
	}
end

	opt_enabled = s:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_action = s:option("action")
		function opt_action:validate(value)
			return self.dt:check_array(value, self:get_actions())
		end

	local opt_io = s:option("io")
		function opt_io:validate(value)
			local pin_options = {}
			for _, io_value in ipairs(io_info) do
				if (io_value.type == "gpio" and (io_value.direction == "out" or io_value.bi_dir == true)) or io_value.type == "relay" then
					pin_options[#pin_options + 1] = io_value.name
				end
			end
			return self.dt:check_array(value, pin_options)
		end

	local opt_value = s:option("value")
		function opt_value:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_value:set(value)
			if value == "1" then self:table_set(self.main_config, self.sid, "value", "on")
			elseif value == "0" then self:table_set(self.main_config, self.sid, "value", "off")
			else self:table_delete(self.main_config, self.sid, "value") end
		end
		function opt_value:get(value)
			if value == "on" then return "1" end
			if value == "off" then return "0" end
		end

	local opt_timeout = s:option("timeout")
		function opt_timeout:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_seconds = s:option("seconds")
		function opt_seconds:validate(value)
			return self.dt:irange(value, 1, 999999)
		end

	local opt_smstext = s:option("smstext")
	opt_smstext.maxlength = 160
		function opt_smstext:validate(value)
			local valid = true
			self:table_foreach(self.config, "rule", function (s)
				if self.sid == s[".name"] then return end -- continue
				if s.smstext and s.smstext == value then
					valid = false
					return false
				end
			end)
			if not valid then return false, "Such SMS text already exists" end
			return self.dt:fieldvalidation(value, '^[a-zA-Z0-9!@#%$%%&%*%+%-/=%?%^_`{|}~%.%[%]]+$')
		end

	local opt_status_sms = s:option("status_sms")
		function opt_status_sms:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_write_config = s:option("write_config")
		function opt_write_config:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_write_wifi = s:option("write_wifi")
		function opt_write_wifi:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_write_mobile = s:option("write_mobile")
		function opt_write_mobile:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_write_esim = s:option("write_esim")
		function opt_write_esim:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_to_other_phone = s:option("to_other_phone")
		function opt_to_other_phone:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_to_number = s:option("to_number", {list = true})
		function opt_to_number:validate(value)
			return self.dt:phonedigit(value)
		end
		function opt_to_number:get(value)
			return (value and type(value) == "string") and util.split(value, " ") or value
		end
		function opt_to_number:set(value)
			self:table_set(self.main_config, self.sid, "to_number", value and table.concat(value or {}, " "))
		end

	local opt_modem_id = s:option("modem_id")
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

	local opt_info_modem_id = s:option("info_modem_id")
		function opt_info_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_send_modem_id = s:option("send_modem_id")
		function opt_send_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_message = s:option("message")
		function opt_message:validate(value)
			local modem_id = self:get_abs_value(self.config, self.sid, "send_modem_id")
			return util_tlt.validate_sms_message(value, modem_id)
		end

	local opt_simcard = s:option("simcard")
		function opt_simcard:validate(value)
			return self.dt:check_array(value, {"1", "2"})
		end

	local opt_ssh_access_enabled = s:option("ssh_access_enabled")
		function opt_ssh_access_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_ssh_access_remote = s:option("ssh_access_remote")
		function opt_ssh_access_remote:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_web_access_enabled = s:option("web_access_enabled")
		function opt_web_access_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_webs_access_enabled = s:option("webs_access_enabled")
		function opt_webs_access_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_web_access_http = s:option("web_access_http")
		function opt_web_access_http:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_web_access_https = s:option("web_access_https")
		function opt_web_access_https:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_redirect_https = s:option("redirect_https")
		function opt_redirect_https:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_mac = s:option("mac")
		function opt_mac:validate(value)
			return self.dt:macaddr(value)
		end

	local opt_authorization = s:option("authorization")
		function opt_authorization:validate(value)
			return self.dt:check_array(value, {"no", "serial", "password", "local"})
		end

	local opt_password = s:option("password")
		opt_password.maxlength = 80
		-- opt_password.require = {"authorization"}
		function opt_password:validate(value)
			local authorization = self:get_abs_value(self.config, self.sid, "authorization")
			local status, msg = self.dt:root_password(value)
			if status and authorization ~= "local" then
				status = false
				msg = "authorization must be set to 'local'."
			end
			return status, msg
		end
		function opt_password:set(value)
			if value == "" then
				self:table_delete(self.config, self.sid, "password")
			else
				local pass = sys.getpasswd("root")
				if not pass then
					self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Failed to get root password")
				else
					self:table_set(self.config, self.sid, "password", nixio.crypt(value, pass))
				end
			end
		end
		function opt_password:get(value)
			local opt_auth = self:get_abs_value(self.config, self.sid, "authorization")
			return opt_auth == "local" and value or nil
		end

	local opt_allowed_phone = s:option("allowed_phone")
	-- Disabled till WebUI fixes its creation of empty configurations.
	-- opt_allowed_phone.require = { ["group"] = { "group"},  ["single"] = { "tel" }}
		function opt_allowed_phone:validate(value)
			return self.dt:check_array(value, {"all", "group", "single"})
		end

	local opt_tel = s:option("tel")
		function opt_tel:validate(value)
			return self.dt:phonedigit(value)
		end

	local opt_group = s:option("group")
		function opt_group:validate(value)
			local found = false
			self:table_foreach("user_groups", "phone", function (s)
				if s.name == value then
					found = true
				end
			end)
			return found, "User group not found"
		end

	local opt_status_code= s:option("status_code")
		function opt_status_code:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_file = util_tlt.userscripts_permission_option("script", s)
	opt_file.orig_validate = opt_file.validate
	opt_file.orig_set = opt_file.set
	function opt_file:getter() return self:get(self:table_get(self.config, self.sid, self.api_key)) end
		function opt_file:validate(value)
			self:orig_validate(value)
			return string.find(value, "#!/bin/sh\n") == 1, "Script must start with #!/bin/sh and a newline."
		end

		function opt_file:get(value)
			if value then
				return fs.readfile(value)
			end
		end

		function opt_file:set(value)
			local path = "/etc/vuci-uploads/" .. self.main_config .. "." .. self.sid .. ".sh"
			if value ~= "" then
				fs.writefile(path, value)
				util.set_file_permissions(path, "mobutils", 744)
			else
				fs.remove(path)
			end
			opt_file:orig_set(value ~="" and path or value)
		end

	local opt_methods = s:option("methods", {list = true})
		function opt_methods:validate(value)
			return self.dt:check_array(value, {"get", "post", "put", "delete"})
		end

	local opt_acl_mode = s:option("acl_mode")
		function opt_acl_mode:validate(value)
			return self.dt:check_array(value, {"allowed", "denied"})
		end

	local opt_respond = s:option("respond")
		function opt_respond:validate(value)
			local selected_action = self:get_abs_value(self.config, self.sid, "action")
			if not actions_with_response[selected_action] then
				-- do not allow to set the option if it's not supported for the selected action
				return false, "Selected action does not support this option"
			end
			return self.dt:is_bool(value)
		end
		function opt_respond:get(value)
			local selected_action = self:get_abs_value(self.config, self.sid, "action")
			if not actions_with_response[selected_action] then return end
			return value or "1"
		end
		function opt_respond:set(value)
			local selected_action = self:get_abs_value(self.config, self.sid, "action")
			if not actions_with_response[selected_action] and value == "" then
				-- allow to delete the option if it's not supported for the selected action
				self:table_delete(self.config, self.sid, self.api_key)
				return
			end
			self:table_set(self.config, self.sid, self.api_key, value == "1" and "1" or "0")
		end

SMSUtilities.DELETE_before_section_delete_hook = function(self)
	opt_file:add_files_to_delete("/etc/vuci-uploads/" .. self.main_config .. "." .. self.sid .. ".sh")
end
return SMSUtilities
