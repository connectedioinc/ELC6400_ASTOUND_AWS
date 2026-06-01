local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local util = require("vuci.util")

local rule_opt = {}
rule_opt[1] = {
	rule = {
		name     = "Allow-IPsec-ESP",
		target   = "ACCEPT",
		src      = "wan",
		proto    = "esp"
	},
	args = { target = "ACCEPT", proto = "esp" }, nil, { "dest" }
}

rule_opt[2] = {
	rule = {
		name      = "Allow-IPsec-NAT-T",
		target    = "ACCEPT",
		src       = "wan",
		proto     = "udp",
		dest_port = {"4500"}
	},
	args = { target = "ACCEPT", proto = "udp", dest_port = {"4500"} }, nil, { "dest" }
}

rule_opt[3] = {
	rule = {
		name      = "Allow-IPsec-IKE",
		target    = "ACCEPT",
		src       = "wan",
		dest_port = {"500"},
		proto     = "udp"
	},
	args = { target = "ACCEPT", proto = "udp", dest_port = {"500"} }, nil, { "dest" }
}

rule_opt[4] = {
	rule = {
		name     = "Allow-IPsec-Forward",
		target   = "ACCEPT",
		src      = "wan",
		proto    = "all",
		dest     = "*",
		extra    = '-m policy --dir in --pol ipsec'
	},
	args = { target = "ACCEPT", extra = '-m policy --dir in --pol ipsec', dest = "*" }
}

-- NAT rule
rule_opt[5] = {
	rule = {
		name     = "Exclude-IPsec-from-NAT",
		proto    = 'any',
		extra    = '-m policy --dir out --pol ipsec',
		src     = 'wan',
		target   = "ACCEPT"
	},
	args = { target = "ACCEPT", extra = '-m policy --dir out --pol ipsec', src = "wan" }, "nat"
}

rule_opt[6] = {
	rule = {
		name   = "Allow-NBMA-WAN-traffic",
		target = "ACCEPT",
		src    = "wan",
		proto  = "54",
	},
	args = { target = "ACCEPT", proto = "54" }
}
gre_rule_opt = {
	rule = {
		name     = "Allow-gre-traffic",
		target   = "ACCEPT",
		src      = "wan",
		family   = "ipv4",
		proto    = "gre"
	},
	args = { proto = "gre", target = "ACCEPT"}
}

local dmvpn = ConfigService:new()

function dmvpn:load_firewall_rules()
	local dmvpn_amount = 0
	self:table_foreach("dmvpn", "dmvpn", function(c)
		dmvpn_amount = dmvpn_amount + 1
	end)
	local exists        = false
	local sid

	if dmvpn_amount > 0 then
		for rule, rule_opt in ipairs(rule_opt) do
			util_tlt.ensure_vpn_rule_exists(self, rule_opt.rule, rule_opt.args, rule_opt[1], rule_opt[2], rule_opt[3])
		end
	end

	local gre_enabled = false
	local network = {}
	local zone_opt = {
		name    = "gre",
		input   = "ACCEPT",
		forward = "REJECT",
		output  = "ACCEPT",
		masq    = '1',
		device  = 'gre+'
	}
	self:table_foreach("network", "interface", function(c)
		if c.proto == "gre" then
			table.insert(network, c[".name"])
		end
		if c.proto == "gre" and (c.disabled ~= "1" or c.auto == "1") then
			gre_enabled = true
		end
	end)
	local zone_network = table.concat(network, " ")
	zone_opt["network"] = zone_network

	if self.request_method == "POST" or self.request_method == "DELETE" then
		util_tlt.update_firewall_zone_network("gre", zone_opt["network"], self.uci, true)
	end

	if gre_enabled then
		local zone_name = util_tlt.ensure_zone_exists(self, zone_opt, self.sid).name
		if zone_name == zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name) end
		util_tlt.ensure_vpn_rule_exists(self, gre_rule_opt.rule, gre_rule_opt.args)
	end
end

