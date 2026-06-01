local ConfigService = require("api/ConfigService")

local flags = {
	create = false,
	delete = false,
	general_section = function(self)
		local sid
		self:table_foreach("firewall", "defaults", function(c)
			sid = c[".name"]
		end)
		return sid
	end,
	global_settings = true
}

local firewall_general_settings = ConfigService:new(flags)
firewall_general_settings.policies = { "REJECT", "DROP", "ACCEPT" }

	local defaults = firewall_general_settings:section("firewall", "defaults")

		local drop_invalid = defaults:option("drop_invalid")
			function drop_invalid:validate(value)
				return self.dt:is_bool(value)
			end
			function drop_invalid:get(value)
				return value or "0"
			end

		local auto_helper = defaults:option("auto_helper")
			function auto_helper:validate(value)
				return self.dt:is_bool(value)
			end
			function auto_helper:get(value)
				return value or "1"
			end

		local input = defaults:option("input")
			function input:validate(value)
				return self.dt:check_array(value, self.policies)
			end
			function input:get(value)
				return value or "REJECT"
			end

		local output = defaults:option("output")
			function output:validate(value)
				return self.dt:check_array(value, self.policies)
			end
			function output:get(value)
				return value or "REJECT"
			end

		local forward = defaults:option("forward")
			function forward:validate(value)
				return self.dt:check_array(value, self.policies)
			end
			function forward:get(value)
				return value or "REJECT"
			end

return firewall_general_settings
