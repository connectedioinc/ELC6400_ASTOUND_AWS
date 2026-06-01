local uci = require "vuci.uci".cursor()
local ConfigService = require("api/ConfigService")
local attack_common = require("api/network/firewall/attack_prevention/attack_prevention_common")
local rule_section

uci:foreach("firewall", "rule", function(s)
	if s.name == "Enable_HTTP_WAN" then
		rule_section = s[".name"]
	end
end)

if not rule_section then
	return nil
end

local flags = {
	create = false,
	delete = false,
	general_section = rule_section
}

local http_attack_prevention = ConfigService:new(flags)

function http_attack_prevention:PUT_before_commit_hook()
	attack_common:limit_enabled_set(self, "http_limit")
end

	local rule = http_attack_prevention:section("firewall", "rule")

	function http_attack_prevention:initialize_hook()
		attack_common:add_limit_options(self, rule)
	end
	
	function rule:filter(options)
		if options[".name"] == rule_section then
			return true
		end
		return false
	end

		local http_limit = rule:option("http_limit")
		http_limit.require = { ["1"] = { "limit", "limit_burst" } }
			function http_limit:validate(value)
				return self.dt:is_bool(value)
			end
			function http_limit:get(value)
				return value or "0"
			end
			function http_limit:set(value) end

return http_attack_prevention