function dmvpn:saving_logic()
	local enabled     = self.current_data_block.enabled
	local config_mode = self:get_abs_value("dmvpn", self.sid, "config_mode")
	if not self.sid then return end
	local section_name = self.sid

	if enabled == "1" then
		self:table_set("network", self.sid, "disabled", "0")
		self:table_set("network", self.sid, "auto", "1")
		self:table_set("ipsec", self.sid, "enabled", "1")
		if not self:table_get("network", self.sid.."_static", "netmask") then
			self:table_set("network", self.sid .. "_static", "netmask", "255.255.255.255")
		end
		self:table_set("nhrp", "nhrp", "enabled", "1")
		self:table_set("nhrp", self.sid, "enabled", "1")
		if config_mode == "spoke" then
			local nhrp_modded = self:table_get("nhrp", self.sid, "dmvpn_user_mod")
			local ipsec_modded = self:table_get("ipsec", self.sid, "dmvpn_user_mod")
			local network_modded = self:table_get("network", self.sid, "dmvpn_user_mod")
			local hub_address = self.current_data_block.hub_address
			if hub_address then
				if nhrp_modded ~= "1" then
					self:table_set("nhrp", self.sid, "nbma_address", hub_address)
				end
				if ipsec_modded ~= "1" then
					self:table_set("ipsec", self.sid, "remote_identifier", hub_address)
					self:table_set("ipsec", self.sid, "gateway", hub_address)
				end
				if network_modded ~= "1" then
					self:table_set("network", self.sid, "peeraddr", hub_address)
				end
			end
			local dmvpn_route_options = {
				enabled   = "1",
				interface = section_name,
				table     = "254",
				target    = self.current_data_block.gre_remote_ipaddr,
				service   = "dmvpn",
				dep       = section_name
			}

			local redirect = self:get_abs_value("dmvpn", self.sid, "redirect")
			if redirect == "1" then
				if ipsec_modded ~= "1" then
					self:table_set("ipsec", self.sid, "remote_identifier", "%any")
					self:table_set("ipsec", self.sid, "gateway", "%any")
				end
				if network_modded ~= "1" then
					self:table_set("network", self.sid, "peeraddr", "0.0.0.0")
				end
				if nhrp_modded ~= "1" then
					self:table_set("nhrp", self.sid, "redirect", "1")
				end
			end
			local nhrp_map_multicast = {
				enabled   = "1",
				ip_addr   = "multicast",
				nbma    = self.current_data_block.hub_address,
				service   = "dmvpn"
			}
			local nhrp_map_gre = {
				enabled   = "1",
				ip_addr   = self.current_data_block.gre_remote_ipaddr,
				nbma    = self.current_data_block.hub_address,
				service   = "dmvpn"
			}
			local multicast = self:get_abs_value("dmvpn", self.sid, "multicast")
			if multicast == "1" then
				self:table_section("nhrp", self.sid .. "_map", self.sid .. "_mcast", nhrp_map_multicast)
				self:table_section("nhrp", self.sid .. "_map", self.sid .. "_gre", nhrp_map_gre)
			else
				self:table_foreach("nhrp", self.sid.."_map", function (rule)
					if rule[".type"] == self.sid.."_map" then
						self:table_delete("nhrp", rule[".name"])
					end
				end)
			end
			if self:table_get("network", self.sid .. "_route", "dmvpn_user_mod") ~= "1" then
				self:table_section("network", "route", self.sid .. "_route", dmvpn_route_options)
			end
		elseif config_mode == "hub" then
			self:table_delete("ipsec", self.sid, "gateway")
			self:table_set("network", self.sid, "peeraddr", "0.0.0.0")
		end
	else
		self:table_set("nhrp", self.sid, "enabled", "0")
		self:table_set("ipsec", self.sid, "enabled", "0")
		self:table_set("network", self.sid, "disabled", "1")
		self:table_set("network", self.sid, "auto", "0")
		if config_mode == "spoke" and self:table_get("network", self.sid .. "_route") then
			self:table_set("network", self.sid .. "_route", "enabled", "0")
		end
	end
end

