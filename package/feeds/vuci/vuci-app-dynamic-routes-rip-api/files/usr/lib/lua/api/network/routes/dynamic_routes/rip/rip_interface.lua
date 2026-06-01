local ConfigService = require("api/ConfigService")
local vpn_utils = require("vuci.vpn")

local dynamic_rip_interface = ConfigService:new()
dynamic_rip_interface.ifnames = vpn_utils:get_all_devices()

	local interface = dynamic_rip_interface:section("rip", "rip_interface")
	interface:make_primary()
	interface.default_options.id.maxlength = 32

		local enabled = interface:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local ifname = interface:option("ifname")
			function ifname:validate(value)
				local ifnames = {}
				for _, entry in ipairs(self.ifnames) do
					if entry.ifname and entry.service ~= "tailscale" then
						table.insert(ifnames, entry.ifname)
					end
				end
				return self.dt:check_array(value, ifnames)
			end

		local passive_interface = interface:option("passive_interface")
			function passive_interface:validate(value)
				return self.dt:is_bool(value)
			end

function dynamic_rip_interface:DELETE_after_data_hook(response_data)
	self:table_foreach(self.main_config, "rip_access_list", function(s)
		if s.target == self.sid then
			self:table_delete(self.main_config, s[".name"])
		end
	end)
end

function dynamic_rip_interface:GET_TYPE_options()
	option_table = {}
	for _, int in ipairs(dynamic_rip_interface.ifnames) do
		if int.service ~= "tailscale" then
			table.insert(option_table, int)
		end
	end
	return self:ResponseOK({ available_interfaces = option_table })
end

return dynamic_rip_interface
