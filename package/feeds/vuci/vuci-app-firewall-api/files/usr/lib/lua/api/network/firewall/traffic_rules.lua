local ConfigService = require("api/ConfigService")

local traffic_rules = ConfigService:new{ increment_name = true }
traffic_rules.order_by = "priority"

function traffic_rules:check_tcpmss_proto()
	local proto = self:getter_wrapped_abs_value(self.config, self.sid, "proto") or {}
	local target = self:getter_wrapped_abs_value(self.config, self.sid, "target") or ""
	if target == "TCPMSS" and (#proto ~= 1 or proto[1] ~= "tcp") then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"'TCPMSS' target can only be used with proto 'tcp'",
			"Validation"
		)
	end
end

--Add flag filter to TCPMSS extra, because rule will error without it, also that user can change flags if needed
function traffic_rules:check_tcpmss_target()
	local target = self:table_get(self.config, self.sid, "target")
	local extra = self:table_get(self.config, self.sid, "extra") or ""
	if target == "TCPMSS" and not extra:match("%-%-tcp%-flags") then
		extra = extra .. " --tcp-flags SYN,RST SYN"
		self:table_set(self.config, self.sid, "extra", extra)
	end
end

traffic_rules.PUT_before_commit_hook = function()
	traffic_rules:check_tcpmss_target()
end
traffic_rules.POST_before_commit_hook = function()
	traffic_rules:check_tcpmss_target()
end

traffic_rules.POST_validate_section_hook = traffic_rules.check_tcpmss_proto
traffic_rules.PUT_validate_section_hook = traffic_rules.check_tcpmss_proto

	local rule = traffic_rules:section("firewall", "rule")

	function traffic_rules:initialize_hook()
	self.option_data = require("api.network.firewall.traffic_rules_options")()

	self.extra_options = {}
	local param_keys = { "require", "maxlength", "readonly", "validate", "get", "set" }
	for opt_name, opt in pairs(self.option_data and self.option_data.options or {}) do
		self.extra_options[opt_name] = rule:option(opt_name, opt.params or {})
		for _, key in ipairs(param_keys) do
			self.extra_options[opt_name][key] = opt[key] or self.extra_options[opt_name][key]
		end
	end
end

	function rule:create_defaults()
		return {
			target = "ACCEPT",
			enabled = "0"
		}
	end

return traffic_rules