function dmvpn:update_nflog_firewall()
	local request_data = {}
	if self.arguments.data and self.arguments.data[1] then
		request_data = self.arguments.data
	elseif self.arguments.data then
		request_data = { self.arguments.data }
	end

	local has_hub = false
	local redirect_enabled = false

	-- Checks request data
	for _, v in pairs(request_data) do
		local mode = self:get_abs_value("dmvpn", v.id, "config_mode")
		local enabled = self:get_abs_value("dmvpn", v.id, "enabled")
		if mode == "hub" and enabled == "1" then
			has_hub = true
		end
		if v.redirect == "1" then
			redirect_enabled = true
		end
	end

	-- Checks data in the config
	if not has_hub then
		self:table_foreach("dmvpn", "dmvpn", function (instance)
			if instance.config_mode == "hub" and instance.enabled == "1" then
				has_hub = true
				return false
			end
		end)
	end

	-- Checks data in the config
	if not redirect_enabled then
		self:table_foreach("nhrp", "nhrp_instance", function (instance)
			if instance.redirect == "1" then
				redirect_enabled = true
				return false
			end
		end)
	end

	local nflog_rule
	self:table_foreach("firewall", "rule", function (rule)
		if rule.name == "NHRP-nflog" then
			nflog_rule = rule[".name"]
		end
	end)

	local nflog_multicast_rule
	self:table_foreach("firewall", "rule", function (rule)
		if rule.name == "NHRP-nflog-multicast" then
			nflog_multicast_rule = rule[".name"]
		end
	end)

	local nhrp_multicast_drop
	self:table_foreach("firewall", "rule", function (rule)
		if rule.name == "NHRP-multicast-drop" then
			nhrp_multicast_drop = rule[".name"]
		end
	end)
	local multicast_nflog_group = self:get_abs_value("nhrp", "nhrp", "multicast_nflog_group")
	if multicast_nflog_group then
		local rule_options = {
			name = "NHRP-nflog-multicast",
			extra = string.format("-j NFLOG --nflog-group %s", multicast_nflog_group),
			target = "ACCEPT",
			dest = "gre",
			proto = "all",
			enable = "1",
			dest_ip = "224.0.0.0/24"
		}
		local drop_rule_options = {
			src = "gre",
			name = "NHRP-multicast-drop",
			target = "DROP",
			dest = "gre",
			proto = "all",
			enable = "1",
			dest_ip = "224.0.0.0/24"
		}
			self:table_section("firewall", "rule", nflog_multicast_rule, rule_options)
			self:table_section("firewall", "rule", nhrp_multicast_drop, drop_rule_options)
		else
			if nflog_multicast_rule then self:table_delete("firewall", nflog_multicast_rule) end
			if nhrp_multicast_drop then self:table_delete("firewall", nhrp_multicast_drop) end
		end

	if has_hub and redirect_enabled then
		local nflog_group = self:get_abs_value("nhrp", "nhrp", "nflog_group")
		if multicast_nflog_group and nflog_group and multicast_nflog_group == nflog_group then return self:ResponseError("NFLOG log groups must not duplicate") end
		if nflog_group then
			local rule_options = {
				src = "gre",
				name = "NHRP-nflog",
				extra = string.format("-m hashlimit --hashlimit-upto 4/minute --hashlimit-burst 1 --hashlimit-mode srcip,dstip --hashlimit-srcmask 24 --hashlimit-dstmask 24 --hashlimit-name loglimit-0 -j NFLOG --nflog-group %s --nflog-size 128", nflog_group),
				target = "ACCEPT",
				dest = "gre",
				proto = "all",
				enable = "1"
			}
			if nflog_rule then
				--FIXME: Update to table_set when it supports passing of the whole table to it, when updating existing section
				self:table_section("firewall", "rule", nflog_rule, rule_options)
			else
				self:table_section("firewall", "rule", self:next_id("firewall"), rule_options)
			end
		end
	else
		if nflog_rule then
			self:table_delete("firewall", nflog_rule)
		end
	end
end

function dmvpn:PUT_before_commit_hook()
	self:load_firewall_rules()
	self:saving_logic()
	self:update_nflog_firewall()
end

function dmvpn:POST_before_commit_hook()
	self:load_firewall_rules()
	self:saving_logic()
	self:update_nflog_firewall()
end

local s = dmvpn:section("dmvpn", "dmvpn")
	-- unnecessary if the main section is the first section or the only one
s:make_primary()
s.default_options.id.maxlength = 8

function s:create_defaults()
	return {
		config_mode = "spoke"
	}
