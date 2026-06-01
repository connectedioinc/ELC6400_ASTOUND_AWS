local type, pairs, ipairs, table
	= type, pairs, ipairs, table
local tonumber
	= tonumber
local require = require
local utl = require "vuci.util"
local uci = require "vuci.uci"

module "vuci.mwan"

local _uci

_CONFIG = "mwan3"

function _valid_id(x)
	return (x and #x > 0 and x:match("^[a-zA-Z0-9_]+$"))
end

function _get(c, s, o)
	return _uci:get(c, s, o)
end

function _set(c, s, o, v)
	if v ~= nil then
		if type(v) == "boolean" then v = v and "1" or "0" end
		return _uci:set(c, s, o, v)
	else
		return _uci:delete(c, s, o)
	end
end

function _uci_name_exists(name)
	local t, n = _uci:get(_CONFIG, name)

	return  (t and n) and true or false
end

function _get_highest_metric()
	local metric = 0

	_uci:foreach(_CONFIG, "member", function(s)
		metric = (s.metric and tonumber(s.metric) > metric) and tonumber(s.metric) or metric
	end)
	return metric
end

function _remove_from_table(tbl, value)
	local _, v, n
	local tmp_table = {}
	local exists = false

	for _, n in ipairs(tbl) do
		for _, v in pairs(value) do
			if n == v then
				exists = true
				break
			end
		end
		if not exists then
			table.insert(tmp_table, n)
		end
		exists = false
	end

	return tmp_table
end

function _table_value_exists(tbl, value)
	local _, n
	for _, n in ipairs(tbl) do
		if n == value then return true end
	end

	return false
end

function init(cursor)
	_uci = cursor or _uci or uci.cursor()

	return _M
end

function get_info(self, name)
	local args = { section = "interfaces" }
	if name then args.interface = name end
	local rv =  utl.ubus("mwan3", "status", args)

	return rv
end

function get_active(self)
	local fs = require "nixio.fs"
	local members = {}

	_uci:foreach("mwan3", "member", function(s)
		if s[".name"] and s[".name"]:find("_member_mwan") and s.interface and s.metric then
			local metric = tonumber(s.metric)
			if metric then
				table.insert(members, { interface = s.interface, metric = tonumber(s.metric) })
			end
		end
	end)

	table.sort(members, function(a, b)
        return a.metric < b.metric
	end)

	for _, s in ipairs(members) do
		local status_file = "/tmp/run/mwan3track/" .. s.interface .. "/STATUS"
		if fs.access(status_file) and fs.readfile(status_file):match("online") then
			return s.interface
		end
    end

	return nil
end

function mwan_enabled()
	local enabled = false
	_uci:foreach("mwan3", "interface", function(s)
		if s.enabled and s.enabled == "1" then
			enabled = true
			return false
		end
	end)

	return enabled
end

--Adds default sections for a coresponding interface
function add_mwan(self, name, options)
	local default_options = {
		enabled = 0,
		family = 'ipv4',
		interval = 3,
	}
	local ifname = self:add_interface(name, options or default_options)

	if ifname then
		local member
		local condition_options = {
			track_ip  = { '1.1.1.1', '8.8.8.8'},
			count = 1,
			reliability = 1,
			up = 3,
			down = 3,
			timeout = 2,
			track_method = 'ping'
		}

		ifname:add_condition(condition_options)
		member = ifname:add_default_member("mwan", { metric = _get_highest_metric() + 1})

		if not options or not options.service then
			if member then
				member:append_policy("mwan_default")
			end
		end

		member = ifname:add_default_member("balance", { weight = 1 })
		if member then
			member:append_policy("balance_default")
		end
	end

end

--Adds new interface section
function add_interface(self, n, options)
	if _valid_id(n) and not _uci_name_exists(n) then
		local old_interface = self:get_interface(n)

		if not old_interface then
			if _uci:section(_CONFIG, "interface", n, options) then
				return Interface(n)
			end
		elseif old_interface then
			if options then
				local k, v
				for k, v in pairs(options) do
					old_interface:set(k, v)
				end
			end
			return old_interface
		end
	end
end

--Deletes interface and all sections related to it
function del_interface(self, n)
	if n then
		local r = _uci:delete(_CONFIG, n)

		if r then
			local del_members = {}
			_uci:delete_all(_CONFIG, "condition",
				function(s) return (s.interface == n) end)
			_uci:delete_all(_CONFIG, "member",
				function(s)
					if s.interface == n then
						del_members[s[".name"]] = s[".name"]
						return true
					end
					return false
				end)
			uci:foreach(_CONFIG, "policy", function(s)
				if s.use_member then
					if type(s.use_member) == "table" then
						local new_members = _remove_from_table(s.use_member, del_members)
						_uci:set(_CONFIG, s[".name"], "use_member", new_members)
					elseif del_members[s.use_member] then
						_uci:delete(_CONFIG, s[".name"], "use_member")
					end
				end
			end)
		end

		return r
	end
end

function get_interface(self, name)
	if name then
		local t, n = _uci:get(_CONFIG, name)

		if t == "interface" and n ~= nil then
			return Interface(name)
		end
	end
end

function get_interfaces(self)
	local ifnames = {}
	_uci:foreach(_CONFIG, "interface", function(s)
		if utl.imatch(s[".name"]) then
			ifnames[s[".name"]] = Interface(s[".name"])
		end
	end)

	return ifnames
end

function get_condition(self, name)
	if name then
		local t, n = _uci:get(_CONFIG, name)

		if t == "condition" and n ~= nil then
			return Condition(name)
		end
	end
end

function get_conditions(self)
	local conditions = {}

	_uci:foreach(_CONFIG, "condition", function(s)
		conditions[#conditions + 1] = Condition(s[".name"])
	end)

	return conditions
end

function del_condition(self, name)
	if name then
		local t, n = _uci:get("mwan3", name)
		if t == "condition" and n == name then
			return _uci:delete("mwan3", name)
		end
	end
end

function get_policy(self, name)
	if name then
		local t, n = _uci:get("mwan3", name)

		if t == "policy" and n ~= nil then
			return Policy(name)
		end
	end
end

function get_policies(self)
	local policies = {}

	_uci:foreach(_CONFIG, "interface", function(s)
		policies[#policies + 1] = Policy(s[".name"])
	end)

	return conditions
end

function del_policy(self, name)
	if name then
		local t, n = _uci:get(_CONFIG, name)
		if t == "policy" and n == name then
			return _uci:delete(_CONFIG, name)
		end
	end
end


Mwan = utl.class()

function Mwan.__init__(self)
	self.config = _CONFIG
end

function Mwan.get(self, opt)
	return _get(self.config, self.sid, opt)
end

function Mwan.set(self, opt, val)
	return _set(self.config, self.sid, opt, val)
end

function Mwan.name(self)
	return self.sid
end


Interface = utl.class(Mwan)

function Interface.__init__(self, name)
	Mwan.__init__(self)
	local t, n = _uci:get(self.config, name)

	if t == "interface" and n ~= nil then
		self.sid = n
	else
		self.not_found = true
	end
	self.sid = self.sid or name
end

function Interface.is_empty(self)
	return not self.not_found
end

function Interface.get_status(self)
	return get_info(self.sid)
end

function Interface.get_condition(self, name)
	if name and _uci:get(self.config, name) == "condition"
			and _uci:get(self.config, name, "interface") == self.sid then
		return Condition(name)
	end
end

function Interface.get_conditions(self)
	local conditions = { }

	_uci:foreach(self.config, "condition", function(s)
		if s.interface == self.sid then
			conditions[#conditions+1] = Condition(s['.name'])
		end
	end)

	return conditions
end

function Interface.add_condition(self, options)
	options = options or { }
	options.interface = self.sid

	local cond = _uci:section(self.config, "condition", nil, options)
	if cond then
		return Condition(cond)
	end
end

function Interface.del_condition(self, cond)
	if cond and _uci:get(self.config, cond, "interface") == self.sid then
		_uci:delete(self.config, cond)
		return true
	end

	return false
end

function Interface.add_member(self, name, options)
	options = options or { }
	options.interface = self.sid

	if name and not _uci_name_exists(name) then
		local member = _uci:section(self.config, "member", name, options)
		if member then
			return Member(member)
		end
	end
end

function Interface.add_default_member(self, type, options)
	return self:add_member(self.sid .. "_member_" .. type, options)
end

function Interface.get_member(self, name)
	if name and _uci:get(self.config, name) == "member"
			and _uci:get(self.config, name, "interface") == self.sid then
		return Member(name)
	end
end

function Interface.get_default_member(self, type)
	return self:get_member(self.sid .. "_member_" .. type)
end

function Interface.del_member(self, member)
	if member and _uci:get(self.config, member, "interface") == self.sid then
		_uci:delete(self.config, member)
		return true
	end

	return false
end

Condition = utl.class(Mwan)

function Condition.__init__(self, name)
	Mwan.__init__(self)
	local t, n = _uci:get(self.config, name)
	self.type = "condition"

	if t == "condition" and n ~= nil then
		self.sid    = n
	else
		self.not_found = true
	end
	self.sid = self.sid or name
end

function Condition.ifname(self)
	return self:get("interface")
end

function Condition.get_interface(self)
	local ifname = self:get("interface")
	return ifname and Interface(ifname) or nil
end

Member = utl.class(Mwan)

function Member.__init__(self, name)
	Mwan.__init__(self)
	local t, n = _uci:get(self.config, name)
	self.type = "member"

	if t == self.type and n ~= nil then
		self.sid    = n
	else
		self.not_found = true
	end
	self.sid    = self.sid or name
end

function Member.ifname(self)
	return self:get("interface")
end

function Member.get_interface(self)
	local ifname = self:get("interface")
	return ifname and Interface(ifname) or nil
end

function Member.add_policy(self, name)
	if name and not _uci_name_exists(name) then
		local policy = _uci:section(self.config, "policy", name, {use_member = {self.sid}})
		if policy then
			return Policy(policy)
		end
	end
end

function Member.append_policy(self, name)
	local t, n = _uci:get(self.config, name)

	if t == "policy" and n ~= nil then
		local members = _uci:get(self.config, name, "use_member") or {}

		if type(members) == "string" then
			members = {members}
		end

		if not _table_value_exists(members, self.sid) then
			table.insert(members, self.sid)
		end

		return _uci:set(self.config, name, "use_member", members)
	else
		self:add_policy(name)
	end

	return false
end

Policy = utl.class(Mwan)

function Policy.__init__(self, name)
	Mwan.__init__(self)
	local t, n = _uci:get(self.config, name)
	self.type = "policy"

	if t == self.type and n ~= nil then
		self.sid    = n
	else
		self.not_found = true
	end
	self.sid = self.sid or name
end

function Policy.add_rule(self, name, options)
	options = options or { }
	options.use_policy = self.sid

	if name and not _uci_name_exists(name) then
		local rule = _uci:section(self.config, "rule", name, options)
		if rule then
			return Rule(rule)
		end
	end
end

function Policy.del_rule(self, name)
	if name and _uci:get(self.config, name, "use_policy") == self.sid then
		_uci:delete(self.config, name)
		return true
	end

	return false
end

function Policy.append_members(self, member)
	local members = self:get("use_member") or {}

	if not _table_value_exists(members, member) then
		table.insert(members, member)

		return self:set("use_member", members)
	end

	return false
end

function Policy.member_exists(self, name)
	local members = self:get("use_member") or {}

	return _table_value_exists(name)
end

Rule = utl.class(Mwan)

function Rule.__init__(self, name)
	Mwan.__init__(self)
	local t, n = _uci:get(self.config, name)
	self.type = "rule"

	if t == self.type and n ~= nil then
		self.sid    = n
	else
		self.not_found = true
	end
	self.sid = self.sid or name
end
