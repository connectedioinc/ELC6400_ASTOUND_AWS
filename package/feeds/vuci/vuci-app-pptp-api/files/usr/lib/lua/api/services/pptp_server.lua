local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local vpn_utils = require("vuci.vpn")
local util = require("vuci.util")
local api_utils = require("api/api_utils")
local instance_limit = 1

local PPTP = ConfigService:new()
local PPTP_Server = PPTP:section("pptpd", "service")
PPTP_Server:make_primary()
PPTP_Server.default_options.id.maxlength = 15

function PPTP:next_pptp_id()
	local nums = {}
	local nums_c = vpn_utils:instance_nums("network", "interface", "pptp", "pptp")
	local nums_s = vpn_utils:instance_nums("pptpd", "service", "pptp")
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
	return "pptp" .. next_num
end

function PPTP:generate_data()
	if not self.arguments.data or api_utils:is_array(self.arguments.data) then
		return
	end
	local description = self.arguments.data.description
	local id = self.arguments.data.id
	local uid = self:next_pptp_id()
	self.arguments.data.id = id or uid
	self.arguments.data.description = description or uid
end

function PPTP_Server:create_defaults(name)
    return {
		localip = "192.168.0.1",
		start = "192.168.0.20",
		limit = "192.168.0.30",
		mppe = "stateless",
		mppe_encryption = { "128" },
		pptp_options = { "proxyarp", "encounter", "auth", "lcp-echo-failure 3", "lcp-echo-interval 60", "default-asyncmap", "mtu 1482", "mru 1482", "nobsdcomp", "nodeflate", "require-mschap-v2", "refuse-chap", "refuse-mschap", "refuse-eap" , "refuse-pap", "logfd 2" }
    }
end

--------------------------START OF OPTIONS--------------------------

	local opt_description = PPTP_Server:option("description")
		opt_description.cfg_require = true
		opt_description.maxlength = 64
		function opt_description:validate(value)
			local duplicates = false
			self:table_foreach("pptpd", "service", function(s)
				if self.sid ~= s[".name"] and s.description == value then
					duplicates = true
					return false
				end
			end)
			self:table_foreach("network", "interface", function(s)
				if self.sid ~= s[".name"] and s.proto == "pptp" and s.description == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return value:match("^[a-zA-Z0-9_ ]+$") ~= nil, "A string of a-Z, 0-9, _ and space characters is accepted."
		end

	local opt_enabled = PPTP_Server:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_localip = PPTP_Server:option("localip")
		function opt_localip:validate(value)
			return self.dt:ip4addr(value)
		end

	local opt_start = PPTP_Server:option("start")
		function opt_start:validate(value)
			return self.dt:ip4addr(value)
		end

	local opt_limit = PPTP_Server:option("limit")
	-- opt_limit.require = { "start" } -- FIXME: Fix after its possible to do requred
	function opt_limit:validate(value)
		local ok, err = self.dt:ip4addr(value)
		if not ok then return ok, err end

		local start = self.current_data_block.start or ""

		local s1,s2,s3,s4 = start:match("(%d%d?%d?)%.(%d%d?%d?)%.(%d%d?%d?)%.(%d%d?%d?)")
		local l1,l2,l3,l4 = value:match("(%d%d?%d?)%.(%d%d?%d?)%.(%d%d?%d?)%.(%d%d?%d?)")

		s1 = tonumber(s1); s2 = tonumber(s2); s3 = tonumber(s3); s4 = tonumber(s4)
		l1 = tonumber(l1); l2 = tonumber(l2); l3 = tonumber(l3); l4 = tonumber(l4)

		if s1 == l1 and s2 == l2 and s3 == l3 and s4 <= l4 and (l4 - s4) < 100 then
			return true
		end
		return false,
		"The value of remote IP range begin or end is invalid: IP adresses must be in the same /24 subnet and the range cannot exceed 100 adresses."
	end

	local opt_idle = PPTP_Server:option("idle")
		function opt_idle:validate(value)
			return self.dt:range(value, 0, 65535)
		end

	local opt_dns1 = PPTP_Server:option("dns1")
		function opt_dns1:validate(value)
			return self.dt:ip4addr(value)
		end

	local opt_dns2 = PPTP_Server:option("dns2")
		function opt_dns2:validate(value)
			return self.dt:ip4addr(value)
		end

	local client_to_client = PPTP_Server:option("client_to_client")
		function client_to_client:validate(value)
			return self.dt:is_bool(value)
		end

	local pptp_options = PPTP_Server:option("pptp_options", { list = true })
		function pptp_options:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-,. /_]+$")
		end

	local mppe = PPTP_Server:option("mppe")
		function mppe:validate(value)
			return self.dt:check_array(value, { "none", "stateful", "stateless" })
		end

	local mppe_encryption = PPTP_Server:option("mppe_encryption", { list = true })
	mppe_encryption.require = { "mppe" }
		function mppe_encryption:validate(value)
			return self.dt:check_array(value, { "40", "56", "128" })
		end

