return function ()
	local board = require("vuci.board")
	local devices_utils = require("api.network.devices_utils")

	return {
		section_hooks = {
			filter = function (self, s)
				return s.type == "ethernet" or not s.type
			end
		},
		hooks = {
			handle_default_eth_delete = function (self)
				local ports = {}
				local lan_ports = board:get_default_lan_ifname()
				local wan_port =  board:get_default_wan_ifname()
				if type(lan_ports) == "string" then
					ports[lan_ports] = true
				else
					for _, port in ipairs(lan_ports) do
						ports[port] = true
					end
				end
				if wan_port then
					ports[wan_port] = true
				end
				local port_ifname = self:table_get(self.config, self.sid, "name")
				if ports[port_ifname] then
					self:add_critical_error(
						STD_CODES.NO_DELETE,
						"Default ethernet devices cannot be deleted.",
						"Validation"
					)
				end
			end,
			DELETE_section_init_hook = function (self)
				self:handle_default_eth_delete()
				devices_utils.remove_from_bridge(self)
			end
		}
	}
end
