local ConfigService = require("api/ConfigService")
local pac = require("vuci.package_checker")
local firewall_installed = pac.is_installed("firewall")
local ac = require("vuci.access")

local snmp_settings = ConfigService:new({ delete = false, create = false })

local CODES = {
	NO_COMMUNITIES = 2
}

function snmp_settings:count_communities()
	local count = 0
		self:table_foreach("snmpd", "com2sec", function(_)
			count = count + 1
		end)
		self:table_foreach("snmpd", "com2sec6", function(_)
			count = count + 1
		end)
	return count
end

function snmp_settings:PUT_section_init_hook()
	if not firewall_installed then return end
	self:table_foreach("firewall", "redirect", function(s)
		if s.name == "dmz_fw" and (not s.enabled or s.enabled == "1") then
			self.DMZ_enabled = true
			return false
		end
	end)
end

function snmp_settings:PUT_before_commit_hook()
	if not firewall_installed then return end
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local allow_ra = self:get_abs_value(self.config, self.sid, "allow_ra")
	local rule_enable = allow_ra == "1" and enabled == "1" and "1" or "0"
	local rule = self:get_snmp_rule()
	if rule then
		local port = self:get_abs_value(self.main_config, self.sid, "port") or ""
		if rule_enable ~= rule.enabled then
			self:table_set("firewall", rule[".name"], "enabled", rule_enable)
		end
		if port ~= rule.dest_port then
			self:table_set("firewall", rule[".name"], "dest_port", port)
		end
	else
		self:create_firewall_rule(rule_enable)
	end

	if not self.DMZ_enabled then return end

	self:table_foreach("firewall", "redirect", function(s)
		if s.name == "dmz_snmp" then
			self:table_set("firewall", s[".name"], "enabled", rule_enable == "1" and "" or "0")
			return false
		end
	end)

	ac.setup_dmz_redirects(self)
end

function snmp_settings:require_validation()
	local _enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if _enabled and _enabled == "1" then
		local _v1mode = self:get_abs_value(self.config, self.sid, "v1mode")
		local _v2mode = self:get_abs_value(self.config, self.sid, "v2cmode")
		local _v3mode = self:get_abs_value(self.config, self.sid, "v3mode")
		if _v1mode and _v1mode == "0" and _v2mode and _v2mode == "0" and _v3mode and _v3mode == "0" then
			self:add_critical_error(STD_CODES.INVALID_SECTION, "Can't enable SNMP, without selected SNMP mode", "Validation")
		end
	end

	if _enabled ~= "1" and self:table_get("lldp", "lldp", "enabled") == "1" then
		self:add_critical_error(STD_CODES.CONF_ERROR, "Can't be disabled while LLDP is enabled", "Validation")
	end
end

snmp_settings.PUT_validate_section_hook = snmp_settings.require_validation

	local agent = snmp_settings:section("snmpd", "agent")
		local enabled = agent:option("enabled")
		enabled.require = { ["1"] = { "port", "ip_type" } }
			function enabled:validate(value)
				if value == "1" and self:count_communities() == 0 then
					self:add_critical_error(
						CODES.NO_COMMUNITIES,
						"At least one community configuration must exist to enable the SNMP service.",
						"Validation"
					)
				end
				return self.dt:is_bool(value)
			end

		if firewall_installed then
			local allow_ra = agent:option("allow_ra")
				function allow_ra:validate(value)
					return self.dt:is_bool(value)
				end
		end

		local ip_type = agent:option("ip_type")
			function ip_type:validate(value)
				return self.dt:check_array(value, { "ipv4", "ipv6", "ipv4v6" })
			end
			function ip_type:set(value)
				self:table_set(self.config, self.sid, "ipfamily", value)
			end
			function ip_type:get(_)
				return self:table_get(self.config, self.sid, "ipfamily")
			end

		local port = agent:option("port")
			function port:validate(value)
				return self.dt:port(value)
			end
			function port:set(value)
				self:table_set(self.config, self.sid, self.api_key, value)
				if not firewall_installed then return end
				self:table_foreach("firewall", "redirect", function(s_firewall)
					if s_firewall.name and s_firewall.name == "dmz_snmp" then
						self:table_set("firewall", s_firewall[".name"], "src_dport", value)
					end
				end)
			end

		local v1mode = agent:option("v1mode")
			function v1mode:validate(value)
				return self.dt:is_bool(value)
			end

		local v2cmode = agent:option("v2cmode")
			function v2cmode:validate(value)
				return self.dt:is_bool(value)
			end

		local v3mode = agent:option("v3mode")
			function v3mode:validate(value)
				return self.dt:is_bool(value)
			end

function snmp_settings:get_snmp_rule()
	local rule
	self:table_foreach("firewall", "rule", function(s)
		if s.name and s.name == "SNMP_WAN_Access" then
			rule = s
		end
	end)
	return rule
end

function snmp_settings:create_firewall_rule(allow_ra)
	local port = self:get_abs_value(self.main_config, self.sid, "port")
	local _wan_zone = false
	self:table_foreach("firewall", "zone", function(zone)
		if zone.name and zone.name == "wan" then
			_wan_zone = true
		end
	end)
	if _wan_zone then
		local snmp_rule_options = {
			target = "ACCEPT",
			proto = "udp",
			name = "SNMP_WAN_Access",
			src = "wan",
			enabled = allow_ra
		}
		if port then
			snmp_rule_options["dest_port"] = port
		end
		self:table_section("firewall", "rule", self:next_id("firewall"), snmp_rule_options)
	else
		self:add_error(STD_CODES.UCI_CREATE_ERROR, "Could not add firewall rule.", "UCI")
	end
end

return snmp_settings
