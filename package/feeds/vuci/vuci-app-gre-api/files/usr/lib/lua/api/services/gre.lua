local ConfigService = require("api/ConfigService")
local has_dmvpn = require("nixio.fs").access("/etc/config/dmvpn")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local ntm

local function to_bits(num,bits)
	-- returns a table of bits, most significant first.
	bits = bits or math.max(1, select(2, math.frexp(num)))
	local t = {} -- will contain the bits
	for b = bits, 1, -1 do
		t[b] = math.fmod(num, 2)
		num = math.floor((num - t[b]) / 2)
	end
	return table.concat(t)
end

local gre = ConfigService:new()

function gre:DELETE_validate_hook()
	if has_dmvpn then
		-- Preload dmvpn sections for delete checking
		self.dmvpn_sections = {}
		self:table_foreach("dmvpn", "dmvpn", function(s)
			table.insert(self.dmvpn_sections, s[".name"])
		end)
	end
end

function gre:DELETE_section_init_hook()
	local function do_error(self, service)
		self:add_critical_error(
			STD_CODES.NO_DELETE,
			string.format("'%s' is used in %s configuration and can not be deleted.", self.sid, service),
			self.sid
		)
	end
	local services = self:table_get("network", self.sid, "services")
	if util.contains(services, "dmvpn") then do_error(self, "DMVPN") end
	if util.contains(services, "ipsec") then do_error(self, "IPsec") end
end

function gre:before_commit_hook()
	local enabled  = false
	local pptp_enabled = false

	self:table_foreach("network", "interface", function(s)
		if s.proto == "gre" or s.proto == "grev6" and s.disabled ~= "1" then
			enabled = true
		end
	end)
	self:table_foreach("pptpd", "service", function(s)
		if s.enabled == "1" then
			pptp_enabled = true
		end
	end)

	local rule_opt = {
		name 		= "Allow-gre-traffic",
		target 		= "ACCEPT",
		src  		= "wan",
		family		= "ipv4",
		proto 		= "gre"
	}

	local zone_opt = {
		name	= "gre",
		input	= "ACCEPT",
		forward	= "REJECT",
		output	= "ACCEPT",
		masq	= '1',
		device	= 'gre+'
	}

	local network = {}
	local has_ipv4, has_ipv6 = false, false

	self:table_foreach("network", "interface", function(c)
		if c.proto == "gre" or c.proto == "grev6" then
			table.insert(network, c[".name"])
			has_ipv4 = has_ipv4 or c.proto == "gre"
			has_ipv6 = has_ipv6 or c.proto == "grev6"
		end
	end)
	rule_opt.family =
		has_ipv4 and not has_ipv6 and "ipv4" or
		has_ipv6 and not has_ipv4 and "ipv6" or
		"any"

	local zone_network = table.concat(network, " ")
	zone_opt["network"] = zone_network

	if self.request_method == "POST" or self.request_method == "DELETE" then
		util_tlt.update_firewall_zone_network(zone, zone_opt["network"], self.uci, true)
	end

	if enabled then
		local zone_name = util_tlt.ensure_zone_exists(self, zone_opt, self.sid).name
		if zone_name == zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name) end
		util_tlt.ensure_vpn_rule_exists(self, rule_opt, { target = rule_opt.target, proto = rule_opt.proto })
	elseif pptp_enabled then
		util_tlt.ensure_vpn_rule_exists(self, rule_opt, { target = rule_opt.target, proto = rule_opt.proto })
	end
end
gre.POST_before_commit_hook = gre.before_commit_hook
gre.PUT_before_commit_hook = gre.before_commit_hook

function gre:DELETE_before_commit_hook()
	ntm = ntm or require "vuci.network".init(self.uci)
	self:table_foreach("network", "route", function(s)
		if s.dep == self.sid then
			self.uci:delete("network", s[".name"])
		end
	end)

	ntm:del_routes(self.sid)
	ntm:del_routes(self.sid.."_static")
	gre:before_commit_hook()
	if not util_tlt.has_section(self, "network", "interface", { proto = "gre" }) or not util_tlt.has_section(self, "network", "interface", { proto = "grev6" }) then
		util_tlt.delete_zone_from_firewall(self, "gre", true, true)
		util_tlt.delete_rule_from_firewall(self, "Allow-gre-traffic", true, true)
	end
end

