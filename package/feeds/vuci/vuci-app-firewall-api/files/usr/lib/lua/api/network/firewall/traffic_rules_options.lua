return function ()
	local util = require("vuci.util")
	local _zones
	local _macs

	-- lazy loading
	-- logic is more complicated but on GET is faster
	local function get_zones_names(uci)
		local zones_names = { "*" }
		uci:foreach("firewall", "zone", function(s)
			table.insert(zones_names, s.name)
		end)
		return zones_names
	end

	local function zones(cs)
		if not _zones then
			_zones = get_zones_names(cs.uci)
		end
		return _zones
	end

	local function macs()
		if not _macs then
			local sys = require "vuci.sys"
			_macs = {}
			sys.net.mac_hints(function(mac, _)
				table.insert(_macs, mac)
			end)
		end
		return _macs
	end

	local function get_rule_priority(cs, name)
		local priority = 1
		cs:table_foreach(cs.config, "rule", function (s)
			if s[".name"] ~= name then
				priority = priority + 1
			else
				return false
			end
		end)
		return tostring(priority)
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

	local period_map = {
		s = "second",
		sec = "second",
		second = "second",
		m = "minute",
		min = "minute",
		minute = "minute",
		h = "hour",
		hour = "hour",
		d = "day",
		day = "day"
	}

	return {
		options = {
			----------------------For internal use only---------------------------------
			owner_type = {
				readonly = true,
				validate = function (self, value)
					local owners = { "modbusgwd", "overip", "ulog", "iec60870_server" }
					return self.dt:check_array(value, owners)
				end,
				get = function (self, value)
					return self:table_get(self.config, self.sid, "_owner_type")
				end,
				set = function (self, value)
					self:table_set(self.config, self.sid, "_owner_type", value)
				end
			},
			owner_id = {
				readonly = true,
				get = function (self, value)
					return self:table_get(self.config, self.sid, "_owner_id")
				end,
				set = function (self, value)
					self:table_set(self.config, self.sid, "_owner_id", value)
				end
			},
			----------------------------------------------------------------------------
			priority = {
				validate = function (self, value)
					local valid, msg = self.dt:uinteger(value)
					if not valid then return false, msg end
					if #self.arguments.data > 0 then return true end
					local found
					self:table_foreach(self.config, "rule", function (s)
						local prio = get_rule_priority(self, s[".name"])
						if prio and self.sid ~= s[".name"] and value == prio then
							found = s
							return false
						end
					end)
					if found then
						return false, string.format("Priority '%s' is already used for the '%s' rule", value, found.name or found[".name"])
					end
					return true
				end,
				set = function(_) end,
				get = function(self, value) return get_rule_priority(self, self.sid) end
			},
			enabled = {
				validate = function (self, value)
					return self.dt:is_bool(value)
				end,
				get = function (self, value)
					return value or "1"
				end
			},
			name = {
				maxlength = 64,
				validate = function (self, value)
					local name_exists = false
					self:table_foreach(self.config, "rule", function (s)
						if s[".name"] ~= self.sid and s.name == value then
							name_exists = true
							return false
						end
					end)
					if name_exists then
						return false, "Configuration with name '" .. value .. "' already exists"
					end
					return self.dt:fieldvalidation(value, "^[a-zA-Z0-9_ -]+$")
				end,
				get = function (self, value)
					return value or self:table_get(self.config, self.sid, "_name")
				end,
			},
			family = {
				validate = function (self, value)
					return self.dt:check_array(value, { " ", "any", "ipv4", "ipv6" })
				end,
				get = function (self, value)
					if value == "any" then
						return nil
					else
						return value
					end
				end
			},
			proto = {
				params = { list = true },
				validate = function (self, value)
					return self.dt:string()
				end,
				get = function (self, value)
					if value and type(value) == "string" then
						value = util.split(value, " ")
					end
					-- TCP & UDP is the default proto if undefined
					return value and #value > 0 and value or { "tcp", "udp" }
				end
			},
			icmp_type = {
				params = { list = true },
				validate = function (self, value)
						local icmp_types = {
						"echo-reply",
						"destination-unreachable",
						"network-unreachable",
						"host-unreachable",
						"protocol-unreachable",
						"port-unreachable",
						"fragmentation-needed",
						"source-route-failed",
						"network-unknown",
						"host-unknown",
						"network-prohibited",
						"host-prohibited",
						"TOS-network-unreachable",
						"TOS-host-unreachable",
						"communication-prohibited",
						"host-precedence-violation",
						"precedence-cutoff",
						"source-quench",
						"redirect",
						"network-redirect",
						"host-redirect",
						"TOS-network-redirect",
						"TOS-host-redirect",
						"echo-request",
						"router-advertisement",
						"router-solicitation",
						"time-exceeded",
						"ttl-zero-during-transit",
						"ttl-zero-during-reassembly",
						"parameter-problem",
						"ip-header-bad",
						"required-option-missing",
						"timestamp-request",
						"timestamp-reply",
						"address-mask-request",
						"address-mask-reply"
					}

					local res = self.dt:check_array(value, icmp_types)
					if not res then
						return self.dt:default_validation(value)
					end
					return true
				end,
			},
			src = {
				validate = function (self, value)
					return self.dt:check_array(value, zones(self))
				end
			},
			src_mac = {
				params = { list = true },
				validate = function (self, value)
					local res, msg, value_table = nil, nil, {}
					value:gsub("[%a%d%p]+", function(s) table.insert(value_table, s) end)
					for _, v in pairs(value_table) do
						res = self.dt:check_array(v, macs())
						if not res then
							res, msg = self.dt:macaddr(v)
							if not res then
								return res, msg
							end
						end
					end
					return true
				end
			},
			src_ip = {
				params = { list = true },
				maxlength = 64,
				validate = function (self, value)
					local values = {}
					value:gsub("[%a%d%p]+", function(s) table.insert(values, s) end)
					for _, v in pairs(values) do
						local new_value, err = self.dt:neg(v)
						if err then
							return false, err
						end
						local ok, mask_err = self.dt:ipmask(new_value)
						if not ok then
							return ok, mask_err
						end
					end
					return true
				end
			},
			src_port = {
				params = { list = true },
				validate = function (self, value)
					local res, msg, value_table = nil, nil, {}
					value:gsub("[%a%d%p]+", function(s) table.insert(value_table, s) end)
					for _, v in pairs(value_table) do
						res, msg = self.dt:neg(v)
						if res == false then
							return res, msg
						end
						res, msg = self.dt:portrange(res)
						if not res then
							return res, msg
						end
					end
					return true
				end
			},
			dest_local = {
				validate = function(self, value)
					return self.dt:check_array(value, zones(self))
				end
			},
			dest = {
				validate = function(self, value)
					return self.dt:check_array(value, zones(self))
				end
			},
			dest_ip = {
				params = { list = true },
				maxlength = 64,
				validate = function(self, value)
					local values = {}
					value:gsub("[%a%d%p]+", function(s) table.insert(values, s) end)
					for _, v in pairs(values) do
						local new_value, err = self.dt:neg(v)
						if err then
							return false, err
						end
						local ok, mask_err = self.dt:ipmask(new_value)
						if not ok then
							return ok, mask_err
						end
					end
					return true
				end
			},
			dest_port = {
				params = { list = true },
				validate = function(self, value)
					local res, msg, value_table = nil, nil, {}
					value:gsub("[%a%d%p]+", function(s) table.insert(value_table, s) end)
					for _, v in pairs(value_table) do
						res, msg = self.dt:neg(v)
						if res == false then
							return res, msg
						end
						res, msg = self.dt:portrange(res)
						if not res then
							return res, msg
						end
					end
					return true
				end
			},
			target = {
				require =  {
					DSCP = {"set_dscp"},
					MARK = {"set_mark"},
					TTL = {"ttl_value"},
					TCPMSS = {"set_mss"}
				},
				validate = function (self, value)
					return self.dt:check_array(value, { "DSCP", "MARK", "DROP", "ACCEPT", "REJECT", "NOTRACK", "TTL", "TCPMSS" })
				end
			},
			set_dscp = {
				validate = function (self, value)
					return self.dt:check_array(value, {"0", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28",
														"30", "32", "34", "36", "38", "40", "46", "48", "56"})
				end
			},
			set_mark = {
				maxlength = 7,
				validate = function (self, value)
					return self.dt:hexstring(value)
				end
			},
			match = {
				require =  {
					DSCP = {"dscp"},
					FWMARK = {"mark"},
				},
				validate = function (self, value)
					return self.dt:check_array(value, {"DSCP", "FWMARK"})
				end
			},
			dscp = {
				validate = function (self, value)
					return self.dt:check_array(value, {"0", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28",
													"30", "32", "34", "36", "38", "40", "46", "48", "56"})
				end
			},
			mark = {
				maxlength = 7,
				validate = function (self, value)
					return self.dt:hexstring(value)
				end
			},
			extra = {
				maxlength = 128,
				validate = function (self, value)
					return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-/!:., ]+$")
				end
			},
			weekdays = {
				params = { list = true },
				validate = function (self, value)
					local days = { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" }
					return self.dt:check_array(value, days)
				end,
				get = function(self, value)
					local value_table = {}
					if value and type(value) == "string" then
						value:gsub("([^ ]+)", function(s) table.insert(value_table, s) end)
					end
					return #value_table > 0 and value_table or value
				end,
				set = function(self, value)
					self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
				end
			},
			monthdays = {
				params = { list = true },
				validate = function (self, value)
					local days = {}
					for i = 1, 31 do
						table.insert(days, tostring(i))
					end
					return self.dt:check_array(value, days)
				end,
				get = function(self, value)
					local value_table = {}
					if value and type(value) == "string" then
						value:gsub("([^ ]+)", function(s) table.insert(value_table, s) end)
					end
					return #value_table > 0 and value_table or value
				end,
				set = function(self, value)
					self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
				end
			},
			start_time = {
				validate = function (self, value)
					return self.dt:timehhmmss(value)
				end
			},
			stop_time = {
				validate = function (self, value)
					return self.dt:timehhmmss(value)
				end
			},
			start_date = {
				validate = function (self, value)
					local valid, message = self.dt:dateyyyymmdd(value, "past_date")
					if not valid then return false, message end
					local stop_date = tostring(self:get_abs_value(self.config, self.sid, "stop_date")) or ""
					return check_dates(value, stop_date)
				end
			},
			stop_date = {
				validate = function (self, value)
					local valid, message = self.dt:dateyyyymmdd(value)
					if not valid then return false, message end
					local start_date = tostring(self:get_abs_value(self.config, self.sid, "start_date")) or ""
					return check_dates(start_date, value)
				end
			},
			utc_time = {
				validate = function (self, value)
					return self.dt:is_bool(value)
				end,
				get = function (self, value)
					return value or "0"
				end
			},
			ttl_value = {
				validate = function (self, value)
					return self.dt:irange(value, 1, 255)
				end
			},
			ttl_action = {
				validate = function (self, value)
					return self.dt:check_array(value, {"set", "increment", "decrement"})
				end,
				get = function (self, value)
					if self:table_get(self.config, self.sid, "target") == "TTL" then
						value = value or "set"
					end
					return value
				end
			},
			set_mss = {
				validate = function (self, value)
					return self.dt:irange(value, 0, 65515)
				end
			},
			---------------------- Limit options ---------------------
			period = {
				require = { "limit" },
				validate = function (self, value)
					return self.dt:check_array(value, { "second", "minute", "hour", "day" })
				end,
				get = function (self, value)
					local period_value = self:table_get(self.config, self.sid, "limit")
					local parsed_period = period_value and period_value:match("(%a+)")
					return period_map[parsed_period] or parsed_period
				end,
				set = function (self, value)
					if value == "" then
						self:table_delete(self.config, self.sid, "limit")
					else
						local limit_cfg_value = self:table_get(self.config, self.sid, "limit")
						limit_cfg_value = limit_cfg_value and limit_cfg_value:match("(%d+)")
						local limit_value = self.current_data_block.limit or limit_cfg_value
						self:table_set(self.config, self.sid, "limit", limit_value.."/"..value)
					end
				end
			},
			limit = {
				require = { "period" },
				validate = function (self, value)
					return self.dt:irange(value, 1, 10000)
				end,
				get = function (self, value)
					return value and value:match("(%d+)") or nil
				end,
				set = function (self, value)
					if value == "" then
						self:table_delete(self.config, self.sid, self.api_key)
					else
						local period_cfg_value = self:table_get(self.config, self.sid, "period")
						period_cfg_value = period_cfg_value and period_cfg_value:match("(%a+)")
						local period_value = self.current_data_block.period or period_cfg_value
						self:table_set(self.config, self.sid, self.api_key, value.."/"..period_value)
					end
				end
			},
			limit_burst = {
				validate = function (self, value)
					return self.dt:irange(value, 1, 10000)
				end
			},
			limit_log_overlimit = {
				validate = function (self, value)
					return self.dt:is_bool(value)
				end
			}
			----------------------------------------------------------
		}
	}
end
