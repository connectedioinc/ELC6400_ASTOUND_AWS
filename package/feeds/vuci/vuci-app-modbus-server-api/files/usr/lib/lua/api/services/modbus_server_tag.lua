local ConfigService = require("api/ConfigService")
local modbus_utils = require("vuci.modbus_utils")
local universal_gateway_utils = require("vuci.universal_gateway_utils")

local modbus_server_tag = ConfigService:new({ increment_name = true })

local s = modbus_server_tag:section("modbus_server", "tag")

function s:filter(_s) -- filters non-serial sections
	return modbus_utils.has_ethernet_server(_s)
end

function s:create_defaults()
	return {
		modbus_dev_config = "modbus"
	}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	universal_gateway_utils.append_tag_options(s, {["1"] = {"modbus_type", "modbus_reg_num"}}, modbus_utils.has_ethernet_server)

	local modbus_type = s:option("modbus_type")
		function modbus_type:validate(value)
			return self.dt:check_array(value, modbus_utils.read_functions)
		end

	local modbus_reg_num = s:option("modbus_reg_num")

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function modbus_server_tag:validate_section_hook()
	universal_gateway_utils.setup_tags(self)
end
modbus_server_tag.PUT_validate_section_hook = modbus_server_tag.validate_section_hook
modbus_server_tag.POST_validate_section_hook = modbus_server_tag.validate_section_hook

function modbus_server_tag:after_validate_section_hook()
	modbus_utils.validate_tag_size(self)
	modbus_utils.validate_modbus_reg_num(self)
	self:return_if_error()
	universal_gateway_utils.validate_tag_existence(self)
	modbus_utils.validate_register_overlap(self, "modbus")
end
modbus_server_tag.PUT_after_validate_section_hook = modbus_server_tag.after_validate_section_hook
modbus_server_tag.POST_after_validate_section_hook = modbus_server_tag.after_validate_section_hook

return modbus_server_tag
