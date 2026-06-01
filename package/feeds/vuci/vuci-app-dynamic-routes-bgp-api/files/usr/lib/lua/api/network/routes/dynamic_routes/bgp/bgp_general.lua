local ConfigService = require("api/ConfigService")
local firewall_service = require("vuci.package_checker").is_installed("firewall")
local util = require("vuci.util")

local flags = {
	create = false,
	delete = false,
	global_settings = true,
	general_section = "bgp"
}

local dynamic_bgp_general = ConfigService:new(flags)

	local bgp = dynamic_bgp_general:section("bgp", "bgp_general")

		local enabled = bgp:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end
			function enabled:get(value)
				return value or "0"
			end

		local debug = bgp:option("debug")
			function debug:validate(value)
				return self.dt:is_bool(value)
			end
			function debug:get(value)
				return value or "0"
			end

		local enabled_vty = bgp:option("enabled_vty")
			function enabled_vty:validate(value)
				return self.dt:is_bool(value)
			end

		local bgpd_custom_conf = bgp:option("bgpd_custom_conf", { file = true })
			function bgpd_custom_conf:validate(value)
				return self.dt:file_validation(value, {"/etc/vuci-uploads/"})
			end

function dynamic_bgp_general:PUT_before_commit_hook()
	if firewall_service then
		local firewall_rule = self:table_get("firewall", "A_BGP")
		local bgp_enabled = self:table_get(self.main_config, self.sid, "enabled")
		if bgp_enabled and bgp_enabled == "1" then
			if firewall_rule then
				self:table_set("firewall", "A_BGP", "enabled", "1")
			else
				local firewall_options = {
					enabled = "1",
					target = "ACCEPT",
					src = "wan",
					proto = {"tcp", "udp"},
					dest_port = "179",
					name = "Allow-BGP-WAN-traffic"
				}
				self:table_section("firewall", "rule", "A_BGP", firewall_options)
			end
		else
			if firewall_rule then
				self:table_set("firewall", "A_BGP", "enabled", "0")
			end
		end
	end
end

function dynamic_bgp_general:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "frr")
	return { path = path }
end

return dynamic_bgp_general
