local ConfigService = require("api/ConfigService")

local banner = ConfigService:new({ delete = false, create = false, general_section = "banner" })

local s = banner:section("system", "banner")

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "message", "title" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local title = s:option("title")
		title.maxlength = 64
		function title:validate() return true end

	local message = s:option("message")
		message.maxlength = 512
		function message:validate() return true end

return banner
