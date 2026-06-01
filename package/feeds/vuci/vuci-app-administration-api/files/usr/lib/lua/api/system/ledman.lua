local ConfigService = require("api/ConfigService")
local pac = require("vuci.package_checker")
if not pac.is_installed("ledman") and not pac.is_installed("ledman-full") and not pac.is_installed("ledman-light") then
	return nil
end

local ledman = ConfigService:new({ delete = false, create = false, general_section = "ledman" })

-- a more generic check for TSW if ledman section exists. If it does not, the endpoint should not function 
if not ledman:table_get("system", "ledman") then
	return nil
end

local s = ledman:section("system", "ledman")
	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

return ledman