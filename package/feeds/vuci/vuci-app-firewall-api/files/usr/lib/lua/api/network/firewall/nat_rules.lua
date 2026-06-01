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

local function check_dates(start_date, stop_date)
	local styear, stmonth, stday = start_date:match("^(%d%d%d%d)-(%d%d)-(%d%d)$")
	local stpyear, stpmonth, stpday = stop_date:match("^(%d%d%d%d)-(%d%d)-(%d%d)$")
	local start_time = os.time{year=styear or 1, month=stmonth or 1, day=stday or 1} or 0
	local stop_time = os.time{year=stpyear or 9999, month=stpmonth or 1, day=stpday or 1} or math.huge
	if start_time > stop_time then
		return false, "Start date cannot be higher than stop date. "
	end
	return true
end

local nat_rules = ConfigService:new(flags)
nat_rules.zones = get_zones_names(nat_rules.uci)
nat_rules.ipv4_hints = {}
nat_rules.order_by = "priority"

sys.net.ipv4_hints(function(ip, _)
	table.insert(nat_rules.ipv4_hints, ip)
end)

function nat_rules:get_nat_priority(name)
	local priority = 1
	self:table_foreach(self.config, "nat", function (s)
		if s[".name"] ~= name then
			priority = priority + 1
		else
			return false
		end
	end)
	return tostring(priority)
end

function nat_rules:check_priority_duplication()
	local hash = {}
	local duplicates = false
	self:table_foreach("firewall", "nat", function (s)
		local prio = self:get_nat_priority(s[".name"])
		if prio and hash[prio] then
			duplicates = true
			return false
		elseif prio then
			hash[prio] = true
		end
	end)
	if not duplicates then return end
	self:add_critical_error(
		STD_CODES.INVALID_OPT,
		"Same priority value cannot be repeated between multiple rules",
		"Validation"
	)
end

nat_rules.PUT_before_commit_hook = nat_rules.check_priority_duplication
nat_rules.POST_before_commit_hook = nat_rules.check_priority_duplication

function nat_rules:validate_section_hook()
	local src_dip = self:getter_wrapped_abs_value(self.config, self.sid, "src_dip")
	local src_dport = self:getter_wrapped_abs_value(self.config, self.sid, "src_dport")
	local target = self:getter_wrapped_abs_value(self.config, self.sid, "target") or "SNAT"
	if target ~= "SNAT" and (src_dip or src_dport) then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"src_dip and/or src_dport can be set only for SNAT target",
			"Validation"
		)
	end

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