end

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "pre_shared_key" }}
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function enabled:set(value)
			local disabled_value = value == "1" and "0" or "1"
			self:table_set(self.config, self.sid, self.api_key, value)
			self:table_set("ipsec", self.sid, "enabled", value)
			self:table_set("network", self.sid, "disabled", disabled_value)
			self:table_set("network", self.sid, "auto", value)
			self:table_set("network", self.sid .. "_static", "enabled", value)
			if value == "0" then
				local enabled_general = false
				self:table_foreach("nhrp", "nhrp_instance", function(s)
					if s[".name"] ~= self.sid and s.enabled and s.enabled == "1" then
						enabled_general = true
					end
				end)
			end
			if not enabled_general then
				self:table_set("nhrp", "nhrp", "enabled", "0")
			else
				self:table_set("nhrp", "nhrp", "enabled", "1")
			end
			self:table_set("nhrp", self.sid, "enabled", value)
		end

	local config_mode = s:option("config_mode")
	config_mode.cfg_require = true
		function config_mode:validate(value)
			return self.dt:check_array(value, { "spoke", "hub" })
		end

	local hub_address = s:option("hub_address")
		function hub_address:validate(value)
			return self.dt:host(value)
		end
	local redirect = s:option("redirect")
		function redirect:validate(value)
			return self.dt:is_bool(value)
		end

local function new_appended_name(append)
	return function(_, name) return name .. append end
end

local static = dmvpn:section("network", "interface", new_appended_name("_static"))
static.optional = true
function static:create_defaults(sid)
	return {
		proto  = "static",
		ifname = "@" .. sid,
		service = "dmvpn"
	}
end

local s2 = dmvpn:section("network", "interface")
s2.optional = true
function s2:create_defaults()
	return {
		proto    = "gre",
		zone     = "gre",
		disabled = "1",
		auto     = "0",
		services = "dmvpn",
		mtu = "1476"
	}
end

	local ipaddr_tunlink = s2:option("ipaddr_tunlink")
		function ipaddr_tunlink:get()
			local iface = self:table_get(self.config, self.sid, "tunlink")
			return iface and iface or self:table_get(self.config, self.sid, "ipaddr")
		end
		function ipaddr_tunlink:set()
		end
		ipaddr_tunlink.maxlength = 16
		function ipaddr_tunlink:validate(value)
				local valid, err = self.dt:ip4addr(value)
				local valid2, err2 = self.dt:uciname(value)
				if not valid and not valid2 then return false, err .. " or " .. err2 end
				return true
		end

	local gre_ipaddr = s2:option("gre_ipaddr")
		function gre_ipaddr:validate(value)
			return self.dt:ip4addr(value)
		end
		function gre_ipaddr:get()
			return self:table_get(self.config, self.sid.."_static", "ipaddr")
		end
		function gre_ipaddr:set(value)
			return self:table_set(self.config, self.sid.."_static", "ipaddr", value)
		end

	local netmask = s2:option("netmask")
		function netmask:validate(value)
			return self.dt:netmask(value)
		end
		function netmask:get()
			return self:table_get(self.config, self.sid.."_static", self.api_key)
		end
		function netmask:set(value)
			self:table_set(self.config, self.sid.."_static", self.api_key, value)
		end

	local gre_remote_ipaddr = s2:option("gre_remote_ipaddr")
		function gre_remote_ipaddr:validate(value)
			return self.dt:ip4addr(value)
		end
		function gre_remote_ipaddr:get()
			local value = self:table_get("nhrp", self.sid, "proto_address")
			if value == "dynamic" then return "0.0.0.0" end
			return value
		end
		function gre_remote_ipaddr:set(value)
			self:table_set("nhrp", self.sid, "proto_address", value)
			if value == "dynamic" then return end
			if not self:table_get(self.config, self.sid .. "_route") then return end
			if self:table_get(self.config, self.sid .. "_route", "dmvpn_user_mod") == "1" then return end
			self:table_set(self.config, self.sid .. "_route", "dep", self.sid)
			self:table_set(self.config, self.sid .. "_route", "target", value)
		end

	local mtu = s2:option("mtu")
		function mtu:validate(value)
			return self.dt:irange(value, 68, 9200)
		end

	local gre_ikey = s2:option("ikey")
		function gre_ikey:validate(value)
			return self.dt:irange(value, 0, 4294967295)
		end

	local gre_okey = s2:option("okey")
		function gre_okey:validate(value)
			return self.dt:irange(value, 0, 4294967295)
		end

local ipsec = dmvpn:section("ipsec", "remote")
ipsec.optional = true

function ipsec:create_defaults(sid)
	return {
		enabled               = "0",
		authentication_method = "psk",
		crypto_proposal       = { sid .. "_ph1_1" },
		transport             = { sid .. "_c" },
		service               = "dmvpn"
	}
