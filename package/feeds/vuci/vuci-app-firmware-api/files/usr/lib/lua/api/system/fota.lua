local ConfigService = require("api/ConfigService")

local Fota = ConfigService:new({
	delete = false,
	create = false,
	general_section = "config"
})

local FotaGeneral = Fota:section("rut_fota", "rut_fota")

	local opt_enabled = FotaGeneral:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enabled:get(value)
			return value or "0"
		end

	local opt_notify = FotaGeneral:option("notify")
		function opt_notify:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_notify:get(value)
			return value or "0"
		end

	local opt_latest = FotaGeneral:option("latest")
		function opt_latest:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_latest:get(value)
			return value or "0"
		end

return Fota