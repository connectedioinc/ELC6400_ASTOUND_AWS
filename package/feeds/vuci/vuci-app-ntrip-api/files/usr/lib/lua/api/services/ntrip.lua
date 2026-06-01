local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local util = require("vuci.util")

local Ntrip = ConfigService:new({ increment_name = true })

if not serial:check_device_serial() then
	return nil
end

local s = Ntrip:section("rs_ntrip", "ntrip")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = {
		["1"] = {
			"device", "baudrate", "databits", "stopbits", "parity", "flowcontrol", "ntrip_ip", "ntrip_port",
			"ntrip_mount_point", "ntrip_data_format", "nmea_source",
		}
	}
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 200
		function name:validate(value)
			return self.dt:default_validation(value)
		end

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

	local server_address = s:option("ntrip_ip")
		function server_address:validate(value)
			return self.dt:host(value, false)
		end

	local server_port = s:option("ntrip_port")
		function server_port:validate(value)
			return self.dt:port(value)
		end

	local mount_point = s:option("ntrip_mount_point")
	mount_point.maxlength = 128
		function mount_point:validate(_)
			return self.dt:string()
		end

	local data_format = s:option("ntrip_data_format")
		function data_format:validate(value)
			local data_format_options = { "n", "h", "u" }
			return self.dt:check_array(value, data_format_options)
		end

	local username = s:option("ntrip_user")
		username.maxlength = 512
		function username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local password = s:option("ntrip_password")
		password.maxlength = 512
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local nmea_source = s:option("nmea_source")
		function nmea_source:validate(value)
			return self.dt:range(value, 1, 4)
		end

	local user_nmea = s:option("user_nmea")
		function user_nmea:validate(value)
			if not value:match("^%$..GGA,") then return false, "$XXGGA, prefix is required. X represents a random symbol." end
			return true
		end

	local lattitude = s:option("lattitude")
		function lattitude:validate(value)
			return self.dt:precision_range(value, -90.000000, 90.000000)
		end

	local longitude = s:option("longitude")
		function longitude:validate(value)
			return self.dt:precision_range(value, -180.000000, 180.000000)
		end

	local report_interval = s:option("report_interval")
		function report_interval:validate(value)
			return self.dt:irange(value, 1, 86400)
		end

	local serial_device = s:option("device")
		serial_device.cfg_require = true
		function serial_device:validate(value)
			if type(value) == "string" and value:find("usb") then
				if self:table_find(self.config, "ntrip", { device = value }) then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	serial.append_duplex_option(s)

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function Ntrip:GET_TYPE_status()
	local res = {}

	self:table_foreach(self.main_config, "ntrip", function(_s)
		if _s.enabled == "1" then
			local ntrip_status = util.ubus("ntrip." .. _s[".name"], "status")
			if ntrip_status then
				ntrip_status.section = _s[".name"]
				table.insert(res, ntrip_status)
			end
		end
	end)

	return self:ResponseOK(res)
end

-- End of status

function Ntrip:POST_validate_hook()
	local interfaces = 0
	self:table_foreach("rs_ntrip", "ntrip", function (_)
		interfaces = interfaces + 1
	end)
	if interfaces >= 20 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 20 instances are allowed")
	end
end

function Ntrip:check_device()
	-- The "get_abs_value(...) or self.current_data_block..." pattern is required, because during a POST request get_abs_value
	-- doesn't work and then current_data_block needs to be used.
	local function delete_opt(opt)
		return self:table_delete(self.main_config, self.sid, opt)
	end
	local cfg = self.current_data_block
	local device = self:get_abs_value(self.main_config, self.sid, "device") or cfg["device"]
	serial:handle_duplex(self)
	serial:assert_device_is_available(self, device)
	if self.request_method == "PUT" then
		local nmea = self:get_abs_value(self.config, self.sid, "nmea_source")
		if nmea ~= "1" then
			delete_opt("user_nmea")
		end
		if nmea ~= "2" then
			delete_opt("lattitude")
			delete_opt("longitude")
		end
		if type(device) == "string" and device:find("usb") then
			serial:assert_device_is_connected(self, device)
		end
	end

	local is_enabled = cfg["enabled"] and cfg["enabled"] or "0"
	if is_enabled == "1" then
		local nmea_source = cfg["nmea_source"] ~= "" and cfg["nmea_source"]
		local user_nmea   = cfg["user_nmea"]   ~= "" and cfg["user_nmea"]
		local longitude   = cfg["longitude"]   ~= "" and cfg["longitude"]
		local lattitude   = cfg["lattitude"]   ~= "" and cfg["lattitude"]
		if nmea_source == "1" and not user_nmea then
			self:add_critical_error( STD_CODES.INVALID_OPT, "Missing required option: [user_nmea]", "Validation")
		elseif nmea_source == "2" and not (longitude and lattitude) then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required options: [longitude, lattitude]", "Validation")
		end
	end
end
Ntrip.PUT_validate_section_hook = Ntrip.check_device
Ntrip.POST_validate_section_hook = Ntrip.check_device

return Ntrip