end

	local local_identifier = ipsec:option("local_identifier")
		function local_identifier:validate(_)
			return self.dt:string()
		end

	local remote_identifier = ipsec:option("remote_identifier")
		function remote_identifier:validate(_)
			return self.dt:string()
		end

	local pre_shared_key = ipsec:option("pre_shared_key", { sensitive = true })
	pre_shared_key.minlength = 5
	pre_shared_key.maxlength = 512
		function pre_shared_key:validate(value)
			return self.dt:credentials_validate(value, true)
		end
		function pre_shared_key:get(value)
			if not value then return nil end
			value = string.gsub(value, "0x", "")
			return util.fromhex(value)
		end
		function pre_shared_key:set(value)
			if value == "" then
				self:table_delete(self.config, self.sid, self.api_key)
			else
				self:table_set(self.config, self.sid, self.api_key, "0x" .. util.tohex(value))
			end
		end

	local force_crypto_proposal = ipsec:option("force_crypto_proposal")
		function force_crypto_proposal:validate(value)
			return self.dt:is_bool(value)
		end
		function force_crypto_proposal:get(value)
			return self:table_get(self.config, self.sid, self.api_key)
		end
		function force_crypto_proposal:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
		end

local ipsec_c = dmvpn:section("ipsec", "connection", new_appended_name("_c"))
ipsec_c.optional = true
function ipsec_c:create_defaults(sid)
	return {
		mode            = "start",
		type            = "transport",
		aggressive      = "0",
		keyexchange     = "ikev1",
		crypto_proposal = { sid .. "_ph2_1" },
		leftprotoport   = "gre",
		rightprotoport  = "gre",
		service         = "dmvpn"
	}
end

	local lifetime = ipsec_c:option("lifetime")
		function lifetime:validate(value)
			return self.dt:fieldvalidation(value, "^[0-9]+[smhd]?$")
		end

	local ikelifetime = ipsec_c:option("ikelifetime")
		function ikelifetime:validate(value)
			return self.dt:fieldvalidation(value, "^[0-9]+[smhd]?$")
		end

	local force_crypto_proposal_2 = ipsec_c:option("force_crypto_proposal_2")
		function force_crypto_proposal_2:validate(value)
			return self.dt:is_bool(value)
		end
		function force_crypto_proposal_2:get(value)
			return self:table_get(self.config, self:name_constructor(self.sid), "force_crypto_proposal")
		end
		function force_crypto_proposal_2:set(value)
			self:table_set(self.config, self:name_constructor(self.sid), "force_crypto_proposal", value)
		end

local encryption_algorithm_array = {
	"3des",
	"des",
	"aes128",
	"aes192",
	"aes256",
	"aes128gcm8",
	"aes192gcm8",
	"aes256gcm8",
	"aes128gcm12",
	"aes192gcm12",
	"aes256gcm12",
	"aes128gcm16",
	"aes192gcm16",
	"aes256gcm16"
}

local hash_algorithm_array = {
	"md5",
	"sha1",
	"sha256",
	"sha384",
	"sha512"
}

local dh_group_array       = {
	"modp768",
	"modp1024",
	"modp1536",
	"modp2048",
	"modp3072",
	"modp4096",
	"ecp192",
	"ecp224",
	"ecp256",
	"ecp384",
	"ecp521"
}

local dh_group_array2      = {
	"modp768",
	"modp1024",
	"modp1536",
	"modp2048",
	"modp3072",
	"modp4096",
	"ecp192",
	"ecp224",
	"ecp256",
	"ecp384",
	"ecp521",
	"no_pfs"
}

local phase1 = dmvpn:section("ipsec", "proposal", new_appended_name("_ph1_1"))
phase1.optional = true
function phase1:create_defaults()
	return {
		service = "dmvpn",
		encryption_algorithm = "aes128",
		hash_algorithm       = "sha1",
		dh_group             = "modp1536"
	}
end

	local encryption_algorithm = phase1:option("encryption_algorithm")
		function encryption_algorithm:validate(value)
			return self.dt:check_array(value, encryption_algorithm_array)
		end

	local hash_algorithm = phase1:option("hash_algorithm")
		function hash_algorithm:validate(value)
			return self.dt:check_array(value, hash_algorithm_array)
		end

	local dh_group = phase1:option("dh_group")
		function dh_group:validate(value)
			return self.dt:check_array(value, dh_group_array)
		end

