local board = require("vuci.board")
if not board:has_ios() then return nil end

local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local io = require("vuci.io")
local all_modems = require("vuci.modem"):get_all_modems()
local pins = io:ioman_info()
local param = require("vuci.param")
local io_juggler_utils = require("api.services.io_juggler_utils")

local IoJugglerAction = ConfigService:new({ increment_name = true })

function IoJugglerAction:GET_TYPE_options()
	return self:ResponseOK({
		params = param:get_params_by_service("jg_action")
	})
end

local s = IoJugglerAction:section("event_juggler", "action")

local multi_options = {
    info_modem_id = { http = "http_info_modem_id", sms = "sms_info_modem_id", email = "smtp_info_modem_id", script = "exec_info_modem_id", mqtt = "mqtt_info_modem_id" },
	text = { sms = "sms_text", http = "http_text", mqtt = "mqtt_text", email = "smtp_text" }
}

function s:create_defaults(_)
	local default_section = {
		io_juggler 	= "1",
		enabled = "1",
		name = require("vuci.util_tlt").get_next_name(self, self.config, self.section_type, "name", "action"),
	}
	local _type = self.current_data_block["type"]
	if _type == "sim_switch" then
		default_section.write_to_config = "0"
	elseif _type == "sms" then
		local phone = self.current_data_block["phone"] or ""
		local phone_group = self.current_data_block["phone_group"] or ""
		if #phone_group > 0 then
			default_section.ui_recipient_format = "group"
		end
		if #phone > 0 then
			default_section.ui_recipient_format = "single"
		end
	end

	return default_section
end

function s:filter(options)
    return options.io_juggler == "1"
end

function IoJugglerAction:section_init_hook()
	self:set_multi_option("info_modem_id", self:getter_wrapped_abs_value(self.config, self.sid, "info_modem_id"))
	self:set_multi_option("text", self:getter_wrapped_abs_value(self.config, self.sid, "text"))
end

IoJugglerAction.PUT_section_init_hook = IoJugglerAction.section_init_hook
IoJugglerAction.POST_section_init_hook = IoJugglerAction.section_init_hook

function IoJugglerAction:get_action_option(option_name)
	return self:table_get(self.config, self.sid, option_name)
end

