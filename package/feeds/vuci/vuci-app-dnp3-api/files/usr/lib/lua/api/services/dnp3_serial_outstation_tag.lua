local ConfigService = require("api/ConfigService")
local universal_gateway_utils = require("vuci.universal_gateway_utils")
local dnp3_utils = require("api.services.dnp3_utils")
local serial_utils = require("vuci.serial")

if not serial_utils:check_device_serial() then
	return nil
end

local function has_serial_outstation(_s)
	return not dnp3_utils.has_ethernet_outstation(_s)
end

local serial_outstation_tag = ConfigService:new({ increment_name = true })

local s = serial_outstation_tag:section("dnp3_outstation", "tag")

function s:filter(_s) -- filters serial sections
	return has_serial_outstation(_s)
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	universal_gateway_utils.append_tag_options(s, {["1"] = {"dnp3_index", "dnp3_variation"}}, has_serial_outstation, nil, true)

	local outstation_dev_id = s:option("outstation_dev_id")
	outstation_dev_id.cfg_require = true
	function outstation_dev_id:validate(value)
		local outstations = {}
		self:table_foreach(self.config, "dnp3_serial_outstation", function(_s)
			table.insert(outstations, _s[".name"])
		end)
		if #outstations == 0 then
			return false, "No dnp3 serial outstation instances found"
		end
		return self.dt:check_array(value, outstations)
	end

	local dnp3_index = s:option("dnp3_index")

	local dnp3_group = s:option("dnp3_group")

	local dnp3_variation = s:option("dnp3_variation")
	dnp3_variation.require = { "dnp3_group" }
		function dnp3_variation:validate(value)
			local opt_dnp3_group = self:get_abs_value(self.config, self.sid, "dnp3_group")
			local variations = dnp3_utils.get_variations_by_group(opt_dnp3_group)
			if not variations then
				return false, "Unknown dnp3_group"
			end
			return self.dt:check_array(value, variations)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function serial_outstation_tag:validate_section_hook()
	universal_gateway_utils.setup_tags(self, true)
end
serial_outstation_tag.PUT_validate_section_hook = serial_outstation_tag.validate_section_hook
serial_outstation_tag.POST_validate_section_hook = serial_outstation_tag.validate_section_hook

function serial_outstation_tag:after_validate_section_hook()
	dnp3_utils.validate_dnp3_group(self)
	dnp3_utils.validate_dnp3_index(self)
	-- dnp3_utils.validate_tag_size(self)
	self:return_if_error()
	universal_gateway_utils.validate_tag_existence(self)
	dnp3_utils.validate_register_overlap(self, "dnp3_serial_outstation")
end
serial_outstation_tag.PUT_after_validate_section_hook = serial_outstation_tag.after_validate_section_hook
serial_outstation_tag.POST_after_validate_section_hook = serial_outstation_tag.after_validate_section_hook

return serial_outstation_tag
