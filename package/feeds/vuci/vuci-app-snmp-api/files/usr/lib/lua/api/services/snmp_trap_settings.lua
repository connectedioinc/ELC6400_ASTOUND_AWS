local ConfigService = require("api/ConfigService")

local flags = {
	create = false,
	delete = false,
	general_section = function(self)
		return self.uci:get_all("snmptrap", "@server[0]")[".name"]
	end,
	global_settings = true
}

local snmp_trap_settings = ConfigService:new(flags)

function snmp_trap_settings:initialize_hook()
	if not require("vuci.package_checker").is_installed("snmptrap") then
		return self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Service does not exist in device" , "Request", 404)
	end
end

function snmp_trap_settings:get_hosts()
	local hosts = self:getter_wrapped_abs_value(self.config, self.sid, "hosts")
	if not hosts or not hosts[1] then return {} end
	local arr = string.split(hosts[1], ";")
	return { host = arr[1] ~= "" and arr[1] or nil, port = arr[2] ~= "" and arr[2] or nil }
end

function snmp_trap_settings:set_hosts(data)
	local hosts = self:getter_wrapped_abs_value(self.config, self.sid, "hosts") or {}
	local values = snmp_trap_settings:get_hosts()
	values.host = data.host and data.host or values.host
	values.port = data.port and data.port or values.port
	hosts[1] = string.format("%s;%s", values.host or "", values.port or "")
	self:table_set(self.config, self.sid, "hosts", hosts)
end

local uci = snmp_trap_settings.uci -- create section if it doesn't exist (user was able to delete it in previous versions)

if not uci:get_all("snmptrap", "@server[0]") then
	uci:section("snmptrap", "server", nil, {
		enabled = "0",
		community = "public"
	})
	uci:commit("snmptrap")
end

	local server = snmp_trap_settings:section("snmptrap", "server")

		local enabled = server:option("enabled")
		enabled.require = { ["1"] = { "host", "port", "community"}}
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local host = server:option("host")
			function host:validate(value)
				return self.dt:host(value)
			end
			function host:get()
				return self:get_hosts().host
			end
			function host:set(value)
				self:set_hosts({ host = value })
			end

		local port = server:option("port")
			function port:validate(value)
				return self.dt:port(value)
			end
			function port:get()
				return self:get_hosts().port
			end

			function port:set(value)
				self:set_hosts({ port = value })
			end

		local hosts = server:option("hosts", { list = true })
		function hosts:validate(value)
			local host_values = string.split(value, ";") 
			if #host_values ~= 2 then return false, "Incorrect hosts format, hostname;port is the allowed format." end
			local ok_host, err_host = self.dt:host(host_values[1])
			if not ok_host then return ok_host, err_host end
			return self.dt:port(host_values[2])
		end
		hosts.max_length = 20

		local community = server:option("community")
		community.maxlength = 31
			function community:validate(value)
				return self.dt:uciname(value)
			end

return snmp_trap_settings
