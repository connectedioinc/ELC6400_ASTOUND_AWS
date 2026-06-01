local ConfigService = require("api/ConfigService")
local fs = require ("nixio.fs")
local util = require "vuci.util"
local board = require("vuci.board")
local util_tlt = require("vuci.util_tlt")

local events_juggler_actions = ConfigService:new({ increment_name = true })

local s = events_juggler_actions:section("event_juggler", "action")

local jg_utils = require ("api.services.event_juggler_utils")(s, {})

function events_juggler_actions:get_is_phone_settings_enabled() -- call actions should be disabled if phone settings is enabled
	return self:get_abs_value(self.config, self.sid, "plugin") == "call" and events_juggler_actions:table_get("callman", "callman", "enabled") == "1"
end
function events_juggler_actions:parent_exists()
	jg_utils:parent_exists("event")
end

function s:create_defaults(_)
	local available_conditions = self:table_get(self.config, self.binding, "available_conditions")
	local enabled_value = (self.current_data_block["plugin"] or "") ~= "" and not self:get_is_phone_settings_enabled() and "1" or "0"
	return jg_utils:create_defaults("actions", { name = jg_utils:get_new_action_name(), enabled = enabled_value, conditions = available_conditions })
end

function s:filter(options)
	if jg_utils:check_if_from_events_reporting_or_io_juggler(options) then return false end
	if not self.binding then return true end
	return util.contains(self:get_abs_value(self.config, self.binding, "actions") or {}, options[".name"])
end

function events_juggler_actions:GET_TYPE_options()
	return self:ResponseOK({
		plugins = jg_utils:get_plugin_info("action") or {}
	})
end

function events_juggler_actions:POST_init_hook()
	jg_utils:do_not_allow_create_without_binding(self)
	jg_utils:validate_limit_count("action")
end

function events_juggler_actions:validate_section_hook()
	pcall(self.validate_section_sim_flip, self)
	pcall(self.set_exec_path, self)
	pcall(self.validate_copy_pin_values, self)
	pcall(self.validate_relay_invert, self)
end

events_juggler_actions.POST_validate_section_hook = events_juggler_actions.validate_section_hook
events_juggler_actions.PUT_validate_section_hook = events_juggler_actions.validate_section_hook

function events_juggler_actions:PUT_after_validate_section_hook()
	local enabled_value = "0"
	if not self:get_is_phone_settings_enabled() then
		enabled_value = self:get_abs_value(self.config, self.sid, "plugin") and "1" or "0"
	end
	self:table_set(self.config, self.sid, "enabled", enabled_value)
end

function events_juggler_actions:DELETE_before_section_delete_hook()
	local parrent_sec = self:table_find(self.config, "event", { actions = { self.sid }})
	if not parrent_sec then return end
	local parent_id, action_list = parrent_sec[".name"], parrent_sec["actions"]
	if not action_list or #action_list <= 1 then
		self:add_critical_error(
			STD_CODES.NO_DELETE,
			string.format("Can't delete all actions which appended to event juggler event (id = %s).", parent_id),
			"Validation"
		)
	end
	jg_utils:remove_from_table(action_list, self.sid)
	self:table_set(self.config, parent_id, "actions", action_list)
end

events_juggler_actions.UPLOAD_after_upload_hook = jg_utils.UPLOAD_after_upload_hook

function events_juggler_actions:get_jg_action_params()
	if not self.jg_action_params then
		self.jg_action_params = require("vuci.param"):get_params_id_by_service("jg_action")
	end
	return self.jg_action_params
