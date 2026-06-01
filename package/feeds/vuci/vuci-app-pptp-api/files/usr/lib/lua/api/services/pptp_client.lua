local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local fw = require("vuci.firewall")
local vpn_utils = require("vuci.vpn")
local util = require("vuci.util")
local api_utils = require("api/api_utils")
local instance_limit = 5

local PPTP = ConfigService:new()
local PPTPClient = PPTP:section("network", "interface")
PPTPClient:make_primary()
PPTPClient.default_options.id.maxlength = 15

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

function PPTPClient:create_defaults(name)
	return {
		proto = "pptp",
		buffering = "1",
		checkup_interval = "20",
		disabled = "1",
		defaultroute = "0",
		mppe = "stateless",
		mppe_encryption = { "128" },
		pptp_options = { "refuse-pap", "refuse-eap", "refuse-chap", "refuse-mschap", "noipdefault", "noauth", "nobsdcomp", "nodeflate", "idle 0", "maxfail 0" }
	}
end

function PPTPClient:filter(options)
    return options.proto == "pptp"
end

--------------------------START OF OPTIONS--------------------------

	local opt_description = PPTPClient:option("description")
		opt_description.cfg_require = true
		opt_description.maxlength = 64
		function opt_description:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "interface", function(s)
				if self.sid ~= s[".name"] and s.proto == "pptp" and s.description == value then
					duplicates = true
					return false
				end
			end)
			self:table_foreach("pptpd", "service", function(s)
				if s.description == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return value:match("^[a-zA-Z0-9_ ]+$") ~= nil, "A string of a-Z, 0-9, _ and space characters is accepted."
		end

	local opt_enabled = PPTPClient:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enabled:set(value)
			self:table_set(self.config, self.sid, "disabled", value == "0" and "1" or "0")
		end
		function opt_enabled:get()
			return self:table_get(self.config, self.sid, "disabled") == "1" and "0" or "1"
		end

	local opt_server = PPTPClient:option("server")
		function opt_server:validate(value)
			return self.dt:host(value)
		end

	local opt_username = PPTPClient:option("username")
		opt_username.maxlength = 255
		function opt_username:validate(value)
			return self:credentials_validate_no_diacritics(value)
		end

	local opt_password = PPTPClient:option("password", { sensitive = true })
		opt_password.maxlength = 255
		function opt_password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local opt_client_to_client = PPTPClient:option("client_to_client")
		function opt_client_to_client:validate(value)
			local defaultroute = self.current_data_block.defaultroute or self:table_get(self.config, self.sid, "defaultroute")
			if defaultroute == "1" and value == "1" then
				return false, "Failed to set client_to_client. Client have defaultroute set."
			end
			return self.dt:is_bool(value)
		end

	local opt_defaultroute = PPTPClient:option("defaultroute")
		function opt_defaultroute:validate(value)
			local client_to_client = self.current_data_block.client_to_client or self:table_get(self.config, self.sid, "client_to_client")
			if client_to_client == "1" and value == "1" then
				return false, "Failed to set defaultroute. Client have client_to_client set."
			end
			return self.dt:is_bool(value)
		end

	local pptp_options = PPTPClient:option("pptp_options", { list = true })
		function pptp_options:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-,. /_]+$")
		end

	local mppe = PPTPClient:option("mppe")
		function mppe:validate(value)
			return self.dt:check_array(value, { "none", "stateful", "stateless" })
		end

	local mppe_encryption = PPTPClient:option("mppe_encryption", { list = true })
	mppe_encryption.require = { "mppe" }
		function mppe_encryption:validate(value)
			return self.dt:check_array(value, { "40", "56", "128" })
		end

--------------------------END OF OPTIONS--------------------------

function PPTP:POST_init_hook()
	local count = 0
	self:table_foreach("network", "interface", function (s)
		if s.proto == "pptp" then count = count + 1 end
	end)
	if count >= instance_limit then
		self:add_critical_error(
			STD_CODES.UCI_CREATE_ERROR,
			"Only " .. instance_limit .. " PPTP client instance is allowed"
		)
	end
	self:generate_data()
end

