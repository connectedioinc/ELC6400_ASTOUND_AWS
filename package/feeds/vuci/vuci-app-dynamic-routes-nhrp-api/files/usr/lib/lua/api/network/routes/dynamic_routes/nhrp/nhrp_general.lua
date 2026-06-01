local ConfigService = require("api/ConfigService")
local firewall_service = require("vuci.package_checker").is_installed("firewall")

local flags = {
	create = false,
	delete = false,
	global_settings = true,
	general_section = "nhrp"
}

local dynamic_nhrp_general = ConfigService:new(flags)

	local nhrp_general = dynamic_nhrp_general:section("nhrp", "nhrp_general")

		local enabled = nhrp_general:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end
			function enabled:get(value)
				return value or "0"
			end

		local debug = nhrp_general:option("debug")
			function debug:validate(value)
				return self.dt:is_bool(value)
			end

function dynamic_nhrp_general:PUT_before_commit_hook()
	if firewall_service then
		local firewall_rule = self:table_get("firewall", "A_NHRP")
		local nhrp_enabled = self:table_get(self.main_config, self.sid, "enabled")
		if nhrp_enabled and nhrp_enabled == "1" then
			if firewall_rule then
				self:table_set("firewall", "A_NHRP", "enabled", "1")
			else
				local firewall_options = {
					enabled = "1",
					target = "ACCEPT",
					src = "wan",
					proto = "54",
					name = "Allow-NBMA-WAN-traffic"
				}
				self:table_section("firewall", "rule", "A_NHRP", firewall_options)
			end
		else
			if firewall_rule then
				self:table_set("firewall", "A_NHRP", "enabled", "0")
			end
		end
	end
end

return dynamic_nhrp_general
