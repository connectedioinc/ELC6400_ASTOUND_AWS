local ConfigService = require("api/ConfigService")
local vpn_utils = require("vuci.vpn")

local flags = {
	increment_name = true
}

local dynamic_ospf_interface = ConfigService:new(flags)

dynamic_ospf_interface.ifnames = vpn_utils:get_all_devices()

	local ospf_interface = dynamic_ospf_interface:section("ospf", "ospf_interface")
	ospf_interface:make_primary()
	ospf_interface.default_options.id.maxlength = 32

		local enabled = ospf_interface:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local ifname = ospf_interface:option("ifname")
			function ifname:validate(value)
				local ifnames = {}
				for _, entry in ipairs(self.ifnames) do
					if entry.ifname and entry.service ~= "tailscale" then
						table.insert(ifnames, entry.ifname)
					end
				end
				return self.dt:check_array(value, ifnames)
			end

		local cost = ospf_interface:option("cost")
			function cost:validate(value)
				return self.dt:irange(value, 1, 65535)
			end

		local hello_interval = ospf_interface:option("hello_interval")
			function hello_interval:validate(value)
				return self.dt:irange(value, 1, 65535)
			end

		local dead_interval = ospf_interface:option("dead_interval")
			function dead_interval:validate(value)
				return self.dt:irange(value, 1, 65535)
			end

		local retransmit_interval = ospf_interface:option("retransmit_interval")
			function retransmit_interval:validate(value)
				return self.dt:irange(value, 0, 65535)
			end

		local priority = ospf_interface:option("priority")
			function priority:validate(value)
				return self.dt:irange(value, 0, 255)
			end

		local type = ospf_interface:option("type")
			function type:validate(value)
				return self.dt:check_array(value, { "broadcast", "non-broadcast", "point-to-point", "point-to-multipoint" })
			end

		local ptp_dmvpn = ospf_interface:option("ptp_dmvpn")
			function ptp_dmvpn:validate(value)
				return self.dt:is_bool(value)
			end

		local authentication = ospf_interface:option("authentication")
			function authentication:validate(value)
				return self.dt:check_array(value, { "none", "pass", "md5_hmac" })
			end

		local router_id = ospf_interface:option("router_id")
			function router_id:validate(value)
				return self.dt:irange(value, 1, 100)
			end
			function router_id:get()
				return self:table_get(self.config, self.sid, "id")
			end
			function router_id:set(value)
				self:table_set(self.config, self.sid, "id", value)
			end

		local password = ospf_interface:option("password", { sensitive = true })
			password.maxlength = 512
			function password:validate(value)
				return self.dt:credentials_validate(value)
			end

function dynamic_ospf_interface:GET_TYPE_options()
	option_table = {}
	for _, int in ipairs(dynamic_ospf_interface.ifnames) do
		if int.service ~= "tailscale" then
			table.insert(option_table, int)
		end
	end
	return self:ResponseOK({ available_interfaces = option_table })
end

return dynamic_ospf_interface