function IoJugglerAction:set_action_option(option_name, value)
	if not value or (type(value) == "table" and #value == 0) or value == "" then
		return self:table_delete(self.config, self.sid, option_name)
	end
	self:table_set(self.config, self.sid, option_name, value)
end

function IoJugglerAction:delete_action_option(option_name)
	self:table_delete(self.config, self.sid, option_name)
end

function IoJugglerAction:set_multi_option(api_key, value)
	local default_option = true
	local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
	if multi_options[api_key][opt_type] then
		self:set_action_option(multi_options[api_key][opt_type], value)
		default_option = false
	end
	if default_option then
		self:set_action_option(api_key, value)
	else
		self:delete_action_option(api_key)
	end
end

function IoJugglerAction:get_multi_option(api_key)
	local opt_type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
	if opt_type and multi_options[api_key][opt_type] then
		return self:get_action_option(multi_options[api_key][opt_type])
	end
	for _, opt_name in pairs(multi_options[api_key] or {}) do
		local opt_value = self:get_action_option(opt_name)
		if opt_value then
			return opt_value
		end
	end
	return self:get_action_option(api_key)
end

function IoJugglerAction:delete_script_file()
	-- delete script option and file when changing action type because it breaks the service
	-- using uci:get to get old value in cfg
	local exec_file_type = self.uci:get(self.config, self.sid, "exec_file_type")
	if exec_file_type == "upload" then
		table.insert(self._removed_files, { file = self.uci:get(self.config, self.sid, "exec_path"), type = "default" })
	end
end

local opt_type

function IoJugglerAction:validate_section_hook()
	local _type = self:getter_wrapped_abs_value(self.config, self.sid, "type")
	local required_options = {
		email =			{"subject", "text", "recipients", "email_group"},
		dout =			{"dest"},
		http =			{"post", "url"},
		script =		{"ui_file_path"},
		profile =		{"profile"},
		sms =			{"text", "ui_recipient_format"},
		mqtt =			{"text", "remote_addr", "remote_port", "keepalive", "qos", "topic"}
	}

	-- HTTP
	if _type == "http" and self:getter_wrapped_abs_value(self.config, self.sid, "ui_params") == "1" then
		table.insert(required_options[_type], "text")
	end

	-- I/O
	if _type == "dout" then
		local invert = self:getter_wrapped_abs_value(self.config, self.sid, "invert") == "1"
		local ui_mirroring = self:getter_wrapped_abs_value(self.config, self.sid, "ui_mirroring") == "1"

		if invert and ui_mirroring then
			return self:add_critical_error(STD_CODES.INVALID_OPT, "Can be turn on only one option 'invert' or 'ui_mirroring'.", "Validation")
		end

		if not (invert or ui_mirroring) then
			table.insert(required_options[_type], "state")
		end

		if ui_mirroring then
			table.insert(required_options[_type], "copy")
		end
	end

	-- Custom Scirpt
	if _type == "script" then
		local ui_file_path = self:getter_wrapped_abs_value(self.config, self.sid, "ui_file_path")
		if ui_file_path == "upload" or ui_file_path == "path" then
			table.insert(required_options[_type], ui_file_path)
		end
	end

	-- SMS
	if _type == "sms" then
		local ui_recipient_format = self:getter_wrapped_abs_value(self.config, self.sid, "ui_recipient_format")
		if ui_recipient_format and ui_recipient_format == "single" then
			table.insert(required_options[_type], "phone")
		end
		if ui_recipient_format and ui_recipient_format == "group" then
			table.insert(required_options[_type], "phone_group")
		end
	end

	-- MQTT
	if _type == "mqtt" then
		local tls = self:getter_wrapped_abs_value(self.config, self.sid, "tls") == "1"
		if tls then
			table.insert(required_options[_type], "tls_type")
			local tls_type = self:getter_wrapped_abs_value(self.config, self.sid, "tls_type")
			if tls_type == "cert" then
				table.insert(required_options[_type], "cafile")
			elseif tls_type == "psk" then
				table.insert(required_options[_type], "psk")
				table.insert(required_options[_type], "identity")
			end
		end
	end

	-- SIM Switch
	if _type == "sim_switch" then
		local flip = self:getter_wrapped_abs_value(self.config, self.sid, "flip")
		local target = self:getter_wrapped_abs_value(self.config, self.sid, "target")
		if not flip and not target then
			return self:add_critical_error(STD_CODES.INVALID_OPT, "Required option missing: 'flip' or 'target'.", "Validation")
		end
	end
	if required_options[_type] then
		opt_type.require = required_options
	end
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local name = s:option("ui_name")
	name.maxlength = 16
	name.cfg_require = true
		function name:validate(value)
			local exists = false
			self:table_foreach(self.config, "action", function(c)
				if c.name == value and c[".name"] ~= self.sid and c.io_juggler == "1" then
					exists = true
					return false
				end
			end)
			if exists then return false, "Name is already used in another configuration." end
			return self.dt:uciname(value)
		end
		function name:set(value)
			self:set_action_option("name", value)
		end
		function name:get()
			return self:get_action_option("name")
		end

IoJugglerAction.type_options = nil
function IoJugglerAction:fetch_type_options()
	if self.type_options then return self.type_options end
	self.type_options = { "email", "dout", "http", "script", "reboot", "profile", "rms", "mqtt" }
	if #all_modems > 0 then
		table.insert(self.type_options, "sms")
		for _, modem in ipairs(all_modems) do
			if modem.sim_count > 1 and not util.contains(self.type_options, "sim_switch") then
				table.insert(self.type_options, "sim_switch")
			end
		end
	end
	if board:has_wifi() then
		table.insert(self.type_options, "wifi")
	end
	return self.type_options
end

local type_map = {
	email = "smtp",
	dout = "out",
	http = "http",
	script = "exec",
	reboot = "reboot",
	profile = "profile",
	rms = "rms",
	mqtt = "mqtt",
	sms = "sms",
	sim_switch = "sim_switch",
	wifi = "wifi"
}

	opt_type = s:option("type")
		function opt_type:validate(value)
			return self.dt:check_array(value, self:fetch_type_options())
		end
		function opt_type:set(value)
			if value ~= "script" then
				self:delete_script_file()
				self:delete_action_option("exec_upload")
				self:delete_action_option("exec_path")
			end
			value = type_map[value] or value
			self:set_action_option("plugin", value)
		end
		function opt_type:get(value)
			value = self:get_action_option("plugin")
			for k, v in pairs(type_map) do
				if v == value then
					return k
				end
			end
			return nil
		end

	local host = s:option("remote_addr")
		function host:validate(value)
			return self.dt:host(value)
		end
		function host:set(value)
			self:set_action_option("mqtt_remote_addr", value)
		end
		function host:get()
			return self:get_action_option("mqtt_remote_addr")
		end

	local port = s:option("remote_port")
		function port:validate(value)
			return self.dt:port(value)
		end
		function port:set(value)
			self:set_action_option("mqtt_port", value)
		end
		function port:get()
			return self:get_action_option("mqtt_port")
		end

	local keep_alive = s:option("keepalive")
		function keep_alive:validate(value)
			return self.dt:irange(value, 0, 2147483647)
		end
		function keep_alive:set(value)
			self:set_action_option("mqtt_keepalive", value)
		end
		function keep_alive:get()
			return self:get_action_option("mqtt_keepalive")
		end

	local qos = s:option("qos")
		function qos:validate(value)
			return self.dt:check_array(value, { "0", "1", "2" })
		end
		function qos:set(value)
			self:set_action_option("mqtt_qos", value)
		end
		function qos:get()
			return self:get_action_option("mqtt_qos")
		end

	local username = s:option("username")
		username.maxlength = 512
		function username:validate(value)
			return self.dt:credentials_validate(value, true)
		end
		function username:set(value)
			self:set_action_option("mqtt_username", value)
		end
		function username:get()
			return self:get_action_option("mqtt_username")
		end

	local password = s:option("password")
		password.maxlength = 512
		function password:validate(value)
			return self.dt:credentials_validate(value, true)
		end
		function password:set(value)
			self:set_action_option("mqtt_password", value)
		end
		function password:get()
			return self:get_action_option("mqtt_password")
		end

	local topic = s:option("topic")
		function topic:validate(_)
			return self.dt:string()
		end
		function topic:set(value)
			self:set_action_option("mqtt_topic", value)
		end
		function topic:get()
			return self:get_action_option("mqtt_topic")
		end

	local client_id = s:option("client_id")
	client_id.maxlength = 64
		function client_id:validate(value)
			return self.dt:mqtt_client_id(value)
		end
		function client_id:set(value)
			self:set_action_option("mqtt_client_id", value)
		end
		function client_id:get()
			return self:get_action_option("mqtt_client_id")
		end

	local tls = s:option("tls")
		function tls:validate(value)
			return self.dt:is_bool(value)
		end
		function tls:set(value)
			self:set_action_option("mqtt_tls", value)
		end
		function tls:get()
			return self:get_action_option("mqtt_tls")
		end

	local tls_type = s:option("tls_type")
		function tls_type:validate(value)
			local tls_type_options = { "cert", "psk" }
			return self.dt:check_array(value, tls_type_options)
		end
		function tls_type:set(value)
			self:set_action_option("mqtt_tls_type", value)
		end
		function tls_type:get()
			return self:get_action_option("mqtt_tls_type")
		end

	local tls_insecure = s:option("tls_insecure")
		function tls_insecure:validate(value)
			return self.dt:is_bool(value)
		end
		function tls_insecure:set(value)
			self:set_action_option("mqtt_tls_insecure", value)
		end
		function tls_insecure:get()
			return self:get_action_option("mqtt_tls_insecure")
		end

	local device_files = s:option("device_files")
		function device_files:validate(value)
			return self.dt:is_bool(value)
		end
		function device_files:set(value)
			self:table_set(self.config, self.sid, "_device_files", value)
		end
		function device_files:get()
			return self:table_get(self.config, self.sid, "_device_files")
		end

	local ca_file_upload = s:option("cafile", {
		certificate = {
			service = "io_juggler",
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			failsafe = true
		}
	})
	ca_file_upload._get_file_size_default = ca_file_upload._get_file_size
	function ca_file_upload:get()
		return self:get_action_option("mqtt_cafile")
	end
	function ca_file_upload:set(value)
		self:set_action_option("mqtt_cafile", value)
	end
	function ca_file_upload:_get_file_size()
		return self:_get_file_size_default(self:get_action_option("mqtt_cafile"))
	end

	local cert_file_upload = s:option("certfile", {
		certificate = {
			service = "io_juggler",
			cert_types = { "certificates" },
			failsafe = true
		}
	})
	cert_file_upload._get_file_size_default = cert_file_upload._get_file_size
	function cert_file_upload:get()
		return self:get_action_option("mqtt_certfile")
	end
	function cert_file_upload:set(value)
		self:set_action_option("mqtt_certfile", value)
	end
	function cert_file_upload:_get_file_size()
		return self:_get_file_size_default(self:get_action_option("mqtt_certfile"))
	end

	local key_file_upload = s:option("keyfile", {
		certificate = {
			service = "io_juggler",
			cert_types = { "keys" },
			failsafe = true
		}
	})
	key_file_upload._get_file_size_default = key_file_upload._get_file_size
	function key_file_upload:get()
		return self:get_action_option("mqtt_keyfile")
	end
	function key_file_upload:set(value)
		self:set_action_option("mqtt_keyfile", value)
	end
	function key_file_upload:_get_file_size()
		return self:_get_file_size_default(self:get_action_option("mqtt_keyfile"))
	end

	local psk = s:option("psk")
		psk.maxlength = 128
		function psk:validate(value)
			return self.dt:hexstring(value)
		end
		function psk:set(value)
			self:set_action_option("mqtt_psk", value)
		end
		function psk:get()
			return self:get_action_option("mqtt_psk")
		end

	local identity = s:option("identity")
		identity.maxlength = 128
		function identity:validate(value)
			return self.dt:uciname(value)
		end
		function identity:set(value)
			self:set_action_option("mqtt_identity", value)
		end
		function identity:get()
			return self:get_action_option("mqtt_identity")
		end

	local subject = s:option("subject")
	subject.maxlength = 256
		function subject:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9!@#$%%&*+-/=?^_`{|}~. ]+$", 0)
		end
		function subject:set(value)
			self:set_action_option("smtp_subject", value)
		end
		function subject:get()
			return self:get_action_option("smtp_subject")
		end

	local write_to_config = s:option("write_to_config")
		function write_to_config:validate(value)
			return self.dt:is_bool(value)
		end
		function write_to_config:set(value)
			self:set_action_option("sim_write", value)
		end
		function write_to_config:get()
			return self:get_action_option("sim_write")
		end

	local post = s:option("post")
		function post:validate(value)
			return self.dt:is_bool(value)
		end
		function post:set(value)
			self:set_action_option("http_post", value)
		end
		function post:get()
			return self:get_action_option("http_post")
		end

	local url = s:option("url")
		function url:validate(value)
			return self.dt:url(value)
		end
		function url:set(value)
			self:set_action_option("http_url", value)
		end
		function url:get()
			return self:get_action_option("http_url")
		end

	local verify = s:option("verify")
		function verify:validate(value)
			return self.dt:is_bool(value)
		end
		function verify:set(value)
			self:set_action_option("http_verify", value)
		end
		function verify:get()
			return self:get_action_option("http_verify")
		end

	local ui_params = s:option("ui_params")
		function ui_params:validate(value)
			return self.dt:is_bool(value)
		end
		function ui_params:set(value)
			self:set_action_option("http_ui_params", value)
		end
		function ui_params:get()
			return self:get_action_option("http_ui_params")
		end

	local text = s:option("text")
		function text:validate(_)
			return self.dt:string()
		end
		function text:set()
		end
		function text:get()
			return self:get_multi_option(self.api_key)
		end

	local params = s:option("params", { list = true })
	params.list_length = 100
	params.allow_duplicates = true
		function params:validate(value)
			local split_value = util.split(value, "=")
			if #split_value <= 1 or #split_value > 2 then return false, "Incorrect format. Accepted format: [parameter=type]" end
			local res, msg = self.dt:fieldvalidation(split_value[1], "^[^=]*$", 0)
			if not res then return false, msg end
			local all_params = {}
			for _, value in pairs(param:get_params_by_service("jg_action")) do
				if value.id then
					table.insert(all_params, value.id)
				end
			end
			return self.dt:check_array(split_value[2], all_params)
		end
		function params:set(value)
			self:set_action_option("http_params", value)
		end
		function params:get()
			return self:get_action_option("http_params")
		end

	local headers = s:option("headers", { list = true })
	headers.list_length = 100
		function headers:validate(_)
			return self.dt:string()
		end
		function headers:set(value)
			self:set_action_option("http_header", value)
		end
		function headers:get()
			return self:get_action_option("http_header")
		end

	local delay = s:option("delay")
	delay.maxlength = 8
		function delay:validate(value)
			return self.dt:irange(value, 0, 4294967295) -- 2^32 - 1 (max uint32)
		end

IoJugglerAction.modem_options = nil

	local info_modem_id = s:option("info_modem_id")
		function info_modem_id:validate(value)
			return self.dt:check_modem(value)
		end
		function info_modem_id:set(value)
		end
		function info_modem_id:get()
			return self:get_multi_option(self.api_key)
		end

	local send_modem_id = s:option("send_modem_id")
		function send_modem_id:validate(value)
			return self.dt:check_modem(value)
		end
		function send_modem_id:set(value)
			self:set_action_option("sms_modem_id", value)
		end
		function send_modem_id:get()
			return self:get_action_option("sms_modem_id")
		end

	local ui_recipient_format = s:option("ui_recipient_format")
		function ui_recipient_format:validate(value)
			local format_options = { "single", "group" }
			return self.dt:check_array(value, format_options)
		end
		function ui_recipient_format:set(value)
			self:set_action_option("sms_recipient_format", value)
		end
		function ui_recipient_format:get()
			return self:get_action_option("sms_recipient_format")
		end

	local phone = s:option("phone")
		function phone:validate(value)
			return self.dt:phonedigit(value)
		end
		function phone:set(value)
			self:set_action_option("sms_phone", value)
		end
		function phone:get()
			return self:get_action_option("sms_phone")
		end

	local phone_group = s:option("phone_group")
		function phone_group:validate(value)
			return self.dt:check_array(value, self:get_phone_groups())
		end
		function phone_group:set(value)
			self:set_action_option("sms_group", value)
		end
		function phone_group:get()
			return self:get_action_option("sms_group")
		end


	local rms = s:option("rms_on")
		function rms:validate(value)
			return self.dt:is_bool(value)
		end

	local wifi_on = s:option("wifi_on")
		function wifi_on:validate(value)
			return self.dt:is_bool(value)
		end

IoJugglerAction.destination_options = nil
function IoJugglerAction:fetch_destination_options()
	if self.destination_options then return self.destination_options end
	self.destination_options = {}
	for _, pin_value in ipairs(pins) do
		if (pin_value.type == "gpio" and (pin_value.direction == "out" or pin_value.bi_dir == true)) or
				pin_value.type == "relay" then
			table.insert(self.destination_options, pin_value.name)
		end
	end
	return self.destination_options
end

	local destination = s:option("dest")
		function destination:validate(value)
			return self.dt:check_array(value, self:fetch_destination_options())
		end
		function destination:set(value)
			self:set_action_option("out_dest", value)
		end
		function destination:get()
			return self:get_action_option("out_dest")
		end

	local revert = s:option("revert")
		function revert:validate(value)
			return self.dt:irange(value, 0, 2147483647)
		end
		function revert:set(value)
			self:set_action_option("out_revert", value)
		end
		function revert:get()
			return self:get_action_option("out_revert")
		end

	local maintain = s:option("maintain")
		function maintain:validate(value)
			return self.dt:is_bool(value)
		end
		function maintain:set(value)
			self:set_action_option("out_maintain", value)
		end
		function maintain:get()
			return self:get_action_option("out_maintain")
		end

	local invert = s:option("invert")
		function invert:validate(value)
			if value == "1" and self:getter_wrapped_abs_value(self.config, self.sid, "ui_mirroring") == "1" then
				return false, "'invert' and 'ui_mirroring' can't be enabled at the same time."
			end
			return self.dt:is_bool(value)
		end
		function invert:set(value)
			if value == "1" then
				return self:set_action_option("out_mode", "invert")
			end
			if self:get_action_option("out_mode") == "invert" then
				return self:delete_action_option("out_mode")
			end
		end
		function invert:get()
			return self:get_action_option("out_mode") == "invert" and "1" or "0"
		end

	local mirror = s:option("ui_mirroring")
		function mirror:validate(value)
			if value == "1" and self:getter_wrapped_abs_value(self.config, self.sid, "invert") == "1" then
				return false, "'invert' and 'ui_mirroring' can't be enabled at the same time."
			end
			return self.dt:is_bool(value)
		end
		function mirror:set(value)
			if value == "1" then
				return self:set_action_option("out_mode", "copy")
			end
			if self:get_action_option("out_mode") == "copy" then
				return self:delete_action_option("out_mode")
			end
		end
		function mirror:get()
			return self:get_action_option("out_mode") == "copy" and "1" or "0"
		end

	local state = s:option("state")
		function state:validate(value)
			return self.dt:is_bool(value)
		end
		function state:set(value)
			self:set_action_option("out_state", value)
		end
		function state:get()
			return self:get_action_option("out_state")
		end

IoJugglerAction.copy_options = nil
function IoJugglerAction:fetch_copy_options()
	if self.copy_options then return self.copy_options end
	self.copy_options = {}
	for _, pin_value in ipairs(pins) do
		if (pin_value.type == "gpio" and (pin_value.direction ~= "out" or pin_value.bi_dir == true)) or
				pin_value.type == "relay" or
				pin_value.type == "dwi" then
			table.insert(self.copy_options, pin_value.name)
		end
	end
	return self.copy_options
end

	local copy = s:option("copy")
		function copy:validate(value)
			return self.dt:check_array(value, self:fetch_copy_options())
		end
		function copy:set(value)
			self:set_action_option("out_copy", value)
		end
		function copy:get()
			return self:get_action_option("out_copy")
		end

	local email_group = s:option("email_group")
		function email_group:validate(value)
			local email_options = {}
			self:table_foreach("user_groups", "email", function(s)
				table.insert(email_options, s.name)
			end)
			return self.dt:check_array(value, email_options)
		end
		function email_group:set(value)
			self:set_action_option("smtp_email_group", value)
		end
		function email_group:get()
			return self:get_action_option("smtp_email_group")
		end

	local recipients = s:option("recipients", { list = true })
		function recipients:validate(value)
			return self.dt:email(value)
		end
		function recipients:set(value)
			self:set_action_option("smtp_recipients", value)
		end
		function recipients:get()
			return self:get_action_option("smtp_recipients")
		end


	local file_or_path = s:option("ui_file_path")
		function file_or_path:validate(value)
			local file_path_options = { "upload", "path" }
			return self.dt:check_array(value, file_path_options)
		end
		function file_or_path:set(value)
			self:set_action_option("exec_file_type", value)
		end
		function file_or_path:get()
			return self:get_action_option("exec_file_type")
		end

		local file_upload = io_juggler_utils.userscripts_permission_option("upload", s, { file = true })
		function file_upload:getter() return self:table_get(self.config, self.sid, "exec_path") end
		file_upload.file_size = 102400
		file_upload._get_file_size_default = file_upload._get_file_size
		file_upload.orig_validate = file_upload.validate
		function file_upload:_get_file_size(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "ui_file_path") == "upload" then
				return self:_get_file_size_default(
					self:getter_wrapped_abs_value(self.config, self.sid, "upload") or self:getter_wrapped_abs_value(self.config, self.sid, "path")
				)
			end
		end
		function file_upload:validate(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "ui_file_path") ~= "upload" then
				return false, "This option is only available when 'ui_file_path' is 'upload'."
			end
			return self:orig_validate(value)
		end
		function file_upload:get()
			if self:getter_wrapped_abs_value(self.config, self.sid, "ui_file_path") == "upload" then
				return self:table_get(self.config, self.sid, "exec_path")
			end
		end
		function file_upload:set(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "ui_file_path") == "upload" then
				self:table_set(self.config, self.sid, "exec_path", value)
			end
		end

		local file_path = io_juggler_utils.userscripts_permission_option("path", s)
		function file_path:getter() return self:table_get(self.config, self.sid, "exec_path") end
		file_path.orig_validate = file_path.validate
		function file_path:validate(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "ui_file_path") ~= "path" then
				return false, "This option is only available when 'ui_file_path' is 'path'."
			end
			return self:orig_validate(value)
		end
		function file_path:get()
			if self:getter_wrapped_abs_value(self.config, self.sid, "ui_file_path") == "path" then
				return self:table_get(self.config, self.sid, "exec_path")
			end
		end
		function file_path:set(value)
			if self:getter_wrapped_abs_value(self.config, self.sid, "ui_file_path") == "path" then
				-- uci used here to check old value in config
				if self.uci:get(self.config, self.sid, "exec_file_type") == "upload" then
					-- remove previously uploaded file (need this because both options ("upload" and "path")
					-- share the same option name ("path") in cfg)
					table.insert(self._removed_files, { file = self:table_get(self.config, self.sid, "exec_path"), type = "default" })
				end
				self:table_set(self.config, self.sid, "exec_path", value)
			end
		end


	local arguments = s:option("arguments")
		function arguments:validate(_)
			return self.dt:string()
		end
		function arguments:set(value)
			if not value or value == "" then
				self:delete_action_option("exec_arg_type")
			else
				self:set_action_option("exec_arg_type", "text")
			end
			self:set_action_option("exec_arguments", value)
		end
		function arguments:get()
			return self:get_action_option("exec_arguments")
		end

	local profile = s:option("profile")
		function profile:validate(value)
			local profile_options = {}
			self:table_foreach("profiles", "profile", function(s)
				table.insert(profile_options, s[".name"])
			end)
			return self.dt:check_array(value, profile_options)
		end

	local flip = s:option("flip")
		function flip:validate(value)
			return self.dt:is_bool(value)
		end
		function flip:set(value)
			self:set_action_option("sim_flip", value)
		end
		function flip:get()
			return self:get_action_option("sim_flip")
		end

	local target = s:option("target")
		function target:validate(value)
			local target_options = {}
			self:table_foreach("simcard", "sim", function(s)
				table.insert(target_options, s.position)
			end)
			return self.dt:check_array(value, target_options)
		end
		function target:set(value)
			self:set_action_option("sim_number", value)
		end
		function target:get()
			return self:get_action_option("sim_number")
		end

	local conditions = s:option("conditions", { list = true })
		function conditions:validate(value)
			local all_conditions = {}
			local conditions_with_id = {}
			self:table_foreach(self.config, "condition", function(s)
				if s.io_juggler == "1" then
					table.insert(all_conditions, s.name)
					conditions_with_id[s[".name"]] = s.name
				end
			end)
			local ok, msg = self.dt:check_array(value, all_conditions)
			if not ok then
				return false, msg
			end
			if not self:check_condition_option(conditions_with_id, value) then
				return false, string.format(
					"Can't use these conditions because they are not fully configured: '%s'.",
					value
				)
			end
			return true
		end
		function conditions:set(value)
			local id = {}
			for _, single_value in ipairs(value) do
				self:table_foreach(self.config, "condition", function(s)
					if s.name == single_value then id[#id + 1] = s[".name"] end
				end)
			end
			self:table_set(self.config, self.sid, self.api_key, id)
		end
		function conditions:get(value)
			local names = {}
			if value ~= nil and value ~= "" then
				for _, single_value in ipairs(value) do
					self:table_foreach(self.config, "condition", function(s)
						if s[".name"] == single_value then names[#names + 1] = s.name end
					end)
				end
			end
			return #names > 0 and names or nil
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function IoJugglerAction:check_condition_option(all_conditions, condition_name)
	local sid
	for k, v in pairs(all_conditions) do
		if (v == condition_name) then
			sid = k
		end
	end
	return io_juggler_utils:validate_condition(self:table_get(self.config, sid))
end

function IoJugglerAction:get_phone_groups()
	local phone_groups = {}
	self:table_foreach("user_groups", "phone", function(s)
		table.insert(phone_groups, s.name)
	end)
	return phone_groups
end

function IoJugglerAction:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "juggler")
	return { path = path }
end

IoJugglerAction.PUT_validate_section_hook = IoJugglerAction.validate_section_hook
function IoJugglerAction:POST_validate_section_hook()
	local count = 0
	self:table_foreach("event_juggler", "action", function(s)
		if s.io_juggler == "1" then
			count = count + 1
		end
	end)
	if count >= 10 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Action limit reached, no more than 10 can be created", "Validation")
	end
	IoJugglerAction:validate_section_hook()
end

function IoJugglerAction:DELETE_before_section_delete_hook()
	self:table_foreach(self.config, "event", function(s)
		if s.io_juggler == "1" and s.actions then
			local action_list = s.actions
			local found = false
			for key = #action_list, 1, -1 do
				if action_list[key] == self.sid then
					table.remove(action_list, key)
					found = true
				end
			end
			if found then
				if #action_list == 0 then
					self:table_delete("event_juggler",s[".name"], "actions")
				else
					self:table_set("event_juggler", s[".name"], "actions", action_list)
				end
			end
		end
	end)
end


return IoJugglerAction
