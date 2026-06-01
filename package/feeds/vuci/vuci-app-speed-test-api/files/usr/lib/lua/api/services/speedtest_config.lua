local ConfigService = require("api/ConfigService")

local SpeedtestConfig = ConfigService:new({
	create = false,
	delete = false,
	general_section = function() return 'general' end
})

function SpeedtestConfig:initialize_hook()
	self.service_group = "config"
end

local config = SpeedtestConfig:section("speedtest", "speedtest_config")
local custom_url = config:option("custom_url")
function custom_url:validate(value)
	return self.dt:url(value)
end

return SpeedtestConfig
