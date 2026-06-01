local ConfigService = require("api/ConfigService")

local flags = {
	delete = false,
	create = false
}

local snmp_settings = ConfigService:new(flags)

	local system = snmp_settings:section("snmpd", "system")

		local sysLocation = system:option("sysLocation")
		sysLocation.maxlength = 255
			function sysLocation:validate(value)
				return self.dt:string(value)
			end

		local sysContact = system:option("sysContact")
		sysContact.maxlength = 255
			function sysContact:validate(value)
				return self.dt:string(value)
			end

		local sysName = system:option("sysName")
			function sysName:validate(value)
				return self.dt:system_host(value)
			end
		function sysName:set(value)
			self:table_foreach("snmpd", "system", function(c)
				self:table_set("snmpd", c[".name"], "sysName", value)
			end)
			self:table_set("system", "system", "hostname", value)
		end

		local oid = system:option("oid")
		oid.readonly = true
			function oid:get(_)
				return "1.3.6.1.4.1.48690"
			end

snmp_settings:action("download_mib", function (self)
	local fs = require "nixio.fs"
	local file_path = self.uci:get("snmpd", "general", "mibfile")
	if not fs.access(file_path) then
		os.execute("/etc/snmp/launch_generate_MIBs.sh > /dev/null")
		os.remove("/etc/snmp/launch_generate_MIBs.sh")
	end

	-- script can change the file path in uci config, so we need to reload uci config and get it again
	local uci = require "vuci.uci".cursor()
	uci._cursor = require("uci").cursor()
	file_path = uci:get("snmpd", "general", "mibfile")
	if not fs.access(file_path) then
		return self:ResponseNotFound("Failed to download MIB file.")
	end
	local mib_file_name = string.match(file_path, "([^/]+)$")
	return self:File(file_path, mib_file_name)
end)

function snmp_settings:PUT_validate_section_hook()
	local sys_name_value = self:get_abs_value(self.config, self.sid, "sysName")
	if not sys_name_value or sys_name_value == "" then
		return self:add_error(STD_CODES.INVALID_OPT, "'sysName' option is required", "sysName")
	end
end

return snmp_settings