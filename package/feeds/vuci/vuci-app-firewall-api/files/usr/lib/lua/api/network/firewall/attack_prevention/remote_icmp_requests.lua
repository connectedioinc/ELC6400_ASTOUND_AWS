local uci = require "vuci.uci".cursor()
local ConfigService = require("api/ConfigService")
local attack_common = require("api/network/firewall/attack_prevention/attack_prevention_common")
local rule_section

uci:foreach("firewall", "rule", function(s)
	if s.name == "Allow-Ping" then
		rule_section = s[".name"]
	end
end)

if not rule_section then
	return nil
end

local remote_icmp_requests = ConfigService:new({
	create = false,
	delete = false,
	general_section = rule_section
})

function remote_icmp_requests:PUT_before_commit_hook()
	attack_common:limit_enabled_set(self, "icmp_limit")
end

	local rule = remote_icmp_requests:section("firewall", "rule")

	function remote_icmp_requests:initialize_hook()
		attack_common:add_limit_options(self, rule)
	end
	
	function rule:filter(options)
		if options[".name"] == rule_section then
			return true
		end
		return false
	end

		local enabled = rule:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

			function enabled:get(value)
				if not value then
					return "1"
				end
				return value
			end

			function enabled:set(value)
				if value == "1" then
					self:table_delete(self.config, self.sid, self.api_key)
				else
					self:table_set(self.config, self.sid, self.api_key, "0")
				end
			end

		local icmp_limit = rule:option("icmp_limit")
		icmp_limit.require = { ["1"] = { "limit", "limit_burst" } }
			function icmp_limit:validate(value)
				return self.dt:is_bool(value)
			end
			function icmp_limit:get(value)
				return value or "0"
			end
			function icmp_limit:set(value) end

return remote_icmp_requests