local main_s = gre:section("network", "interface")
main_s:make_primary()
main_s.default_options.id.maxlength = 8
main_s.default_options.id.validate = function(self, value)
	if value:match("_dmvpn") then
		local dmvpn_name = util.split(value, "_dmvpn")
		if self.request_method == "PUT" and dmvpn_name[1] and self:table_get("dmvpn", dmvpn_name[1]) then
			return true
		end
		return false, "Configuration name can't contain '_dmvpn'"
	end
	return true
end
function main_s:filter(s)
	return s.proto == "gre" or s.proto == "grev6"
end
function main_s:create_defaults(sid)
	return {
		proto = "gre",
		disabled = "1",
		mtu = "1476"
	}
end


	local enabled = main_s:option("enabled")
		function enabled:validate(val) return self.dt:is_bool(val) end
		function enabled:get()
			local disabled = self:table_get(self.config, self.sid, "disabled")
			if (not disabled or disabled == "0") then return "1" end
			return "0"
		end
		function enabled:set(val)
			if val == "1" then
				self:table_delete("network", self.sid, "disabled")
			else
				self:table_set("network", self.sid, "disabled", "1")
			end
		end
	local main_proto = main_s:option("proto")
		function main_proto:validate(value)
			return self.dt:check_array(value, { "gre", "grev6" })
		end
		function main_proto:set(value)
			self:table_set(self.config, self.sid, "proto", value)
			if value == "gre" then
				self:table_delete(self.config, self.sid, "peer6addr")
				self:table_delete(self.config, self.sid, "ip6addr")
			else
				self:table_delete(self.config, self.sid, "peeraddr")
				self:table_delete(self.config, self.sid, "ipaddr")
			end
		end
		local ipaddr_tunlink = main_s:option("ipaddr_tunlink")
		function ipaddr_tunlink:validate(value)
			local valid, err = self.dt:ipaddr(value)
			local valid2, err2 = self.dt:uciname(value)
			-- IPv6 address can be longer than 15 characters, cannot use `ipaddr_tunlink.maxlength = 16`
			if valid2 and #value > 16 then
				valid2 = false;
				err2 = "Provided value is too long. Is " .. #value .. " characters, but can be up to 16 characters"
			end
			if not valid and not valid2 then return false, err .. " or " .. err2 end
			return true
		end
		function ipaddr_tunlink:get(val)
			return self:table_get(self.config, self.sid, "ipaddr") or self:table_get(self.config, self.sid, "tunlink")
		end
		function ipaddr_tunlink:set(val)
			if self.dt:ip4addr(val) then
				self:table_set("network", self.sid, "ipaddr", val)
				self:table_delete("network", self.sid, "ip6addr")
				self:table_delete("network", self.sid, "tunlink")
			elseif self.dt:ip6addr(val) then
				self:table_set("network", self.sid, "ip6addr", val)
				self:table_delete("network", self.sid, "ipaddr")
				self:table_delete("network", self.sid, "tunlink")
			else
				self:table_set("network", self.sid, "tunlink", val)
				self:table_delete("network", self.sid, "ipaddr")
				self:table_delete("network", self.sid, "ip6addr")
			end
		end

	local peeraddr = main_s:option("peeraddr")
		function peeraddr:validate(value)
			if self:get_abs_value(self.config, self.sid, "proto") == "grev6" then
				return self.dt:ipv6host(value)
			else
				return self.dt:ipv4host(value)
			end
		end
		function peeraddr:get(value)
			if self:get_abs_value(self.config, self.sid, "proto") == "grev6" then
				value = self:table_get(self.config, self.sid, "peer6addr")
			else
				value = self:table_get(self.config, self.sid, "peeraddr")
			end
			return value
		end
		function peeraddr:set(value)
			if self:table_get(self.config, self.sid, "proto") == "grev6" then
				self:table_set(self.config, self.sid, "peer6addr", value)
			else
				self:table_set(self.config, self.sid, "peeraddr", value)
			end
			if self:table_get(self.config, self.sid, "service") == "dmvpn" then
				self:table_set(self.config, self.sid, "dmvpn_user_mod", "1")
			elseif util.contains(self:table_get(self.config, self.sid, "services"), "dmvpn") then
				self:table_set(self.config, self.sid, "dmvpn_user_mod", "1")
			end
		end

	local mtu = main_s:option("mtu")
		function mtu:validate(value) return self.dt:irange(value, 68, 9200) end

	local okey = main_s:option("okey")
		function okey:validate(value) return self.dt:irange(value, 0, 4294967295) end

	local ikey = main_s:option("ikey")
		function ikey:validate(value) return self.dt:irange(value, 0, 4294967295) end

	local df = main_s:option("df")
		function df:validate(value) return self.dt:is_bool(value) end
		function df:get(value)
			if value == "1" or value == nil then return "0" end
			if value == "0" then return "1" end
		end
		function df:set(value)
			if value == "1" then self:table_set(self.config, self.sid, self.api_key, "0") end
			if value == "0" or value == "" then self:table_set(self.config, self.sid, self.api_key, "1") end
		end

	local ttl = main_s:option("ttl")
		function ttl:validate(value) return self.dt:range(value, 0, 255) end

	local keep_alive = main_s:option("keep_alive")
		function keep_alive:validate(value) return self.dt:is_bool(value) end

	local keep_alive_interval = main_s:option("keep_alive_interval")
		function keep_alive_interval:validate(value) return self.dt:irange(value, 1, 255) end

	local keep_alive_retries = main_s:option("keep_alive_retries")
		function keep_alive_retries:validate(value) return self.dt:irange(value, 1, 255) end

	local _tunlink = main_s:option("_tunlink")
	_tunlink.readonly = true
		function _tunlink:get(value)
			local ipaddr = self:table_get(self.config, self.sid, "ipaddr")
			if self.dt:ip4addr(ipaddr) then return ipaddr end
			local ip6addr = self:table_get(self.config, self.sid, "ip6addr")
			if self.dt:ip6addr(ip6addr) then return ip6addr end

			local tunlink = self:table_get(self.config, self.sid, "tunlink")
			if tunlink then
				local iface = util.ubus("network.interface." .. tunlink, "status") or {}
				if iface["ipv4-address"] and #iface["ipv4-address"] > 0 and iface["ipv4-address"][1].address ~= "" then
					return iface["ipv4-address"][1].address
				elseif iface["ipv6-address"] and #iface["ipv6-address"] > 0 and iface["ipv6-address"][1].address ~= "" then
					return iface["ipv6-address"][1].address
				end
			end
		end

	local _tun_net = main_s:option("_tun_net")
		_tun_net.readonly = true
		function _tun_net:get(value)
			local ip = self:table_get("network", self.sid .. "_static", "ipaddr") or ""
			local mask = self:table_get("network", self.sid .. "_static", "netmask") or ""
			if ip == "" or mask == "" then
				return nil
			end

			local mask_arr = util.split(mask, ".")
			local mask_num = 0
			for _, m in ipairs(mask_arr) do
				local bits = to_bits(tonumber(m))
				if #bits > 1 then
					bits = bits:match("1+")
				end
				if bits ~= "0" then
					mask_num = mask_num + #bits
				end
			end
			if ip ~= "" and mask ~= "" then
				return ip .. "/" .. mask_num
			end
		end

	local service = main_s:option("service")
	service.readonly = true
	function service:get(value)
		local services_list = util.to_table(self:table_get(self.config, self.sid, "services"))
		for _, service in ipairs(services_list or {}) do
			if service == "dmvpn" then
				return "dmvpn"
			end
		end
		return nil
	end

	local services = main_s:option("services", { list = true })
	services.readonly = true