--------------------------END OF OPTIONS--------------------------

function PPTP:POST_init_hook()
	local count = 0
	self:table_foreach("pptpd", "service", function (s)
		count = count + 1
	end)
	if count >= instance_limit then
		self:add_critical_error(
			STD_CODES.UCI_CREATE_ERROR,
			"Only " .. instance_limit .. " PPTP server instance is allowed"
		)
	end
	self:generate_data()
end

function PPTP:update_firewall_zone()
	local interfaces = 0
	local services = 0
	local enabled = false
	local client_to_client = false

	self:table_foreach("network", "interface", function(interface)
		if interface.proto == "pptp" then interfaces = interfaces + 1 end
		if interface.proto == "pptp" and interface.disabled ~= "1" then
			enabled = true
		end
	end)

	self:table_foreach("pptpd", "service", function(c)
		services = services + 1
		if c.enabled == "1" then enabled = true end
		if c.client_to_client == "1" then client_to_client = true end
	end)

	if interfaces > 0 or services > 0 then
		local rule_opt = {
			name            = "Allow-pptp-traffic",
			target          = "ACCEPT",
			src             = "wan",
			family          = "ipv4",
			dest_port       = {"1723"},
			proto           = "tcp"
		}

		local zone_opt = {
			name    = "pptp",
			input   = "ACCEPT",
			forward = "REJECT",
			output  = "ACCEPT",
			masq    = '1',
			device  = 'pptp+'
		}

		if enabled then
			local zone_name = util_tlt.ensure_zone_exists(self, zone_opt, nil, zone_opt.device).name
			if zone_name == zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name, true) end
			util_tlt.ensure_vpn_rule_exists(self, rule_opt, { dest_port = rule_opt.dest_port, proto = rule_opt.proto, target = rule_opt.target })
			util_tlt.add_to_firewall_zone(self, "wan", "helper", "pptp", true)
		else
			util_tlt.delete_from_firewall_zone(self, "wan", "helper", "pptp", true)
		end
	else
		util_tlt.delete_zone_from_firewall(self, "pptp", true, true)
		util_tlt.delete_rule_from_firewall(self, "Allow-pptp-traffic", true, true)
	end

	self:table_foreach("firewall", "zone", function(c)
		if c.name == "pptp" then
			self:table_set("firewall", c[".name"], "forward", client_to_client and "ACCEPT" or "REJECT")
		end
	end)
end

function PPTP:delete_users()
	self:table_foreach("pptpd", "login", function(c)
		self:table_delete("pptpd", c[".name"])
	end)
end

function PPTP:POST_before_commit_hook()
	self:update_firewall_zone()
end

function PPTP:PUT_before_commit_hook()
	self:update_firewall_zone()
end

function PPTP:DELETE_before_commit_hook()
	self:update_firewall_zone()
	self:delete_users()
end

return PPTP
