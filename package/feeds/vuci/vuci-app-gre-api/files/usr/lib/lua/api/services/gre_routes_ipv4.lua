local ConfigService = require("api/ConfigService")
local ntm

local gre_routes = ConfigService:new({ increment_name = true})

function gre_routes:parent_exists()
	local proto = self.uci:get("network", self.binding, "proto")
	if self.binding and (proto ~= "gre" and proto ~= "grev6") then
		self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				string.format("Parent section '%s' does not exist", self.binding),
				"UCI",
				HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

local route = gre_routes:section("network", "route")
function route:create_defaults(sid)
	return {
		dep = self.binding,
		interface = self.binding .. "_static"
	}
end
function route:filter(s)
	return s.dep == self.binding
end

	local target = route:option("target")
		function target:validate(value)
			return self.dt:ip4addr(value)
		end
		function target:set(value)
			if self:table_get(self.config, self.sid, "service") == "dmvpn" then
				self:table_set(self.config, self.sid, "dmvpn_user_mod", "1")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local netmask = route:option("netmask")
		function netmask:validate(value)
			local ok, err = self.dt:netmask(value)
			if not ok then return ok, err end

			local ip = require("luci.ip")
			ntm = ntm or require "vuci.network".init(self.uci)
			local lan_net = ntm:get_network("lan")
			local vpn_net_ip = self.current_data_block.target or self:table_get("network", self.sid, "target")
			local lan_ip = lan_net:ipaddr()
			local includes_lan

			if vpn_net_ip and value then
				local range = ip.new("%s/%s" % {vpn_net_ip, value})
				if not range then
					return false, "'target' not provided"
				end
				local net_addr = range:network():string()

				if net_addr ~= vpn_net_ip then
					return false, "To match the specified netmask, 'target' should be " .. net_addr
				end

				includes_lan = lan_ip and range:contains(lan_ip)

				if includes_lan and vpn_net_ip ~= "0.0.0.0" and value ~= "0.0.0.0"  then
					return false, "Remote subnet IP address includes router LAN."
				end
			end
			return true
		end
		function netmask:set(value)
			if self:table_get(self.config, self.sid, "service") == "dmvpn" then
				self:table_set(self.config, self.sid, "dmvpn_user_mod", "1")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

return gre_routes
