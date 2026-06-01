local ConfigService = require("api/ConfigService")
local modbus_utils = require("vuci.modbus_utils")

local ALARM_ACTION = modbus_utils.ALARM_ACTION

local ModbusSerialClientAlarm = ConfigService:new({ increment_name = true })

local s = ModbusSerialClientAlarm:section("modbus_client", function(self) return "alarm_" .. self.binding end)
function s:filter()
	local parent = self:table_get(self.config, self.binding)
	if parent[".type"] == "rtu_server" then return true end
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "f_code", "data_type", "value", "condition", "actionfrequency", "action" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local function_code = s:option("f_code")
		function function_code:validate(value)
			return self.dt:check_array(value, modbus_utils.read_functions)
		end

	local register = s:option("register")
		function register:validate(value)
			return self.dt:irange(value, 1, 65536)
		end

	local condition = s:option("condition")
		function condition:validate(value)
			return self.dt:check_array(value, modbus_utils.conditions)
		end

	local data_type = s:option("data_type")
		function data_type:validate(value)
			local f_code = self:get_abs_value(self.config, self.sid, "function")
			return self.dt:check_array(value, modbus_utils:get_data_types(f_code))
		end

	local _value = s:option("value")
	_value.require = { "f_code", "data_type" }
		function _value:validate(value)
			local func = self:get_abs_value(self.config, self.sid, "f_code")
			local d_type = self:get_abs_value(self.config, self.sid, "data_type")
			return modbus_utils:validate_alarm_value(func, value, d_type)
		end

	local action_frequency = s:option("actionfrequency")
		function action_frequency:validate(value)
			return self.dt:is_bool(value)
		end

	local redundacy_protection = s:option("redundancy_protection")
		function redundacy_protection:validate(value)
			return self.dt:is_bool(value)
		end

	local redundancy_protection_period = s:option("redundancy_protection_period")
		function redundancy_protection_period:validate(value)
			return self.dt:irange(value, 1, 86400)
		end

	local action = s:option("action")
	action.require = {
		[ALARM_ACTION.MODBUS] = { "modbus_timeout", "modbus_id", "modbus_function", "modbus_data_type", "modbus_first_reg" },
		[ALARM_ACTION.SMS]    = { "msg" },
		[ALARM_ACTION.IO]     = { "output", "io_action" },
		[ALARM_ACTION.MQTT]   = { "json", "host", "topic", "port", "keepalive", "qos" },
		[ALARM_ACTION.EMAIL]   = { "json", "subject", "recipEmail", "email_group_id" }
	}
		function action:validate(value)
			return self.dt:check_array(value, modbus_utils:get_alarm_action_options())
		end

	local output = s:option("output")
		function output:validate(value)
			return self.dt:check_array(value, modbus_utils:fetch_io_output_options())
		end

	local io_action = s:option("io_action")
		function io_action:validate(value)
			return self.dt:range(value, 0, 2)
		end

	local modem = s:option("modem")
		function modem:validate(value)
			local modems = modbus_utils:fetch_modem_options()
			if #modems == 0 then
				return false, "No modems found on device."
			end
			return self.dt:check_array(value, modems)
		end

	local msg = s:option("msg")
	msg.maxlength = 160
		function msg:validate(_)
			return self.dt:string()
		end

	local phone_number = s:option("telnum", {list = true})
	phone_number.list_length = 16
		function phone_number:validate(value)
			return self.dt:fieldvalidation(value, "^[0-9+]*$")
		end

	local phone_group_id = s:option("phone_group_id")
		function phone_group_id:validate(value)
			local ok = false
			self:table_foreach("user_groups", "phone", function(_s)
				if _s[".name"] == value then
					ok = true
					return false
				end
			end)
			return ok, "phone group not found"
		end

	local modbus_ip_address = s:option("modbus_ip_addr")
		function modbus_ip_address:validate(value)
			return self.dt:ip4addr(value)
		end

	local modbus_port = s:option("modbus_port")
		function modbus_port:validate(value)
			return self.dt:port(value)
		end

	local modbus_timeout = s:option("modbus_timeout")
		function modbus_timeout:validate(value)
			return self.dt:irange(value, 1, 30)
		end

	local modbus_id = s:option("modbus_id")
		function modbus_id:validate(value)
			return self.dt:irange(value, 1, 255)
		end

	local modbus_function = s:option("modbus_function")
	modbus_function.require = { "modbus_reg_count" }
		function modbus_function:validate(value)
			return self.dt:check_array(value, modbus_utils.write_functions)
		end

	local modbus_first_reg = s:option("modbus_first_reg")
		function modbus_first_reg:validate(value)
			return self.dt:irange(value, 1, 65536)
		end

	local modbus_data_type = s:option("modbus_data_type")
		function modbus_data_type:validate(value)
			local f_code = self:get_abs_value(self.config, self.sid, "modbus_function")
			return self.dt:check_array(value, modbus_utils:get_data_types(f_code))
		end

	local modbus_reg_count = s:option("modbus_reg_count")
	modbus_reg_count.require = { "modbus_function", "modbus_data_type" }
		function modbus_reg_count:validate(value)
			local func = self:get_abs_value(self.config, self.sid, "modbus_function")
			local d_type = self:get_abs_value(self.config, self.sid, "modbus_data_type")
			return modbus_utils:validate_value(func, value, d_type)
		end
	-- mqtt message options
	local json = s:option("json")
		function json:validate(_)
			return self.dt:string()
		end

	local host = s:option("host")
		function host:validate(_)
			return self.dt:string()
		end

	local port = s:option("port")
		function port:validate(value)
			return self.dt:port(value)
		end

	local keep_alive = s:option("keepalive")
		function keep_alive:validate(value)
			return self.dt:range(value, 1, 640)
		end

	local topic = s:option("topic")
		function topic:validate(_)
				return self.dt:string()
		end

	local client_id = s:option("client_id")
		function client_id:validate(_)
				return self.dt:string()
		end

	local opt_qos = s:option("qos")
		function opt_qos:validate(value)
			return self.dt:check_array(value, {
				"0", --At most once
				"1", --At least once
				"2"  --Exactly once
			})
		end

	local use_tls_root_ca = s:option("use_tls_root_ca")
		function use_tls_root_ca:validate(value)
			return self.dt:is_bool(value)
		end

	local tls_enabled = s:option("tls_enabled")
	tls_enabled.require = { ["1"] = { "tls_type" } }
		function tls_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_tls_type = s:option("tls_type")
	opt_tls_type.require = { ["1"] = { "ca_file" }, ["0"] = { "preshared_key" } }
		function opt_tls_type:validate(value)
			return self.dt:check_array(value, {
				"0", "1"
			})
		end

	local preshared_key = s:option("preshared_key", { sensitive = true })
		function preshared_key:validate(_)
			return self.dt:string(_)
		end

	local opt_identity = s:option("identity")
		function opt_identity:validate(_)
			return self.dt:string(_)
		end

	-- File uploads
	local device_files = s:option("device_files")
		function device_files:validate(value)
			return self.dt:is_bool(value)
		end
		function device_files:set(value)
			local old_option = self:table_get(self.config, self.sid, "_device_files")
			if old_option then
				self:table_set(self.config, self.sid, "_device_files", "")
			end
			self:table_set(self.config, self.sid, "device_files", value)
		end
		function device_files:get(value)
			local old_option = self:table_get(self.config, self.sid, "_device_files")
			return old_option or value
		end

	s:option("ca_file", {file = true})
	s:option("cert_file", {file = true})
	s:option("key_file", {file = true})

	local use_credentials = s:option("use_credentials")
		function use_credentials:validate(value)
			return self.dt:is_bool(value)
		end
	local username = s:option("username")
		username.maxlength = 512
		function username:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 512
		function password:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local subject = s:option("subject")
	subject.maxlength = 256
		function subject:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9!@#$%%&*+/=?^_`{|}~%. %-]+$")
		end

	local email_group_id = s:option("email_group_id")
		function email_group_id:validate(value)
			local ok = false
			self:table_foreach("user_groups", "email", function(_s)
				if _s[".name"] == value then
					ok = true
					return false
				end
			end)
			return ok, "email group not found"
		end

	local recipEmail = s:option("recipEmail", {list = true})
	recipEmail.list_length = 16
		function recipEmail:validate(value)
			return self.dt:email(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function ModbusSerialClientAlarm:adjust_requires()
	local enabled_val = self:getter_wrapped_abs_value(self.config, self.sid, enabled.api_key)
	local phone_number_val = self:getter_wrapped_abs_value(self.config, self.sid, phone_number.api_key)
	local phone_group_id_val = self:getter_wrapped_abs_value(self.config, self.sid, phone_group_id.api_key)
	local modbus_ip = self:getter_wrapped_abs_value(self.config, self.sid, modbus_ip_address.api_key)
	local modbus_port_val = self:getter_wrapped_abs_value(self.config, self.sid, modbus_port.api_key)
	if enabled_val ~= "1" then action.require = nil end
	if not action.require then return end
	if not (phone_number_val or phone_group_id_val) then
		table.insert(action.require[ALARM_ACTION.SMS], "telnum")
	end
	if modbus_ip then
		table.insert(action.require[ALARM_ACTION.MODBUS], "modbus_port")
	end
	if modbus_port_val then
		table.insert(action.require[ALARM_ACTION.MODBUS], "modbus_ip_addr")
	end
end

function ModbusSerialClientAlarm:POST_validate_section_hook()
	if self:table_get(self.main_config, self.binding, ".type") ~= "rtu_server" then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Parent configuration has to be Server configuration.", "Validation", HTTP_STATUS_CODES.BAD_REQUEST)
	end
	self:adjust_requires()
end
ModbusSerialClientAlarm.PUT_validate_section_hook = ModbusSerialClientAlarm.adjust_requires

function ModbusSerialClientAlarm:before_commit_hook()
	local phone_group_id_val = self.arguments.data.phone_group_id
	if phone_group_id_val then
		self:table_foreach("user_groups", "phone", function(_s)
			if _s[".name"] == phone_group_id_val then
				local tel_nums = _s.tel or {}
				if #tel_nums == 0 then
					self:add_critical_error(STD_CODES.INVALID_OPT, string.format("Phone group must contain at least 1 phone number."), "phone_group_id")
				end
				if phone_number.list_length < #tel_nums then
					self:add_critical_error(STD_CODES.INVALID_OPT, string.format("Phone group must not exceed 16 phone numbers."), "phone_group_id")
				end
				self:table_set(self.config, self.sid, "telnum", tel_nums)
				return false
			end
		end)
	end
end

ModbusSerialClientAlarm.POST_before_commit_hook = ModbusSerialClientAlarm.before_commit_hook
ModbusSerialClientAlarm.PUT_before_commit_hook = ModbusSerialClientAlarm.before_commit_hook

return ModbusSerialClientAlarm
