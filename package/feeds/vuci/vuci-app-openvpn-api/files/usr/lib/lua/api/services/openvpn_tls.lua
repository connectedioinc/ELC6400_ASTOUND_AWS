local ConfigService = require("api/ConfigService")
local ntm = require "vuci.network".init()
local util = require("vuci.util")
local bit = require ("nixio").bit
local util_tlt = require("vuci.util_tlt")
local board = require("vuci.board")

local flags = {
	anonymous = true
}

local openvpn_tls = ConfigService:new(flags)

local s = openvpn_tls:section("openvpn", "client")

function s:create_defaults(sid)
	return {
		instance = self.binding
	}
end
-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local section_name = s:option("name")
	section_name.cfg_require = true
		function section_name:validate(value)
			return self.dt:uciname(value)
		end

	local common_name = s:option("common_name")
		common_name.maxlength = 64
		function common_name:validate(value)
			return self.dt:nospace(value)
		end

	local local_ip = s:option("local_ip")
	local_ip.require = { "remote_ip" }
		function local_ip:validate(value)
			return self.dt:ip4addr(value)
		end

	local remote_ip = s:option("remote_ip")
	remote_ip.require = { "local_ip" }
		function remote_ip:validate(value)
			return self.dt:ip4addr(value)
		end

	local local_net = s:option("local_net")
		function local_net:validate(value)
			return self.dt:cidr4(value)
		end

	local private_network = s:option("private_network")
		function private_network:validate(value)
			if util_tlt.in_lan_range(value, board:is_ap()) then
				return false, "Provided network cannot be in LAN network range."
			end
			return self.dt:cidr4(value)
		end

	local local_ipv6 = s:option("local_ipv6")
		function local_ipv6:validate(value)
			return self.dt:ipmask6(value)
		end

	local private_network_ipv6 = s:option("private_network_ipv6")
		function private_network_ipv6:validate(value)
			if util_tlt.in_lan_range(value, board:is_ap()) then
				return false, "Provided network cannot be in LAN network range."
			end
			return self.dt:ipmask6(value)
		end   

openvpn_tls.interface_options = nil
function openvpn_tls:fetch_interface_options()
	if self.interface_options then return self.interface_options end
	self.interface_options = {}
	self:table_foreach("network", "interface", function(s)
		if s[".name"] and s[".name"] ~= "loopback" and s["proto"] ~= "relay" and s["proto"] ~= "l2tp" and
				s["proto"] ~= "wireguard" and  s["proto"] ~= "gre" and s["proto"] ~= "sstp" and s["proto"] ~= "l2tpv3" and
				s["proto"] ~= "pptp" and not s[".name"]:match("_static$") then
			table.insert(self.interface_options, s.name or s[".name"])
		end
	end)
	return self.interface_options
end

	local covered_network = s:option("covered_network", { list = true })
		function covered_network:validate(value)
			return self.dt:check_array(value, self:fetch_interface_options())
		end
		function covered_network:get(value) return util.network_mapper_get(self, value) end
		function covered_network:set(value) util.network_mapper_set(self, value) end

	local instance = s:option("instance")
		function instance:validate(value)
			return self.dt:string(value)
		end
-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return openvpn_tls