function PPTP:update_firewall_zone()
	local interfaces = 0
	local services = 0
	local enabled = false
	self:table_foreach("network", "interface", function (interface)
		if interface.proto == "pptp" then interfaces = interfaces + 1 end
		if interface.proto == "pptp" and interface.disabled ~= "1" then
			enabled = true
		end
	end)

	self:table_foreach("pptpd", "service", function (c)
		services = services + 1
		if c.enabled == "1" then
			enabled = true
		end
	end)

	if interfaces > 0 or services > 0 then
		local network = {}
		self:table_foreach("network", "interface", function (c)
			if c.proto == "pptp" then
				table.insert(network, c[".name"])
			end
		end)

		if self.request_method == "POST" or self.request_method == "DELETE" then
			util_tlt.update_firewall_zone_network("pptp", table.concat(network, " "), self.uci, true)
		end

		local zone_opt = {
			name    = "pptp",
			input   = "ACCEPT",
			forward = "REJECT",
			output  = "ACCEPT",
			network = table.concat(network, " "),
			masq    = '1',
			device  = 'pptp+'
		}
		local rule_opt = {
			name            = "Allow-pptp-traffic",
			target          = "ACCEPT",
			src             = "wan",
			family          = "ipv4",
			dest_port       = {"1723"},
			proto           = "tcp"
		}
		
		if enabled then
			local zone_name = util_tlt.ensure_zone_exists(self, zone_opt, zone_opt.network).name
			if zone_name == zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name, true) end
			util_tlt.ensure_vpn_rule_exists(self, rule_opt, { dest_port = rule_opt.dest_port, proto = rule_opt.proto })
			util_tlt.add_to_firewall_zone(self, "wan", "helper", "pptp", true)
		else
			util_tlt.delete_from_firewall_zone(self, "wan", "helper", "pptp", true)
		end
	else
		util_tlt.delete_zone_from_firewall(self, "pptp", true, true)
		util_tlt.delete_rule_from_firewall(self, "Allow-pptp-traffic", true, true)
	end
end

function PPTP:have_default_iface()
	local have = false
	self:table_foreach("network", "interface", function (s)
		if s[".name"] ~= self.sid then
			local m = tonumber(s.metric) or 0
			if m == 0 then
				have = true
			end
		end
	end)
	return have
end

function PPTP:update_metric()
	local disabled = self:get_abs_value("network", self.sid, "disabled")
	if disabled == "1" then return end

	local defaultroute = self:get_abs_value("network", self.sid, "defaultroute")

	if defaultroute == "1" and fw.get_zone("pptp", "pptp") then
		fw.get_zone("pptp", "pptp"):add_forwarding_to("wan")
	end

	if defaultroute == "1" and self:have_default_iface() then
		self:table_delete("network", self.sid, "metric")
		self:table_foreach("network", "interface", function (s)
			if s[".name"] ~= self.sid then
				local m = tonumber(s.metric) or 0
				self:table_set("network", s[".name"], "metric", m + 1)
			end
		end)
	end

	if defaultroute == "1" and not self:have_default_iface() then
		self:table_delete(self.main_config, self.sid, "metric")
	end

	if defaultroute ~= "1" and not self:have_default_iface() then
		local max_metric = 0
		self:table_foreach("network", "interface", function (s)
			if s[".name"] ~= self.sid then
				local m = tonumber(s.metric) or 0
				if m - 1 >= 0 then m = m - 1 end
				if m > max_metric then max_metric = m end
				if m == 0 then
					self:table_delete("network", s[".name"], "metric")
				else
					self:table_set("network", s[".name"], "metric", m)
				end
			end
		end)
		self:table_set("network", self.sid, "metric", max_metric + 1)
	end
end

function PPTP:PUT_before_commit_hook()
	self:update_metric()
	self:update_firewall_zone()
end

function PPTP:POST_before_commit_hook()
	self:update_metric()
	self:update_firewall_zone()
end

function PPTP:DELETE_before_commit_hook()
	self:update_firewall_zone()
end

function PPTP:credentials_validate_no_diacritics(val)
	local regex = "^[0-9a-zA-Z@._-]*$"
	local hint = "Alphanumeric and @, ., _, - characters are allowed."
	local result = string.match(val, regex)
	if result then return true end
	return false, hint
end

return PPTP
