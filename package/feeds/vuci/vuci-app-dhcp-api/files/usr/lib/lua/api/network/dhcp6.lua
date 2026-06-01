-- FIXME this part should be moved to a separate file using inheritance. 
-- START:

local util = require("vuci.util")
local board = require("vuci.board")

if board:is_switch() then return nil end

local ConfigService = require("api/ConfigService")

local dhcp6 = ConfigService:new()

dhcp6.ERR_CODES = {
	INVALID_INTERFACE_TYPE = 1
}

dhcp6.RA_MANAGEMENT_TABLE = {
	["0"] = { ra_slaac = "1", ra_flags = "other-config" },
	["1"] = { ra_slaac = "1", ra_flags = "managed-config" },
	["2"] = { ra_slaac = "0", ra_flags = "managed-config" }
}

local STATUS_CODES = {
	PROCESS_NOT_RUNNING = 1,
	DHCPv6_SERVER_DISABLED = 2,
	INTERFACE_DISABLED = 3,
	INTERFACE_NOT_RUNNING = 4
}

local STATUS_MESSAGES = {
	PROCESS_NOT_RUNNING = "Odhcpd process is not running.",
	DHCPv6_SERVER_DISABLED = "DHCPv6 server on this interface is disabled.",
	INTERFACE_DISABLED = "Interface, on which this DHCPv6 server is created, is disabled.",
	INTERFACE_NOT_RUNNING = "Interface, on which this DHCPv6 server is created, is down."
}

function dhcp6:initialize_hook()
	self.modems = nil
	self.reinit_modems = {}
	self.modified_sections = {}
end

function dhcp6:section_init_hook()
	self.modified_sections[self.sid] = true
end
dhcp6.POST_section_init_hook = dhcp6.section_init_hook
dhcp6.PUT_section_init_hook = dhcp6.section_init_hook

function dhcp6:validate_enable()
	local enabled = self.current_data_block.enable_dhcpv6
	if not enabled then
		enabled = self:table_get(self.config, self.sid, "ignore_ipv6") == "1" and "0" or "1"
	end

	if enabled == "1" then
		local ra = self.current_data_block.ra or self:table_get(self.config, self.sid, "ra")
		local dhcpv6 = self.current_data_block.dhcpv6 or self:table_get(self.config, self.sid, "dhcpv6")
		local ndp = self.current_data_block.ndp or self:table_get(self.config, self.sid, "ndp")
		if (not ra or ra == "") and (not dhcpv6 or dhcpv6 == "") and (not ndp or ndp == "") then
			self:add_error(STD_CODES.INVALID_OPT, "Missing one of required option: ra, dhcpv6, ndp", "enable_dhcpv6")
		end
	end
end
dhcp6.PUT_validate_section_hook = dhcp6.validate_enable

function dhcp6:POST_validate_section_hook()
	local area_type = self:get_abs_value("network", self.sid, "area_type")
	local network_section = self:table_get("network", self.sid)
	if not network_section or network_section[".type"] ~= "interface" then
		self:add_error(STD_CODES.INVALID_SECTION, "DHCP configuration ID must match an ID of a network interface configuration.", "URL")
		return
	end
	if network_section.proto ~= "static" then
		self:add_error(STD_CODES.INVALID_SECTION, "DHCP configuration can only be created for interface with static protocol.", "URL")
		return
	end
	if area_type == "wan" then
		self:add_error(self.ERR_CODES.INVALID_INTERFACE_TYPE,
			"DHCP configuration can be created only for LAN type interfaces", "id", self.sid)
		return
	end

	self:validate_enable()
end

-- FIXME this part should be moved to a separate file using inheritance. 
-- END

function dhcp6:after_data_hook()
	-- Add default DHCPV6 server settings if it's enabled without any of them
	local ra = self:table_get(self.config, self.sid, "ra")
	local dhcpv6 = self:table_get(self.config, self.sid, "dhcpv6")
	local ndp = self:table_get(self.config, self.sid, "ndp")
	if self:table_get(self.config, self.sid, "ignore_ipv6") ~= "1" and not ndp and
		(not ra or ra == "disabled") and (not dhcpv6 or dhcpv6 == "disabled") then
		self:table_set(self.config, self.sid, "ra", "server")
		self:table_set(self.config, self.sid, "dhcpv6", "server")
	end

	-- Add default leasetime if it's enabled without it
	if not self:table_get(self.config, self.sid, "leasetime") then
		self:table_set(self.config, self.sid, "leasetime", "12h")
	end
end
dhcp6.POST_after_data_hook = dhcp6.after_data_hook
dhcp6.PUT_after_data_hook = dhcp6.after_data_hook

-- FIXME this part should be moved to a separate file using inheritance. 
-- START:

local s = dhcp6:section("dhcp", "dhcp")
function s:create_defaults(sid)
	return {
		interface = sid,
		ignore = "1",
		ignore_ipv6 = "1"
	}
