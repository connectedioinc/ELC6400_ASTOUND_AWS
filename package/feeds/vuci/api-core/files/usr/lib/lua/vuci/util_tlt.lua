local ipairs, pairs, type, string, io, table, tonumber, tostring, math, require, os = ipairs, pairs, type, string, io, table, tonumber, tostring, math, require, os
local nixio = require "nixio"
local fs = require "nixio.fs"
local uci = require "vuci.uci".cursor()
local fw = require "vuci.firewall".init()
local util = require "vuci.util"
local board = require("vuci.board")
local ip = require("luci.ip")
local nw
local _G = _G
local mdm = require("vuci.modem")

module "vuci.util_tlt"

local net_map = {
    { ifname_reg = "wwan", type = "mobile", proto = "wwan"},
    { ifname_reg = "wlan", type = "wireless", proto = "dhcp"},
    { ifname_reg = "connm", type = "mobile", proto = "connm"},
	{ ifname_reg = "radio", type = "wireless", proto = "dhcp"}
}


local wan = board:get_default_wan_ifname()
local lan = board:get_default_lan_ifname()

if wan then
	table.insert(net_map, 1, { ifname_reg = board:get_default_wan_ifname(), type = "wired", proto = {"static", "dhcp", "pppoe"}})
end

if lan then
	table.insert(net_map, 2, { ifname_reg = board:get_default_lan_ifname(), type = "wired", proto = {"static", "dhcp"}})
end

function next_id(self)
	local id = 0
	uci:foreach("firewall", nil, function (s)
		local sid = tonumber(s[".name"])
		if sid then id = math.max(id, sid) end
	end)
	return tostring(id + 1)
end

function fork_exec_fn(func, options)
	options = options or {}

	local parent_pid = nixio.getpid()
	local pid = nixio.fork()
	if pid > 0 then
		return true
	elseif pid == 0 then
		-- change to root dir
		nixio.chdir("/")

		-- patch stdin, out, err to /dev/null
		local null = nixio.open("/dev/null", "w+")
		if null then
			if not options.stderr then
				nixio.dup(null, nixio.stderr)
			end
			if not options.stdout then
				nixio.dup(null, nixio.stdout)
			end
			if not options.stdin then
				nixio.dup(null, nixio.stdin)
			end
			if null:fileno() > 2 then
				null:close()
			end
		end

		if options.after_exit then
			while nixio.getppid() == parent_pid do
				nixio.nanosleep(1, 0)
			end
		end

		func()
		os.exit(0)
	end
	return false
end

function fork_exec(command, options)
	fork_exec_fn(function()
		nixio.exec("/bin/sh", "-c", command)
	end, options)
end


function net_type(value, key)
	if value and key then
		for _, net in ipairs(net_map) do
			if net[key] then
				local buff = type(net[key]) == "string" and {net[key]} or net[key]
				for _, v in ipairs(buff) do
					for _, dev in ipairs(util.to_table(value)) do
						local found = string.find(dev, v)
						if found and found == 1 then
								return net.type
						end
					end
				end
			end
		end
	end

	return false
end

function add_rule(opts)
	return uci:section("firewall", "rule", next_id(), opts)
end

---@deprecated This function, has a lot of optional parameters, which makes it hard to reason about its functionality.
-- Use a combination of 'ensure_zone_exists', 'ensure_vpn_zone_forwardings', 'ensure_vpn_rule_exists' instead
function enable_vpn_firewall(zone, zone_opt, rule_opt, uci_cursor, need_wan, skip_commit)
	local uci = uci_cursor or uci
	local exists = false
	local sid

	if zone and zone_opt then
		if not fw.get_zone(zone, zone) then
			uci:section("firewall", "zone", next_id(), zone_opt)
		end

		if #fw.get_zone(zone, zone):get_forwardings_by("src") == 0 then
			fw.get_zone(zone, zone):add_forwarding_to("lan")
			if need_wan then
				fw.get_zone(zone, zone):add_forwarding_to("wan")
			end
		end

		if #fw.get_zone(zone, zone):get_forwardings_by("dest") == 0 then
			fw.get_zone(zone, zone):add_forwarding_from("lan")
		end
	end

	uci:foreach("firewall", "rule",
		function(s)
			if rule_opt and s.name == rule_opt.name then
				exists = true
				sid = s[".name"]
				uci:delete("firewall", sid, "enabled")
			end
	end)

	if rule_opt and not exists then
		add_rule(rule_opt, uci_cursor)
	end
	if not skip_commit then
		uci:commit("firewall")
	end
