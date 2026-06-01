local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")

local zerotier = ConfigService:new({increment_name = true})
local zone_opt = {
	name	= "zerotier",
	input	= "ACCEPT",
	forward	= "REJECT",
	output	= "ACCEPT",
	device	= "zt+"
}

function zerotier:add_to_firewall_zone()
	local zone_name = util_tlt.ensure_zone_exists(self, zone_opt, nil, zone_opt.device).name
	if zone_name == zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name) end
end

local s = zerotier:section("zerotier", "instance")
function s:create_defaults()
    return {
        enabled = "0"
    }
end
	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 8
	name.cfg_require = true
		function name:validate(value)
			local exists = false
			self:table_foreach("zerotier", "instance",
				function(s)
					if s.name == value and s[".name"] ~= self.sid then
						exists = true
					end
				end
			)
			if exists then
				return false, string.format("Name: '%s' is already used. Please choose a different name", value)
			end
			return self.dt:uciname(value)
		end

	local node_id = s:option("node_id")
	node_id.readonly = true

function zerotier:PUT_before_commit_hook()
	self:add_to_firewall_zone()
end

function zerotier:POST_before_commit_hook()
	self:add_to_firewall_zone()
end

function zerotier:DELETE_after_data_hook()
	self:table_foreach("zerotier", "network_".. self.sid, function(network)
		local net = self:table_get("zerotier", network[".name"], "bridge_to")
        if net then
            local ifname = self:table_get("zerotier", network[".name"], "device_name")
            local curr_ports_list = self:table_get("network", "br_" .. net, "ports")
            local updated_ports_list = {}

            for _, v in ipairs(curr_ports_list) do
                if v ~= ifname then
                    table.insert(updated_ports_list, v)
                end
            end
            self:table_set("network", "br_" .. net, "ports", updated_ports_list)
        end
		self:table_delete("zerotier", network[".name"])
	end)
end

function zerotier:DELETE_before_commit_hook()
	if not util_tlt.has_section(self, "zerotier", "instance") then
		util_tlt.delete_zone_from_firewall(self, "zerotier", true, true)
	end
end

return zerotier
