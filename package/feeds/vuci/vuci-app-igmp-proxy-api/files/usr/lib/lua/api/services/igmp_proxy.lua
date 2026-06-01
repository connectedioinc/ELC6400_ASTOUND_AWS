local ConfigService = require("api/ConfigService")

local IgmpProxy = ConfigService:new({
	delete = false,
	create = false,
	general_section = "igmpproxy",
	global_settings = true
})
local section_igmpproxy = IgmpProxy:section("igmpproxy", "igmpproxy")

local opt_enabled = section_igmpproxy:option("enabled")
	function opt_enabled:validate(value)
		return self.dt:is_bool(value)
	end

local opt_quickleave = section_igmpproxy:option("quickleave")
	function opt_quickleave:validate(value)
		return self.dt:is_bool(value)
	end

return IgmpProxy