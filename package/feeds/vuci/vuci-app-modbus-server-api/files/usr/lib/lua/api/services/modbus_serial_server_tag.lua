local ConfigService = require("api/ConfigService")
local modbus_utils = require("vuci.modbus_utils")
local universal_gateway_utils = require("vuci.universal_gateway_utils")
local serial = require("vuci.serial")

if not serial:check_device_serial() then
	return nil
end

local function has_serial_server(_s)
	return not modbus_utils.has_ethernet_server(_s)
end

local modbus_serial_server_tag = ConfigService:new({ increment_name = true })

local s = modbus_serial_server_tag:section("modbus_server", "tag")

function s:filter(_s) -- filters serial sections
	return has_serial_server(_s)
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	universal_gateway_utils.append_tag_options(s, { ["1"] = { "modbus_type", "modbus_reg_num" } }, has_serial_server)

	local modbus_type = s:option("modbus_type")
	function modbus_type:validate(value)
		return self.dt:check_array(value, modbus_utils.read_functions)
	end

	local modbus_reg_num = s:option("modbus_reg_num")

	local modbus_dev_config = s:option("modbus_dev_config")
	modbus_dev_config.cfg_require = true
	function modbus_dev_config:validate(value)
		local devices = {}
		self:table_foreach(self.config, "rtu_device", function(_s)
			table.insert(devices, _s[".name"])
		end)
		if #devices == 0 then
			return false, "No modbus serial server instances found"
		end
		return self.dt:check_array(value, devices)
	end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function modbus_serial_server_tag:validate_section_hook()
	universal_gateway_utils.setup_tags(self)
end
modbus_serial_server_tag.PUT_validate_section_hook = modbus_serial_server_tag.validate_section_hook
modbus_serial_server_tag.POST_validate_section_hook = modbus_serial_server_tag.validate_section_hook

function modbus_serial_server_tag:after_validate_section_hook()
	modbus_utils.validate_tag_size(self)
	modbus_utils.validate_modbus_reg_num(self)
	self:return_if_error()
	universal_gateway_utils.validate_tag_existence(self)
	modbus_utils.validate_register_overlap(self, "rtu_device")
end
modbus_serial_server_tag.PUT_after_validate_section_hook = modbus_serial_server_tag.after_validate_section_hook
modbus_serial_server_tag.POST_after_validate_section_hook = modbus_serial_server_tag.after_validate_section_hook

return modbus_serial_server_tag
