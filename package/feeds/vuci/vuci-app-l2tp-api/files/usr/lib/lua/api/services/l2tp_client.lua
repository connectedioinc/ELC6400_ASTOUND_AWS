local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local l2tp_zone = "l2tp"
local fs = require "nixio.fs"
local vpn_utils = require("vuci.vpn")
local util = require("vuci.util")
local api_utils = require("api/api_utils")
local has_mwan = fs.access("/etc/config/mwan3")
local instance_limit = 5

local L2TP = ConfigService:new()

local L2TPClient = L2TP:section("network", "interface")
L2TPClient:make_primary()
L2TPClient.default_options.id.maxlength = 15

function L2TP:next_l2tp_id()
	local nums = {}
	local nums_c = vpn_utils:instance_nums("network", "interface", "l2tp", "l2tp")
	local nums_s = vpn_utils:instance_nums("xl2tpd", "service", "l2tp")
	if nums_c and #nums_c > 0 then
		for _, c in ipairs(nums_c) do
			table.insert(nums, c)
		end
	end
	if nums_s and #nums_s > 0 then
		for _, s in ipairs(nums_s) do
			table.insert(nums, s)
		end
	end
	local next_num = util.find_first_missing(nums)
	return "l2tp" .. next_num
end

function L2TP:generate_data()
	if not self.arguments.data or api_utils:is_array(self.arguments.data) then
		return
	end
	local description = self.arguments.data.description
	local id = self.arguments.data.id
	local uid = self:next_l2tp_id()
	self.arguments.data.id = id or uid
	self.arguments.data.description = description or uid
end

function L2TPClient:create_defaults(sid)
	return {
		disabled = "1",
		defaultroute = "0",
		checkup_interval = "20",
		proto = "l2tp",
		buffering = "1",
		pppd_options = { "usepeerdns", "nodefaultroute", "lcp-max-terminate 0" }
	}
end

function L2TPClient:filter(options)
	return options.proto == "l2tp"
end

