local ConfigService = require("api/ConfigService")
local utils = require("api.network.routes.utils")
local firewall_service = require("vuci.package_checker").is_installed("firewall")

local flags = {
	create = false,
	delete = false,
	general_section = "eigrp"
}

local dynamic_eigrp_general = ConfigService:new(flags)

	local eigrp_general = dynamic_eigrp_general:section("eigrp", "eigrp_general")
	local enabled_depends = { ["1"] = {"as"} }

		local enabled = eigrp_general:option("enabled")
		enabled.require = enabled_depends
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local debug = eigrp_general:option("debug")
			function debug:validate(value)
				return self.dt:is_bool(value)
			end

		local as = eigrp_general:option("as")
			function as:validate(value)
				return self.dt:irange(value, 1, 65535)
			end

		local router_id = eigrp_general:option("router_id")
			function router_id:validate(value)
				return self.dt:ipaddr(value)
			end
			function router_id:get()
				return self:table_get(self.config, self.sid, "id")
			end
			function router_id:set(value)
				self:table_set(self.config, self.sid, "id", value)
			end

		local network = eigrp_general:option("network", { list = true })
			function network:validate(value)
				return self.dt:ipmask4(value)
			end

		local redistribute = eigrp_general:option("redistribute", { list = true })
			redistribute.maxlength = 32
			function redistribute:validate(value)
				return self.dt:string(value)
			end

		local neighbor = eigrp_general:option("neighbor", { list = true })
			function neighbor:validate(value)
				return self.dt:ipmask4(value)
			end

function dynamic_eigrp_general:PUT_before_commit_hook()
	if firewall_service then
		local firewall_rule = self:table_get("firewall", "A_EIGRP")
		local eigrp_enabled = self:table_get(self.main_config, self.sid, "enabled")
		if eigrp_enabled and eigrp_enabled == "1" then
			if firewall_rule then
				self:table_set("firewall", "A_EIGRP", "enabled", "1")
			else
				local firewall_options = {
					enabled = "1",
					target = "ACCEPT",
					src = "wan",
					proto = "88",
					name = "Allow-EIGRP-WAN-traffic"
				}
				self:table_section("firewall", "rule", "A_EIGRP", firewall_options)
			end
		else
			if firewall_rule then
				self:table_set("firewall", "A_EIGRP", "enabled", "0")
			end
		end
	end
end

function dynamic_eigrp_general:GET_TYPE_status()
	local util = require("vuci.util")
	local json = require("luci.jsonc")
	-- this connects to the service using a hardcoded pass, otherwise FRR does not allow any connectons to it.
	-- Password has nothing to do with the system itself and service is only reachable via localhost
	local function run_vtysh(cmd)
		local shell_cmd = string.format(
			[[ ( usleep 0; echo admin01; usleep 0; echo '%s'; ) 2>/dev/null | nc 127.0.0.1 2613 2>/dev/null | sed '1,9d' | head -n -1 | sed 's/\r//' ]],
			cmd
		)
		local result = util.file_exec("/bin/sh", { "-c", shell_cmd })
		util.perror("/bin/sh -c " ..shell_cmd)
		return result.stdout or ""
	end
	local vty = run_vtysh("show ip eigrp neighbors detail")
	if not vty or vty == "" then return self:ResponseOK() end
	local vty2 = run_vtysh("show ip eigrp topology")

	vty = string.match(vty, "Num%s*(.*)")
	vty = vty:gsub("Version%s[^\n]*", "")

	local neighbors = utils.parse_text_routes(vty,"(.*)","%S*")
	local routes = utils.parse_text_routes(vty2,"sia Status%s*(.*)","[^,\n]+")
	local dec_string = "{ \"neighbors\" :{"
	local neighbors_name = {"H","Address","Interface","Hold","Uptime","SRTT","RTO","Q","Seq"}
	dec_string = utils.array_to_json(neighbors_name, neighbors, dec_string, "neighbor")
	dec_string = dec_string.. ","

	local routes_name = {"ip","successors", "fd", "serno", "via", "interface"}
	dec_string = utils.array_to_json(routes_name, routes, dec_string, "route")
	dec_string = dec_string.. "}"

	local decoded = json.parse(dec_string)
	return self:ResponseOK(decoded)
end

return dynamic_eigrp_general
