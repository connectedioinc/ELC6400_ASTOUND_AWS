local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local flags = {
	delete = false,
	create = false
}

local outstation = ConfigService:new(flags)

local function set_ra(data)
	local rule_exists = false
	local msg = nil

	local port = outstation:get_abs_value("dnp3_outstation", "dnp3_outstation", "port")
	outstation:table_foreach("firewall", "rule", function(s)
		if s.name == "Enable_DNP3_WAN" then
			rule_exists = true
			outstation:table_set("firewall", s[".name"], "enabled", data.allow_ra)
			outstation:table_set("firewall", s[".name"], "dest_port", port)
		end
	end)

	if not rule_exists then
		local fw = require("vuci.firewall").init(outstation.uci)
		local wanZone = fw:get_zone("wan")
		if not wanZone then
			msg = "Could not add firewall rule"
			data.allow_ra = ""
			return data, msg
		end
		local fw_rule = {
			name = "Enable_DNP3_WAN",
			target = "ACCEPT",
			proto = "tcp",
			dest_port = port,
			enabled = data.allow_ra
		}
		wanZone:add_rule(fw_rule)
		-- regets firewall config for synchronization between uci and table_xx functions
		outstation.t_func:_get_config("firewall")
	end
	data.allow_ra = ""

	return data, msg
end

local s = outstation:section("dnp3_outstation", "dnp3_outstation")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = { "local_addr", "remote_addr", "protocol", "port" } }
		enabled.cfg_require = true
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local local_addr = s:option("local_addr")
		local_addr.cfg_require = true
		function local_addr:validate(value)
			return self.dt:irange(value, 0, 65519)
		end

	local remote_addr = s:option("remote_addr")
		remote_addr.cfg_require = true
		function remote_addr:validate(value)
			return self.dt:irange(value, 0, 65519)
		end

	local unsolicited_enabled = s:option("unsolicited_enabled")
		unsolicited_enabled.cfg_require = true
		function unsolicited_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local protocol = s:option("protocol")
		protocol.cfg_require = true
		function protocol:validate(value)
			return self.dt:check_array(value, {"tcp", "udp"})
		end

	local port = s:option("port")
		port.cfg_require = true
		function port:validate(value)
			return self.dt:port(value)
		end

	local udp_response_port = s:option("udp_response_port")
		function udp_response_port:validate(value)
			return self.dt:port(value)
		end

	local udp_response_ip = s:option("udp_response_ip")
		function udp_response_ip:validate(value)
			return self.dt:ipaddr(value)
		end

	local allow_ra = s:option("allow_ra")
		function allow_ra:validate(value)
			return self.dt:is_bool(value)
		end
		function allow_ra:set()
			set_ra(self.current_data_block)
		end
		function allow_ra:get()
			local result = "0"
			self:table_foreach("firewall", "rule",
				function(s)
					if s.name == "Enable_DNP3_WAN" and s.enabled == "1" then
						result = "1"
					end
				end
			)
			return result
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function outstation:GET_TYPE_status()
	local res = {}

	local dnp3_status = util.ubus("dnp3_outstation", "status")
	if dnp3_status then
		res.uptime = dnp3_status.uptime
		res.server = {}
		local sid = "dnp3_outstation"
		if self:table_get(self.main_config, sid, "enabled") == "1" then
			for _, server_status in pairs(dnp3_status.servers) do
				if server_status.id == sid then
					res.server = server_status
				end
			end
		end
	end

	return self:ResponseOK(res)
end

-- End of status

function outstation:delete_params()
	local protocol = self:get_abs_value(self.config, self.sid, "protocol")
	if protocol ~= "udp" then
		self:table_delete(self.main_config, self.sid, "udp_response_ip")
		self:table_delete(self.main_config, self.sid, "udp_response_port")
	end
end

outstation.PUT_validate_section_hook = outstation.delete_params

return outstation