end

function has_forwarding(service, direction, zone)
	local exists = false
	service:table_foreach("firewall", "forwarding", function(f)
		if f.src and f.dest and f[direction] == zone then
			exists = true
		end
	end)
	return exists
end

-- UCI is used here, because table_delete doesn't work in after commit hooks
function ensure_forwarding(service, src, dest)
	local exists = false
	service:table_foreach("firewall", "forwarding", function(f)
		if f.src == src and f.dest == dest then
			exists = true
			return false
		end
	end)

	if not exists then
		local id = service:next_id("firewall")
		service.uci:section("firewall", "forwarding", id, { src  = src, dest = dest })
		service:table_section("firewall", "forwarding", id, { src  = src, dest = dest })
	end
end

function has_zone(service, zone)
	local exists = false
	service:table_foreach("firewall", "zone", function(z)
		if z.name == zone then
			exists = true
			return false
		end
	end)
	return exists
end

-- UCI is used here, because table_delete doesn't work in after commit hooks
-- rule = rule to apply
-- match_params = table with parameters to check if rule exists already
-- rule_type = type of rule to check (rule, nat)
-- ignore_params = table with parameters to ignore when checking if rule exists
function ensure_vpn_rule_exists(service, rule, match_params, rule_type, ignore_params)
	local id
	local rule_type = rule_type or "rule"
	ignore_params = ignore_params or {}
	if match_params then
		service:table_foreach("firewall", rule_type, function(r)
			if r.name == rule.name then
				id = r[".name"]
				service:table_section("firewall", rule_type, id, rule)
				return false
			else
				local match = true
				if match_params then
					for key, value in pairs(match_params) do
						for _, ignore_key in ipairs(ignore_params) do
							if r[ignore_key] then
								match = false
								break
							end
						end

						local r_value = r[key]
						r_value = util.to_table(r_value)
						value = util.to_table(value)

						local found = false
						for _, v in ipairs(value) do
							if util.contains(r_value, v) then
								found = true
								break
							else
								break
							end
						end

						if not found then
							match = false
							break
						end
					end

					if match then
						id = r[".name"]
						return false
					end
				end
			end
		end)
	end

	if not id then
		id = service:next_id("firewall")
		service.uci:section("firewall", rule_type, id, rule)
		service:table_section("firewall", rule_type, id, rule)
	end

	return id
end

-- UCI is used here, because table_delete doesn't work in after commit hooks
function ensure_zone_exists(service, zone, network, device)
	local response
	if network then
		response = fw:get_zone_by_network(network)
		if response then return response.data end
	end
	if device then
		response = fw:get_zone_by_device(device)
		if response then return response.data end
	end
	if not has_zone(service, zone.name, network) then
		local id = service:next_id("firewall")
		service.uci:section("firewall", "zone", id, zone)
		service:table_section("firewall", "zone", id, zone)
	end
	return zone
end

function ensure_vpn_zone_forwardings(service, zone_name, needs_wan)
	if not has_forwarding(service, "src", zone_name) then
		ensure_forwarding(service, zone_name, "lan")
		if needs_wan then
			ensure_forwarding(service, zone_name, "wan")
		end
	end

	if not has_forwarding(service, "dest", zone_name) then
		ensure_forwarding(service, "lan", zone_name)
	end
end

-- UCI is used here, because table_delete doesn't work in after commit hooks
function set_vpn_nat_enabled(service, rule_name, enabled)
	local uci = service.uci
	uci:foreach("firewall", "nat", function(section)
		if section.name == rule_name then
			if not enabled and section.enabled ~= "0" then
				service:table_set("firewall", section[".name"], "enabled", "0")
			else
				service:table_delete("firewall", section[".name"], "enabled")
			end
			return false -- break out of foreach
		end
	end)
