local ConfigService = require("api/ConfigService")

local flags = {
	increment_name = true
}

local snmp_communities_v6 = ConfigService:new(flags)

local community, secname, source

function snmp_communities_v6:PUT_validate_section_hook()
	local required_options = {"community", "secname", "source"}
	for _, value in ipairs(required_options) do
		local opt_value = self:get_abs_value(self.config, self.sid, value)
		if not opt_value or opt_value == "" then
			self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", value)
		end
	end
end

local CODES = {
	CANT_DELETE_ALL = 1
}

	local com2sec6 = snmp_communities_v6:section("snmpd", "com2sec6")

		community = com2sec6:option("community", { sensitive = true })
		community.maxlength = 31
		function community:validate(value)
			local ok = true
			self:table_foreach("snmpd", "com2sec6", function (instance)
				if instance.community == value and instance[".name"] ~= self.sid then
					ok = false
				end
			end)
			if not ok then
				return false, "Community name is already in use."
			end
			return self.dt:default_validation(value)
		end

		secname = com2sec6:option("secname")
			function secname:validate(value)
				return self.dt:check_array(value, { "ro", "rw" })
			end

		source = com2sec6:option("source")
			function source:validate(value)
				return self.dt:ipmask6host(value)
			end

	function snmp_communities_v6:DELETE_before_section_delete_hook()
		local settings_enabled = self:get_abs_value("snmpd", "general", "enabled")
		if not settings_enabled or settings_enabled == "0" then
			return
		end
		local count = 0
		self:table_foreach("snmpd", "com2sec", function(_)
			count = count + 1
		end)
		self:table_foreach("snmpd", "com2sec6", function(_)
			count = count + 1
		end)

		local delete_count = 1
		if self.arguments and type(self.arguments.data) == "table" then
			delete_count = #self.arguments.data
		end

		if count <= delete_count then
			self:add_critical_error(CODES.CANT_DELETE_ALL, "SNMP service requires at least one community instance when it is enabled.", "Validation")
		end
	end

return snmp_communities_v6