local phase2 = dmvpn:section("ipsec", "proposal", new_appended_name("_ph2_1"))
phase2.optional = true
function phase2:create_defaults()
	return {
		service = "dmvpn",
		encryption_algorithm = "aes128",
		hash_algorithm       = "sha1",
		dh_group             = "modp1536"
	}
end

	local encryption_algorithm_2 = phase2:option("encryption_algorithm_2")
		function encryption_algorithm_2:validate(value)
			return self.dt:check_array(value, encryption_algorithm_array)
		end
		function encryption_algorithm_2:get(value)
			return self:table_get(self.config, self:name_constructor(self.sid), "encryption_algorithm")
		end
		function encryption_algorithm_2:set(value)
			self:table_set(self.config, self:name_constructor(self.sid), "encryption_algorithm", value)
		end


	local hash_algorithm_2 = phase2:option("hash_algorithm_2")
		function hash_algorithm_2:validate(value)
			return self.dt:check_array(value, hash_algorithm_array)
		end
		function hash_algorithm_2:get(value)
			return self:table_get(self.config, self:name_constructor(self.sid), "hash_algorithm")
		end
		function hash_algorithm_2:set(value)
			self:table_set(self.config, self:name_constructor(self.sid), "hash_algorithm", value)
		end


	local dh_group_2 = phase2:option("dh_group_2")
		function dh_group_2:validate(value)
			return self.dt:check_array(value, dh_group_array2)
		end
		function dh_group_2:get(value)
			return self:table_get(self.config, self:name_constructor(self.sid), "dh_group")
		end
		function dh_group_2:set(value)
			self:table_set(self.config, self:name_constructor(self.sid), "dh_group", value)
		end

	local nhrp = dmvpn:section("nhrp", "nhrp_instance")
	nhrp.optional = true
	function nhrp:create_defaults(sid)
		return {
			enabled        = "0",
			interface      = "gre4-" .. sid,
			ipsec_support  = "1",
			ipsec_instance = sid .. "-" .. sid .. "_c",
			redirect = "0",
			service = "dmvpn",
			network_id = "1"
		}
	end

	local network_id = nhrp:option("network_id")
		function network_id:validate(value)
			return self.dt:irange(value, 1, 4294967295)
		end

	local auth = nhrp:option("auth", { sensitive = true })
	auth.maxlength = 8
		function auth:validate(value)
			return self.dt:credentials_validate(value)
		end

	local holdtime = nhrp:option("holdtime")
		function holdtime:validate(value)
			return self.dt:range(value, 1, 65000)
		end

	local opt_nflog_group = nhrp:option("nflog_group")
	function opt_nflog_group:validate(value)
		return self.dt:range(value, 1, 65535)
	end
	function opt_nflog_group:set(value)
		self:table_set(self.config, "nhrp", self.api_key, value)
	end
	function opt_nflog_group:get()
		return self:table_get(self.config, "nhrp", self.api_key)
	end

	local opt_multicast_nflog_group = nhrp:option("multicast_nflog_group")
	function opt_multicast_nflog_group:validate(value)
		return self.dt:range(value, 1, 65535)
	end
	function opt_multicast_nflog_group:set(value)
		self:table_set(self.config, "nhrp", self.api_key, value)
	end
	function opt_multicast_nflog_group:get()
		return self:table_get(self.config, "nhrp", self.api_key)
	end

	local opt_multicast = s:option("multicast")
	function opt_multicast:validate(value)
		return self.dt:is_bool(value)
	end

function dmvpn:save_gre_tun_ipaddr()
	local ipaddr_tunlink = self.current_data_block["ipaddr_tunlink"]

	if ipaddr_tunlink == "" or ipaddr_tunlink == "any" then
		self:table_delete("network", self.sid, "tunlink")
		self:table_delete("network", self.sid, "ipaddr")
		return
	end

	if ipaddr_tunlink then
		if string.match(ipaddr_tunlink, "(%d+)%.(%d+)%.(%d+)%.(%d+)") then
			self:table_set("network", self.sid, "ipaddr", ipaddr_tunlink)
			self:table_delete("network", self.sid, "tunlink")
		else
			self:table_set("network", self.sid, "tunlink", ipaddr_tunlink)
			self:table_delete("network", self.sid, "ipaddr")
		end
	end
end

