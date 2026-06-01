local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local board = require("vuci.board")
local util = require("vuci.util")
local Modem = ConfigService:new({ increment_name = true })
local support_csd = false
if not board:has_serial_without_mbus() or not board:has_mobile() then
	return nil
end

local s = Modem:section("rs_modem", "modem")

function Modem:is_csd_supported()
	local md = require("vuci.modem")
	local m_id = self:get_abs_value(self.config, self.sid, "modem")
	for info in md:info_iterator() do
		if not m_id or info.usb_id == m_id then
			return md:csd_supported(info.usb_id)
		end
	end
	return false
end

if Modem:is_csd_supported() then
	support_csd = true
end
-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "baudrate", "databits", "stopbits", "parity", "flowcontrol", "device", "ctl_mode" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 200

	local baudrate = s:option("baudrate")
		function baudrate:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_baudrates(serial_device))
		end

	local databits = s:option("databits")
		function databits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_databits(serial_device))
		end

	local stopbits = s:option("stopbits")
		function stopbits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_stopbits(serial_device))
		end

	local parity = s:option("parity")
		function parity:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_parity(serial_device))
		end

	local flow_control = s:option("flowcontrol")
		function flow_control:validate(value)
			local validated_opts = serial:validate_flowcontrol(self)
			return self.dt:check_array(value, validated_opts)
		end

	local modem = s:option("modem")
		function modem:validate(value)
			return self.dt:check_modem(value)
		end

	local mode = s:option("ctl_mode")
		function mode:validate(value)
			local mode_options = { "partial", "full" }
			return self.dt:check_array(value, mode_options)
		end

	serial.append_duplex_option(s)

	local canonical_mode = s:option("canonical_mode")
		function canonical_mode:validate(value)
			return self.dt:is_bool(value)
		end

	local start_up_msg = s:option("start_up_msg", { list = true })
	start_up_msg.maxlength = 500
	start_up_msg.list_length = 8

	local serial_device = s:option("device")
	serial_device.cfg_require = true
		function serial_device:validate(value)
			if type(value) == "string" and value:find("usb") then
				if self:table_get(self.config, self.sid, "device") == value then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end
	local data_mode = s:option("data_mode")
		function data_mode:validate(value)
			if not board:has_urc_control() then return false, "Device doesn't support data mode" end
			return self.dt:is_bool(value)
		end
	local csd_enabled = s:option("csd_enabled")
		function csd_enabled:validate(value)
			if not support_csd then return false, "Device doesn't support CSD" end
			return self.dt:is_bool(value)
		end
		
	local csd_scan_mode = s:option("csd_scan_mode")
		function csd_scan_mode:validate(value)
			if not support_csd then return false, "Device doesn't support CSD" end
			local options = { "0", "1" }
			return self.dt:check_array(value, options)
		end

	local csd_role = s:option("csd_role")
		function csd_role:validate(value)
			if not support_csd then return false, "Device doesn't support CSD" end
			local options = { "0", "1" }
			return self.dt:check_array(value, options)
		end

	local csd_allowed_number = s:option("csd_allowed_number", { list = true })
	csd_allowed_number.list_length = 16
		function csd_allowed_number:validate(value)
			if not support_csd then return false, "Device doesn't support CSD" end
			return self.dt:phonedigit(value)
		end

	local csd_allow_all_numers = s:option("csd_allow_all_numbers")
		function csd_allow_all_numers:validate(value)
			if not support_csd then return false, "Device doesn't support CSD" end
			return self.dt:is_bool(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function Modem:GET_TYPE_status()
	local res = {}
	self:table_foreach(self.main_config, "modem", function(_s)
		if _s.enabled == "1" then
			local dev = _s.device:match(".*/dev/(.*)")
			local overip_status = util.ubus("modem_control." .. dev, "status")
			if overip_status then
				overip_status.section = _s[".name"]
				table.insert(res, overip_status)
			end
		end
	end)
	return self:ResponseOK(res)
end

-- End of status

function Modem:check_device()
	local canonical_mode = self:get_abs_value(self.main_config, self.sid, "canonical_mode")
	local data_mode = self:get_abs_value(self.main_config, self.sid, "data_mode")
	if canonical_mode == "1" and data_mode == "1" then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Canonical and data mode cannot be enabled together", "Validation")
	end
	-- The "get_abs_value(...) or self.current_data_block..." pattern is required, because during a POST request get_abs_value
	-- doesn't work and then current_data_block needs to be used.
	local device = self:get_abs_value(self.main_config, self.sid, "device") or self.current_data_block["device"]
	serial:handle_duplex(self)
	serial:assert_device_is_available(self, device)
	if self.request_method == "PUT" and device and type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end

	local modem_used, modem_used_by = false, ""
	local enabled_other = false
	local in_request = {}
	local data = self.arguments.data

	-- when PUT is performed check the body too find clashing configuration
	if self.request_method == "PUT" and self._single == false then
		for _, v in pairs(data) do
			in_request[v.id] = {ctl_mode = v.ctl_mode, enabled = v.enabled}
		end
	end

	self:table_foreach(self.main_config, "modem", function(c)
		local request = in_request[c[".name"]] or {}
		local ctl = request.ctl_mode or c.ctl_mode
		local enabled = request.enabled or c.enabled
		if c.enabled == "1" and c[".name"] ~= self.sid then
			enabled_other = true
		end
		if ctl == "full" and enabled == "1" and c[".name"] ~= self.sid then
			modem_used = true
			modem_used_by = c[".name"]
		end
	end)

	local is_enabled = self.current_data_block["enabled"] and self.current_data_block["enabled"] or "0"
	if is_enabled == "1" then
		if enabled_other and self.current_data_block["ctl_mode"] == "full" then
			self:add_critical_error(STD_CODES.INVALID_OPT, string.format("Can not change control mode to full when other configurations are enabled %s.", modem_used_by), "Validation")
		end
		if modem_used then
			self:add_critical_error(STD_CODES.INVALID_OPT, string.format("Can not enable configuration when modem is fully controlled by configuration %s.", modem_used_by), "Validation")
		end
	end
end

Modem.PUT_validate_section_hook = Modem.check_device
Modem.POST_validate_section_hook = Modem.check_device

return Modem
