local ConfigService = require("api/ConfigService")
local firewall_lib = require("api.network.firewall.firewall_lib")

local IpFilter = ConfigService:new{ increment_name = true }
IpFilter.order_by = "priority"

local s = IpFilter:section("firewall", "rule")
function s:create_defaults()
	local enabled = self:table_get("rs_overip", self.binding, "enabled") or "0"

	return firewall_lib:rule_create_defaults(self, "overip", self.binding, {
		target = "ACCEPT",
		enabled = enabled,
		src = "lan",
		name = self:pick_next_name(self.binding)
	})
end
function s:filter(c)
	return firewall_lib:is_rule(self, c[".name"], "overip", self.binding)
end

function IpFilter:parent_exists()
	if self.binding and not self.uci:get("rs_overip", self.binding) then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Parent section '%s' does not exist", self.binding),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local firewall_zone = s:option("src")
		function firewall_zone:validate(value)
			local interface_options = {}
			self:table_foreach("firewall", "zone", function(c)
				table.insert(interface_options, c.name)
			end)
			return self.dt:check_array(value, interface_options)
		end
		function firewall_zone:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local allow_ip = s:option("src_ip", { list = true })
		function allow_ip:validate(value)
			return self.dt:ipmask(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- Shift over all rules, so ip filter could be inserted with highest priority
function IpFilter:POST_after_data_hook()
	local rules = {}
	self:table_foreach("firewall", "rule", function (s)
		if s[".name"] ~= self.sid then
			table.insert(rules, s)
		end
	end)

	local rule_ids = { self.sid }
	for i, rule in ipairs(rules) do
		table.insert(rule_ids, rule[".name"])
		self:table_set(self.config, rule[".name"], "priority", tostring(i+1))
	end
	self:table_set(self.config, self.sid, "priority", "1")

	s:force_reorder(rule_ids)
end

function IpFilter:pick_next_name(overip_id)
	local ip_filter_index = 1

	local name
	while true do
		name = ("Over IP %s - IP Filter %s"):format(overip_id, ip_filter_index)
		if not self:table_find(self.main_config, "rule", { name = name }) then
			break
		end

		ip_filter_index = ip_filter_index + 1
	end

	return name
end

return IpFilter
