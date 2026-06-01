local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local firewall_zones = ConfigService:new{ increment_name = true }
firewall_zones.policies = { "REJECT", "DROP", "ACCEPT" }

-- lazy loding
local fw
local function get_fw()
	if not fw then
		fw = require("vuci.firewall").init(firewall_zones.uci)
	end
	return fw
end

--- Creates firewall forwardings for set direction
--- @param direction string Forwarding direction: "in" or "out"
--- @param values table Zone names to add a forwarding for
function firewall_zones:create_forwardings(direction, values)
	local zone_name = self:table_get(self.config, self.sid, "name")
	local zone = get_fw():get_zone(zone_name)
	local updated = false

	if direction == "in" then
		zone:del_forwardings_by("dest")
		for i = 1, #values do
			zone:add_forwarding_from(values[i])
		end
		updated = true
	else
		zone:del_forwardings_by("src")
		for i = 1, #values do
			zone:add_forwarding_to(values[i])
		end
		updated = true
	end

	if updated then
		self:populate_configs() -- Need this to refresh from uci side
	end
end

	local zone = firewall_zones:section("firewall", "zone")
	function zone:create_defaults()
		local fw = get_fw()
		local def = fw:get_defaults()
		local name = "newzone"
		local count = 1

		while fw:get_zone(name) do
			count = count + 1
			name = "newzone%d" % count
		end

		return {
			name    = name,
			input   = def:input()   or "DROP",
			forward = def:forward() or "DROP",
			output  = def:output()  or "DROP"
		}
	end

		local name = zone:option("name")
			name.maxlength = 11
			function name:validate(value)
				local name_exists = false
				self:table_foreach(self.config, self.section_type, function (s)
					if s[".name"] ~= self.sid and s.name == value then
						name_exists = true
						return false
					end
				end)
				if name_exists then
					return false, "Configuration with name '" .. value .. "' already exists"
				end
				return self.dt:uciname(value)
			end

			function name:set(value)
				local old_name = self:table_get(self.config, self.sid, self.api_key)
				if self.request_method == "PUT" and old_name ~= value then
					get_fw():rename_zone(old_name, value)
					self:populate_configs() -- Need this to refresh from uci side
				end
				self:table_set(self.config, self.sid, self.api_key, value)
			end

		local input = zone:option("input")
			function input:validate(value)
				return self.dt:check_array(value, self.policies)
			end

		local output = zone:option("output")
			function output:validate(value)
				return self.dt:check_array(value, self.policies)
			end

		local forward = zone:option("forward")
			function forward:validate(value)
				return self.dt:check_array(value, self.policies)
			end

		local masq = zone:option("masq")
			function masq:validate(value)
				return self.dt:is_bool(value)
			end
			function masq:get(value)
				return value or "0"
			end

		local masq6 = zone:option("masq6")
			function masq6:validate(value)
				return self.dt:is_bool(value)
			end
			function masq6:get(value)
				return value or "0"
			end

		local mtu_fix = zone:option("mtu_fix")
			function mtu_fix:validate(value)
				return self.dt:is_bool(value)
			end
			function mtu_fix:get(value)
				return value or "0"
			end

		local network = zone:option("network", { list = true })
			function network:validate(value)
				return self.dt:uciname(value)
			end
			function network:get(value)
				local value_table = {}
				local network_pretty = util.get_network_map(self, true)
				if value and type(value) == "string" then
					value:gsub("([^ ]+)", function(s) table.insert(value_table, network_pretty[s] or s) end)
				else
					for key, val in pairs(value or {}) do
						value[key] = network_pretty[val] or val
					end
				end
				return #value_table > 0 and value_table or value
			end

			function network:set(value)
				local network_internal = util.get_network_map(self)
				for key, val in pairs(value) do
					value[key] = network_internal[val] or val
				end
				self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
			end

		local family = zone:option("family")
			function family:validate(value)
				return self.dt:check_array(value, { "ipv4", "ipv6" })
			end

		local masq_src = zone:option("masq_src", { list = true })
			function masq_src:validate(value)
				return self.dt:ipmask4(value)
			end

		local masq_dest = zone:option("masq_dest", { list = true })
			function masq_dest:validate(value)
				return self.dt:ipmask4(value)
			end

		local conntrack = zone:option("conntrack")
			function conntrack:validate(value)
				return self.dt:is_bool(value)
			end
			function conntrack:get(value)
				return value or "0"
			end

		local log = zone:option("log")
			function log:validate(value)
				return self.dt:is_bool(value)
			end
			function log:get(value)
				return value or "0"
			end

		local helper = zone:option("helper", { list = true })
			function helper:validate(value)
				local helpers = { "amanda", "ftp", "RAS", "Q.931", "irc",
							"pptp", "sip", "snmp", "tftp" }
				return self.dt:check_array(value, helpers)
			end

			function helper:get(value)
				local value_table = {}
				if value and type(value) == "string" then
					value:gsub("([^ ]+)", function(s) table.insert(value_table, s) end)
				end
				return #value_table > 0 and value_table or value
			end

			function helper:set(value)
				self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
			end

		local log_limit = zone:option("log_limit")
			function log_limit:validate(value)
				return self.dt:loglimit(value)
			end

		local out = zone:option("out", { list = true })
			function out:validate(value)
				local zones = {}
				self:table_foreach(self.config, self.section_type, function(s)
					if s[".name"] ~= self.sid and s.name then
						table.insert(zones, s.name)
					end
				end)
				return self.dt:check_array(value, zones)
			end

			function out:get(value)
				local zone_out = {}
				local zone_name = self:get_abs_value(self.config, self.sid, "name")
				if zone_name then
					self:table_foreach(self.config, "forwarding", function (fwd)
						if fwd.dest and fwd.src == zone_name then
							table.insert(zone_out, fwd.dest)
						end
					end)
				end
				return #zone_out > 0 and zone_out or nil
			end

			function out:set(value)
				if self.request_method == "PUT" then
					self:create_forwardings("out", value)
				end
			end

		local zone_in = zone:option("in", { list = true })
			function zone_in:validate(value)
				local zones = {}
				self:table_foreach(self.config, self.section_type, function(s)
					if s[".name"] ~= self.sid and s.name then
						table.insert(zones, s.name)
					end
				end)
				return self.dt:check_array(value, zones)
			end

			function zone_in:get(value)
				local zone_ins = {}
				local zone_name = self:get_abs_value(self.config, self.sid, "name")
				if zone_name then
					self:table_foreach(self.config, "forwarding", function (fwd)
						if fwd.dest == zone_name and fwd.src then
							table.insert(zone_ins, fwd.src)
						end
					end)
				end
				return #zone_ins > 0 and zone_ins or nil
			end

			function zone_in:set(value)
				if self.request_method == "PUT" then
					self:create_forwardings("in", value)
				end
			end

		local device = zone:option("device", { list = true })
			device.maxlength = 15
			function device:set(value)
				self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
			end

			function device:get(value)
				local value_table = {}
				if value and type(value) == "string" then
					value:gsub("([^ ]+)", function(s) table.insert(value_table, s) end)
				end
				return #value_table > 0 and value_table or value
			end

