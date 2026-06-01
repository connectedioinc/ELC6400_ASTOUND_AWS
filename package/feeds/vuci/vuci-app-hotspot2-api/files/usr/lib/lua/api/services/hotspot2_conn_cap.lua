local ConfigService = require("api/ConfigService")

local ConnCapGeneral = ConfigService:new({
	increment_name = true
})

local ConnCap = ConnCapGeneral:section("wireless", "hs20_conn_capab")
function ConnCap:create_defaults()
    return {
        wifi_id = self:table_get(self.config, self.binding, "wifi_id")
    }
end
function ConnCap:filter(options)
    return options.wifi_id == self:table_get(self.config, self.binding, "wifi_id")
end

	local opt_proto = ConnCap:option("proto")
		function opt_proto:validate(value)
			return self.dt:check_array(value, {
				"1", -- ICMP
				"6", -- TCP
				"17" -- UDP
			})
		end

	local opt_port = ConnCap:option("port")
		function opt_port:validate(value)
			return self.dt:port(value)
		end

	local opt_state = ConnCap:option("state")
		function opt_state:validate(value)
			return self.dt:check_array(value, {
				"0", -- Closed
				"1", -- Open
				"2" -- Unknown
			})
		end

return ConnCapGeneral