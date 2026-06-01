if not require("nixio.fs").access("/etc/config/dfota") then
	return nil
end

local ConfigService = require("api/ConfigService")

local DFOTAService = ConfigService:new({
	delete = false,
	create = false,
	general_section = "config"
})

local DFOTA = DFOTAService:section("dfota", "dfota")
	local opt_notify = DFOTA:option("notify")
		function opt_notify:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_notify:get(value)
			return value or "1"
		end

return DFOTAService