local static_s = gre:section("network", "interface", function(self, sid) return sid.."_static" end)
function static_s:create_defaults(sid)
	-- cannot set proto = "static" in defaults because now "proto" option can be sent inside request
	self:table_set(self.config, self.sid .. "_static", "proto", "static")
	return {
		device = "@" .. sid
	}
end

	local tun_ipaddr = static_s:option("tun_ipaddr")
		function tun_ipaddr:validate(value) return self.dt:ip4addr(value) end
		function tun_ipaddr:get(value)
			return self:table_get(self.config, self.sid .. "_static", "ipaddr")
		end
		function tun_ipaddr:set(value)
			self:table_set(self.config, self.sid .. "_static", "ipaddr", value)
		end

	local tun_netmask = static_s:option("tun_netmask")
		function tun_netmask:validate(value) return self.dt:netmask(value) end
		function tun_netmask:get(value)
			return self:table_get(self.config, self.sid .. "_static", "netmask")
		end
		function tun_netmask:set(value)
			self:table_set(self.config, self.sid .. "_static", "netmask", value)
		end

	local tun_ip6addr = static_s:option("tun_ip6addr")
		function tun_ip6addr:validate(value) return self.dt:cidr6(value) end
		function tun_ip6addr:get(value)
			return self:table_get(self.config, self.sid .. "_static", "ip6addr")
		end
		function tun_ip6addr:set(value)
			self:table_set(self.config, self.sid .. "_static", "ip6addr", value)
		end

return gre
