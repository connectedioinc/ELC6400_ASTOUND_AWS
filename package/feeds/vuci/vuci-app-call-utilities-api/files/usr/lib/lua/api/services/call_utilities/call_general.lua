local ConfigService = require("api/ConfigService")
local mdm = require("vuci.modem")

if mdm:modem_count() == 0 then
	return nil
else
	for _, modem in ipairs(mdm:get_all_modems()) do
		if modem.id and not mdm:call_functionality_supported(modem.id) then
			return nil
		end
	end
end

local CallUtilities = ConfigService:new({
	create = false,
	delete = false,
	general_section = "call",
	global_settings = true
})

local s = CallUtilities:section("call_utils", "call")

function CallUtilities:PUT_validate_section_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if enabled == "1" and self:table_get("callman", "callman", "enabled") == "1" then
		self:add_error(STD_CODES.INVALID_OPT,
			"Only one of Call Utilities or Phone Settings can be enabled at a time.",
			"enabled", self.sid, enabled)
	end
end

	local enabled = s:option("enabled")
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end
	enabled.require = { ["1"]	 = { "action" } }

	local opt_action = s:option("action")
	opt_action.require = {["answer"] = {"line_close_time"}}
		function opt_action:validate(value)
			return self.dt:check_array(value, {
				"reject", "answer", "ignore"
			})
		end

	local opt_line_close_time = s:option("line_close_time")
		function opt_line_close_time:validate(value)
			return self.dt:irange(value, 0, 100)
		end

return CallUtilities