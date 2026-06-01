local ConfigService = require("api/ConfigService")
local firewall_service = require("vuci.package_checker").is_installed("firewall")
local util = require("vuci.util")

local flags = {
	create = false,
	delete = false,
	global_settings = true,
	general_section = "rip"
}

local dynamic_rip_general = ConfigService:new(flags)

	local rip = dynamic_rip_general:section("rip", "rip_general")

		local enabled = rip:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end
			function enabled:get(value)
				return value or "0"
			end

		local debug = rip:option("debug")
			function debug:validate(value)
				return self.dt:is_bool(value)
			end
			function debug:get(value)
				return value or "0"
			end

		local enabled_vty = rip:option("enabled_vty")
			function enabled_vty:validate(value)
				return self.dt:is_bool(value)
			end

		local ripd_custom_conf = rip:option("ripd_custom_conf", { file = true })
			function ripd_custom_conf:validate(value)
				return self.dt:file_validation(value, {"/etc/vuci-uploads/"})
			end

		local version = rip:option("version")
			function version:validate(value)
				return self.dt:irange(value, 1, 2)
			end

		local neighbors = rip:option("neighbors", { list = true })
			function neighbors:validate(value)
				return self.dt:ipmask4(value)
			end

function dynamic_rip_general:PUT_before_commit_hook()
	if  firewall_service then
		local firewall_rule = self:table_get("firewall", "A_RIP")
		local rip_enabled = self:table_get(self.main_config, self.sid, "enabled")
		if rip_enabled and rip_enabled == "1" then
			if firewall_rule then
				self:table_set("firewall", "A_RIP", "enabled", "1")
			else
				local firewall_options = {
					enabled = "1",
					target = "ACCEPT",
					src = "wan",
					proto = "udp",
					dest_port = "520",
					name = "Allow-RIP-WAN-traffic"
				}
				self:table_section("firewall", "rule", "A_RIP", firewall_options)
			end
		else
			if firewall_rule then
				self:table_set("firewall", "A_RIP", "enabled", "0")
			end
		end
	end
end

function dynamic_rip_general:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "frr")
	return { path = path }
end

return dynamic_rip_general
