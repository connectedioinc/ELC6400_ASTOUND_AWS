local ConfigService = require("api/ConfigService")
local hs_util = require("api.services.hotspot_utils")

local hotspot_landing_page = ConfigService:new({
	create = false,
	delete = false,
	general_section = "general",
	global_settings = true
})

local s = hotspot_landing_page:section("landingpage", "landing")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local theme = s:option("theme")
		local themes = hs_util:get_themes()

		function theme:validate(value)
			local theme_options = {}
			for _, theme in ipairs(themes) do
				table.insert(theme_options, theme.id)
			end
			return self.dt:check_array(value, theme_options)
		end
		

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return hotspot_landing_page