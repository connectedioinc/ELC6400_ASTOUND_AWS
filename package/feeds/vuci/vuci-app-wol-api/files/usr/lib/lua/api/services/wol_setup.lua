local util = require("vuci.util")
local board = require("vuci.board")
local ConfigService = require("api/ConfigService")
local wol_interfaces = require("api/services/wol_interfaces")

if not board:has_ethernet() then
	return nil
end

local flags = {
	delete = false,
	create = false,
	general_section = "setup",
	global_settings = true
}

local STATUS_CODES = {
    WAKE_FAILED = 1,
    VALIDATION_FAILED = 2
}

local wake_on_lan_setup = ConfigService:new(flags)
	local etherwake = wake_on_lan_setup:section("etherwake", "etherwake")
		local broadcast = etherwake:option("broadcast")
		function broadcast:validate(value)
			local options = { "on", "off" }
			local res, msg = self.dt:check_array(value, options)
			local res2, msg2 = self.dt:is_bool(value)

			if res or res2 then
				return true
			else
				return false, msg .. " or " .. msg2
			end
		end

		local opt_interface = etherwake:option("interface")
		function opt_interface:validate(value)
			return self.dt:check_array(value, wol_interfaces())
		end

return wake_on_lan_setup
