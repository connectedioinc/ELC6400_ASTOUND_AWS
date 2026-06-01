-- FIXME this part should be moved to a separate file using inheritance. 
-- START:

local ConfigService = require("api/ConfigService")

local util = require("vuci.util")
local nixio = require "nixio"
local fs = require("nixio.fs")
local ipc = require("luci.ip")
local network_lib = require("vuci.network_lib")

local STATUS_CODES = {
	PROCESS_NOT_RUNNING = 1,
	DHCPv4_SERVER_DISABLED = 2,
	INTERFACE_DISABLED = 3,
	INTERFACE_NOT_RUNNING = 4,
	DHCPv4_SERVER_ALREADY_EXISTS = 5,
	RESTART_FAILED = 6
}

local STATUS_MESSAGES = {
	PROCESS_NOT_RUNNING = "Dnsmasq process is not running.",
	DHCPv4_SERVER_DISABLED = "DHCPv4 server on this interface is disabled.",
	INTERFACE_DISABLED = "Interface, on which this DHCPv4 server is created, is disabled.",
	INTERFACE_NOT_RUNNING = "Interface, on which this DHCPv4 server is created, is down.",
	DHCPv4_SERVER_ALREADY_EXISTS = "DHCPv4 server is already running on this interface.",
	RESTART_FAILED = "Failed to restart DHCPv4 servers."
}

local dhcp = ConfigService:new()

dhcp.ERR_CODES = {
	INVALID_INTERFACE_TYPE = 1
}

function dhcp:initialize_hook()
	self.modems = nil
	self.modified_sections = {}
end

function dhcp:section_init_hook()
	self.modified_sections[self.sid] = true
end
dhcp.POST_section_init_hook = dhcp.section_init_hook
dhcp.PUT_section_init_hook = dhcp.section_init_hook

function dhcp:POST_validate_section_hook()
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
	end
end

-- FIXME this part should be moved to a separate file using inheritance. 
-- END

local function ip_to_decimal(ip)
	local a = util.split(ip, ".")
	local decAddr = 0
	for i = 1, 4 do
		a[i] = tonumber(a[i])
		if not a[i] then return nil end
	end

	decAddr = decAddr + a[1] * 16777216
	decAddr = decAddr + a[2] * 65536
	decAddr = decAddr + a[3] * 256
	decAddr = decAddr + a[4]
	return decAddr
end

local function network_start(ipaddr, netmask)
	local bit = nixio.bit
	local a = {0,0,0,0}
	local ipArr = util.split(ipaddr, ".")
	local netmaskArr = util.split(netmask, ".")
	for i = 1, 4 do
		a[i] = bit.band(tonumber(ipArr[i]), tonumber(netmaskArr[i]))
	end

	return table.concat(a, ".")
end

local function decimal_to_ip(dec_ip)
	local bit = nixio.bit
	local n1 = bit.band(bit.rshift(dec_ip, 24), 255)
	local n2 = bit.band(bit.rshift(dec_ip, 16), 255)
	local n3 = bit.band(bit.rshift(dec_ip, 8), 255)
	local n4 = bit.band(bit.rshift(dec_ip, 0), 255)
    return table.concat({n1,n2,n3,n4}, ".")
end