nat_rules.PUT_validate_section_hook = nat_rules.validate_section_hook
nat_rules.POST_validate_section_hook = nat_rules.validate_section_hook

	local redirect = nat_rules:section("firewall", "nat")

	function redirect:create_defaults()
		local src_dport = self:get_abs_value(self.config, self.sid, "src_dport")
		return {
			target = "SNAT",
			proto = src_dport and src_dport ~= "" and { "tcp", "udp" } or { "all" },
			enabled = "0"
		}
	end

		local opt_priority = redirect:option("priority")
			function opt_priority:validate(value)
				local valid, msg = self.dt:uinteger(value)
				if not valid then return false, msg end
				if #self.arguments.data > 0 then return true end
				local found
				self:table_foreach(self.config, "nat", function (s)
					local prio = self:get_nat_priority(s[".name"])
					if prio and self.sid ~= s[".name"] and value == prio then
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
				return self:get_nat_priority(self.sid)
			end

		local enabled = redirect:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end
			function enabled:get(value)
				return value or "1"
			end

		local name = redirect:option("name")
		name.maxlength = 64
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

		local src_ip = redirect:option("src_ip", { list = true })
			function src_ip:validate(value)
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

		local src_port = redirect:option("src_port", { list = true })
			function src_port:validate(value)
				local res, msg = self.dt:neg(value)
				if res == false then
					return res, msg
				end
				return self.dt:portrange(res)
			end

		local dest = redirect:option("dest")
			function dest:validate(value)
				return self.dt:check_array(value, self.zones)
			end

		local dest_ip = redirect:option("dest_ip")
			function dest_ip:validate(value)
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

		local dest_port = redirect:option("dest_port")
			function dest_port:validate(value)
				local res, msg = self.dt:neg(value)
				if res == false then
					return res, msg
				end
				return self.dt:portrange(res)
			end

		local src_dip = redirect:option("src_dip")
			function src_dip:validate(value)
				local nw = require "vuci.network".init(self.uci)
				local ip = {}
				for _, v in ipairs(nw:get_interfaces()) do
					for _, a in ipairs(v:ipaddrs()) do
						table.insert(ip, a:host():string())
					end
				end
				local res, msg = self.dt:check_array(value, ip)
				if not res then
					res, msg = self.dt:ip4addr(value)
					if not res then
						return res, msg
					end
				end

				return true
			end
			function src_dip:get()
				return self:table_get(self.config, self.sid, "snat_ip")
			end
			function src_dip:set(value)
				self:table_set(self.config, self.sid, "snat_ip", value)
			end

		local src_dport = redirect:option("src_dport")
			function src_dport:validate(value)
				local res, msg = self.dt:neg(value)
				if res == false then
					return res, msg
				end
				return self.dt:portrange(value)
			end
			function src_dport:get()
				return self:table_get(self.config, self.sid, "snat_port")
			end
			function src_dport:set(value)
				self:table_set(self.config, self.sid, "snat_port", value)
			end

		local extra = redirect:option("extra")
		extra.maxlength = 128
			function extra:validate(value)
				return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-/!:. ]+$")
			end

		local weekdays = redirect:option("weekdays", { list = true })
			function weekdays:validate(value)
				local days = { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" }
				return self.dt:check_array(value, days)
			end

			function weekdays:get(value)
				local value_table = {}
				if value and type(value) == "string" then
					value:gsub("([^ ]+)", function(s) table.insert(value_table, s) end)
				end
				return #value_table > 0 and value_table or value
			end

			function weekdays:set(value)
				self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
			end

		local monthdays = redirect:option("monthdays", { list = true })
			function monthdays:validate(value)
				local days = {}
				for i = 1, 31 do
					table.insert(days, tostring(i))
				end
				return self.dt:check_array(value, days)
			end

			function monthdays:get(value)
				local value_table = {}
				if value and type(value) == "string" then
					value:gsub("([^ ]+)", function(s) table.insert(value_table, s) end)
				end
				return #value_table > 0 and value_table or value
			end

			function monthdays:set(value)
				self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
			end

		local start_time = redirect:option("start_time")
			function start_time:validate(value)
				return self.dt:timehhmmss(value)
			end

		local stop_time = redirect:option("stop_time")
			function stop_time:validate(value)
				return self.dt:timehhmmss(value)
			end

		local start_date = redirect:option("start_date")
			function start_date:validate(value)
				local valid, message = self.dt:dateyyyymmdd(value, "past_date")
				if not valid then return false, message end
				local stop_date = self:get_abs_value(self.config, self.sid, "stop_date") or ""
				return check_dates(value, stop_date)
			end

		local stop_date = redirect:option("stop_date")
			function stop_date:validate(value)
				local valid, message = self.dt:dateyyyymmdd(value)
				if not valid then return false, message end
				local start_date = self:get_abs_value(self.config, self.sid, "start_date") or ""
				return check_dates(start_date, value)
			end

		local utc_time = redirect:option("utc_time")
			function utc_time:validate(value)
				return self.dt:is_bool(value)
			end
			function utc_time:get(value)
				return value or "0"
			end

		local target = redirect:option("target")
			target.cfg_require = true
			target.require = { ["SNAT"] = { "src_dip"} }
			function target:validate(value)
				return self.dt:check_array(value, { "SNAT", "MASQUERADE", "ACCEPT" })
			end

return nat_rules
