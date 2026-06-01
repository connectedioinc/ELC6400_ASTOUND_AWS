local util = require "vuci.util"
local ConfigService = require("api/ConfigService")
local ntm

local webfilter = ConfigService:new({
	create = false,
	delete = false,
	general_section = "config",
	global_settings = true
})
local s = webfilter:section("hostblock", "hostblock")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"mode", "network"} }
		function enabled:validate(value) return self.dt:is_bool(value) end

	local mode = s:option("mode")
		function mode:validate(value) return self.dt:check_array(value, {"blacklist", "whitelist"}) end

	local network = s:option("network")
		function network:validate(value)
			local hotspot = self:table_find("chilli", "chilli", { enabled = "1" })
			local interfaces = { "all" }

			if hotspot then
				table.insert(interfaces, "hotspot")
			end

			self:table_foreach("network", "interface", function(i)
				if i.area_type and i.area_type == "lan" and i[".name"] ~= "loopback" and i[".name"] ~= "lan" then
					table.insert(interfaces, i.name or s[".name"])
				end
			end)
			return self.dt:check_array(value, interfaces)
		end
		function network:get(value) return util.network_mapper_get(self, value) end
		function network:set(value) util.network_mapper_set(self, value) end

function webfilter:sid_to_wlan(sid)
	local status = util.ubus("network.wireless", "status") or {}
	local wifi_id = self:table_get("wireless", sid, "wifi_id")
	for _, device in pairs(status) do
		for _, iface in ipairs(device.interfaces) do
			if iface.config.wifi_id == wifi_id then
				return iface.ifname
			end
		end
	end
end

function webfilter:find_device(network)
	ntm = ntm or require "vuci.network".init(self.uci)
	local net = ntm:get_network(network) or ntm:get_wifinet_by_wid(network)
	return net and net:ifname()
end

function webfilter:update_dnsmasq_config()
	local function convert_current(name)
		local data = (self.arguments or {}).data or {}
		if not data[name] then return nil end
		return util.get_network_map(self)[data[name]] or data[name]
	end
	local device
	local enabled_old = self.uci:get(self.main_config, self.sid, "enabled")
	local enabled = self:get_abs_value(self.main_config, self.sid, "enabled")
	local network_old = self.uci:get(self.main_config, self.sid, "network")
	local network = convert_current("network") or network_old

	if network_old ~= network or enabled_old ~= enabled then
		self:table_foreach("dhcp", "dnsmasq", function(c)
			if string.match(c[".name"], "_webfilter$") then
				local to_remove = util.to_table(c.interface) or {}
				local notifs = util.to_table(self:table_get("dhcp", "@dnsmasq[0]", "notinterface")) or {}
				local updated = {}
				for _, iface in ipairs(notifs) do
					if not util.contains(to_remove, iface) then
						table.insert(updated, iface)
					end
				end
				self:table_set("dhcp", "@dnsmasq[0]", "notinterface", updated)
				self:table_delete("dhcp", c[".name"])
			end
		end)
		local lan_ip = self:table_get("network", "lan" , "ipaddr")
		local hotspot_enabled = false
		self:table_foreach("chilli", "chilli", function(c)
			if c.dns1 and c.uamlisten and (c.dns1 == c.uamlisten or c.dns1 == lan_ip) then
				self:table_set("chilli", c[".name"], "dns1", "8.8.8.8")
				self:table_set("chilli", c[".name"], "dns2", "8.8.4.4")
			end
			if c.enabled == "1" then
				hotspot_enabled = true
			end
		end)

		if enabled == "1" then
			if network == "hotspot" then
				device = {}
				local tun_id = 0
				self:table_foreach("chilli", "chilli", function(c)
					if c.enabled == "1" then
						table.insert(device, "tun" .. tun_id)
						if c.network then
							local dev = self:find_device(c.network)
							if dev and not util.contains(device, dev) then
								table.insert(device, dev)
							end
						end
						for _, interface in ipairs(c.moreif or {}) do
							local dev = self:find_device(interface)
							if dev and not util.contains(device, dev) then
								table.insert(device, dev)
							end
						end
						if c.uamlisten then
							self:table_set("chilli", c[".name"], "dns1", c.uamlisten)
							self:table_delete("chilli", c[".name"], "dns2")
						end
						tun_id = tun_id + 1
					end
				end)
			elseif network == "all" and hotspot_enabled then
				if lan_ip then
					self:table_foreach("chilli", "chilli", function(c)
						if c.enabled == "1" then
							self:table_set("chilli", c[".name"], "dns1", lan_ip)
							self:table_delete("chilli", c[".name"], "dns2")
						end
					end)
				end
			else
				device = self:table_get("network", network , "device")
				if not device then
					self:table_foreach("wireless", "wifi-iface", function(c)
						if c.network and c.network == network then
							device = self:sid_to_wlan(c[".name"])
						end
					end)
				end
			end

			if network ~= "all" then
				local options = {
					confdir = "/tmp/dnsmasq.d_" .. network,
					interface = util.to_table(device),
					notinterface = { "lo" }
				}
				self:table_set("dhcp", "@dnsmasq[0]", "notinterface", util.to_table(device))
				self:table_section("dhcp", "dnsmasq", network .. "_webfilter" , options)
			end
		end
	end
end

webfilter.PUT_before_commit_hook = webfilter.update_dnsmasq_config

return webfilter