end

function add_to_firewall_zone(service, zone_name, option, value, skip_commit)
	local uci = service.uci
	local zone_sid
	if zone_name and option and value then
		uci:foreach("firewall", "zone", function(s)
			if s.name and s.name == zone_name then
				zone_sid = s[".name"]
				return false
			end
		end)
		if zone_sid then
			local value_exists
			local existing_value = uci:get("firewall", zone_sid, option)
			if existing_value then
				if type(existing_value) == "table" then
					for _, v in ipairs(existing_value) do
						if v == value then
							value_exists = true
							return false
						end
					end
					if not value_exists then
						existing_value[#existing_value + 1] = value
						uci:set("firewall", zone_sid, option, existing_value)
					end
				elseif existing_value ~= value then
					uci:set("firewall", zone_sid, option, {existing_value, value})
				end
			else
				uci:set("firewall", zone_sid, option, value)
			end
		end
	end
	if not skip_commit then
			uci:commit("firewall")
	end
end

function delete_from_firewall_zone(service, zone_name, option, value, skip_commit)
	local uci = service.uci
	local zone_sid
	if zone_name and option and value then
		uci:foreach("firewall", "zone", function(s)
			if s.name and s.name == zone_name then
				zone_sid = s[".name"]
				return false
			end
		end)
		if zone_sid then
			local new_value = {}
			local existing_value = uci:get("firewall", zone_sid, option)
			if existing_value then
				if type(existing_value) == "table" then
					for _, v in ipairs(existing_value) do
						if v ~= value then
							new_value[#new_value + 1] = v
						end
					end
					uci:set("firewall", zone_sid, option, new_value)
				elseif existing_value == value then
					uci:delete("firewall", zone_sid, option)
				end
			end
		end
	end
	if not skip_commit then
		uci:commit("firewall")
	end
end

function update_firewall_zone_network(vpn_type, value, uci, skip_commit)
	uci:foreach("firewall", "zone", function(c)
		if c.name == vpn_type then
			uci:set("firewall", c[".name"], "network", value)
		end
	end)
	if not skip_commit then
		uci:commit("firewall")
	end
end

function delete_overview_section(id, section_name)
	local uci = uci_cursor or uci
	if id and section_name then
		uci:foreach("overview", "overview", function(s)
			if s.id and s.section_name and s.id == id and s.section_name == section_name then
				uci:delete("overview", s[".name"])
			end
		end)
	elseif id then
		uci:foreach("overview", "overview", function(s)
			if s.id and s.id == id then
				uci:delete("overview", s[".name"])
			end
		end)
	end
end

function find(path, name)
	local files = {}
	local list = io.popen("find %s -name %s" % {path or "", name})

	if list then
		while true do
			local file = list:read("*l")
			if not file then
				break
			else
				files[#files+1] = file
			end
		end

		list:close()

		return files
	end

	return files
end

function seconds_to_days_hours_minutes_seconds(total_seconds)
    local time_days     = math.floor(total_seconds / 86400)
    local time_hours    = math.floor(math.mod(total_seconds, 86400) / 3600)
    local time_minutes  = math.floor(math.mod(total_seconds, 3600) / 60)
    local time_seconds  = math.floor(math.mod(total_seconds, 60))
    if (time_hours < 10) then
        time_hours = "0" .. time_hours
    end
    if (time_minutes < 10) then
        time_minutes = "0" .. time_minutes
    end
    if (time_seconds < 10) then
        time_seconds = "0" .. time_seconds
    end
	if (time_days > 0) then
		return time_days .. "d " .. time_hours .. "h " .. time_minutes .. "m " .. time_seconds .. "s"
	end
	return time_hours .. "h " .. time_minutes .. "m " .. time_seconds .. "s"
end

function crypt_sha512(str)
	local response = util.ubus("file", "exec", {
		command = "/usr/bin/mkpasswd",
		params = {"-m", "sha512", str}
	})

	if response.code == 0 then
		return response.stdout:gsub("\r?\n", "")
	else
		return nil
	end
end


function delete_zone_from_firewall(service, zone_name, skip_commit, skip_uci_delete)
	service:table_foreach("firewall", "zone", function(s)
		if s.name == zone_name then
			service:table_delete("firewall", s[".name"])
			if not skip_uci_delete then service.uci:delete("firewall", s[".name"]) end
		end
	end)
	service:table_foreach("firewall", "forwarding", function (fwd)
		if fwd.dest == zone_name or fwd.src == zone_name then
			service:table_delete("firewall", fwd[".name"])
			if not skip_uci_delete then service.uci:delete("firewall", fwd[".name"]) end
		end
	end)
	if not skip_commit then
		service.uci:commit("firewall")
	end
end

-- It's necessary to use "uci" here, because table_delete doesn't work in after commit hooks
-- Then "table_delete" is also used, to mark that the section is deleted
function delete_rule_from_firewall(service, rule_name, skip_commit, skip_uci_delete)
	local rule_types = "rule redirect nat"
	for rule in string.gmatch(rule_types, "%S+") do
		service:table_foreach("firewall", rule, function(r)
			if r.name == rule_name then
				service:table_delete("firewall", r[".name"])
				if not skip_uci_delete then service.uci:delete("firewall", r[".name"]) end
			end
		end)
	end
	if not skip_commit then
		service.uci:commit("firewall")
	end
end

local function matches_filter(section, filter)
	for k, v in pairs(filter) do
		if section[k] ~= v then
			return false
		end
	end
	return true
end

function has_section(service, config_name, section_type, filter)
	local found = false
	service:table_foreach(config_name, section_type, function(section)
		if not filter or matches_filter(section, filter) then
			found = true
			return false -- break out of foreach
		end
	end)
	return found
end

function remove_value(list, value)
	for i, v in ipairs(list) do
		if v == value then
			table.remove(list, i)
		end
	end
end

function in_lan_range(network, ap)
	nw = nw or require("vuci.network").init()
	local range = ip.new(network)
	if ip.checkip4(range) then
		for _, iface in ipairs(nw:get_networks()) do
			local iface_ip = iface:ipaddr()
			local iface_mask = iface:netmask()
			if iface_ip and iface_mask and iface:ifname() ~= "lo" then
				if ( not ap and iface:get("area_type") == "lan" ) or ( ap and iface:ifname() == "br-lan" ) then
					local lan_range = ip.new("%s/%s" % { iface_ip, iface_mask })
					if lan_range and lan_range:contains(network) then
						return true
					end
				end
			end
		end
	elseif ip.checkip6(range) then
		for _, iface in ipairs(nw:get_networks()) do
			local iface_ip6 = iface:ip6addr()
			if iface_ip6 and iface:ifname() ~= "lo" then
				if ( not ap and iface:get("area_type") == "lan" ) or ( ap and iface:ifname() == "br-lan" ) then
					local lan_range = ip.new(iface_ip6)
					if lan_range and lan_range:contains(network) then
						return true
					end
				end
			end
		end
	end
	return false
end

function lan_ip(uci_cursor)
	local ipv4_addr, ipv6_addr, ip6assign
	local section

	uci_cursor = uci_cursor or uci

	local disabled = { disabled = "1" }
	if (uci_cursor:get_all("network", "mgmt") or disabled).disabled ~= "1" then
		section = "mgmt"
	elseif (uci_cursor:get_all("network", "static") or disabled).disabled ~= "1" then
		section = "static"
	elseif (uci_cursor:get_all("network", "lan") or disabled).disabled ~= "1" then
		section = "lan"
	else
		uci_cursor:foreach("network", "interface", function (s)
			if s[".name"] == "loopback" or (not s.ipaddr and
				not s.ip6addr and not s.ip6assign) then return true end
			if s.area_type == "lan" and s.disabled ~= "1" then
				section = s[".name"]
				return false
			end
		end)
	end

	if section then
		ipv4_addr = uci_cursor:get("network", section, "ipaddr")
		ipv6_addr = uci_cursor:get("network", section, "ip6addr")
		ip6assign = uci_cursor:get("network", section, "ip6assign")
	end

	local ula_prefix = false
	if not ipv6_addr and ip6assign then
		ipv6_addr = uci_cursor:get("network", "globals", "ula_prefix")
		ula_prefix = true
	end

	if ipv6_addr and ipv6_addr:find("/") then
		ipv6_addr = ipv6_addr:sub(1, ipv6_addr:find("/") - 1)
	end

	if ipv6_addr and ula_prefix then
		ipv6_addr = ipv6_addr .. "1"
	end

	if not ipv4_addr and not ipv6_addr then
		ipv4_addr = board:get_default_lan_ip()
	end

	return ipv4_addr, ipv6_addr
end

--- Function to get the mount point of a file
---
--- BEWARE! This will resolve symlinks, so a `file_path` that is `/mnt/sda1/modbus_db`
--- will return a mount_point of `/usr/local/mnt/sda1`
--- @param file_path string File path
--- @return string|nil Mount point of the file
function get_mount_point(file_path)
	local mount_info = fs.readfile("/proc/mounts")
	if not mount_info or not file_path then
		return nil
	end

	-- Paths can have symlink to mount point so we need to resolve them
	local first_segment = file_path:match("^(/[^/]+)")
	if first_segment then
		local target = nixio.fs.readlink(first_segment)
		if target then
			if target:sub(1, 1) ~= "/" then
				target = "/" .. target
			end
			file_path = target .. file_path:sub(#first_segment + 1)
		end
	end

	local mount_points = {}
	local overlays = {}

	for line in mount_info:gmatch("[^\r\n]+") do
		local device, mount_point, fs_type, options = line:match("([%w%d/]+)%s+([%w%d/]+)%s+([%w%d/]+)%s+(.*)")
		if device and mount_point then
			if fs_type == "overlay" then
				local upperdir = options:match("upperdir=([%w%d/]+)")
				if upperdir then
					overlays[mount_point] = upperdir
				end
			end
			table.insert(mount_points, mount_point)
		end
	end

	table.sort(mount_points, function(a, b)
		return #a > #b
	end)

	for _, mount_point in ipairs(mount_points) do
		if file_path:sub(1, #mount_point) == mount_point then
			local upperdir = overlays[mount_point]
			if upperdir then
				for _, base_mount_point in ipairs(mount_points) do
					if upperdir:sub(1, #base_mount_point) == base_mount_point then
						return base_mount_point
					end
				end
			else
				return mount_point
			end
		end
	end

	return nil
end

--- Function to determine if the current flash/ram space is sufficent
---@param required_space_kb number|nil Required flash/ram space to do some action
---@param mount string|nil Mount point to check the space
---@return boolean Is there enough space
---@return number Current free space minus reserved
---@return string|nil Error message
function check_reserved_space(required_space_kb, mount)
	mount = mount or get_mount_point("/etc")
	required_space_kb = required_space_kb or 0
	local statvfs = nixio.fs.statvfs(mount)
	local free_space_kb = (statvfs.bavail * statvfs.frsize) / 1024

	local err_msg = "Not enough free space in the flash storage."
	if mount:match("^/tmp") then
		err_msg = "Not enough free space in the RAM storage."
	end

	-- 100 KB should be always reserved
	free_space_kb = free_space_kb - 100
	if free_space_kb <= required_space_kb then
		return false, free_space_kb > 0 and free_space_kb or 0, err_msg
	end

	-- Reserve space for logs
	local log_file = uci:get("system", "system", "log_file")
	if log_file and mount == get_mount_point(log_file) then
		local log_size = uci:get("system", "system", "log_size") or 0
		free_space_kb = free_space_kb - (log_size + 100)
		if free_space_kb <= required_space_kb then
			return false, free_space_kb > 0 and free_space_kb or 0, err_msg .. " Please disable logs to file."
		end
	end

	return true, free_space_kb > 0 and free_space_kb or 0
end

--- Function to get the next free name value for a given option in a service. Checks all sections and returns the first available name.
--- Returns nil instantly if the name is already provided in request body (unless skip_body_check is true).
---@param service table
---@param cfg string
---@param section_type string
---@param opt_name string
---@param prefix string
---@param skip_body_check boolean? If true, skips the check for the name in the current_data_block. Needed in some cases
---@param start_index number? Index to start searching from (default is 1)
---@return string?
function get_next_name(service, cfg, section_type, opt_name, prefix, skip_body_check, start_index)
	if not skip_body_check and service.current_data_block[opt_name] then return end

	local used_names = {}
	service:table_foreach(cfg, section_type, function(s)
		if s[opt_name] then
			used_names[s[opt_name]] = true
		end
	end)

	local opt_val
	for i = start_index or 1, math.huge do
		opt_val = prefix .. i
		if not used_names[opt_val] then
			break
		end
	end
	return opt_val
end

--- Function to create an option which prevents non root user from changing script path or uploading a file.
---@param option_name string
---@param section table
---@param options table
---@return table option
function userscripts_permission_option(option_name, section, options)
	options = options and options or {}
	local option = section:option(option_name, options)
	function option:getter() return self:table_get(self.config, self.sid, self.api_key) end
	function option:validate(value)
		if self:getter() ~= value and self.user.group ~= "root" then
			self:add_critical_error(_G.STD_CODES.UNAUTHORIZED, "Current user is unauthorized to edit scripts", "Authorization", "401")
		end
		if options.file then return self.dt:file_validation(value, { "/etc/vuci-uploads/" }) end
		return self.dt.string(value) 
	end

	option.file_handle_request = options.file and function(self)
		if self.user.group ~= "root" then self:add_critical_error(_G.STD_CODES.UNAUTHORIZED, "Current user is unauthorized to edit scripts", "Authorization", "401") end
	end
	return option
end

-- Function to validate SMS message length
--- @param modem_id string? Modem ID to use for validation, if nil, uses the first modem
--- @param value string SMS message text to validate
--- @return boolean Is the message valid
--- @return string? Error message
function validate_sms_message(value, modem_id)
	modem_id = modem_id or mdm:get_all_modems()[1].id
	local res = mdm:call_ubus_object(modem_id, "send_sms", { number = "", text = value:gsub("\r\n?", "\n"), validate = true }, 125)
	if ((res == mdm.NO_VALUE or res.errno) and #value > 8 * 160) or (res ~= mdm.NO_VALUE and not res.errno and res.sms_used > 8) then
		return false, "Max SMS count is 8 messages"
	end
	return true
end

function hex_add(hex1, hex2)
	local hex_map = "0123456789ABCDEF"
	local result, carry = "", 0
	local i, j = #hex1, #hex2

	while i > 0 or j > 0 or carry > 0 do
		local d1 = i > 0 and tonumber(hex1:sub(i, i), 16) or 0
		local d2 = j > 0 and tonumber(hex2:sub(j, j), 16) or 0
		local sum = d1 + d2 + carry
		carry = math.floor(sum / 16)
		result = hex_map:sub((sum % 16) + 1, (sum % 16) + 1) .. result
		i, j = i - 1, j - 1
	end

	return result
end

function hex_sub(hex1, hex2)
	local hex_map = "0123456789ABCDEF"
	local result, borrow = "", 0
	local i, j = #hex1, #hex2

	while i > 0 do
		local d1 = tonumber(hex1:sub(i, i), 16) or 0
		local d2 = j > 0 and tonumber(hex2:sub(j, j), 16) or 0
		d1 = d1 - borrow

		if d1 < d2 then
			d1 = d1 + 16
			borrow = 1
		else
			borrow = 0
		end

		local diff = d1 - d2
		result = hex_map:sub(diff + 1, diff + 1) .. result

		i, j = i - 1, j - 1
	end

	result = result:gsub("^0+", "")

	return result ~= "" and result or "0"
end

function hex_gte(hex1, hex2)
	hex1 = hex1:gsub("^0x", ""):gsub("^0+", "")
	hex2 = hex2:gsub("^0x", ""):gsub("^0+", "")

	if #hex1 > #hex2 then return true end
	if #hex1 < #hex2 then return false end

	return hex1 >= hex2
end

-- Function to check if at least one key is provided in current_data_block and is non ""
--- @param service table
--- @param arr table array of keys to check
--- @return boolean Result does key exists
function check_current_data_block(service, arr)
	for _, val in pairs(arr) do
		if service.current_data_block[val] and service.current_data_block[val] ~= "" then return true end
	end
	return false
end