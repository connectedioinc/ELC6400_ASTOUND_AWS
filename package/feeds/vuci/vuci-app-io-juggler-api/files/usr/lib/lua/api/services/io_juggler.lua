local board = require("vuci.board")
if not board:has_ios() then return nil end

local ConfigService = require("api/ConfigService")

local IoJuggler = ConfigService:new({
	create = false,
	delete = false,
	general_section = "general",
	global_settings = true
})

local s = IoJuggler:section("event_juggler", "general")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return IoJuggler