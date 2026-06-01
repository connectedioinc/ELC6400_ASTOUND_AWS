local ConfigService = require("api/ConfigService")
local ipsec_service = require("vuci.package_checker").is_installed("vuci-app-strong-swan-api")
local util = require("vuci.util")


local function get_interfaces(self)
	local interfaces = {}
	self:table_foreach("network", "interface", function(s)
		if s.proto and ( s.proto == "static" or s.proto == "dhcp" or s.proto == "dhcpv6" or s.proto == "gre" ) and s[".name"] ~= "loopback" then
			if s.proto == "gre" then
				table.insert(interfaces, "gre4-"..s[".name"])
			end
			if s.area_type and s.device and not util.contains(interfaces, s.device) then
				table.insert(interfaces, s.device)
			end
		end
	end)
	return interfaces
end

local function get_ipsec_instances(self)
	local ipsec_instances = {}
	self:table_foreach("ipsec", "remote", function(s)
		table.insert(ipsec_instances, s[".name"])
	end)
	return ipsec_instances
end

local dynamic_nhrp_instance = ConfigService:new()

function dynamic_nhrp_instance:DELETE_section_init_hook()
	if self:table_get("nhrp", self.sid, "service") == "dmvpn" then
		self:add_critical_error(
			STD_CODES.NO_DELETE,
			string.format("'%s' is used in dmvpn configuration and cannot be deleted.", self.sid),
			self.sid
		)
	end
end

dynamic_nhrp_instance.interfaces = get_interfaces(dynamic_nhrp_instance)
dynamic_nhrp_instance.ipsec_instances = get_ipsec_instances(dynamic_nhrp_instance)

	local nhrp_instance = dynamic_nhrp_instance:section("nhrp", "nhrp_instance")

		local enabled = nhrp_instance:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local interface = nhrp_instance:option("interface")
			function interface:validate(value)
				return self.dt:check_array(value, self.interfaces)
			end

			function interface:set(value)
				if value:match("(.*)-") == "gre4" then
					local ntm = require("vuci.network").init(self.uci)
					local nhrp_interface= ""
					local data = { ipaddrs = { } }
					local interface_name = value:match("-(.*)")
					local local_hub_address = self:table_get("network", interface_name, "ipaddr")
					for _, intf in ipairs(ntm.get_interfaces()) do
						for _, a in ipairs(intf:ipaddrs()) do
							data.ipaddrs[#data.ipaddrs+1] = {
								addr = a:host():string()
							}
							if data.ipaddrs[#data.ipaddrs].addr == local_hub_address then
								nhrp_interface = intf.ifname
							end
						end
					end
					self:table_set(self.config, self.sid, "tunnel_source", nhrp_interface)
				end
				self:table_set(self.config, self.sid, self.api_key, value)
			end

		local network_id = nhrp_instance:option("network_id")
			function network_id:validate(value)
				return self.dt:irange(value, 1, 4294967295)
			end

		local auth = nhrp_instance:option("auth", { sensitive = true })
		auth.maxlength = 8
			function auth:validate(value)
				return self.dt:credentials_validate(value)
			end

		local proto_address = nhrp_instance:option("proto_address")
			function proto_address:validate(value)
				if not self.dt:ipaddr(value) and value ~= "dynamic" then
					return false, "NHS must be an IP address or 'dynamic'"
				end
				return true
			end

		local nbma_address = nhrp_instance:option("nbma_address")
			function nbma_address:validate(value)
				return self.dt:host(value)
			end

		local holdtime = nhrp_instance:option("holdtime")
			function holdtime:validate(value)
				return self.dt:irange(value, 1, 65000)
			end

		local redirect = nhrp_instance:option("redirect")
			function redirect:validate(value)
				return self.dt:is_bool(value)
			end
			function redirect:set(value)
				if self:table_get(self.config, self.sid, "service") == "dmvpn" then
					self:table_set(self.config, self.sid, "dmvpn_user_mod", "1")
				end
				self:table_set(self.config, self.sid, self.api_key, value)
			end

		local ipsec_support = nhrp_instance:option("ipsec_support")
			function ipsec_support:validate(value)
				if not ipsec_service then
					return false, "The IPsec service is not available on the device"
				end
				return self.dt:is_bool(value)
			end

		local ipsec_instance = nhrp_instance:option("ipsec_instance")
			function ipsec_instance:validate(value)
				if not ipsec_service then
					return false, "The IPsec service is not available on the device"
				end
				return self.dt:check_array(value, self.ipsec_instances)
			end
			function ipsec_instance:set(value)
				self:table_set(self.config, self.sid, self.api_key, value .. "-" .. value .. "_c")
			end
			function ipsec_instance:get()
				local str = self:table_get(self.config, self.sid, self.api_key)
				if str then
					return string.sub(string.match(str, "^.*-"), 1, -2)
				end
			end

		local service = nhrp_instance:option("service")
		service.readonly = true

function dynamic_nhrp_instance:bulk_dmvpn_delete()
	self:table_foreach("ipsec", "proposal", function(s)
		if s[".name"] == self.sid .. "_ph1" or s[".name"] == self.sid .. "_ph2" then
			self:table_delete("ipsec", s[".name"])
		end
	end)
	self:table_foreach("ipsec", "connection", function(s)
		if s[".name"] == self.sid .. "_c" then
			self:table_delete("ipsec", s[".name"])
		end
	end)
	self:table_delete("ipsec", self.sid)
	self:table_delete("network", self.sid.. "_route")
	local sid_name = util.split(self.sid, "_")
	if sid_name then
		self:table_delete("network", sid_name)
		self:table_delete("dmvpn", sid_name)
		self:table_delete("network", sid_name .. "_static")
	end
end

function dynamic_nhrp_instance:DELETE_after_data_hook(response_data)
	self:table_foreach(self.main_config, self.sid .. "_map", function(s)
		self:table_delete(self.main_config, s[".name"])
	end)
	if self.sid:find("_dmvpn") then
		self:bulk_dmvpn_delete()
	end
end

return dynamic_nhrp_instance