local mode
function dhcp:before_commit_hook()
	local dhcp_option = self:get_abs_value(self.config, self.sid, "dhcp_option") or {}
	local options_hash = {}
	for _, s in ipairs(dhcp_option) do
		local values_hash = {}
		local values = util.split(s, ",")
		local option = values[1]
		table.remove(values, 1)
		if options_hash[option] then
			self:add_critical_error(
				STD_CODES.INVALID_OPT,
				"Duplicate option code values are not allowed",
				"Validation"
			)
			break
		end
		for _, val in ipairs(values) do
			if values_hash[val] then
				self:add_critical_error(
					STD_CODES.INVALID_OPT,
					"Duplicate values with same option code are not allowed",
					"Validation"
				)
				break
			end
			values_hash[val] = true
		end
		options_hash[option] = true
	end
	for sid in pairs(self.modified_sections) do
		local server_ip = self:table_get(self.config, sid, "server_relay")
		local ipaddr = self:table_get("network", sid, "ipaddr")
		local circuit_id = self:getter_wrapped_abs_value(self.config, sid, "circuit_id")
		local remote_id = self:getter_wrapped_abs_value(self.config, sid, "remote_id")
		local dhcp_mode = mode:get(nil, sid)
		local relay_id = sid .. "_relay"
		local relay_section = self:table_get(self.config, relay_id)
		if relay_section then
			relay_section = relay_section[".name"]
		else
			self:table_foreach(self.config, "relay", function(s)
				if s.local_addr == ipaddr then
					relay_section = s[".name"]
					return false
				end
			end)
		end
		if dhcp_mode == "relay" then
			if not relay_section then
				self:table_section(self.config, "relay", relay_id, {
					local_addr = ipaddr,
					server_addr = server_ip,
					circuit_id = circuit_id,
					remote_id = remote_id,
				})
			else
				self:table_set(self.config, relay_section, "server_addr", server_ip)
				self:table_set(self.config, relay_section, "circuit_id", circuit_id or "")
				self:table_set(self.config, relay_section, "remote_id", remote_id or "")
			end
		else
			if relay_section then
				self:table_delete(self.config, relay_section)
			end
		end
	end

	network_lib:update_mobile_ipv4_conn_setup(dhcp)
end
dhcp.POST_before_commit_hook = dhcp.before_commit_hook
dhcp.PUT_before_commit_hook = dhcp.before_commit_hook

function dhcp:DELETE_before_section_delete_hook()
	local ipaddr = self:table_get("network", self.sid, "ipaddr")
	local relay_id = self.sid .. "_relay"
	local relay_section = self:table_get(self.config, relay_id)
	if relay_section then
		relay_section = relay_section[".name"]
	else
		self:table_foreach(self.config, "relay", function(s)
			if s.local_addr == ipaddr then
				relay_section = s[".name"]
				return false
			end
		end)
	end
	if relay_section then
		self:table_delete(self.config, relay_section)
	end
end

function dhcp:DELETE_before_commit_hook()
	network_lib:update_mobile_ipv4_conn_setup(dhcp)
end

function dhcp:after_data_hook()
	-- Add default DHCPV4 server settings if it's enabled without any of them
	if self:table_get(self.config, self.sid, "ignore") ~= "1" and
		not self:table_get(self.config, self.sid, "server_relay") then
		if not self:table_get(self.config, self.sid, "start") then
			self:table_set(self.config, self.sid, "start", "100")
		end
		if not self:table_get(self.config, self.sid, "limit") then
			self:table_set(self.config, self.sid, "limit", "150")
		end
		if not self:table_get(self.config, self.sid, "leasetime") then
			self:table_set(self.config, self.sid, "leasetime", "12h")
		end
	end
end
dhcp.POST_after_data_hook = dhcp.after_data_hook
dhcp.PUT_after_data_hook = dhcp.after_data_hook

function dhcp:get_used_netmask(sid, interface)
	-- Netmask in DHCP config has higher priority over the one from interface
	local netmask = self:get_abs_value("dhcp", sid, "netmask")
	local netmask_type = type(netmask)
	if not netmask or netmask_type == "table" or netmask_type == "number" or #netmask == 0 then
		netmask = self:table_get("network", interface, "netmask")
	end
	return self.dt:netmask(netmask) and netmask
end