function firewall_zones:before_commit_hook()
	local net_map = {}
	local net_present = false
	self:table_foreach(self.config, "zone", function(s)
		for net in util.imatch(s.network or "") do
			if net_map[net] then
				net_present = true
				return false
			 end
			net_map[net] = true
		end
	end)
	if net_present then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Interface can only be assigned to a single firewall zone",
			"network"
		)
	end
end

firewall_zones.PUT_before_commit_hook = firewall_zones.before_commit_hook

function firewall_zones:POST_before_commit_hook()
	self:before_commit_hook()

	if self.current_data_block["in"] then
		self:create_forwardings("in", self.current_data_block["in"])
	end

	if self.current_data_block["out"] then
		self:create_forwardings("out", self.current_data_block["out"])
	end
end

function firewall_zones:DELETE_before_section_delete_hook()
	self.zone_name = self:table_get(self.main_config, self.sid, "name")
end

function firewall_zones:DELETE_after_data_hook()
	if self.zone_name then
		self:table_foreach(self.main_config, "rule", function(s)
			if s.src == self.zone_name or s.dest == self.zone_name then
				self:table_delete(self.main_config, s[".name"])
			end
		end)

		self:table_foreach(self.main_config, "redirect", function(s)
			if s.src == self.zone_name or s.dest == self.zone_name then
				self:table_delete(self.main_config, s[".name"])
			end
		end)

		self:table_foreach(self.main_config, "forwarding", function(s)
			if s.src == self.zone_name or s.dest == self.zone_name then
				self:table_delete(self.main_config, s[".name"])
			end
		end)
		self.zone_name = nil
	end
end

return firewall_zones
