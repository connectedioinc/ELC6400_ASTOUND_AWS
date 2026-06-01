local attack_prevention_common = {}

function attack_prevention_common:limit_enabled_set(cs, limit_enabled_name)
    local value = cs:getter_wrapped_abs_value(cs.config, cs.sid, limit_enabled_name) or ""
    cs:table_set(cs.config, cs.sid, limit_enabled_name, value)

    if value == "0" or value == "" then
        cs:table_delete(cs.config, cs.sid, "limit")
        cs:table_delete(cs.config, cs.sid, "limit_burst")
    end
end

function attack_prevention_common:add_limit_options(cs, rule)
	cs.option_data = require("api.network.firewall.traffic_rules_options")()
	cs.extra_options = {}
	local param_keys = { "require", "validate", "get", "set" }
	local limit_options = { "period", "limit", "limit_burst", "limit_log_overlimit" }

	for _, opt_name in ipairs(limit_options) do
		cs.extra_options[opt_name] = rule:option(opt_name, cs.option_data.options[opt_name].params or {})
		for _, key in ipairs(param_keys) do
			cs.extra_options[opt_name][key] = cs.option_data.options[opt_name][key] or  cs.extra_options[opt_name][key]
		end
	end
end

return attack_prevention_common
