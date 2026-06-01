local ConfigService = require("api/ConfigService")
local bgp_utils = require ("api/network/routes/dynamic_routes/bgp/bgp_utils")

local flags = {
	increment_name = true
}

local function get_target_info(self)
	local targets = {}
	self:table_foreach("bgp", "bgp_peer", function(s)
		table.insert(targets, s[".name"])
	end)
	self:table_foreach("bgp", "bgp_peer_group", function(s)
		table.insert(targets, s[".name"])
	end)
	return targets
end

local dynamic_bgp_access = ConfigService:new(flags)
dynamic_bgp_access.targets = get_target_info(dynamic_bgp_access)

	local access_list = dynamic_bgp_access:section("bgp", "bgp_access_list")

		local enabled = access_list:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

		local target = access_list:option("target")
        -- Disabled till WebUI front-end stops creating empty configurations
		-- target.cfg_require = true
			function target:validate(value)
				return self.dt:check_array(value, self.targets)
			end

		local action = access_list:option("action")
			function action:validate(value)
				return self.dt:check_array(value, { "permit", "deny" })
			end

		local net = access_list:option("net")
			function net:validate(value)
				if self.dt:fieldvalidation(value, "any") or self.dt:cidr4(value) or self.dt:cidr6(value) then return true end
				return false, "IPv4, IPv6 address with netmask or \"any\" is accepted."
			end

		local direction = access_list:option("direction")
			function direction:validate(value)
				return self.dt:check_array(value, { "in", "out" })
			end

function dynamic_bgp_access:POST_validate_section_hook()
	bgp_utils:section_limit(self, "bgp_access_list", nil, 30)
end

return dynamic_bgp_access
