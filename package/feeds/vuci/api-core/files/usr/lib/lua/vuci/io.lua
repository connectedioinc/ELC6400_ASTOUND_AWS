local util = require("vuci.util")
local uci = require "vuci.uci".cursor()

local io = {}

local IGNORED_UBUS_PINS = {
	"ioman.gpio.bat_ign_mode"
}

-- Example:
--   ubus_name: ioman.gpio.din1
--   Result: gpio, din1
function io:split_ubus_name(ubus_name)
	return ubus_name:match("[^.]+.([^.]+).([^.]+)")
end

function io:ioman_list()
	if self.ioman_ubus_list then return self.ioman_ubus_list end
	self.ioman_ubus_list = {}

	local info = util.file_exec("/bin/ubus", { "list", "ioman.*" }).stdout
	if not info then
		return nil
	end


	for ubus_name in info:gmatch("[^\r\n]+") do
		local io_type, _ = io:split_ubus_name(ubus_name)
		if io_type ~= "therm" and not util.contains(IGNORED_UBUS_PINS, ubus_name) then
			table.insert(self.ioman_ubus_list, ubus_name)
		end
	end
	return self.ioman_ubus_list
end

function io:ioman_info(run_location, run_status)
	local io_ubus_names = io:ioman_list()
	if not io_ubus_names then
		return false
	end

	-- Default to true if parameters are not provided
	run_location = run_location == nil and true or run_location
	run_status = run_status == nil and true or run_status

	local result = {}
	for _, ubus_name in ipairs(io_ubus_names) do
		local io_type, io_name = io:split_ubus_name(ubus_name)
		local io_info          = {}
		if run_location then
			for k, location in pairs(util.ubus(ubus_name, "location") or {}) do
				io_info[k] = location
			end
		end
		if run_status then
			for k, status in pairs(util.ubus(ubus_name, "status") or {}) do
				io_info[k] = status
			end
		end
		io_info.name = io_name
		io_info.type = io_type
		table.insert(result, io_info)
	end
	return result
end

function io:has_io(name_io, type_io, direction)
	local ios = self:ioman_info()
	if not ios then return false end

	for _, v in ipairs(ios) do
		if v.name == name_io then
			if type_io and type_io ~= v.type then
				return false
			end
			if direction and direction ~= v.direction then
				return false
			end
			return true
		end
	end
	return false
end

function io:is_scheduler_enabled(pin)
	if pin then
		local enabled = false
		uci:foreach("io_scheduler", "scheduler", function (s)
			if s.pin == pin and s.enabled == "1" then
				enabled = true
			end
		end)
		return enabled
	end
	return false
end

function io:get_pin_obj(pin_name, options, convert_bools)
	if convert_bools == nil then convert_bools = true end
	local pin_ubus_obj = self:find_pin_ubus_obj(pin_name) or ""
	local tmp = util.split(pin_ubus_obj, ".")
	local pin_type = tmp[#tmp-1]
	local pin_obj = { id = pin_name, type = pin_type }
	local default_options = {"bi_dir", "io_name", "io_param", "type", "block_type", "block_pins",
		"block_index", "value", "invert_input", "state", "direction", "id", "hr_state", "custom_value",
		"custom_name", "custom_unit", "custom_mul", "custom_off", "custom_add", "custom_div",
		"current", "percent", "hr_state_low", "hr_state_high", "hr_state_open", "hr_state_closed", "hr_state_shorted",
		"is_counter", "count", "counter_support"
	}

	options = options and options or default_options

	local status_data = util.ubus(pin_ubus_obj, "status")
	if (pin_name:match("adc") or pin_name:match("pwr")) and not status_data then
		-- adc status doesn't work if modem is blocked, return "-" values instead
		status_data = {
			value = "-",
			custom_value = "-",
			custom_name = "-",
			custom_unit = "-",
			custom_mul = "-",
			custom_off = "-",
			custom_add = "-",
			custom_div = "-"
		}
	end

	local location_data = util.ubus(pin_ubus_obj, "location")
	for _, data in ipairs({status_data, location_data}) do
		for k, v in pairs(data) do
			if util.contains(options, k) then
				if convert_bools then
					if v == true then v = "1" end
					if v == false then v = "0" end
				end
				pin_obj[k] = v
			end
		end
	end

	pin_obj.type = pin_type

	self:inf_check(pin_obj)
	return pin_obj
end

function io:find_pin_ubus_obj(pin_id)
	local ioman_ubus = self:ioman_list() or {}
	for _, ubus_obj in ipairs(ioman_ubus) do
		if ubus_obj:match("^.*%.(.*)$") == pin_id then
			return ubus_obj
		end
	end
end

function io:not_adc_validation(pin_id)
	local pin = self:find_pin_ubus_obj(pin_id)
	if pin and pin:find("adc") then
		return false, "This option is not available for 'adc' type pins."
	else
		return true
	end
end

function io:acl_adc_validation(pin_id)
	local pin_type = self:pin_type(pin_id)
	return pin_type == "acl" or pin_type == "adc", "This option is supported only on 'adc' or 'acl' type pins."
end

function io:hr_state_low_high_validation(pin_id, data)
	local pin_type, ubus_pin = self:pin_type(pin_id)
	local pin_status = data.state and data or util.ubus(ubus_pin, "status")
	return pin_type == "gpio" or (pin_type == "dwi" and pin_status.state == "wet"), "This option is supported only on 'gpio' or wet 'dwi' type pins."
end

function io:hr_state_closed_validation(pin_id)
	local pin_type = self:pin_type(pin_id)
	return pin_type == "relay", "This option is supported only on 'relay' type pins."
end

function io:hr_state_open_validation(pin_id, data)
	local pin_type, ubus_pin = self:pin_type(pin_id)
	local pin_status = data.state and data or util.ubus(ubus_pin, "status")
	return pin_type == "relay" or (pin_type == "dwi" and pin_status.state == "dry"), "This option is supported only on 'relay' or dry 'dwi' type pins."
end

function io:hr_state_shorted_validation(pin_id, data)
	local pin_type, ubus_pin = self:pin_type(pin_id)
	local pin_status = data.state and data or util.ubus(ubus_pin, "status")
	return pin_type == "dwi" and pin_status.state == "dry", "This option is supported only on dry 'dwi' type pins."
end

function io:pin_type(pin_id)
	local ubus_pin_name = self:find_pin_ubus_obj(pin_id)
	local pin_type = ubus_pin_name and ubus_pin_name:match("^[^.]+%.([^.]+)") or nil
	return pin_type, ubus_pin_name
end

function io:inf_check(pin_obj)
	for key, value in pairs(pin_obj) do
		if value == math.huge then
			pin_obj[key] = "inf"
		elseif value == -math.huge then
			pin_obj[key] = "-inf"
		end
	end
end

return io
