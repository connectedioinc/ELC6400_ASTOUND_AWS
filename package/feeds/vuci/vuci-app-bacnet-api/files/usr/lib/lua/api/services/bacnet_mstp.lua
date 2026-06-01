local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local board = require("vuci.board")

if not board:has_usb() and not board:has_rs485() then
	return nil
end

local BACnet = ConfigService:new({
	increment_name = true
})

local s = BACnet:section("bacnet_router", "port")
function s:filter(options)
	return options.device_type == "mstp"
end
function s:create_defaults()
	return {
		device_type = "mstp"
	}
end
	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "mac", "max_client", "device", "baud", "databits", "stopbits", "parity" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
	local opt_device = s:option("device")
		function opt_device:validate(value)
			if value and value == self:table_get(self.config, self.sid, self.api_key) then
				return true -- If its the same one then its valid (This is mainly for disconnected device configs)
			end
			local devices = serial:get_devices(true)
			-- Filter out unwanted devices
			local filtered_devices = {}
			for _, device in ipairs(devices) do
				if device ~= "/dev/rs232" and device ~= "/dev/rsconsole" and device ~= "/dev/mbus" then
					table.insert(filtered_devices, device)
				end
			end
			return self.dt:check_array(value, filtered_devices)
		end

	local network = s:option("network")
		function network:validate(value)
			return self.dt:irange(value, 1, 65534)
		end

	local mac = s:option("mac")
		function mac:validate(value)
			return self.dt:irange(value, 0, 127)
		end

	local max_client = s:option("max_client")
		function max_client:validate(value)
			return self.dt:irange(value, 1, 127)
		end

	local baud = s:option("baud")
		function baud:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_baudrates(device))
		end

	local parity = s:option("parity")
		function parity:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_parity(device))
		end

	local databits = s:option("databits")
		function databits:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_databits(device))
		end

	local stopbits = s:option("stopbits")
		function stopbits:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_stopbits(device))
		end

function BACnet:DELETE_validate_section_hook()
	local section_enabled = self:get_abs_value("bacnet_router", self.sid, "enabled")
	local sections = self:table_count("bacnet_router", "port", { enabled = "1" })
	local bbmd_enabled = self:table_get("bacnet_router", "general", "bbmd_enabled") == "1" and 1 or 0
	local total_sections = sections + bbmd_enabled
	local bacnet_enabled = self:table_get("bacnet_router", "general", "enabled")
	if bacnet_enabled == "1" and total_sections < 3 and section_enabled == "1" then
		self:add_critical_error(
			STD_CODES.UCI_CREATE_ERROR,
			"Deletion is not allowed: At least two interfaces need to be configured for BACnet to work",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end
end

function BACnet:POST_validate_section_hook()
	local device = self.current_data_block["device"]
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
end

function BACnet:PUT_validate_section_hook()
	local device = self:get_abs_value(self.main_config, self.sid, "device")

	serial:assert_device_is_available(self, device)
	if type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end
end

return BACnet