-- FIXME this part should be moved to a separate file using inheritance. 
-- START:
local s = dhcp:section("dhcp", "dhcp")
function s:create_defaults(sid)
	return {
		interface = sid,
		ignore = "1",
		ignore_ipv6 = "1"
	}
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
      if letter == "s" then valid, err = self.dt:irange(time, 120, 999999)
      elseif letter == "m" then valid, err = self.dt:irange(time, 2, 999999)
      elseif letter == "h" then valid, err = self.dt:irange(time, 1, 99999)
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

	local enable_dhcpv4 = s:option("enable_dhcpv4")
		function enable_dhcpv4:validate(value)
			return self.dt:is_bool(value)
		end
		function enable_dhcpv4:get(_, sid)
			return self:table_get(self.config, sid, "ignore") == "1" and "0" or "1"
		end
		function enable_dhcpv4:set(value)
			if value == "1" then
				self:table_delete(self.config, self.sid, "ignore")
			else
				self:table_set(self.config, self.sid, "ignore", "1")
			end
		end

	mode = s:option("mode")
		mode.require = { relay = {"server_relay"} }
		function mode:validate(value) return self.dt:check_array(value, {"server", "relay"}) end
		function mode:get(_, sid)
			local val_relay = self:table_get(self.config, sid, "server_relay")
			return val_relay and "relay" or "server"
		end
		function mode:set(value)
			if value == "server" then
				self:table_delete(self.config, self.sid, "server_relay")
			end
		end

	local server_relay = s:option("server_relay")
		function server_relay:validate(value) return self.dt:ip4addr(value) end

	local circuit_id = s:option("circuit_id")
		circuit_id.require = { "remote_id" }
		function circuit_id:validate(value)
			return self.dt:max_bytes(value, 32)
		end
		function circuit_id:get(_, sid)
			if mode:get(nil, sid) == "relay" then
				return self:table_get(self.config, sid.."_relay", "circuit_id")
			end
		end
		function circuit_id:set() end

	local remote_id = s:option("remote_id")
		remote_id.require = { "circuit_id" }
		function remote_id:validate(value)
			return self.dt:max_bytes(value, 32)
		end
		function remote_id:get(_, sid)
			if mode:get(nil, sid) == "relay" then
				return self:table_get(self.config, sid.."_relay", "remote_id")
			end
		end
		function remote_id:set() end

	local end_ip
	local start_ip = s:option("start_ip")
		function start_ip:get(value, sid)
			if mode:get(nil, sid) == "relay" then
				return nil
			end

			local start = self:table_get("dhcp", sid, "start") or "100"
			start = start - "1"

			local interface = self:table_get("dhcp", sid, "interface")
			local ipaddr = self:table_get("network", interface, "ipaddr")
			local netmask = dhcp:get_used_netmask(sid, interface)
			if not ipaddr or not netmask then return nil end

			local addr = ipc.new(ipaddr, netmask)
			local start_ipaddr = addr:minhost()
			local min_host = addr:minhost()
			if min_host:add(start, true) and addr:contains(min_host) then
				start_ipaddr = min_host
			end

			return start_ipaddr:string()
		end
		function start_ip:set(value)
			local sid = self.sid
			local start_ip = value

			if start_ip == "" then
				self:table_delete("dhcp", sid, "start")
				return
			end

			local interface = self:table_get("dhcp", sid, "interface")
			local ipaddr = self:table_get("network", interface, "ipaddr")
			local netmask = dhcp:get_used_netmask(sid, interface)

			local n_start = network_start(ipaddr, netmask)
			local dec_n_start = ip_to_decimal(n_start)
			local dec_start_ip = ip_to_decimal(start_ip)

			local start = dec_start_ip - dec_n_start
			self:table_set("dhcp", sid, "start", start)
		end
		function start_ip:validate(value)
			local sid = self.sid
			local start_ip = value

			local ok, err = self.dt:ip4addr(start_ip)
			if not ok then return ok, err end

			local interface = self:table_get("dhcp", sid, "interface")
			local ipaddr = self:table_get("network", interface, "ipaddr")
			local netmask = dhcp:get_used_netmask(sid, interface)
			if not ipaddr or not netmask then return false, "Network interface IP address and netmask must be set." end

			local n_start = network_start(ipaddr, netmask)
			local dec_n_start = ip_to_decimal(n_start)
			local dec_start_ip = ip_to_decimal(start_ip)

			local start = dec_start_ip - dec_n_start
			if start <= 0 then
				return false, "Start IP must be greater than the network's start address (%s)." % n_start
			end
			return true
		end

	end_ip = s:option("end_ip")
		end_ip.require = {"start_ip"}
		function end_ip:get(value, sid)
			if mode:get(nil, sid) == "relay" then
				return nil
			end

			local limit = self:table_get("dhcp", sid, "limit") or "150"
			limit = limit - "1"

			local interface = self:table_get("dhcp", sid, "interface")
			local ipaddr = self:table_get("network", interface, "ipaddr")
			local netmask = dhcp:get_used_netmask(sid, interface)
			if not ipaddr or not netmask then return nil end

			local addr = ipc.new(ipaddr, netmask)
			local start_ipaddr = ipc.new(start_ip:get(nil, self.sid))
			local end_ipaddr = addr:maxhost()
			if start_ipaddr:add(limit, true) and addr:contains(start_ipaddr) then
				end_ipaddr = start_ipaddr
			end

			return end_ipaddr:string()
		end
		function end_ip:set(value)
			local sid = self.sid
			local start_ip = self.current_data_block.start_ip or start_ip:get(nil, self.sid)
			local end_ip = value

			if end_ip == "" then
				self:table_delete("dhcp", sid, "limit")
				return
			end

			local dec_start_ip = ip_to_decimal(start_ip)
			local dec_end_ip = ip_to_decimal(end_ip)
			local limit = dec_end_ip - dec_start_ip + 1
			self:table_set("dhcp", sid, "limit", limit)
		end
		function end_ip:validate(value)
			local sid = self.sid
			local start_ip_val = self.current_data_block.start_ip or start_ip:get(nil, self.sid)
			local end_ip_val = value

			local ok, err = self.dt:ip4addr(end_ip_val)
			if not ok then return ok, err end

			if not start_ip_val or start_ip_val == "" then
				return true -- will return error, because missing start_ip
			end
			ok, err = start_ip:validate(start_ip_val)
			if not ok then return true end -- will return error, because wrong start_ip


			local interface = self:table_get("dhcp", sid, "interface")
			local ipaddr = self:table_get("network", interface, "ipaddr")
			local netmask = dhcp:get_used_netmask(sid, interface)
			if not ipaddr or not netmask then return false, "Network interface IP address and netmask must be set." end

			local dec_ip_addr = ip_to_decimal(ipaddr)
			if not dec_ip_addr then return false, "Missing/invalid IP address." end

			local n_start = network_start(ipaddr, netmask)
			local dec_n_start = ip_to_decimal(n_start)
			local n_size = 4294967296 - ip_to_decimal(netmask)

			local dec_start_ip = ip_to_decimal(start_ip_val)
			local start = dec_start_ip - dec_n_start

			local dec_end_ip = ip_to_decimal(end_ip_val)
			local limit = dec_end_ip - dec_start_ip + 1
			if limit <= 0 then
				return false, "End IP address can not be smaller than the start IP address (%s)." % decimal_to_ip(dec_start_ip)
			end
			if limit + start > n_size then
				return false, "End IP address can not be greater than the last network address. (%s)" % decimal_to_ip(dec_n_start + n_size - 1)
			end
			return true
		end

	local netmask = s:option("netmask")
		function netmask:validate(value) return self.dt:netmask(value) end

	local dhcp_option = s:option("dhcp_option", { list = true })
		dhcp_option.minlength = 0
		dhcp_option.maxlength = 64
		function dhcp_option:validate(value)
			local valid, err = true, nil
			if tonumber(value) and tonumber(value) >= 0 then return true end
			local option, value = value:match("^(%d+),(.*)$")
			if not option or #option == 0 or not value or #value == 0 then
				return false, "option (positive integer) and value must be provided together and separated by comma. E.g. 3,192.168.1.1 . Only option (positive integer) is also accepted. E.g. 3 ."
			end

			local parsed_count = 0
			for sec in value:gmatch("([^,]+)") do
				if util.contains({"3", "6", "42"}, option) then
					parsed_count = parsed_count + 1
					valid, err = self.dt:ip4addr(sec)
				elseif option == "2" then
					parsed_count = parsed_count + 1
					valid, err = self.dt:integer(sec)
				elseif option == "15" then
					valid, err = self.dt:string(sec)
				end
				if not valid then
					return valid, err
				end
			end

			local _, expected_count = value:gsub(",", "")
			expected_count = expected_count + 1 -- Adding one to expected count because first comma is removed from value
			if util.contains({"3", "6", "42", "2"}, option) and parsed_count ~= expected_count then
				return false, string.format("Not enough values provided. Expected: %d values, but got: %d", expected_count, parsed_count)
			end

			return true
		end
		function dhcp_option:get(value)
			return self:table_get(self.config, self.sid, "dhcp_option") or self:table_get(self.config, self.sid, "dhcp_option_force")
		end
		function dhcp_option:set(value)
			local force = self.current_data_block.force_options or (self:table_get(self.config, self.sid, "dhcp_option_force") and "1" or nil)
			if force == "1" then
				self:table_delete(self.config, self.sid, "dhcp_option")
				self:table_set(self.config, self.sid, "dhcp_option_force", value)
			else
				self:table_delete(self.config, self.sid, "dhcp_option_force")
				self:table_set(self.config, self.sid, "dhcp_option", value)
			end
		end

	local force_options = s:option("force_options")
	--TODO: Add this when API version increases to check whether there are dhcp_options before trying to set them to force
	--force_options.require = {["1"] = {"dhcp_option"}}
		function force_options:validate(value) return self.dt:is_bool(value) end
		function force_options:get(value) return self:table_get(self.config, self.sid, "dhcp_option_force") and "1" or nil end
		function force_options:set(value)
			local opt_val = self:table_get(self.config, self.sid, "dhcp_option") or self:table_get(self.config, self.sid, "dhcp_option_force")
			local opt_name = value == "1" and "dhcp_option_force" or "dhcp_option"
			local opt_name_del = value == "1" and "dhcp_option" or "dhcp_option_force"
			self:table_set(self.config, self.sid, opt_name, opt_val or "")
			self:table_delete(self.config, self.sid, opt_name_del)
		end