end

	local enable_dhcpv6 = s:option("enable_dhcpv6")
		function enable_dhcpv6:validate(value)
			return self.dt:is_bool(value)
		end
		function enable_dhcpv6:get(_)
			return self:table_get(self.config, self.sid, "ignore_ipv6") == "1" and "0" or "1"
		end
		function enable_dhcpv6:set(value)
			if value == "1" then
				self:table_delete(self.config, self.sid, "ignore_ipv6")
			else
				self:table_set(self.config, self.sid, "ignore_ipv6", "1")
			end
		end

  local interface = s:option("interface")
    interface.readonly = true
    function interface:get(value) return util.network_mapper_get(self, value) end

  local leasetime = s:option("leasetime")
    function leasetime:validate(value)
      if value == "infinite" then
        return true
      end

      local ok = value:match("^%d+[shm]$")
      if not ok then return false, "Allowed single word 'infinite' or characters: positive number followed by 'h', 'm' or 's' symbol." end

      local time, letter = value:match("(%d+)(%a)")
      local valid, err
      if letter == "s" then valid, err = self.dt:range(tonumber(time), 120, 999999)
      elseif letter == "m" then valid, err = self.dt:range(tonumber(time), 2, 999999)
      elseif letter == "h" then valid, err = self.dt:range(tonumber(time), 1, 99999)
      end
      if (letter == 's' and not valid) or
          (letter == 'm' and not valid) or
          (letter == 'h' and not valid) then
        return false, err
      end
      return true
    end

  local dynamicdhcp = s:option("dynamicdhcp")
    function dynamicdhcp:validate(value) return self.dt:is_bool(value) end
    function dynamicdhcp:get(value) return not value and "1" or value  end
    function dynamicdhcp:set(value) return self:table_set(self.config, self.sid, self.api_key, value == "1" and "" or value) end

  local force = s:option("force")
    function force:validate(value) return self.dt:is_bool(value) end

-- FIXME this part should be moved to a separate file using inheritance. 
-- END

	local ra = s:option("ra")
		function ra:validate(value) return self.dt:check_array(value, {"server", "relay", "hybrid"}) end

	local dhcpv6 = s:option("dhcpv6")
		function dhcpv6:validate(value) return self.dt:check_array(value, {"server", "relay", "hybrid"}) end

	local ndp = s:option("ndp")
		function ndp:validate(value) return self.dt:check_array(value, {"relay", "hybrid"}) end

	local ra_management = s:option("ra_management")
		function ra_management:validate(value) return self.dt:check_array(value, {"0", "1", "2"}) end
		function ra_management:get(value)
			local ra_slaac = self:table_get(self.config, self.sid, "ra_slaac") or "1"
			local ra_flags = self:table_get(self.config, self.sid, "ra_flags") or { "other-config" }
			for k, v in pairs(self.RA_MANAGEMENT_TABLE) do
				for _, flag in ipairs(ra_flags or {}) do
					if v.ra_slaac == ra_slaac and v.ra_flags == flag then
						return k
					end
				end
			end

			return "0"
		end

		function ra_management:set(value)
			if value == "" then
				self:table_delete(self.config, self.sid, "ra_slaac")
				self:table_delete(self.config, self.sid, "ra_flags")
				return
			end
			self:table_set(self.config, self.sid, "ra_slaac", self.RA_MANAGEMENT_TABLE[value].ra_slaac)
			local ra_flags = self:table_get(self.config, self.sid, "ra_flags")
			local new_flags = {}

			--managed-config and other-config flags are mutually exclusive, so only home-agent flag needs to be kept if set
			for _, flag in ipairs(ra_flags or {}) do
				if flag == "home-agent" then
					table.insert(new_flags, flag)
					break
				end
			end

			table.insert(new_flags, self.RA_MANAGEMENT_TABLE[value].ra_flags)

			self:table_set(self.config, self.sid, "ra_flags", new_flags)
		end

	local ra_default = s:option("ra_default")
		function ra_default:validate(value) return self.dt:is_bool(value) end

	local dns = s:option("dns", { list = true })

	local domain = s:option("domain", { list = true })

function dhcp6:GET_TYPE_status()
	local function interface_enabled(interface)
		return self:table_get("network", interface, "disabled") ~= "1"
	end

	local function interface_up(interface)
		local iface = util.ubus("network.interface." .. interface, "status") or {}
		return iface and iface.up or false
	end

	local res, odhcpd_running = {}, true

	local ok = util.file_exec("/bin/pidof", {"odhcpd"})
	if ok and ok.code == 1 then
		odhcpd_running = false
	end

	self:table_foreach(self.config, "dhcp", function(s)
		local server_running, errors, intf_down = false, {}, false

		if not interface_enabled(s.interface) then
			intf_down = true
			table.insert(errors, {error = STATUS_CODES.INTERFACE_DISABLED, error_message = STATUS_MESSAGES.INTERFACE_DISABLED})
		end

		if not interface_up(s.interface) and not intf_down then
			table.insert(errors, {error = STATUS_CODES.INTERFACE_NOT_RUNNING, error_message = STATUS_MESSAGES.INTERFACE_NOT_RUNNING})
		end

		if s.ignore_ipv6 == "1" then
			table.insert(errors, {error = STATUS_CODES.DHCPv6_SERVER_DISABLED, error_message = STATUS_MESSAGES.DHCPv6_SERVER_DISABLED})
		end

		if #errors == 0 and odhcpd_running then
			server_running = true
		elseif #errors == 0 and not odhcpd_running then
			table.insert(errors, {error = STATUS_CODES.PROCESS_NOT_RUNNING, error_message = STATUS_MESSAGES.PROCESS_NOT_RUNNING})
		end

		if server_running then
			table.insert(res, { id = s.interface, running = server_running, interface = util.network_mapper_get(self, s.interface) })
		else
			table.insert(res, { id = s.interface, running = server_running, interface = util.network_mapper_get(self, s.interface), errors = errors })
		end
	end)

	return self:ResponseOK(res)
end

return dhcp6
