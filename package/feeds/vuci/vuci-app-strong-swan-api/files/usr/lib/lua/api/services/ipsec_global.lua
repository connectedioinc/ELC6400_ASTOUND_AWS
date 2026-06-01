local ConfigService = require("api/ConfigService")

local flags = {
	create = false,
	delete = false,
	global_settings = true,
	general_section = "global"
}

local globals = ConfigService:new(flags)

local s = globals:section("ipsec", "ipsec")

	local rtinstall_enabled = s:option("rtinstall_enabled")
	function rtinstall_enabled:validate(value)
		return self.dt:is_bool(value)
	end

	local make_before_break = s:option("make_before_break")
	function make_before_break:validate(value)
		return self.dt:is_bool(value)
	end

	local debug = s:option("debug")
	function debug:validate(value)
		return self.dt:check_array(value, { "0", "1", "2", "3", "4" })
	end

return globals
