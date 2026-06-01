local fs = require "nixio.fs"
local custom_rules_file = "/etc/firewall.user"
local util = require("vuci.util")

local ConfigService = require("api/ConfigService")

local CustomRules = ConfigService:new({ create = false, delete = false, general_section = function (self)
	return self.uci:get_all("firewall", "@defaults[0]")[".name"]
end })

local defaults = CustomRules:section("firewall", "defaults")

	local custom_rules = defaults:option("custom_rules")
		custom_rules.maxlength = 65535
		function custom_rules:validate(_)
			return true
		end
		function custom_rules:get(_)
			return fs.readfile(custom_rules_file)
		end

		local changes_made = false
		function custom_rules:set(value)
			local new_custom_rules = value:gsub("\r\n?", "\n")
			fs.writefile(custom_rules_file, new_custom_rules)
			changes_made = true
		end

function CustomRules:PUT_after_commit_hook()
	if changes_made then
		util.ubus("rc", "init", { name = "firewall", action = "restart" })
	end
end

function CustomRules.reset(self)
	fs.copy("/rom/etc/firewall.user", custom_rules_file)
	util.ubus("rc", "init", { name = "firewall", action = "restart" })
	return self:ResponseOK({ ["custom_rules"] = fs.readfile(custom_rules_file) })
end

CustomRules:action("reset", CustomRules.reset)

return CustomRules
