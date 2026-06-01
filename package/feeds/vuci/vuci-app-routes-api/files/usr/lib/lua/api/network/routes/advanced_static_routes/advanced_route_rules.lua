local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local board = require("vuci.board")

if board:is_switch() then return nil end

local flags = {
	increment_name = true
}

local function get_interfaces(self)
	local interfaces = {}
	self:table_foreach("network", "interface", function (s)
		if s[".name"] ~= "loopback" then
			table.insert(interfaces, s.name or s[".name"])
		end
	end)
	return interfaces
end

local routing_rules = ConfigService:new(flags)
routing_rules.interfaces = get_interfaces(routing_rules)

	local rule = routing_rules:section("network", "rule")

		local priority = rule:option("priority")
			function priority:validate(value)
				return self.dt:irange(value, 0, 65535)
			end

		local rule_in = rule:option("in")
			function rule_in:validate(value)
				return self.dt:check_array(value, { "any", unpack(self.interfaces) })
			end
			function rule_in:get(value) return util.network_mapper_get(self, value) or "any" end
			function rule_in:set(value)
				if value == "any" then
					return self:table_delete(self.config, self.sid, self.api_key)
				end
				util.network_mapper_set(self, value)
			end

		local out = rule:option("out")
			function out:validate(value)
				return self.dt:check_array(value, { "none", unpack(self.interfaces) })
			end
			function out:get(value) return util.network_mapper_get(self, value) or "none" end
			function out:set(value)
				if value == "none" then
					return self:table_delete(self.config, self.sid, self.api_key)
				end
				util.network_mapper_set(self, value)
			end

		local src = rule:option("src")
			function src:validate(value)
				local status = self.dt:cidr4(value) or self.dt:ipnet4(value) 
				return status, "IPv4 subnets are accepted in CIDR notation e.g. 192.168.1.1/24"
			end

		local dest = rule:option("dest")
			function dest:validate(value)
				local status = self.dt:cidr4(value) or self.dt:ipnet4(value) 
				return status, "IPv4 subnets are accepted in CIDR notation e.g. 192.168.1.1/24"
			end

		local tos_values = {"16", "8" , "4" , "2" , "0"} -- Valid TOS values can be found in linux/ip.h or by running "iptables -j TOS -h"
		local tos = rule:option("tos")
			function tos:validate(value) 
				return self.dt:check_array(value, tos_values)
			end	

		local mark = rule:option("mark")
		mark.maxlength = 21
			function mark:validate(value)

				parts = util.split(tostring(value), "/")
				if #parts ~= 1 and #parts ~= 2 then
					return false, "fwmark and optionally its mask to match, e.g. 0xFF to match mark 255 or 0x0/0x1 to match any even mark value"
				end
				for _, part in ipairs(parts) do
					-- Checks if fwmark is less than 10 characters because fwmark should be "0x" + upto 8 hex characters  
					if string.len(part) > 10 or (string.sub(part, 1, 2) ~= "0x" or not self.dt:hexstring(string.sub(part, 3, string.len(part)))) then
						return false, "fwmark and optionally its mask to match, e.g. 0xFF to match mark 255 or 0x0/0x1 to match any even mark value"
					end
				end
				return true
			end

		local invert = rule:option("invert")
			function invert:validate(value)
				return self.dt:is_bool(value)
			end

		local action_group = rule:option("action_group")
			function action_group:validate(value)
				return self.dt:check_array(value, { "lookup", "goto", "action" })
			end

		rule:option("lookup")

		rule:option("goto")

		local action = rule:option("action")
			function action:validate(value)
				return self.dt:check_array(value, { "prohibit", "unreachable", "blackhole", "throw" })
			end

return routing_rules
