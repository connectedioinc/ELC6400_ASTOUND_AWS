local util = require ("vuci.util")
local mdm = require("vuci.modem")
local modems = mdm:get_all_modems()

local ConfigService = require("api/ConfigService")

local ntpservers = ConfigService:new({ increment_name = true })

local s = ntpservers:section("ntpclient", "ntpserver")

function ntpservers:PUT_validate_section_hook()
	local opt_hostname = self:get_abs_value(self.config, self.sid, "hostname")
	if not opt_hostname then
		self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", "hostname")
	end
end

	local hostname = s:option("hostname")
		function hostname:validate(value)
			return self.dt:host(value)
		end

function ntpservers:DELETE_before_commit_hook()
	local sid = self.uci:get_all("ntpclient", "@ntpclient[0]")[".name"]
	local enabled = self:get_abs_value(self.config, sid, "enabled")
	local sync_enabled = self:get_abs_value(self.config, sid, "sync_enabled")
	local ids = self._single and {self.sid} or self.arguments.data
	if enabled ~= "1" then return end
	if #modems > 0 and sync_enabled == "1" then return end

	local count = 0
	local empty_hostname_count = 0
	self:table_foreach("ntpclient", "ntpserver", function (server)
		if not util.contains(ids, server[".name"]) then
			count = count + 1
			if not server.hostname then
				empty_hostname_count = empty_hostname_count + 1
			end
		end
	end)

	if count ~= empty_hostname_count then return end

	return self:add_critical_error(
		STD_CODES.INVALID_OPT,
		#modems > 0 and
			"Service does not work without enabled 'sync_enabled' or at least one 'ntpserver'." or
			"Service does not work without at least one 'ntpserver' instance configured.",
		"Validation"
	)
end
function ntpservers:POST_validate_hook()
	local interfaces = 0
	self:table_foreach("ntpclient", "ntpserver", function (_)
		interfaces = interfaces + 1
	end)
	if interfaces >= 4 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 4 instances are allowed")
	end
end


return ntpservers
