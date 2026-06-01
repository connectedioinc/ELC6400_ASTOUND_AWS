local sys = require "vuci.sys"
local ConfigService = require("api/ConfigService")
local util_split = require("vuci.util").split

local flags = {
	increment_name = true
}

local function get_zones_names(uci)
	local zones_names = {}
	uci:foreach("firewall", "zone", function(s)
		table.insert(zones_names, s.name)
	end)
	return zones_names
end

local port_forwards = ConfigService:new(flags)
port_forwards.zones = get_zones_names(port_forwards.uci)
port_forwards.macs = {}
port_forwards.ipv4_hints = {}
port_forwards.order_by = "priority"

sys.net.mac_hints(function(mac, _)
	table.insert(port_forwards.macs, mac)
end)
sys.net.ipv4_hints(function(ip, _)
	table.insert(port_forwards.ipv4_hints, ip)
end)

function port_forwards:get_redirect_priority(name)
	local priority = 1
	self:table_foreach(self.config, "redirect", function (s)
		if s.target ~= "SNAT" then
			if s[".name"] ~= name then
				priority = priority + 1
			else
				return false
			end
		end
	end)
	return tostring(priority)
end

function port_forwards:check_priority_duplication()
	local hash = {}
	local duplicates = false
	self:table_foreach("firewall", "redirect", function (s)
		if s.target ~= "SNAT" then
			local prio = self:get_redirect_priority(s[".name"])
			if prio and hash[prio] then
				duplicates = true
				return false
			elseif prio then
				hash[prio] = true
			end
		end
	end)
	if not duplicates then return end
	self:add_critical_error(
		STD_CODES.INVALID_OPT,
		"Same priority value cannot be repeated between multiple rules",
		"Validation"
	)
end

port_forwards.PUT_before_commit_hook = port_forwards.check_priority_duplication
port_forwards.POST_before_commit_hook = port_forwards.check_priority_duplication

function port_forwards:validate_section_hook()
	local protos = self:getter_wrapped_abs_value(self.config, self.sid, "proto") or {}
	local port_opts = { "src_dport", "src_port", "dest_port" }

	for _, proto_val in ipairs(protos) do
		for _, port_opt in ipairs(port_opts) do
			local port_value = self:getter_wrapped_abs_value(self.config, self.sid, port_opt) or ""
			if proto_val ~= "tcp" and proto_val ~= "udp" and port_value ~= "" then
				self:add_error(
					STD_CODES.INVALID_OPT,
					string.format("Option '%s' can only be set when using 'tcp' or 'udp' protocols", port_opt),
					"Validation"
				)
			end
		end
	end
end