function dhcp:GET_TYPE_status()
	local function interface_enabled(interface)
		return self:table_get("network", interface, "disabled") ~= "1"
	end

	local function interface_up(interface)
		local iface = util.ubus("network.interface." .. interface, "status") or {}
		return iface and iface.up or false
	end

	local res, sec_name, dnsmasq_running = {}, nil, true

	self:table_foreach(self.config, "dnsmasq", function(s)
		sec_name = s[".name"]
	end)

	local ok = util.file_exec("/usr/bin/pgrep", {"/usr/sbin/dnsmasq"})
	if ok and ok.code == 1 then
		dnsmasq_running = false
	end

	self:table_foreach(self.config, "dhcp", function(s)
		local server_running, errors, intf_down = false, {}, false

		if not interface_enabled(s.interface) then
			intf_down = true
			table.insert(errors, {error = STATUS_CODES.INTERFACE_DISABLED, error_message = STATUS_MESSAGES.INTERFACE_DISABLED})
		end

		if not interface_up(s.interface) and not intf_down then
			intf_down = true
			table.insert(errors, {error = STATUS_CODES.INTERFACE_NOT_RUNNING, error_message = STATUS_MESSAGES.INTERFACE_NOT_RUNNING})
		end

		if s.ignore ~= "1" and not intf_down then
			local phy_dev = self:table_get("network", s.interface, "device")
			if phy_dev then
				local status_file = "/var/run/dnsmasq."..sec_name.."." .. phy_dev .. ".dhcp"
				if (fs.readfile(status_file) or ""):match("0") or s.force == "1" then
					server_running = true
				elseif (fs.readfile(status_file) or ""):match("1") then
					table.insert(errors, {error = STATUS_CODES.DHCPv4_SERVER_ALREADY_EXISTS, error_message = STATUS_MESSAGES.DHCPv4_SERVER_ALREADY_EXISTS})
				end
			end
		end

		if s.ignore == "1" then
			table.insert(errors, {error = STATUS_CODES.DHCPv4_SERVER_DISABLED, error_message = STATUS_MESSAGES.DHCPv4_SERVER_DISABLED})
		end

		if #errors == 0 and dnsmasq_running then
			server_running = true
		elseif #errors == 0 and not dnsmasq_running then
			table.insert(errors, {error = STATUS_CODES.PROCESS_NOT_RUNNING, error_message = STATUS_MESSAGES.PROCESS_NOT_RUNNING})
			server_running = false
		end

		if server_running then
			table.insert(res, { id = s.interface, running = server_running, interface = util.network_mapper_get(self, s.interface) })
		else
			table.insert(res, { id = s.interface, running = server_running, interface = util.network_mapper_get(self, s.interface), errors = errors })
		end
	end)

	return self:ResponseOK(res)
end

function dhcp:restart()
	local _, err = util.ubus("rc", "init", { name = "dnsmasq", action = "restart" })
	return not err or false, STATUS_MESSAGES.RESTART_FAILED
end

dhcp:action("restart", function (self)
	local ok, err = self:restart()
	if not ok then
		self:add_critical_error(STATUS_CODES.RESTART_FAILED, err)
	end
	self:ResponseOK()
end)

return dhcp