end

	local name = s:option("name")
		name.cfg_require = true
		function name:validate(value)
			return jg_utils:validate_name(value, "action")
		end

	local action_plugin_list = jg_utils:get_plugin_names("action")

	local action_plugin = s:option("plugin")
		action_plugin.require = {}
		function action_plugin:validate(value)
			return self.dt:check_array(value, action_plugin_list)
		end

	s:option("delay").validate = function(self, value)
		return self.dt:irange(value, 0, 4294967295) -- 2^32 - 1 (max uint32)
	end

	s:option("operator").validate = function (self, value)
		return self.dt:check_array(value, {"and", "or", "nor", "nand"})
	end

	 s:option("conditions", { list = true} ).validate = function(self, value)
		local parrent_sec = self:table_find(self.config, "event", { actions = { self.sid }})
		return self.dt:check_array(value, parrent_sec.available_conditions or {})
	end

	if util.contains(action_plugin_list, "smtp") or util.contains(action_plugin_list, "http") or util.contains(action_plugin_list, "sms") or util.contains(action_plugin_list, "call") then
		s:option("retry_count").validate = function(self, value)
			return self.dt:irange(value, 0, 16)
		end

		s:option("retry_timeout").validate = function(self, value)
			return self.dt:irange(value, 0, 60)
		end
	end

	function events_juggler_actions:validate_params(value)
		local MAX_PARAM_LENGTH = 128
		local split_value = util.split(value, "=")

		if #split_value ~= 2 or split_value[1] == "" then
			return false, "Incorrect format. Accepted format: [parameter=type]"
		end

		if #split_value[1] > MAX_PARAM_LENGTH then
			return false, string.format("Provided parameter is too long. Is %s characters, but can be up to %s characters", #split_value[1], MAX_PARAM_LENGTH)
		end

		return self.dt:check_array(split_value[2], events_juggler_actions:get_jg_action_params())
	end

	-- --------------------------------- CONNECTION ---------------------------------

	if util.contains(action_plugin_list, "connection") then
		action_plugin.require["connection"] = {"conn_type", "conn_state"}

		local _network_map = nil
		local function get_network_map()
			_network_map = _network_map or util.get_network_map(events_juggler_actions.uci, true, true)
			return _network_map
		end

		function events_juggler_actions:get_interface_options()
			local interfaces = {}
			local exclude_protos = {
				relay = true, sstp = true, pptp = true, gre = true, l2tp = true, l2tpv3 = true,
				wireguard = true, mirror = true, vrf = true, openconnect = true, xfrm = true
			}
			self:table_foreach("network", "interface", function(s)
				local name, type = s[".name"], s[".type"]
				if type ~= "interface" or name == "loopback" or name:match("_static$") then
					return true
				end
				if exclude_protos[s.proto] then
					return true
				end
				if s.invisible ~= "1" then
					table.insert(interfaces, get_network_map()[name] or name)
				end
			end)
			return interfaces
		end

		local conn_type = s:option("conn_type")
			conn_type.require = {
				interface	= {"conn_interface"},
			}
			if board:has_mobile() and board:has_dual_sim() then
				conn_type.require["modem"] = { "conn_sim" }
			end
			function conn_type:validate(value)
				local types = {"interface"}
				if board:has_mobile() then
					table.insert(types, "modem")
				end
				return self.dt:check_array(value, types)
			end

		s:option("conn_state").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		s:option("conn_persist").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		local conn_interface = s:option("conn_interface")
			function conn_interface:validate(value)
				return self.dt:check_array(value, events_juggler_actions:get_interface_options())
			end
			function conn_interface:set(value)
				self:table_foreach("network", "interface", function(s)
					if s[".name"] == value or get_network_map()[s[".name"]] == value then
						self:table_set(self.config, self.sid, self.api_key, s[".name"])
						return false -- break
					end
				end)
			end
			function conn_interface:get(value)
				self:table_foreach("network", "interface", function(s)
					if get_network_map()[s[".name"]] == value or s[".name"] == value then
						value = get_network_map()[s[".name"]] or s[".name"]
						return false -- break
					end
				end)
				return value
			end

		if board:has_mobile() then

			s:option("conn_modem_id").validate = function(self, value)
				return self.dt:check_modem(value)
			end

			s:option("conn_sim").validate = function(self, value)
				local modem_id = self:get_abs_value(self.config, self.sid, "conn_modem_id")
				return jg_utils:sim_number_validation(modem_id, value)
			end
		end
	end

	-- --------------------------------- EXEC ---------------------------------

	if util.contains(action_plugin_list, "exec") then
		action_plugin.require["exec"] = {"exec_arg_type", "exec_file_type"}

		s:option("exec_arg_type").validate = function(self, value)
			return self.dt:check_array(value, {"text", "list"})
		end

		s:option("exec_arguments").validate = function(self, value)
			return self.dt:string(value)
		end
		
		local exec_arg = s:option("exec_arg", { list = true })
			exec_arg.list_length = 32
			exec_arg.allow_duplicates = true
			exec_arg.validate = events_juggler_actions.validate_params

		local exec_file_type = s:option("exec_file_type")
			exec_file_type.require = {
				["path"] 	= {"exec_file_path"},
				["upload"] 	= {"exec_file_upload"}
			}
			function exec_file_type:validate(value)
				return self.dt:check_array(value, {"upload", "path"})
			end

		jg_utils.userscripts_permission_option("exec_file_upload", s, { file = true })

		jg_utils.userscripts_permission_option("exec_file_path", s)

		if board:has_mobile() then
			s:option("exec_info_modem_id").validate = function(self, value)
				return self.dt:check_modem(value)
			end
		end

		function events_juggler_actions:set_exec_path()
			local exec_path = self:table_get(self.config, self.sid, "exec_path")
			local exec_file_type = self:get_abs_value(self.config, self.sid, "exec_file_type")
			local exec_file_path = self:get_abs_value(self.config, self.sid, "exec_file_path")
			local exec_file_upload = self:get_abs_value(self.config, self.sid, "exec_file_upload")

			local path_val = exec_file_type == "path" and exec_file_path or exec_file_upload

			if path_val ~= exec_path then
				self:table_set(self.config, self.sid, "exec_path", path_val)
			end
		end
	end

	-- --------------------------------- HTTP ---------------------------------

	if util.contains(action_plugin_list, "http") then
		action_plugin.require["http"] = {"http_url", "http_ui_params"}

		s:option("http_url").validate = function(self, value)
			return self.dt:url(value)
		end

		s:option("http_post").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		local http_header = s:option("http_header", { list = true })
			http_header.maxlength = 128
			http_header.list_length = 10
			function http_header:validate(value)
				return self.dt:string(value)
			end

		s:option("http_timeout").validate = function(self, value)
			return self.dt:irange(value, 0, 4294967295)
		end

		local http_tls = s:option("http_tls")
		http_tls.require = { ["1"] = { "http_cafile" } }
			function http_tls:validate(value)
				return self.dt:is_bool(value)
			end

		s:option("http_device_files").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		s:option("http_cafile", {certificate = {
			type = "certificates",
			cert_types = { "ca", "import", "root_ca" },
			failsafe = true
		}})

		s:option("http_certfile",{certificate = {
			type = "certificates",
			cert_types = { "client","server", "root_ca" },
			failsafe = true
		}})

		s:option("http_keyfile", { certificate = {
			cert_types = { "keys" },
			failsafe = true
		}})

		s:option("http_verify").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		local http_ui_params = s:option("http_ui_params")
		http_ui_params.require = {
			["0"] = { "http_text" },
			["1"] = { "http_params" }
				}
			function http_ui_params:validate(value)
				return self.dt:is_bool(value)
			end

		s:option("http_text").validate = function(self, value)
				return self.dt:string(value)
			end

		local http_params = s:option("http_params", { list = true })
			http_params.list_length = 32
			http_params.allow_duplicates = true
			http_params.validate = events_juggler_actions.validate_params
			
		if board:has_mobile() then
			s:option("http_info_modem_id").validate = function(self, value)
				return self.dt:check_modem(value)
			end
		end
	end

	-- --------------------------------- LUA ---------------------------------

	if util.contains(action_plugin_list, "lua") then
		action_plugin.require["lua"] = {"lua_action_path"}
		jg_utils.userscripts_permission_option("lua_action_path", s, { file = true })

		events_juggler_actions:action("download_example_operation_lua", function (self)
			local file_path = "/etc/event_juggler/action.lua"
			if not fs.access(file_path) then
				return self:ResponseNotFound("Failed to download operation example lua file.")
			end
			return self:File(file_path, "example_action_lua.lua")
		end)
	end

	-- --------------------------------- MODEM ---------------------------------

	if util.contains(action_plugin_list, "modem") then
		action_plugin.require["modem"] = {"modem_action"}
	
		s:option("modem_action").validate = function(self, value)
			return self.dt:check_array(value, {"reload", "restart", "hard_restart"})
		end
	
		s:option("modem_id").validate = function(self, value)
			return self.dt:check_modem(value)
		end
	end

	-- --------------------------------- MQTT ---------------------------------

	if util.contains(action_plugin_list, "mqtt") then
		action_plugin.require["mqtt"] = {"mqtt_remote_addr", "mqtt_port", "mqtt_topic", "mqtt_text", "mqtt_qos", "mqtt_keepalive"}

		s:option("mqtt_remote_addr").validate = function(self, value)
			return self.dt:host(value)
		end

		s:option("mqtt_port").validate = function(self, value)
			return self.dt:port(value)
		end

		local mqtt_topic = s:option("mqtt_topic")
			mqtt_topic.maxlength = 65535
			function mqtt_topic:validate(value)
				return self.dt:mqtt_client_id(value)
			end

		s:option("mqtt_text").validate = function(self, value)
			return self.dt:string(value)
		end

		if board:has_mobile() then
			s:option("mqtt_info_modem_id").validate = function(self, value)
				return self.dt:check_modem(value)
			end
		end

		s:option("mqtt_qos").validate = function(self, value)
			return self.dt:check_array(value, { "0", "1", "2" })
		end

		s:option("mqtt_keepalive").validate = function(self, value)
			return self.dt:irange(value, 0, 2147483647)
		end

		local mqtt_client_id = s:option("mqtt_client_id")
			mqtt_client_id.maxlength = 64
			function mqtt_client_id:validate(value)
				return self.dt:mqtt_client_id(value)
			end

		local mqtt_tls = s:option("mqtt_tls")
			mqtt_tls.require = { 
				["1"] = {"mqtt_tls_type"}
			}
			function mqtt_tls:validate(value)
				return self.dt:is_bool(value)
			end

		s:option("mqtt_tls_insecure").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		local mqtt_tls_type = s:option("mqtt_tls_type")
			mqtt_tls_type.require = {
				cert 	= { "mqtt_cafile" },
				psk 	= { "mqtt_psk", "mqtt_identity" }
			}
			function mqtt_tls_type:validate(value)
				return self.dt:check_array(value, {"cert", "psk"})
			end

		s:option("mqtt_device_files").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		s:option("mqtt_cafile", {
			certificate = {
				type = "certificates",
				cert_types = { "ca", "import", "root_ca" },
				failsafe = true
			}
		})

		s:option("mqtt_certfile", {
			certificate = {
				type = "certificates",
				cert_types = { "client", "server", "root_ca" },
				failsafe = true
			}
		})

		s:option("mqtt_keyfile", {
			certificate = {
				cert_types = { "keys" },
				failsafe = true
			}
		})

		local mqtt_psk = s:option("mqtt_psk", { sensitive = true })
			mqtt_psk.maxlength = 128
			function mqtt_psk:validate(value)
				return self.dt:hexstring(value)
			end

		local mqtt_identity = s:option("mqtt_identity")
			mqtt_identity.maxlength = 128
			function mqtt_identity:validate(value)
				return self.dt:uciname(value)
			end

		local mqtt_use_credentials = s:option("mqtt_use_credentials")
			mqtt_use_credentials.require = {
				["1"] = {"mqtt_username", "mqtt_password"}
			}
			function mqtt_use_credentials:validate(value)
				return self.dt:is_bool(value)
			end

		local mqtt_username = s:option("mqtt_username")
		mqtt_username.maxlength = 512
		function mqtt_username:validate(value)
			return self.dt:credentials_validate(value)
		end

		local mqtt_password = s:option("mqtt_password", { sensitive = true })
		mqtt_password.maxlength = 512
		function mqtt_password:validate(value)
			return self.dt:credentials_validate(value)
		end
	end

	-- --------------------------------- OUT ---------------------------------

	if util.contains(action_plugin_list, "out") then
		function events_juggler_actions:validate_copy_pin_values()
			if self:get_abs_value(self.config, self.sid, "out_dest") ~= nil and 
				self:get_abs_value(self.config, self.sid, "out_dest") == self:get_abs_value(self.config, self.sid, "out_copy") then
				self:add_error(STD_CODES.INVALID_OPT, "Values of out_dest and out_copy must differ.", "Validation")
			end
		end

		function events_juggler_actions:validate_relay_invert() -- handle event: relay, both => do not allow action: relay, invert options
			if not util_tlt.check_current_data_block(self, {"out_dest", "out_mode", "plugin"}) then return end

			local out_dest = self:get_abs_value(self.config, self.sid, "out_dest")
			local out_mode = self:get_abs_value(self.config, self.sid, "out_mode")
			if self:get_abs_value(self.config, self.sid, "plugin") == "out" and out_dest and out_dest:find("relay") and out_mode == "invert" then
				local parrent_sec = self:table_find(self.config, "event", { actions = { self.sid } })
				if parrent_sec.plugin == "io" and parrent_sec.io_name and parrent_sec.io_name:find("relay") and parrent_sec.io_trigger == "both" then
					self:add_error(
						STD_CODES.INVALID_OPT,
						string.format("Option 'invert' is disabled due to existing event configured with io_name - %s and io_trigger - both.",
						parrent_sec.io_name),
						"out_mode",
						nil, out_mode)
				end
			end
		end

		action_plugin.require["out"] = {"out_mode"}

		local out_mode = s:option("out_mode")
			out_mode.require = {
				["invert"]  = {"out_dest"},
				["copy"]    = {"out_copy", "out_dest"},
				["set"]     = {"out_state", "out_dest"},
			}
			function out_mode:validate(value)
				return self.dt:check_array(value, { "invert", "copy", "set" })
			end

		s:option("out_state").validate = function(self, value)
			return self.dt:is_bool(value)
		end

		s:option("out_revert").validate = function(self, value)
			return self.dt:irange(value, 0, 2147483647)
		end

		s:option("out_dest").validate = function(self, value)
			return self.dt:check_array(value, jg_utils:get_dest_io_pins())
		end

		s:option("out_copy").validate = function(self, value)
			return self.dt:check_array(value, jg_utils:get_copy_io_pins())
		end

		 s:option("out_maintain").validate = function(self, value)
			return self.dt:is_bool(value)
		end
	end

	-- --------------------------------- PROFILE ---------------------------------

	if util.contains(action_plugin_list, "profile") then
		action_plugin.require["profile"] = {"profile"}

		s:option("profile").validate = function(self, value)
			local profile_options = {}
			self:table_foreach("profiles", "profile", function(s)
				table.insert(profile_options, s[".name"])
			end)
			return self.dt:check_array(value, profile_options)
		end
	end

	-- --------------------------------- RMS ---------------------------------

	if util.contains(action_plugin_list, "rms") then
		action_plugin.require["rms"] = {"rms_on"}

		s:option("rms_on").validate = function(self, value)
			return self.dt:is_bool(value)
		end
	end

	-- --------------------------------- SIM SWITCH ---------------------------------

	if util.contains(action_plugin_list, "sim_switch") then
		action_plugin.require["sim_switch"] = {}
	
		function events_juggler_actions:validate_section_sim_flip()
			local opt_plugin = self:get_abs_value(self.config, self.sid, "plugin")
			if opt_plugin ~= "sim_switch" then return end
	
			local opt_sim_flip = self:get_abs_value(self.config, self.sid, "sim_flip")
			if opt_sim_flip == "1" then return end
	
			local opt_sim_number = self:get_abs_value(self.config, self.sid, "sim_number")
			if not opt_sim_number then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: sim_number", "sim_number")
			end
		end
	
		s:option("sim_modem_id").validate = function(self, value)
			return self.dt:check_modem(value)
		end
	
		s:option("sim_number").validate = function(self, value)
			local modem_id = self:get_abs_value(self.config, self.sid, "sim_modem_id")	
			return jg_utils:sim_number_validation(modem_id, value)
		end
	
		s:option("sim_flip").validate = function(self, value)
			return self.dt:is_bool(value)
		end
	
		s:option("sim_write").validate = function(self, value)
			return self.dt:is_bool(value)
		end
	end

	-- --------------------------------- SMS ---------------------------------

	if util.contains(action_plugin_list, "sms") then
		action_plugin.require["sms"] = {"sms_recipient_format", "sms_text"}

		local sms_recipient_format = s:option("sms_recipient_format")
			sms_recipient_format.require = {
				single	= {"sms_phone"},
				group	= {"sms_group"}
			}
			function sms_recipient_format:validate(value)
				return self.dt:check_array(value, {"single", "group"})
			end

		s:option("sms_phone").validate = function(self, value)
				return self.dt:phonedigit(value)
		end

		s:option("sms_group").validate = function(self, value)
			local groups = {}
			self:table_foreach("user_groups", "phone", function (s)
				if s.name then
					table.insert(groups, s.name)
				end
			end)
			return self.dt:check_array(value, groups)
		end

		s:option("sms_text").validate = function(self, value)
			local modem_id = self:get_abs_value(self.config, self.sid, "sms_modem_id")
			return util_tlt.validate_sms_message(value, modem_id)
		end

		s:option("sms_modem_id").validate = function(self, value)
			return self.dt:check_modem(value)
		end

		s:option("sms_info_modem_id").validate = function(self, value)
			return self.dt:check_modem(value)
		end
	end

	-- --------------------------------- CALL ---------------------------------

	if util.contains(action_plugin_list, "call") then
		action_plugin.require["call"] = {"call_phone"}

		s:option("call_phone").validate = function(self, value)
			return self.dt:phonedigit(value)
		end

		s:option("call_timeout").validate = function(self, value)
			return self.dt:irange(value, 5, 180)
		end

		s:option("call_modem_id").validate = function(self, value)
			local mdm = require("vuci.modem")
			local all_modems = mdm:get_all_modems()
			for _, v in pairs(all_modems) do
				if v.id == value and not mdm:call_functionality_supported(v.id) then
					return false, "Provided modem does not support call functionality"
				end
				if v.id == value then return true end
			end
			return false, "Provided modem does not exist"
		end
	end

	-- --------------------------------- SMTP ---------------------------------

	if util.contains(action_plugin_list, "smtp") then
		action_plugin.require["smtp"] = {"smtp_subject", "smtp_email_group", "smtp_text", "smtp_recipients"}

		s:option("smtp_subject").validate = function(self, value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9!@#$%%&*+-/=?^_`{|}~. ]+$", 0)
		end

		s:option("smtp_text").validate = function(self, value)
			return self.dt:string(value)
		end

		s:option("smtp_email_group").validate = function(self, value)
			local smtp_users = {}
			self:table_foreach("user_groups", "email", function (s)
				if s.name then
					table.insert(smtp_users, s.name)
				end
			end)
			return self.dt:check_array(value, smtp_users)
		end

		s:option("smtp_recipients", { list = true }).validate = function(self, value)
			return self.dt:email(value)
		end

		if board:has_mobile() then
			s:option("smtp_info_modem_id").validate = function(self, value)
				return self.dt:check_modem(value)
			end
		end
	end

	-- --------------------------------- WiFi ---------------------------------

	if util.contains(action_plugin_list, "wifi") then
		action_plugin.require["wifi"] = {"wifi_on"}

		s:option("wifi_on").validate = function(self, value)
			return self.dt:is_bool(value)
		end
	end

	if util.contains(action_plugin_list, "led") then
		action_plugin.require["led"] = { "led_red", "led_green", "led_blue" }
		s:option("led_red").validate = function(self, value) return self.dt:is_bool(value) end
		s:option("led_green").validate = function(self, value) return self.dt:is_bool(value) end
		s:option("led_blue").validate = function(self, value) return self.dt:is_bool(value) end
		s:option("led_revert").validate = function(self, value) return self.dt:irange(value, 1, 3600) end
		local led_blink = s:option("led_blink")
		led_blink.validate = function(self, value) return self.dt:is_bool(value) end
		led_blink.require = { ["1"] = { "led_blink_off", "led_blink_on" } }
		s:option("led_blink_on").validate = function(self, value) return self.dt:irange(value, 1, 60000) end
		s:option("led_blink_off").validate = function(self, value) return self.dt:irange(value, 1, 60000) end
	end
return s