port_forwards.PUT_validate_section_hook = port_forwards.validate_section_hook
port_forwards.POST_validate_section_hook = port_forwards.validate_section_hook

	local redirect = port_forwards:section("firewall", "redirect")
	function redirect:filter(options)
		if options.target ~= "SNAT" then
			return true
		end
		return false
	end
	function redirect:create_defaults()
		return {
			target = "DNAT",
			src = "wan",
			dest = "lan",
			proto = {"tcp", "udp"},
			enabled = "0"
		}
	end

	local function check_negation_port(value, res)
		local _, count = string.gsub(value, "!", '')
		if value and count then
			if count ~= 1 and value ~= res then
				return false, "Negation port or negation port range using only one exclamation mark. E.g. !0-10 or !25 ."
			end
			if count >= 1 and value == res then
				return false, "Negation port range using only one exclamation mark need be in beginning. E.g. !0-10 ."
			end
		end	
		return true
	end

		local opt_priority = redirect:option("priority")
			function opt_priority:validate(value)
				local valid, msg = self.dt:uinteger(value)
				if not valid then return false, msg end
				if #self.arguments.data > 0 then return true end
				local found
				self:table_foreach(self.config, "redirect", function (s)
					local prio = self:get_redirect_priority(s[".name"])
					if s.target ~= "SNAT" and prio and self.sid ~= s[".name"] and value == prio then
						found = s
						return false
					end
				end)
				if found then
					return false, string.format("Priority '%s' is already used for the '%s' rule", value, found.name or found[".name"])
				end
				return true
			end
			function opt_priority:set(_) end
			function opt_priority:get()
				return self:get_redirect_priority(self.sid)
			end

		local enabled = redirect:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end
			function enabled:get(value)
				return value or "1"
			end

		local name = redirect:option("name")
		name.maxlength = 2048
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
				return self.dt:fieldvalidation(value, "^[a-zA-Z0-9_ -]+$")
			end

			function name:get(value)
				return value or self:table_get(self.config, self.sid, "_name")
			end

		local proto = redirect:option("proto", { list = true })
			function proto:validate()
				return self.dt:string()
			end
			function proto:get(value)
				if value and type(value) == "string" then
					value = util_split(value, " ")
				end
				return value
			end

		local src = redirect:option("src")
			function src:validate(value)
				return self.dt:check_array(value, self.zones)
			end

		local src_mac = redirect:option("src_mac", { list = true })
			function src_mac:validate(value)
				local res, msg
				res = self.dt:check_array(value, self.macs)
				if res then
					return true
				end
				res, msg = self.dt:neg(value)
				if res == false then
					return res, msg
				end
				return self.dt:macaddr(res)
			end

		local src_ip = redirect:option("src_ip", {list = true})
			function src_ip:validate(value)
				local res, msg = self.dt:neg(value)
				if not res then
					return res, msg
				end
				return self.dt:ipmask4(res)
			end
			function src_ip:get()
				local values = self:table_get(self.config, self.sid, self.api_key)
				if type(values) == "string" then
					-- For ip values seperated by " "
					return util_split(values, " ")
				elseif type(values) == "table" then
					return values
				end
			end

		local src_port = redirect:option("src_port", { list = true })
			function src_port:validate(value)
				local res, msg = self.dt:neg(value)
				if res == false then
					return res, msg
				end
				local flag, msg = check_negation_port(value, res)
				if flag == false then
					return flag, msg
				end
				return self.dt:portrange(res)
			end

		local src_dip = redirect:option("src_dip")
			function src_dip:validate(value)
				local res, msg
				res = self.dt:check_array(value, self.ipv4_hints)
				if res then
					return true
				end
				res, msg = self.dt:neg(value)
				if res == false then
					return res, msg
				end
				return self.dt:ipmask4(res)
			end

		local src_dport = redirect:option("src_dport")
			function src_dport:validate(value)
				if value == "any" then return true end
				local res, msg = self.dt:neg(value)
				if res == false then
					return res, msg
				end
				local flag, msg = check_negation_port(value, res)
				if flag == false then
					return flag, msg
				end
				return self.dt:portrange(res)
			end
			function src_dport:set(value)
				if value == "" or value == "any" then return self:table_delete(self.config, self.sid, self.api_key) end
				self:table_set(self.config, self.sid, self.api_key, value)
			end

		local dest = redirect:option("dest")
			function dest:validate(value)
				return self.dt:check_array(value, self.zones)
			end

		local dest_ip = redirect:option("dest_ip")
			function dest_ip:validate(value)
				local res = self.dt:check_array(value, self.ipv4_hints)
				if res then
					return true
				end
				return self.dt:ipmask4(value)
			end

		local dest_port = redirect:option("dest_port")
			function dest_port:validate(value)
				local res, msg = self.dt:neg(value)
				if res == false then
					return res, msg
				end
				local flag, msg = check_negation_port(value, res)
				if flag == false then
					return flag, msg
				end
				return self.dt:portrange(res)
			end

		local reflection = redirect:option("reflection")
			function reflection:validate(value)
				return self.dt:is_bool(value)
			end
			function reflection:get(value)
				return value or "1"
			end

		local extra = redirect:option("extra")
		extra.maxlength = 128
			function extra:validate(value)
				return self.dt:string(value)
			end

		local helper = redirect:option("helper")
			function helper:validate(value)
				local helpers = { "amanda", "ftp", "RAS", "Q.931", "irc", "pptp", "sip", "snmp", "tftp" }
				return self.dt:check_array(value, helpers)
			end

return port_forwards
