local ConfigService = require("api/ConfigService")
local ugw_utils = require("vuci.universal_gateway_utils")

local snmp_tag = ConfigService:new({ increment_name = true })

local s = snmp_tag:section("snmpd", "tag")

function s:create_defaults()
	local util_tlt = require("vuci.util_tlt")
	return {
		snmp_tag_oid = util_tlt.get_next_name(self, self.config, "tag", "snmp_tag_oid", "", nil, 0),
		tag_name = util_tlt.get_next_name(self, self.config, "tag", "tag_name", "obj", nil, 0),
	}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	ugw_utils.append_tag_options(s, {["1"] = {"snmp_tag_oid"}}, nil, nil, true)

	local opt_snmp_tag_oid = s:option("snmp_tag_oid")
		function opt_snmp_tag_oid:validate(value)
			local ok = true
			self:table_foreach(self.config, self.section_type, function(s)
				if self.sid ~= s[".name"] and value == s.snmp_tag_oid then
					ok = false
					return false -- break
				end
			end)
			if not ok then return false, "OID '" .. value .. "' already in use" end
			return self.dt:uinteger(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function snmp_tag:validate_section_hook()
	ugw_utils.setup_tags(snmp_tag, true)
end
snmp_tag.PUT_validate_section_hook = snmp_tag.validate_section_hook
snmp_tag.POST_validate_section_hook = snmp_tag.validate_section_hook

function snmp_tag:after_validate_section_hook()
	ugw_utils.validate_tag_existence(snmp_tag)
end
snmp_tag.PUT_after_validate_section_hook = snmp_tag.after_validate_section_hook
snmp_tag.POST_after_validate_section_hook = snmp_tag.after_validate_section_hook

return snmp_tag