function dmvpn:PUT_after_validate_section_hook()
	self:save_gre_tun_ipaddr()
end

function dmvpn:POST_after_validate_section_hook()
	self:table_foreach("ipsec", "remote", function(s)
		if s[".name"] == self.sid then
			self:add_error(
				STD_CODES.NAME_USED,
				"Name already used for a configuration",
				"Validation"
			)
			return
		end
	end)
	self:save_gre_tun_ipaddr()
end


function dmvpn:DELETE_after_data_hook()
	local counter = 0
	self.uci:foreach("network", "route", function(c)
		if c.dep == self.sid then
			self.uci:delete("network", c[".name"])
		end
	end)
	self.uci:foreach(self.main_config, "dmvpn", function(_)
		counter = counter + 1
	end)
	if counter == 0 then
		if self.uci:get("nhrp", "nhrp", "enabled") == "1" then
			self.uci:set("nhrp", "nhrp", "enabled", "0")
		end
	end
	local gre_count = 0
	self.uci:foreach("network", "interface", function(c)
		if c.proto == "gre" then gre_count = gre_count + 1 end
	end)
	if gre_count == 0 then
		self.uci:foreach("firewall", "zone", function(c)
			if c.name == "gre" then
				self.uci:delete("firewall", c[".name"])
			end
		end)
		self.uci:foreach("firewall", "forwarding", function(c)
			if c.src == "gre" or c.dest == "gre" then
				self.uci:delete("firewall", c[".name"])
			end
		end)
		self.uci:foreach("firewall", "rule", function(c)
			if c.name == gre_rule_opt.rule.name then
				self.uci:delete("firewall", c[".name"])
			end
		end)
	end
	local ipsec_count = 0
	self.uci:foreach("ipsec", "remote", function(c)
		ipsec_count = ipsec_count + 1
	end)
	if ipsec_count == 0 then
		local rules_to_delete = {
			[rule_opt[1].rule.name] = true,
			[rule_opt[2].rule.name] = true,
			[rule_opt[3].rule.name] = true,
			[rule_opt[4].rule.name] = true,
		}
		self.uci:foreach("firewall", "rule", function(c)
			if rules_to_delete[c.name] then
				self.uci:delete("firewall", c[".name"])
			end
		end)
		self.uci:foreach("firewall", "nat", function(c)
			if c.name == rule_opt[5].rule.name then
				self.uci:delete("firewall", c[".name"])
			end
		end)
	end
	local nhrp_count = 0
	self.uci:foreach("nhrp", "nhrp_instance", function(c)
		nhrp_count = nhrp_count + 1
	end)
	if nhrp_count == 0 then
		self.uci:foreach("firewall", "rule", function(c)
			if c.name == rule_opt[6].rule.name then
				self.uci:delete("firewall", c[".name"])
			end
		end)
		self.uci:delete("nhrp", "nhrp", "multicast_nflog_group")
		self.uci:delete("nhrp", "nhrp", "nflog_group")
	end

	self.uci:delete("nhrp", self.sid)
	self.uci:foreach("nhrp", self.sid .. "_map", function(c)
		self.uci:delete("nhrp", c[".name"])
	end)
	self.uci:foreach("nhrp", self.sid .. "_nhs", function(c)
		self.uci:delete("nhrp", c[".name"])
	end)

	self:commit("firewall")
	self:commit("network")
	self:commit("nhrp")
end

function dmvpn:DELETE_before_commit_hook()
	local ipsec_count = 0
	self:table_foreach("ipsec", "remote", function(_)
		ipsec_count = ipsec_count + 1
	end)
	self:load_firewall_rules()
	if not util_tlt.has_section(self, "dmvpn", "dmvpn") then
		-- UCI is used here, because table_delete doesn't work in after commit hooks
		self:table_foreach("firewall", "nat", function(s)
			if s.name == rule_opt[5].rule.name then
				self.uci:delete("firewall", s[".name"])
			end
		end)
		self:table_foreach("firewall", "zone", function(s)
			if s.name == "gre" then
				self.uci:delete("firewall", s[".name"])
			end
		end)
		self:table_foreach("firewall", "rule", function(r)
			for _, opt in ipairs(rule_opt) do
				if r.name == opt.rule.name and ipsec_count == 0 then
					self.uci:delete("firewall", r[".name"])
				end
			end
		end)
	end
end

return dmvpn
