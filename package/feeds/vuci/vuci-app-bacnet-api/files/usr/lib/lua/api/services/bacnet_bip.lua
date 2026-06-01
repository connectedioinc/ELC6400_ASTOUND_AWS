local ConfigService = require("api/ConfigService")

local BACnet = ConfigService:new({
	increment_name = true,
	first_general = true,
	general_section = '1'
})

local s = BACnet:section("bacnet_router", "port")
function s:filter(options)
	return options.device_type == "bip"
end
function s:create_defaults()
	return {
		device_type = "bip",
		enabled = "1"
	}
end

function BACnet:DELETE_validate_section_hook()
	local section_enabled = self:get_abs_value("bacnet_router", self.sid, "enabled")
	local sections = self:table_count("bacnet_router", "port", { enabled = "1" })
	local bbmd_enabled = self:get_abs_value(self.config, "general", "bbmd_enabled") == "1" and 1 or 0
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
	if self.sid == "1" or self.sid == "general" then
		self:add_critical_error(
			STD_CODES.NO_DELETE,
			"Deletion of initial BIP configuration is not allowed",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end
end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local port = s:option("port")
		function port:validate(value)
			return self.dt:port(value)
		end
	local network = s:option("network")
		function network:validate(value)
			return self.dt:irange(value, 1, 65534)
		end
	
	local device = s:option("device")
		function device:validate(value)
			local devices_status = require("vuci.devices_status_lib"):new(self.uci)
			local devices = devices_status:get_device_status()
			local devnames = {}
			for _, dev in ipairs(devices) do
				local name = dev.name
				if name and name ~= "lo" and not name:find("sit") and not name:match("^wwan") and not name:match("^rmnet") and dev.type ~= "vrf" then
					devnames[#devnames + 1] = name
				end
			end
			return self.dt:check_array(value, devnames)
		end

return BACnet
