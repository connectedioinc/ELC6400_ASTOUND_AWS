local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local wg_utils = require("api.services.wireguard_utils")

local function key_validator(self, value)
	if #value ~= 44 then
		return false, "Value must be of length 44."
	end
	return self.dt:base64(value)
end

local wireguard = ConfigService:new()

local function wireguard_commit(self, section)
	if section then
		util.file_exec( "/bin/sh", { "-c", "/sbin/ifup " .. section .. "& > /dev/null" })
	end
end

function wireguard:generate_keys()
	local private_key = util.file_exec("/bin/sh", { "-c", "wg genkey"}).stdout
	local public_key = util.file_exec("/bin/sh", { "-c", "echo " .. util.shellquote(private_key) .. " | wg pubkey"}).stdout
	return {
		private = util.trim(private_key),
		public = util.trim(public_key)
	}
end

function wireguard:update_firewall_zone()
	local instances = {}
	local enabled = false
	self:table_foreach(self.main_config, "interface", function(iface)
		if iface.proto == "wireguard" then
			table.insert(instances, iface)
		end
		if iface.proto == "wireguard" and iface.disabled ~= "1" then
			enabled = true
		end
	end)

	if #instances > 0 then
		local network = {}
		for _, instance in ipairs(instances) do
			if instance["listen_port"] and instance.disabled ~= "1" then
				local wireguard_rule
				local dest_port = instance["listen_port"] or ""
				local rule_opt = {
					name      = "Allow-wireguard_" .. instance[".name"] .. "-traffic",
					target    = "ACCEPT",
					src       = "wan",
					proto     = "udp",
					dest_port = dest_port
				}
				util_tlt.ensure_vpn_rule_exists(self, rule_opt, { target = rule_opt.target, dest_port = rule_opt.dest_port })
			end
			table.insert(network, instance[".name"])
		end
		local wireguard_zone_opt = {
			name = "wireguard",
			input = "ACCEPT",
			forward = "REJECT",
			output = "ACCEPT",
			network = self.sid,
			masq = '1'
		}

		if self.request_method == "POST" or self.request_method == "DELETE" then
			util_tlt.update_firewall_zone_network(wireguard_zone_opt.name, table.concat(network, " "), self.uci, true)
		end

		if enabled then
			local zone_name = util_tlt.ensure_zone_exists(self, wireguard_zone_opt, self.sid).name
			if zone_name == wireguard_zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name) end
		end
	else
		util_tlt.delete_zone_from_firewall(self, "wireguard", true, true)
		self:table_foreach("firewall", "rule", function(section)
			if section.name and string.match(section.name, "Allow%-wireguard_[^%-]+%-traffic") then
				util_tlt.delete_rule_from_firewall(self, section.name, true, true)
			end
		end)
	end
end

wireguard:action("generate_keys", function(self)
	self:ResponseOK(self:generate_keys())
end)

local s = wireguard:section("network", "interface")

function s:create_defaults(_)
	local keys = self:generate_keys()
	return {
		listen_port = "51820",
		proto       = "wireguard",
		private_key = keys.private,
		public_key  = keys.public,
		disabled    = 1
	}
end

s.filter = function(self, options)
	if options["proto"] == "wireguard" then
		return true
	end
	return false
end
	local enabled = s:option("enabled")
		enabled.require = { ["1"] = { "private_key" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

		function enabled:set(val)
			self:table_set("network", self.sid, "disabled", val == "0" and "1" or "0")
		end

		function enabled:get(val, sid)
			local value = self:table_get("network", self.sid, "disabled")
			return value == "0" and "1" or "0"
		end

	local private_key = s:option("private_key", { sensitive = true })
		function private_key:validate(value)
			return key_validator(self, value)
		end

	local public_key = s:option("public_key")
		function public_key:validate(value)
			return key_validator(self, value)
		end

	local listen_port = s:option("listen_port")
		function listen_port:validate(value)
			return self.dt:port(value)
		end

	local addresses = s:option("addresses", { list = true })
		function addresses:validate(value)
			local function validate(v)
				local result4, msg4 = self.dt:cidr4(v)
				local result6, msg6 = self.dt:cidr6(v)
				if not result4 and not result6 then
					if not result4 then
						return false, msg4
					end
					if not result6 then
						return false, msg6
					end
				end
				return true
			end

			return validate(value)
		end

	local metric = s:option("metric")
		function metric:validate(value)
			return self.dt:range(value, 0, 65535)
		end

	local mtu = s:option("mtu")
		function mtu:validate(value)
			return self.dt:irange(value, 68, 9200)
		end

	local dns = s:option("dns", { list = true })
		function dns:validate(value)
			return self.dt:ipaddr(value)
		end

	local watchdog_interval = s:option("watchdog_interval")
		function watchdog_interval:validate(value)
			return self.dt:irange(value, 0, 60)
		end

function wireguard:POST_validate_section_hook()
	if #self.current_data_block.id > 8 then
		self:add_error(
			STD_CODES.INVALID_OPT,
			"Name is too long. Section name can not be longer than 8 characters.",
			"Validation"
		)
	end
end

function wireguard:PUT_before_commit_hook()
	self:update_firewall_zone()
	if wg_utils.has_mwan3 and self.sid then wg_utils:update_mwan_rules(self, self.sid) end
end

function wireguard:POST_before_commit_hook()
	self:update_firewall_zone()
	if wg_utils.has_mwan3 then wg_utils:update_mwan_rules(self, self.sid) end
end

function wireguard:DELETE_before_commit_hook()
	self:table_foreach("network", "wireguard_" .. self.sid, function(s)
		self:table_delete("network", s[".name"])
	end)
	self:table_foreach("firewall", "rule", function(s)
		if s.name == "Allow-wireguard_" .. self.sid .. "-traffic" then
			self:table_delete("firewall", s[".name"])
		end
	end)
	self:update_firewall_zone()
	if wg_utils.has_mwan3 then wg_utils:remove_mwan_rules(self, self.sid) end
end

function wireguard:PUT_after_commit_hook()
	if #self.arguments.data > 0 then
		for k, v in pairs(self.arguments.data) do
			wireguard_commit(self, v.id)
		end
	else
		wireguard_commit(self, self.sid)
	end
end

function wireguard:POST_after_commit_hook()
	wireguard_commit(self, self.sid)
end

function wireguard:DELETE_after_commit_hook()
	wireguard_commit(self, self.sid)
end

return wireguard
