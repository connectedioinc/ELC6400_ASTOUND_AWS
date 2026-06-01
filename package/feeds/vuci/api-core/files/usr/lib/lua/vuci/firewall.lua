-- Copyright 2009 Jo-Philipp Wich <jow@openwrt.org>
-- Licensed to the public under the Apache License 2.0.

-- Modifications Copyright (C) 2021 Teltonika Networks

local type, pairs, ipairs, table, luci, math, os, tostring, tonumber
	= type, pairs, ipairs, table, luci, math, os, tostring, tonumber

-- local tpl = require "luci.template.parser"
local utl = require "vuci.util"
local uci = require "vuci.uci"
local io = require "io"

module "vuci.firewall"


local uci_r

function _valid_id(x)
	return (x and #x > 0 and x:match("^[a-zA-Z0-9_]+$"))
end

function _get(c, s, o)
	return uci_r:get(c, s, o)
end

function _set(c, s, o, v)
	if v ~= nil then
		if type(v) == "boolean" then v = v and "1" or "0" end
		return uci_r:set(c, s, o, v)
	else
		return uci_r:delete(c, s, o)
	end
end


function init(cursor)
	uci_r = cursor or uci_r or uci.cursor()

	return _M
end

function get_defaults()
	return defaults()
end

function new_zone(self)
	local name = "newzone"
	local count = 1

	while self:get_zone(name) do
		count = count + 1
		name = "newzone%d" % count
	end

	return self:add_zone(name)
end

function next_id(self)
	local id = 0
	uci_r:foreach("firewall", nil, function (s)
		local sid = tonumber(s[".name"])
		if sid then id = math.max(id, sid) end
	end)
	return tostring(id + 1)
end

function add_zone(self, n)
	if _valid_id(n) and not self:get_zone(n) then
		local d = defaults()
		local z = uci_r:section("firewall", "zone", next_id(), {
			name    = n,
			input   = d:input()   or "DROP",
			forward = d:forward() or "DROP",
			output  = d:output()  or "DROP"
		})

		return z and zone(z)
	end
end

function get_zone(self, n)
	if uci_r:get("firewall", n) == "zone" then
		return zone(n)
	else
		local z
		uci_r:foreach("firewall", "zone",
			function(s)
				if n and s.name == n then
					z = s['.name']
					return false
				end
			end)
		return z and zone(z)
	end
end

function get_zones(self)
	local zones = { }
	local znl = { }

	uci_r:foreach("firewall", "zone",
		function(s)
			if s.name then
				znl[s.name] = zone(s['.name'])
			end
		end)

	local z
	for z in utl.kspairs(znl) do
		zones[#zones+1] = znl[z]
	end

	return zones
end

function get_zone_by_device(self, device)
	local z

	uci_r:foreach("firewall", "zone",
		function(s)
			if s.device == device then
				z = s['.name']
				return false
			end
		end)

	return z and zone(z)
end

function get_zone_by_network(self, net)
	local z

	uci_r:foreach("firewall", "zone",
		function(s)
			if s.name and net then
				local n
				for n in utl.imatch(s.network or s.name) do
					if n == net then
						z = s['.name']
						return false
					end
				end
			end
		end)

	return z and zone(z)
end

function del_zone(self, n)
	local r = false

	if uci_r:get("firewall", n) == "zone" then
		local z = uci_r:get("firewall", n, "name")
		r = uci_r:delete("firewall", n)
		n = z
	else
		uci_r:foreach("firewall", "zone",
			function(s)
				if n and s.name == n then
					r = uci_r:delete("firewall", s['.name'])
					return false
				end
			end)
	end

	if r then
		uci_r:foreach("firewall", "rule",
			function(s)
				if s.src == n or s.dest == n then
					uci_r:delete("firewall", s['.name'])
				end
			end)

		uci_r:foreach("firewall", "redirect",
			function(s)
				if s.src == n or s.dest == n then
					uci_r:delete("firewall", s['.name'])
				end
			end)

		uci_r:foreach("firewall", "forwarding",
			function(s)
				if s.src == n or s.dest == n then
					uci_r:delete("firewall", s['.name'])
				end
			end)
	end

	return r
end

function rename_zone(self, old, new)
	local r = false

	if _valid_id(new) and not self:get_zone(new) then
		uci_r:foreach("firewall", "zone",
			function(s)
				if old and s.name == old then
					uci_r:set("firewall", s['.name'], "name", new)
					r = true
					return false
				end
			end)

		if r then
			uci_r:foreach("firewall", "rule",
				function(s)
					if s.src == old then
						uci_r:set("firewall", s['.name'], "src", new)
					end
					if s.dest == old then
						uci_r:set("firewall", s['.name'], "dest", new)
					end
				end)

			uci_r:foreach("firewall", "redirect",
				function(s)
					if s.src == old then
						uci_r:set("firewall", s['.name'], "src", new)
					end
					if s.dest == old then
						uci_r:set("firewall", s['.name'], "dest", new)
					end
				end)

			uci_r:foreach("firewall", "forwarding",
				function(s)
					if s.src == old then
						uci_r:set("firewall", s['.name'], "src", new)
					end
					if s.dest == old then
						uci_r:set("firewall", s['.name'], "dest", new)
					end
				end)
		end
	end

	return r
end

function del_network(self, net)
	local z
	if net then
		for _, z in ipairs(self:get_zones()) do
			z:del_network(net)
		end
	end
end

function get_iptables_names(self, ip6)
	local f = ip6 and io.open("/proc/net/ip6_tables_names", "r") or io.open("/proc/net/ip_tables_names", "r")
	if not f then return {} end
	local table_names = {}
	for name in f:lines() do
		table.insert(table_names, name)
	end
	f:close()
	return table_names
end

function reset_iptables_counters(self, ip6)
	local tables = ip6 and "ip6tables" or "iptables"
	local responses = {}
	for _, name in ipairs(get_iptables_names(self, ip6)) do
		local res = os.execute(tables .. " -Z -t " .. name .. " -w30")
		table.insert(responses, { code = res, table_name = name })
	end
	for _, res in ipairs(responses) do
		-- code 768 - table not found. Iptables names located in "/proc/net/ip_tables_names" file aren't always
		-- present on some of the devices, and thus the error is skipped
		if res.code ~= 0 and res.code ~= 768 then
			return false, "Failed to reset chains counters of \"".. res.table_name .."\" table"
		end
	end
	return true
end

function get_iptables_status(self, table_name, table_type)
	local function parse_string(value)
		if not value or value == '--' or #value == 0 then return nil end
		return value
	end

	local function get_value(line, key)
		return line:match(key.."%s([^%s]*)")
	end

	local function parse_options(line)
		local comment = ""
		local options = line:match("(%-m%s.*)")
		if not options then return "", "" end
		local end_idx = options:find("%s%-[cj]%s")
		if end_idx then
			options = options:sub(0, end_idx - 1)
		end
		local comment_start_idx, comment_end_idx = options:find('".*"')
		-- offset for `-m comment --comment` part
		local comment_start_offset = 22
		if comment_start_idx then
			-- if comment is before options
			if comment_start_idx < comment_start_offset + 1 then
				comment = options:sub(comment_start_offset, comment_end_idx)
				options = options:sub(comment_end_idx + 2)
			-- comment is after options
			else
				comment = options:sub(comment_start_idx, comment_end_idx)
				options = options:sub(0, comment_start_idx - comment_start_offset)
			end
		end
		comment = comment:match('"!fw3: (.*)"') or ""
		return options, comment
	end

	local function merge_chains_with_rules(data, rules)
		for _, chain in ipairs(data.chains) do
			for _, rule in ipairs(rules) do
				if chain.chain == rule.chain then
					rule.chain = nil
					table.insert(chain.rules, rule)
				end
			end
		end
		return data
	end

	table_type = table_type and "ip6tables" or "iptables"
	table_name = table_name or "filter"
	local filename = "/tmp/"..table_type.."_"..table_name
	-- `io.popen` occasionally causes `Interrupted system call` error when `f:lines` is used
	-- thus `os.execute` is utilized to write information to file and then read from it
	local res = os.execute(table_type.." -vS -t "..table_name.." -w30 > "..filename.." || rm "..filename)
	if res ~= 0 then return nil end
	local f = io.open(filename, "r")
	if not f then return nil end
	local data = {
		table = table_name,
		chains = {}
	}
	local rules = {}
	for line in f:lines() do
		if line:match("^%-[PN]") then
			local chain, policy = line:match("^%-[PN]%s*([^%s]*)%s*([^%s]*)")
			local pkts, bytes = line:match("%-c%s(%d*)%s(%d*)")
			table.insert(data.chains, {
				chain = chain,
				pkts = parse_string(pkts) or "0",
				bytes = parse_string(bytes) or "0",
				policy = parse_string(policy),
				rules = {}
			})
		else
			local pkts, bytes = line:match("%-c%s(%d*)%s(%d*)")
			local options, comment = parse_options(line)
			local target_opts = line:match("-j%s[^%s]*%s(%-%-[^%s]*%s.*)")
			if target_opts then
				options = target_opts.." "..options
			end
			table.insert(rules, {
				chain = get_value(line, "-A"),
				pkts = parse_string(pkts) or "0",
				bytes = parse_string(bytes) or "0",
				target = parse_string(get_value(line, "-j")) or "any",
				prot = parse_string(get_value(line, "-p")) or "any",
				["in"] = parse_string(get_value(line, "-i")) or "any",
				out = parse_string(get_value(line, "-o")) or "any",
				source = parse_string(get_value(line, "-s")) or "anywhere",
				destination = parse_string(get_value(line, "-d")) or "anywhere",
				options = options,
				comment = comment
			})
		end
	end
	f:close()
	return merge_chains_with_rules(data, rules)
end


defaults = utl.class()
function defaults.__init__(self)
	uci_r:foreach("firewall", "defaults",
		function(s)
			self.sid  = s['.name']
			return false
		end)

	self.sid = self.sid or uci_r:section("firewall", "defaults", next_id(), { })
end

function defaults.get(self, opt)
	return _get("firewall", self.sid, opt)
end

function defaults.set(self, opt, val)
	return _set("firewall", self.sid, opt, val)
end

function defaults.syn_flood(self)
	return (self:get("syn_flood") == "1")
end

function defaults.drop_invalid(self)
	return (self:get("drop_invalid") == "1")
end

function defaults.input(self)
	return self:get("input") or "DROP"
end

function defaults.forward(self)
	return self:get("forward") or "DROP"
end

function defaults.output(self)
	return self:get("output") or "DROP"
end


zone = utl.class()
function zone.__init__(self, z)
	if uci_r:get("firewall", z) == "zone" then
		self.sid  = z
		self.data = uci_r:get_all("firewall", z)
	else
		uci_r:foreach("firewall", "zone",
			function(s)
				if s.name == z then
					self.sid  = s['.name']
					self.data = s
					return false
				end
			end)
	end
end

function zone.get(self, opt)
	return _get("firewall", self.sid, opt)
end

function zone.set(self, opt, val)
	return _set("firewall", self.sid, opt, val)
end

function zone.masq(self)
	return (self:get("masq") == "1")
end

function zone.name(self)
	return self:get("name")
end

function zone.network(self)
	return self:get("network")
end

function zone.input(self)
	return self:get("input") or defaults():input() or "DROP"
end

function zone.forward(self)
	return self:get("forward") or defaults():forward() or "DROP"
end

function zone.output(self)
	return self:get("output") or defaults():output() or "DROP"
end

function zone.add_network(self, net)
	if uci_r:get("network", net) == "interface" then
		local nets = { }

		local n
		for n in utl.imatch(self:get("network") or "") do
			if n ~= net then
				nets[#nets+1] = n
			end
		end

		nets[#nets+1] = net

		_M:del_network(net)
		self:set("network", table.concat(nets, " "))
	end
end

function zone.del_network(self, net)
	local nets = { }

	local n
	for n in utl.imatch(self:get("network") or "") do
		if n ~= net then
			nets[#nets+1] = n
		end
	end

	if #nets > 0 then
		self:set("network", table.concat(nets, " "))
	else
		self:set("network", " ")
	end
end

function zone.get_networks(self)
	local nets = { }

	local n
	for n in utl.imatch(self:get("network") or "") do
		nets[#nets+1] = n
	end

	return nets
end

function zone.clear_networks(self)
	self:set("network", " ")
end

function zone.get_forwardings_by(self, what)
	local name = self:name()
	local forwards = { }

	uci_r:foreach("firewall", "forwarding",
		function(s)
			if s.src and s.dest and s[what] == name then
				forwards[#forwards+1] = forwarding(s['.name'])
			end
		end)

	return forwards
end

function zone.add_forwarding_to(self, dest)
	local exist, forward

	for _, forward in ipairs(self:get_forwardings_by('src')) do
		if forward:dest() == dest then
			exist = true
			break
		end
	end

	if not exist and dest ~= self:name() and _valid_id(dest) then
		local s = uci_r:section("firewall", "forwarding", next_id(), {
			src     = self:name(),
			dest    = dest
		})

		return s and forwarding(s)
	end
end

function zone.add_forwarding_from(self, src)
	local exist, forward

	for _, forward in ipairs(self:get_forwardings_by('dest')) do
		if forward:src() == src then
			exist = true
			break
		end
	end

	if not exist and src ~= self:name() and _valid_id(src) then
		local s = uci_r:section("firewall", "forwarding", next_id(), {
			src     = src,
			dest    = self:name()
		})

		return s and forwarding(s)
	end
end

function zone.del_forwardings_by(self, what)
	local name = self:name()

	uci_r:delete_all("firewall", "forwarding",
		function(s)
			return (s.src and s.dest and s[what] == name)
		end)
end

function zone.add_redirect(self, options)
	options = options or { }
	options.src = self:name()

	local s = uci_r:section("firewall", "redirect", next_id(), options)
	return s and redirect(s)
end

function zone.add_rule(self, options)
	options = options or { }
    options.src = self:name()

	local s = uci_r:section("firewall", "rule", next_id(), options)
	return s and rule(s)
end

function zone.get_color(self)
	if self and self:name() == "lan" then
		return "#90f090"
	elseif self and self:name() == "wan" then
		return "#f09090"
	elseif self then
		math.randomseed(tpl.hash(self:name()))

		local r   = math.random(128)
		local g   = math.random(128)
		local min = 0
		local max = 128

		if ( r + g ) < 128 then
			min = 128 - r - g
		else
			max = 255 - r - g
		end

		local b = min + math.floor( math.random() * ( max - min ) )

		return "#%02x%02x%02x" % { 0xFF - r, 0xFF - g, 0xFF - b }
	else
		return "#eeeeee"
	end
end


forwarding = utl.class()
function forwarding.__init__(self, f)
	self.sid = f
end

function forwarding.src(self)
	return uci_r:get("firewall", self.sid, "src")
end

function forwarding.dest(self)
	return uci_r:get("firewall", self.sid, "dest")
end

function forwarding.src_zone(self)
	local z = zone(self:src())
	return z.sid and z
end

function forwarding.dest_zone(self)
	local z = zone(self:dest())
	return z.sid and z
end


rule = utl.class()
function rule.__init__(self, f)
	self.sid = f
end

function rule.get(self, opt)
	return _get("firewall", self.sid, opt)
end

function rule.set(self, opt, val)
	return _set("firewall", self.sid, opt, val)
end

function rule.src(self)
	return uci_r:get("firewall", self.sid, "src")
end

function rule.dest(self)
	return uci_r:get("firewall", self.sid, "dest")
end

function rule.src_zone(self)
	return zone(self:src())
end

function rule.dest_zone(self)
	return zone(self:dest())
end


redirect = utl.class()
function redirect.__init__(self, f)
	self.sid = f
end

function redirect.get(self, opt)
	return _get("firewall", self.sid, opt)
end

function redirect.set(self, opt, val)
	return _set("firewall", self.sid, opt, val)
end

function redirect.src(self)
	return uci_r:get("firewall", self.sid, "src")
end

function redirect.dest(self)
	return uci_r:get("firewall", self.sid, "dest")
end

function redirect.src_zone(self)
	return zone(self:src())
end

function redirect.dest_zone(self)
	return zone(self:dest())
end
