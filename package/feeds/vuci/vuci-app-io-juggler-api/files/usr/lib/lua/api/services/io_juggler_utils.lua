local io_juggler_utils = {}

local function check_required_options(sec, options)
	for _, option in ipairs(options) do
		if not sec[option] then
			return false
		end
	end
	return true
end

function io_juggler_utils:validate_condition(sec)
	local plugin = sec["plugin"]
	if not plugin then
		return false
	end
	if plugin == "time" then
		if not sec["time_old_type"] then
			return false
		end
		if (sec["time_old_type"] == "hour" or sec["time_old_type"] == "minute") and not check_required_options(sec, {"time_cond_start_time", "time_cond_end_time"}) then
			return false
		end
		if sec["time_old_type"] == "weekday" and not sec["time_cond_wday"] then
			return false
		end
		if sec["time_old_type"] == "monthday" and not sec["time_cond_day"] then
			return false
		end
		if sec["time_old_type"] == "yearday" and not check_required_options(sec, {"time_cond_start_yday", "time_cond_end_yday"}) then
			return false
		end
		return true
	end
	if plugin == "bool" then
		if not sec["bool_operation"] or not (sec["bool_conditions"] and #sec["bool_conditions"] > 1)  then
			return false
		end
	end
	if plugin == "io" then
		if not sec["io_cond_name"] then
			return false
		end
		if sec["io_cond_name"] == "acl0" then
			if not sec["io_cond_acl"] then
				return false
			end
			if sec["io_cond_acl"] == "current" and (not sec["io_cond_min"] or not sec["io_cond_max"]) then
				return false
			end
			if sec["io_cond_acl"] == "percent" and (not sec["io_cond_min"] or not sec["io_cond_max"]) then
				return false
			end
		end
		if (sec["io_cond_name"] == "adc0" or sec["io_cond_name"] == "pwr0") and (not sec["io_cond_min"] or not sec["io_cond_max"]) then
			return false
		end
		if (sec["io_cond_name"] ~= "adc0" and sec["io_cond_name"] ~= "pwr0" and sec["io_cond_name"] ~= "acl0") and not sec["io_cond_state"] then
			return false
		end
	end
	return true
end

function io_juggler_utils:validate_action(sec)
	local plugin = sec["plugin"]
	if not plugin then
		return false
	end
	if plugin == "smtp" and not check_required_options(sec, {"smtp_email_group", "smtp_recipients", "smtp_subject", "smtp_text"}) then
		return false 
	end
	if plugin == "out" then
		if not sec["out_dest"] then
			return false
		end
		if sec["out_mode"] == "copy" and not sec["out_copy"] then
			return false
		end
		if sec["out_mode"] == "set" and not sec["out_state"] then
			return false
		end
	end
	if plugin == "http" then
		if not check_required_options(sec, {"http_url", "http_post"}) then
			return false
		end
		if sec["http_ui_params"] == "1" and not sec["http_text"] then
			return false
		end
	end
	if plugin == "exec" then
		if not sec["exec_file_type"] then
			return false
		end
		if (sec["exec_file_type"] == "path" or sec["exec_file_type"] == "upload") and not sec["exec_path"] then
			return false
		end
	end
	if plugin == "profile" and not sec["profile"] then
		return false
	end
	if plugin == "sim_switch" and (not sec["sim_flip"] or sec["sim_flip"] == "0") and not sec["sim_number"] then
		return false
	end
	if plugin == "sms" then
		if not sec["sms_text"] or not sec["sms_recipient_format"] then
			return false
		end
		if sec["sms_recipient_format"] == "single" and not sec["sms_phone"] then
			return false
		end
		if sec["sms_recipient_format"] == "group" and not sec["sms_group"] then
			return false
		end
	end
	if plugin == "mqtt" then
		if not check_required_options(sec, {"mqtt_text", "mqtt_remote_addr", "mqtt_port", "mqtt_keepalive", "mqtt_qos", "mqtt_topic"}) then
			return false
		end
		if sec["mqtt_tls"] == '1' then
			if not sec["mqtt_tls_type"] then
				return false
			end
			if sec["mqtt_tls_type"] == "cert" and not sec["mqtt_cafile"] then
				return false
			end
			if sec["mqtt_tls_type"] == "psk" and not(sec["mqtt_psk"] and sec["mqtt_identity"]) then
				return false
			end
		end
	end
	return true
end

function io_juggler_utils:validate_io_min_max_values(s, val, pair_option, name, is_max)
	local res, message = s.dt:number(val)
	if not res then return res, message end
	local pair_val = s:getter_wrapped_abs_value(s.config, s.sid, pair_option)
	local is_valid = tonumber(pair_val) == nil and true or tonumber(is_max and val or pair_val) > tonumber(is_max and pair_val or val)
	local direction = is_max and { "Maximum", "bigger", "minimum" } or { "Minimum", "smaller", "maximum" }

	return is_valid, string.format("%s %s must be %s than %s", direction[1], name, direction[2], direction[3])
end

io_juggler_utils.userscripts_permission_option = require("vuci.util_tlt").userscripts_permission_option
return io_juggler_utils