local board = require("vuci.board")
if not board:has_ios() then return nil end

local ConfigService = require("api/ConfigService")

local IoScheduler = ConfigService:new({ create = false, delete = false, general_section = "general", global_settings = true })

local s = IoScheduler:section("io_scheduler", "general")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return IoScheduler