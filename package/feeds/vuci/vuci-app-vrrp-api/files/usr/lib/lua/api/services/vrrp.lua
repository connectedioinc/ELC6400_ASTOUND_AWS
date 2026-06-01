local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local fs = require("nixio.fs")

local VRRPGeneral = ConfigService:new()

function VRRPGeneral:GET_TYPE_status()
	local data = {}
	self:table_foreach("vrrpd", "vrrpd", function (instance)
		data[instance[".name"]] = {
			state = "N/A",
			main_ip = "N/A"
		}
		if instance.enabled == "1" then
			local instance_info = fs.readfile("/var/run/vrrpd/vrrpd_"..instance[".name"].."_log")
			if instance_info and type(instance_info) ~= "table" then
				local instance_splitted = util.split(instance_info, "\n")
				if instance_splitted[1] == "Master" then
					local addrs = util.ubus("network.interface.%s" % instance.interface, "status")
					if addrs then
						if addrs["ipv4-address"] and #addrs["ipv4-address"] > 0 and addrs["ipv4-address"][1].address ~= "" then
							data[instance[".name"]] = { state="Main", main_ip=addrs["ipv4-address"] and #addrs["ipv4-address"] > 0 and addrs["ipv4-address"][1].address }
						else
							data[instance[".name"]] = { state="Main", main_ip="N/A" }
						end
					else
						data[instance[".name"]] = { state="Main", main_ip="N/A" }
					end
				else
					data[instance[".name"]] = { state=instance_splitted[1], main_ip=instance_splitted[2] }
				end
			end
		end
	end)
	local response_table = {}
	for k, v in pairs(data) do
		v.name = k
		table.insert(response_table, v)
	end
	self:ResponseOK(response_table)
end

function VRRPGeneral:update_wan_rule()
	local enable_wan_rule = false
	local enable_vrrp_traffic = false

	self:table_foreach("vrrpd", "vrrpd", function (s)
		if s.enabled == "1" and s.interface and s.interface == "wan" then
			enable_wan_rule = true
		end
	end)

	if enable_wan_rule then
		local wan_zone
		self:table_foreach("firewall", "zone", function (zone)
			if zone.name == "wan" then wan_zone = zone end
		end)

		if wan_zone and wan_zone.network then
			local wan_networks = util.split(wan_zone.network, " ")
			for _, wan_iface in ipairs(wan_networks) do
				if wan_iface == "wan" and enable_wan_rule then enable_vrrp_traffic = true end
			end
		end
	end

	local wan_rule
	self:table_foreach("firewall", "rule", function (rule)
		if rule.name == "Allow-VRRP-WAN" and rule.proto == "112" then wan_rule = rule end
	end)

	if enable_vrrp_traffic then
		if wan_rule then
			self.uci:set("firewall", wan_rule[".name"], "enabled", "1")
		else
			self:table_section("firewall", "rule", self:next_id("firewall"), {
				name = "Allow-VRRP-WAN",
				family = "ipv4",
				enabled = "1",
				utc_time = "0",
				proto = "112",
				dest_ip = "224.0.0.18",
				target = "ACCEPT"
			})
		end
	else
		if wan_rule then
			self.uci:delete("firewall", wan_rule[".name"])
		end
	end
end

function VRRPGeneral:DELETE_before_commit_hook()
	self:update_wan_rule()
	self:commit("firewall")
end

function VRRPGeneral:PUT_before_commit_hook()
	self:update_wan_rule()
	self:commit("firewall")
end

function VRRPGeneral:POST_before_commit_hook()
	self:update_wan_rule()
	self:commit("firewall")
end

local VRRP = VRRPGeneral:section("vrrpd", "vrrpd")
VRRP:make_primary()
VRRP.default_options.id.maxlength = 8

	local opt_enabled = VRRP:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_enabled:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if not self.current_data_block.ping_enabled and value ~= "1" then
				self:table_set(self.config, self.sid .. "_ping", self.api_key, value)
			end
		end

	local opt_virtual_mac = VRRP:option("virtual_mac")
		function opt_virtual_mac:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_virtual_id = VRRP:option("virtual_id")
		opt_virtual_id.required = true
		function opt_virtual_id:validate(value)
			local same_id = false
			self:table_foreach(self.config, "vrrpd", function (s)
				if s.virtual_id == value and s[".name"] ~= self.sid then same_id = true end
			end)
			if same_id then
				return false, "Instance with the virtual_id exists"
			end
			return self.dt:irange(value, 1, 255)
		end

	local opt_priority = VRRP:option("priority")
		opt_priority.required = true
		function opt_priority:validate(value)
			return self.dt:irange(value, 1, 255)
		end

	local opt_delay = VRRP:option("delay")
		function opt_delay:validate(value)
			return self.dt:irange(value, 1, 255)
		end

	local opt_interface = VRRP:option("interface")
		function opt_interface:validate(value)
			local exist = false
			value = util.get_network_map(self)[value] or value
			self:table_foreach("network", "interface", function (s)
				if s[".name"] == value and self.dt:check_array(s["proto"], { "pppoe", "static", "dhcp" }) and s["device"] then exist = true end
			end)
			if not exist then return exist, "invalid interface" end
			local already_set = false
			self:table_foreach("vrrpd", "vrrpd", function (s)
				if s.interface == value and s[".name"] ~= self.sid then already_set = true end
			end)
			return not already_set, "interface already in use"
		end
		function opt_interface:get(value) return util.network_mapper_get(self, value) end
		function opt_interface:set(value) util.network_mapper_set(self, value) end

	local opt_virtual_ip = VRRP:option("virtual_ip", {list = true})
		function opt_virtual_ip:validate(value)
			return self.dt:ip4addr(value)
		end

local VRRPPing = VRRPGeneral:section("vrrpd", "ping", function (_, name) return name.."_ping" end)

	local opt2_enabled = VRRPPing:option("ping_enabled")
		opt2_enabled.require = { ["1"] = { "host" } }
		function opt2_enabled:validate(value)
			local enb = self:get_abs_value(self.config, self.sid, "enabled") or self.current_data_block.enabled or "0"
			if enb == "0" and value == "1" then
				return false, "Cannot enable check connection without enabling vrrp section"
			end
			return self.dt:is_bool(value)
		end
		function opt2_enabled:get()
			return self:table_get(self.config, self:_get_sid(self.sid), "enabled")
		end
		function opt2_enabled:set(value)
			self:table_set(self.config, self:_get_sid(self.sid), "enabled", value)
		end

	local opt2_host = VRRPPing:option("host")
		function opt2_host:validate(value)
			return self.dt:host(value)
		end

	local opt2_interval = VRRPPing:option("interval")
		function opt2_interval:validate(value)
			return self.dt:irange(value, 0, 99999)
		end

	local opt2_time_out = VRRPPing:option("time_out")
		function opt2_time_out:validate(value)
			return self.dt:irange(value, 0, 99999)
		end

	local opt2_packet_size = VRRPPing:option("packet_size")
		function opt2_packet_size:validate(value)
			return self.dt:irange(value, 0, 65535)
		end

	local opt2_ping_attempts = VRRPPing:option("ping_attempts")
		function opt2_ping_attempts:validate(value)
			return self.dt:irange(value, 0, 99999)
		end

	local opt2_retry = VRRPPing:option("retry")
		function opt2_retry:validate(value)
			return self.dt:irange(value, 0, 99999)
		end

return VRRPGeneral
