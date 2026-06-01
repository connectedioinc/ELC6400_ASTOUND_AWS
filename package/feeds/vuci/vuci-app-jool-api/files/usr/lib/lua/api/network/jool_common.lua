local jool_common = {}

function jool_common.get_iface_zone(self, iface)
	local iface_zone
	local function find_zone(ifname, zone_name)
		if ifname == iface then
			iface_zone = zone_name
		end
	end
	self:table_foreach("firewall", "zone", function(s)
		if s.network and type(s.network) == "string" then
			s.network:gsub("([^ ]+)", function(ifname)
				find_zone(ifname, s.name)
			end)
		else
			for _, ifname in ipairs(s.network or {}) do
				find_zone(ifname, s.name)
			end
		end
	end)
  return iface_zone
end

return jool_common
