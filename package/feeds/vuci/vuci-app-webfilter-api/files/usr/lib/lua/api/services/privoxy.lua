local ConfigService = require("api/ConfigService")

local privoxy = ConfigService:new({ create = false, delete = false, general_section = "privoxy" })

local s = privoxy:section("privoxy", "privoxy")

	local enabled = s:option("enabled")
		function enabled:validate(value) return self.dt:is_bool(value) end

	local mode = s:option("mode")
		function mode:validate(value) return self.dt:check_array(value, {"blacklist", "whitelist"}) end
		function mode:set(value)
			self:table_set(self.config, self.sid, "_mode", value)
		end
		function mode:get()
			return self:table_get(self.config, self.sid, "_mode")
		end

	local url = s:option("url", { list = true })
		function url:validate(value) return true end

return privoxy
