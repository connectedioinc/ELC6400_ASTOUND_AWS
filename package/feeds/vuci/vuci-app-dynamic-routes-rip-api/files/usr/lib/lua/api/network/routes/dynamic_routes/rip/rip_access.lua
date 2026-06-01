local ConfigService = require("api/ConfigService")

local function get_target_info(self)
	local targets = {}
	self:table_foreach("rip", "rip_interface", function(s)
		table.insert(targets, s[".name"])
	end)
	return targets
end

local dynamic_rip_access = ConfigService:new()
dynamic_rip_access.targets = get_target_info(dynamic_rip_access)

	local access_list = dynamic_rip_access:section("rip", "rip_access_list")
	access_list:make_primary()
	access_list.default_options.id.maxlength = 32

		local enabled = access_list:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local target = access_list:option("target")
		target.cfg_require = true
			function target:validate(value)
				return self.dt:check_array(value, self.targets)
			end

		local action = access_list:option("action")
			function action:validate(value)
				return self.dt:check_array(value, { "permit", "deny" })
			end

		local net = access_list:option("net")
			function net:validate(value)
				if self.dt:fieldvalidation(value, "any") or self.dt:cidr4(value) then return true end
				return false, "IPv4 address with netmask or \"any\" is accepted."
			end

		local direction = access_list:option("direction")
			function direction:validate(value)
				return self.dt:check_array(value, { "in", "out" })
			end

return dynamic_rip_access