--------------------------START OF OPTIONS--------------------------

	local opt_description = L2TPClient:option("description")
		opt_description.cfg_require = true
		opt_description.maxlength = 64
		function opt_description:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "interface", function(s)
				if self.sid ~= s[".name"] and s.proto == "l2tp" and s.description == value then
					duplicates = true
					return false
				end
			end)
			self:table_foreach("xl2tpd", "service", function(s)
				if s.description == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return value:match("^[a-zA-Z0-9_ ]+$") ~= nil, "A string of a-Z, 0-9, _ and space characters is accepted."
		end

	local opt_enabled = L2TPClient:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enabled:set(value)
			self:table_set(self.config, self.sid, "disabled", value == "0" and "1" or "0")
		end
		function opt_enabled:get()
			return self:table_get(self.config, self.sid, "disabled") == "1" and "0" or "1"
		end

	local opt_server = L2TPClient:option("server")
		function opt_server:validate(value)
			if self.dt:host(value) or self.dt:hostipport(value) then return true end
			return false, "Domain names or IP addresses with or without port are allowed."
		end

	local opt_username = L2TPClient:option("username")
		opt_username.maxlength = 512
		function opt_username:validate(value)
			return self.dt:credentials_validate(value)
		end

	local opt_password = L2TPClient:option("password", { sensitive = true })
		opt_password.maxlength = 512
		function opt_password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local opt_auth = L2TPClient:option("auth", { sensitive = true })
		opt_auth.minlength = 5
		function opt_auth:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9!@$%%&*+/=?^_`{|}~.-]+$")
		end

	local opt_defaultroute = L2TPClient:option("defaultroute")
		function opt_defaultroute:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_mtu = L2TPClient:option("mtu")
		function opt_mtu:validate(value)
			return self.dt:irange(value, 68, 9200)
		end

	local opt_auth_chap = L2TPClient:option("auth_chap")
		function opt_auth_chap:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_auth_pap = L2TPClient:option("auth_pap")
		function opt_auth_pap:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_auth_mschap2 = L2TPClient:option("auth_mschap2")
		function opt_auth_mschap2:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_options = L2TPClient:option("pppd_options", { list = true })
		function opt_options:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-,. /_]+$")
		end

---------------------------END OF OPTIONS--------------------------

function L2TP:POST_init_hook()
	local interfaces = 0
	self:table_foreach("network", "interface", function (iface)
		if iface.proto == "l2tp" then
			interfaces = interfaces + 1
		end
	end)
	if interfaces >= instance_limit then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Only " .. instance_limit .. " L2TP client instance is allowed")
	end

	self:generate_data()
end

function L2TP:update_firewall_zone()
	local interfaces = 0
	local services = 0
	local enabled = false
	self:table_foreach("network", "interface", function (interface)
		if interface.proto == "l2tp" then interfaces = interfaces + 1 end
		if interface.proto == "l2tp" and interface.disabled ~= "1" then enabled = true end
	end)
	self:table_foreach("xl2tpd", "service", function(c)
		services = services + 1
		if c.enabled == "1" then
			enabled = true
		end
	end)

	if interfaces > 0 then
		local network = {}
		self:table_foreach("network", "interface", function(c)
			if c.proto == "l2tp" then
				table.insert(network, c[".name"])
			end
		end)

		local l2tp_zone_opt = {
			name	= l2tp_zone,
			input	= "ACCEPT",
			forward	= "REJECT",
			output	= "ACCEPT",
			network = table.concat(network, " "),
			masq	= '1',
			device	= 'l2tp+ xl2tp+'
		}

		if self.request_method == "POST" or self.request_method == "DELETE" then
			util_tlt.update_firewall_zone_network(l2tp_zone, table.concat(network, " "), self.uci, true)
		end

		if enabled then
			local zone_name = util_tlt.ensure_zone_exists(self, l2tp_zone_opt, l2tp_zone_opt.network).name
			if zone_name == l2tp_zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name, true) end
		end
	else
		if services == 0 then
			util_tlt.delete_zone_from_firewall(self, l2tp_zone, true, true)
		else
			util_tlt.update_firewall_zone_network(l2tp_zone, "", self.uci, true)
		end
	end
end

function L2TP:remove_mwan_rules()
	local mwan = require "vuci.mwan".init(self.uci)
	local sid_max_len = string.sub(self.sid, 1, 5)
	local vpn_policy = mwan:get_policy("mwan_l2tp_" .. sid_max_len)
	if vpn_policy then
	vpn_policy:del_rule("l2tp_" .. self.sid .. "_d")
	end
	local def_policy = mwan:get_policy("mwan_default")
	if def_policy then
		def_policy:del_rule("l2tp_" .. self.sid .. "_s")
	end
	mwan:del_policy("mwan_l2tp_" .. sid_max_len)
	mwan:del_interface(self.sid)
end

function L2TP:resolve_ip(url)
	local nixio = require "nixio"
	local info = nixio.getaddrinfo(url, "inet")
	local addr = {}
	if info then
		for _, v in pairs(info) do
			if v.address then
				if v.family == "inet" then addr[#addr+1] = v.address .. "/32" end
				if v.family == "inet6" then addr[#addr+1] = v.address .. "/128" end
			end
		end
	end
	return addr
end

function L2TP:update_mwan_rules()
	if not self.sid then return end
	local defaultroute = self:table_get(self.config, self.sid, "defaultroute") or "0"
	local disabled = self:table_get(self.config, self.sid, "disabled") or "1"

	if disabled == "1" or defaultroute ~= "1" then
		if self.uci:get("mwan3", "l2tp_" .. self.sid .. "_d") then
			self:remove_mwan_rules()
		end
		return
	end

	local mwan = require "vuci.mwan".init(self.uci)
	local server = self:table_get(self.config, self.sid, "server")
	if not server or server == "" then return end

	local mwan_enabled = false
	self:table_foreach("mwan3", "interface", function(s)
		if s.enabled == "1" then
			mwan_enabled = true
		end
	end)

	local int_opt = {
		enabled = (mwan_enabled == true) and 1 or 0,
		family = 'ipv4',
		interval = 3,
		service = "l2tp"
	}
	mwan:add_mwan(self.sid, int_opt)
	local interface = mwan:get_interface(self.sid)
	local member = interface:get_member(self.sid .. "_member_mwan")
	local sid_max_len = string.sub(self.sid, 1, 5)
	local vpn_policy = member:add_policy("mwan_l2tp_" .. sid_max_len)
	self:table_set("mwan3", "mwan_l2tp_" .. sid_max_len, "last_resort", "unreachable")
	if vpn_policy then
		local opt = {
			sticky = "0",
			dest_ip = { "0.0.0.0/0" },
			proto = "all",
			family = "ipv4"
		}
		vpn_policy:add_rule("l2tp_" .. self.sid .. "_d", opt)
	end

	local def_policy = mwan:get_policy("mwan_default")
	local server_ip = self:resolve_ip(server)
	if def_policy then
		local opt = {
			sticky = "0",
			dest_ip = server_ip,
			proto = "all",
			family = "ipv4"
		}
		if self.uci:get("mwan3", "l2tp_" .. self.sid .. "_s") then def_policy:del_rule("l2tp_" .. self.sid .. "_s") end
		def_policy:add_rule("l2tp_" .. self.sid .. "_s", opt)
	end
	if self.uci:get("mwan3", "l2tp_" .. self.sid .. "_s") and self.uci:get("mwan3", "l2tp_" .. self.sid .. "_d") then
		self.uci:reorder("mwan3", {"l2tp_" .. self.sid .. "_s",  "l2tp_" .. self.sid .. "_d"})
	end
end

function L2TP:check_defaultroute()
	local defaultroute = 0
	self:table_foreach("network", "interface", function (iface)
		if iface.proto == "l2tp" then
			if iface.defaultroute == "1" and iface.disabled ~= "1" then defaultroute = defaultroute + 1 end
		end
	end)
	if defaultroute > 1 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Option defaultroute can be enabled on one instance")
	end
end

function L2TP:POST_before_commit_hook()
	self:check_defaultroute()
	self:update_firewall_zone()
	if has_mwan then self:update_mwan_rules() end
end

function L2TP:PUT_before_commit_hook()
	self:check_defaultroute()
	self:update_firewall_zone()
	if has_mwan then self:update_mwan_rules() end
end

function L2TP:DELETE_before_commit_hook()
	self:update_firewall_zone()
	if has_mwan then self:remove_mwan_rules() end
end

return L2TP
