local ConfigService = require("api/ConfigService")
local BACnet = ConfigService:new({ create = false, delete = false })

local function handle_firewall_changes(allow_ra, self)
	local firewall_rule = self:table_find("firewall", "rule", { name = "BACnet" })
	local sid = firewall_rule and firewall_rule[".name"]

	if allow_ra then
		self:table_set(self.config, self.sid, "allow_ra", allow_ra)
	end
	if not sid then
		local port = self:get_abs_value("bacnet_router", "general", "bbmd_port")
		local forward = {
			proto = "udp",
			name = "BACnet",
			enabled = allow_ra == "" and "0" or allow_ra,
			target = "ACCEPT",
			dest_port = port,
			src = "wan"
		}
		self:table_section("firewall", "rule", self:next_id("firewall"), forward)
	end
	if sid then
		self:table_set("firewall", sid, "enabled", allow_ra)
	end
end

local s = BACnet:section("bacnet_router", "general")

	local bbmd_port = s:option("bbmd_port")
		function bbmd_port:validate(value)
			return self.dt:port(value)
		end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			local sections = self:table_count("bacnet_router", "port")
			local bbmd_enabled = self:get_abs_value(self.config, self.sid, "bbmd_enabled") == "1" and 1 or 0
			local total_sections = sections + bbmd_enabled
			if value == "1" and total_sections < 2 then
				return false, 'At least two interfaces need to be configured for BACnet to work.'
			end
			return self.dt:is_bool(value)
		end

	local bbmd_enabled = s:option("bbmd_enabled")
	bbmd_enabled.require = { ["1"] = { "force_gateway", "bbmd_port", "bbmd_interface" } }
		function bbmd_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local bbmd_interface = s:option("bbmd_interface")
		function bbmd_interface:validate(value)
			local devices_status = require("vuci.devices_status_lib"):new(self.uci)
			local devices = devices_status:get_device_status()
			local devnames = {}
			for _, dev in ipairs(devices) do
				local name = dev.name
				if name and name ~= "lo" and not name:find("sit") and not name:match("^wwan") and not name:match("^rmnet") then
					devnames[#devnames + 1] = name
				end
			end
			return self.dt:check_array(value, devnames)
		end
	local allow_ra = s:option("allow_ra")
		function allow_ra:validate(value)
			return self.dt:is_bool(value)
		end
		function allow_ra:set(value)
			handle_firewall_changes(value, self)
		end
		function allow_ra:get(value)
			local firewall_rule = self:table_find("firewall", "rule", { name = "BACnet" })
			local firewall = firewall_rule and firewall_rule.enabled
			return firewall or value or "0"
		end

	local force_gateway = s:option("force_gateway")
	force_gateway.require = { ["1"] = { "gateway_address", "gateway_port" } }
		function force_gateway:validate(value)
			return self.dt:is_bool(value)
		end

	local gateway_address = s:option("gateway_address")
		function gateway_address:validate(value)
			return self.dt:ip4addr(value)
		end

	local gateway_port = s:option("gateway_port")
		function gateway_port:validate(value)
			return self.dt:port(value)
		end

function BACnet:PUT_validate_section_hook()

	local firewall_rule = self:table_find("firewall", "rule", { name = "BACnet" })
	local bbmd_enabled = self:get_abs_value(self.config, self.sid, "bbmd_enabled")
	if firewall_rule and bbmd_enabled == "1" then
		local current_port = self:get_abs_value(self.config, self.sid, "bbmd_port")
		if type(current_port) == "string" then
			self:table_set("firewall", firewall_rule['.name'], "dest_port", current_port)
		end
	end
end

return BACnet
