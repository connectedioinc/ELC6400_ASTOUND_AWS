local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local util = require("vuci.util")
local fs = require("nixio.fs")
local api_utils = require("api/api_utils")

local eoip = ConfigService:new()
local s = eoip:section("eoip", "eoip")
local tmp_path = "/var/run/eoip/"

s:make_primary()
s.default_options.id.maxlength = 8

function eoip:next_num()
	local nums = {}
	self:table_foreach(self.config, "eoip", function(s)
		local num_name
		if s.name then num_name = tonumber(string.match(s.name, "^instance(%d+)$")) end
		local num_id = tonumber(string.match(s[".name"], "^inst(%d+)$"))
		if num_name then
			table.insert(nums, num_name)
		end
		if num_id then
			table.insert(nums, num_id)
		end
	end)
	local next_num = util.find_first_missing(nums)
	return next_num
end

function eoip:POST_init_hook()
	if not self.arguments.data or api_utils:is_array(self.arguments.data) then
		return
	end
	local name = self.arguments.data.name
	local id = self.arguments.data.id
	local num = self:next_num()
	self.arguments.data.id = id or "inst"..num
	self.arguments.data.name = name or "instance"..num
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

local enabled = s:option("enabled")
	enabled.require = { ["1"] = {"tun_id"} }
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

local tun_id = s:option("tun_id")
	function tun_id:validate(value)
		return self.dt:irange(value, 1, 65536)
	end

local dynamic = s:option("dynamic")
	function dynamic:validate(value)
		return self.dt:is_bool(value)
	end

local remote_ip = s:option("remote_ip")
	function remote_ip:validate(value)
		if self:get_abs_value(self.config, self.sid, "use_ipv6") == "1" then
			if not self.dt:ip6addr(value) then return false, "IPv6 addresses are accepted. E.g. ::0000:8a2e:0370:7334, because use_ipv6 is enabled." end
			return true
		else
			return self.dt:ip4addr(value)
		end
	end

local local_ip = s:option("local_ip")
	function local_ip:validate(value)
		if self:get_abs_value(self.config, self.sid, "use_ipv6") == "1" then
			if not self.dt:ip6addr(value) then return false, "IPv6 addresses are accepted. E.g. ::0000:8a2e:0370:7334, because use_ipv6 is enabled." end
			return true
		else
			return self.dt:ip4addr(value)
		end
	end

local name = s:option("name")
	name.maxlength = 64
	name.required = true
	function name:validate(value)
		local duplicates = false
		self:table_foreach(self.config, "eoip", function(s)
			if self.sid ~= s[".name"] and s.name == value then
				duplicates = true
				return false
			end
		end)
		if duplicates then return false, "Duplicate names are not allowed" end
		return value:match("^[a-zA-Z0-9_ ]+$") ~= nil, "A string of a-Z, 0-9, _ and space characters is accepted."
	end

local to_bridge = s:option("to_bridge")
	function to_bridge:validate(value)
		local bridge_list = { "none" }
		self:table_foreach("network", "device", function(s)
			if s[".name"] and  string.match(s[".name"], "^br_(.+)") then
				table.insert(bridge_list, s[".name"])
			end
		end)
		return self.dt:check_array(value, bridge_list)
	end

local use_ipv6 = s:option("use_ipv6")
	function use_ipv6:validate(value)
		return self.dt:is_bool(value)
	end
-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function eoip:add_firewall_rule()
	local zone = {
		name    = "eoip",
		input   = "ACCEPT",
		forward = "REJECT",
		output  = "ACCEPT",
		masq    = "1",
		device  = "eoip_+"
	}
	local zone_name = util_tlt.ensure_zone_exists(self, zone, nil, zone.device).name
	if zone_name == zone.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name, true) end
	local rule_id = {
		name      = "Allow-eoip-traffic",
		target    = "ACCEPT",
		src       = "wan",
		family    = "any",
		proto     = {"gre"}
	}
	util_tlt.ensure_vpn_rule_exists(self, rule_id, { target = rule_id.target, proto = rule_id.proto })
	self:table_foreach("firewall", "zone", function(s)
		if s.name == "wan" and s.masq == "1" then
			self:table_set("firewall", s[".name"], "masq_allow_invalid", "1")
		end
	end)
end

function eoip:get_num()
	return self.sid:match("inst([1-9]%d*)$") or self.sid
end

function eoip:update_network_bridge(action)
	local dev = "eoip_" .. self:get_num()
	local to_bridge = self:table_get(self.config, self.sid, "to_bridge") or ""
	self:table_foreach("network", "device", function(s)
		if string.match(s[".name"], "^br_(.+)") then
			local eoip_dev = false
			local ports = self:table_get("network", s[".name"], "ports") or {}
			local _ports = {}
			for _, p in pairs(ports) do
				if p == dev then
					eoip_dev = true
				else
					table.insert(_ports, p)
				end
			end
			if eoip_dev and (to_bridge == "none" or to_bridge ~= s[".name"] or action == "remove") then
				if #_ports ~= 0 then
					self:table_set("network", s[".name"], "ports", _ports)
				else
					self:table_delete("network", s[".name"], "ports")
				end
			elseif not eoip_dev and to_bridge == s[".name"] and action ~= "remove" then
				table.insert(ports, dev)
				self:table_set("network", s[".name"], "ports", ports)
			end
		end
	end)
end

function eoip:DELETE_before_commit_hook()
	if not util_tlt.has_section(self, self.config, "eoip") then
		util_tlt.delete_zone_from_firewall(self, "eoip", true, true)
		util_tlt.delete_rule_from_firewall(self, "Allow-eoip-traffic", true, true)
		self:table_foreach("firewall", "zone", function(c)
			if c.name == "wan" then
				self:table_delete("firewall", c[".name"], "masq_allow_invalid")
			end
		end)
	end
	self:update_network_bridge("remove")
end

function eoip:UPDATE_before_commit()
	local s_enabled = false
	local count = 0
	if self:get_abs_value(self.config, self.sid, "enabled") == "1" then
		s_enabled = true
		self:update_network_bridge()
	end
	self:table_foreach(self.config, "eoip", function(c)
		count = count +1
		s_enabled = c.enabled == "1"
	end)
	if s_enabled then
		self:add_firewall_rule()
	end
	if count > 20 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Maximum number of instances has been reached", "Validation")
	end
end

eoip.POST_before_commit_hook   = eoip.UPDATE_before_commit
eoip.PUT_before_commit_hook    = eoip.UPDATE_before_commit

function eoip:DELETE_before_section_delete_hook()
	fs.remove(tmp_path .. "eoip-" .. self.sid .. ".conf") -- remove config file
end

return eoip