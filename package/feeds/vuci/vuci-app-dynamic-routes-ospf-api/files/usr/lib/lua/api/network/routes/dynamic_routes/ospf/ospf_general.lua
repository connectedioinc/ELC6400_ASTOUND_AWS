local ConfigService = require("api/ConfigService")
local vpn_utils = require("vuci.vpn")
local firewall_service = require("vuci.package_checker").is_installed("firewall")
local util = require("vuci.util")


local flags = {
	create = false,
	delete = false,
	global_settings = true,
	general_section = "ospf"
}

local dynamic_ospf_general = ConfigService:new(flags)
dynamic_ospf_general.ifnames = vpn_utils:get_all_devices()

	local ospf = dynamic_ospf_general:section("ospf", "ospf_general")

		local enabled = ospf:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end
			function enabled:get(value)
				return value or "0"
			end

		local debug = ospf:option("debug")
			function debug:validate(value)
				return self.dt:is_bool(value)
			end
			function debug:get(value)
				return value or "0"
			end

		local enabled_vty = ospf:option("enabled_vty")
			function enabled_vty:validate(value)
				return self.dt:is_bool(value)
			end

		local ospfd_custom_conf = ospf:option("ospfd_custom_conf", { file = true })
		function ospfd_custom_conf:validate(value)
			return self.dt:file_validation(value, {"/etc/vuci-uploads/"})
		end

		local router_id = ospf:option("router_id")
			function router_id:validate(value)
				return self.dt:ip4addr(value)
			end
			function router_id:get()
				return self:table_get(self.config, self.sid, "id")
			end
			function router_id:set(value)
				self:table_set(self.config, self.sid, "id", value)
			end

		local passive_ifname = ospf:option("passive_ifname", { list = true })
			function passive_ifname:validate(value)
				local ifnames = {}
				for _, entry in ipairs(self.ifnames) do
					if entry.ifname then
						table.insert(ifnames, entry.ifname)
					end
				end
				return self.dt:check_array(value, ifnames)
			end

		local originate = ospf:option("originate")
			function originate:validate(value)
				return self.dt:check_array(value, { "default", "always", "off" })
			end
			function originate:set(value)
				if value == "off" then
					self:table_set(self.config, self.sid, "originate", "")
				else
					self:table_set(self.config, self.sid, "originate", value)
				end
			end

		local redistribute = ospf:option("redistribute", { list = true })
		redistribute.maxlength = 32

function dynamic_ospf_general:PUT_before_commit_hook()
	if firewall_service then
		local firewall_rule = self:table_get("firewall", "A_OSPFIGP")
		local ospf_enabled = self:table_get(self.main_config, self.sid, "enabled")
		if ospf_enabled and ospf_enabled == "1" then
			if firewall_rule then
				self:table_set("firewall", "A_OSPFIGP", "enabled", "1")
			else
				local firewall_options = {
					enabled = "1",
					target = "ACCEPT",
					src = "wan",
					proto = "89",
					name = "Allow-OSPFIGP-WAN-traffic"
				}
				self:table_section("firewall", "rule", "A_OSPFIGP", firewall_options)
			end
		else
			if firewall_rule then
				self:table_set("firewall", "A_OSPFIGP", "enabled", "0")
			end
		end
	end
end

function dynamic_ospf_general:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "frr")
	return { path = path }
end

return dynamic_ospf_general
