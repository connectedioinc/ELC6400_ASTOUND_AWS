local ConfigService = require("api/ConfigService")

local HTTPS_DNS_PROXY_GLOBAL = ConfigService:new({
	delete = false,
	create = false,
	general_section = "config",
	global_settings = true
})

local MAIN = HTTPS_DNS_PROXY_GLOBAL:section("https-dns-proxy", "main")

	local enabled = MAIN:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function enabled:get(value)
			return value or "0"
		end

return HTTPS_DNS_PROXY_GLOBAL
