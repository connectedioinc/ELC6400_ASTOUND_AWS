local ConfigService = require("api/ConfigService")
local pac = require("vuci.package_checker")
local util_tlt = require("vuci.util_tlt")
local vpn_utils = require("vuci.vpn")
local util = require("vuci.util")
local api_utils = require("api/api_utils")
local instance_limit = 1

local L2TP = ConfigService:new()

local L2TPServer = L2TP:section("xl2tpd", "service")
L2TPServer:make_primary()
L2TPServer.default_options.id.maxlength = 15

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

function L2TPServer:create_defaults(name)
	return {
		limit = "192.168.0.30",
		localip = "192.168.0.1",
		start = "192.168.0.20",
		use_ipv6 = "0",
		pppd_options = { "noauth", "logfd 2", "noccp", "novj", "novjccomp", "nopcomp", "noaccomp", "mtu 1400", "mru 1400", "lcp-echo-interval 20", "lcp-echo-failure 5", "connect-delay 5000", "nodefaultroute", "noipdefault", "proxyarp" }
	}
end

---------------------------START OF OPTIONS--------------------------

	local opt_description = L2TPServer:option("description")
		opt_description.cfg_require = true
		opt_description.maxlength = 64
		function opt_description:validate(value)
			local duplicates = false
			self:table_foreach("xl2tpd", "service", function(s)
				if self.sid ~= s[".name"] and s.description == value then
					duplicates = true
					return false
				end
			end)
			self:table_foreach("network", "interface", function(s)
				if self.sid ~= s[".name"] and s.proto == "l2tp" and s.description == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return value:match("^[a-zA-Z0-9_ ]+$") ~= nil, "A string of a-Z, 0-9, _ and space characters is accepted."
		end

	local opt_enabled = L2TPServer:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_localip = L2TPServer:option("localip")
		function opt_localip:validate(value)
			return self.dt:ip4addr(value)
		end

	local opt_start = L2TPServer:option("start")
		function opt_start:validate(value)
			return self.dt:ip4addr(value)
		end

	local opt_limit = L2TPServer:option("limit")
		function opt_limit:validate(value)
			return self.dt:ip4addr(value)
		end

	local opt_chap = L2TPServer:option("chap")
		function opt_chap:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_auth = L2TPServer:option("auth", { sensitive = true })
		opt_auth.minlength = 5
		function opt_auth:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9!@$%%&*+/=?^_`{|}~.-]+$")
		end

	local opt_auth_chap = L2TPServer:option("auth_chap")
		function opt_auth_chap:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_auth_pap = L2TPServer:option("auth_pap")
		function opt_auth_pap:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_auth_mschap2 = L2TPServer:option("auth_mschap2")
		function opt_auth_mschap2:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_options = L2TPServer:option("pppd_options", { list = true })
		function opt_options:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-,. /_]+$")
		end

	local opt_use_ipv6 = L2TPServer:option("use_ipv6")
		function opt_use_ipv6:validate(value)
			if value == "1" and not pac.is_installed("xl2tpd6") then
				return false, "Missing l2tpv6_support package for connection to IPv6 host"
			end
			return self.dt:is_bool(value)
		end

	local opt_port = L2TPServer:option("port")
		function opt_port:validate(value)
			return self.dt:port(value)
		end

----------------------------END OF OPTIONS--------------------------

function L2TP:POST_init_hook()
	local services = 0
	self:table_foreach("xl2tpd", "service", function (_)
		services = services + 1
	end)
	if services >= instance_limit then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Only " .. instance_limit .. " L2TP server instance is allowed")
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

	self:table_foreach("xl2tpd", "service", function (c)
		services = services + 1
		if c.enabled == "1" then
			enabled = true
		end
	end)

	if services > 0 then

		local l2tp_zone_opt = {
			name    = "l2tp",
			input   = "ACCEPT",
			forward = "REJECT",
			output  = "ACCEPT",
			masq    = '1',
			device  = 'l2tp+ xl2tp+'
		}

		local l2tp_rule_opt = {
			name            = "Allow-l2tp-traffic",
			target          = "ACCEPT",
			src             = "wan",
			family          = "any",
			dest_port       = {self:get_abs_value(self.main_config, self.sid, "port") or "1701"},
			proto           = "udp"
		}
		if enabled then
			local zone_name = util_tlt.ensure_zone_exists(self, l2tp_zone_opt, nil, l2tp_zone_opt.device).name
			if zone_name == l2tp_zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name, true) end
			util_tlt.ensure_vpn_rule_exists(self, l2tp_rule_opt, { target = l2tp_rule_opt.target, dest_port = l2tp_rule_opt.dest_port, proto = l2tp_rule_opt.proto })
		end
	else
		if interfaces == 0 then util_tlt.delete_zone_from_firewall(self, "l2tp", true, true) end
		util_tlt.delete_rule_from_firewall(self, "Allow-l2tp-traffic", true, true)
	end
end

function L2TP:delete_users()
	self:table_foreach("xl2tpd", "login", function (c)
		self:table_delete("xl2tpd", c[".name"])
	end)
end

function L2TP:POST_before_commit_hook()
	self:update_firewall_zone()
end

function L2TP:PUT_before_commit_hook()
	self:update_firewall_zone()
end

function L2TP:DELETE_before_commit_hook()
	self:update_firewall_zone()
	self:delete_users()
end

return L2TP
