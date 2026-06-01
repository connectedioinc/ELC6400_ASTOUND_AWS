local ConfigService = require("api/ConfigService")

local flags = {
	increment_name = true
}

local snmp_communities = ConfigService:new(flags)

local community, ipaddr, netmask, secname

function snmp_communities:PUT_validate_section_hook()
	local required_options = {"community", "ipaddr", "netmask", "secname"}
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

	local com2sec = snmp_communities:section("snmpd", "com2sec")

		community = com2sec:option("community", { sensitive = true })
		community.maxlength = 31
		function community:validate(value)
			local ok = true
			self:table_foreach("snmpd", "com2sec", function (instance)
				if instance.community == value and instance[".name"] ~= self.sid then
					ok = false
				end
			end)
			if not ok then
				return false, "Community name is already in use."
			end
			return self.dt:default_validation(value)
		end

		ipaddr = com2sec:option("ipaddr")
			function ipaddr:validate(value)
				return self.dt:ip4addr(value)
			end

		netmask = com2sec:option("netmask")
			function netmask:validate(value)
				return self.dt:irange(value, 0, 32)
			end

		secname = com2sec:option("secname")
			function secname:validate(value)
				return self.dt:check_array(value, { "ro", "rw" })
			end

	function snmp_communities:DELETE_before_section_delete_hook()
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

return snmp_communities
