local FunctionService = require("api/FunctionService")
local dynamic_ospf_status = FunctionService:new()

function dynamic_ospf_status:GET_TYPE_status()
	local util = require("vuci.util")
	local jsonc = require("luci.jsonc")
	-- this connects to the service using a hardcoded pass, otherwise FRR does not allow any connectons to it.
	-- Password has nothing to do with the system itself and service is only reachable via localhost
	local function run_vtysh(cmd, drop_first, drop_last)
		local shell_cmd = string.format(
			[[ ( usleep 0; echo admin01; usleep 0; echo '%s'; ) 2>/dev/null | nc 127.0.0.1 2604 2>/dev/null | sed '1,%dd' | head -n -%d ]],
			cmd, drop_first, drop_last
		)
		local result = util.file_exec("/bin/sh", { "-c", shell_cmd })
		return result.stdout or ""
	end
	local vty_neighbors = run_vtysh("show ip ospf neighbor json", 9, 2)
	if not vty_neighbors then return self:ResponseOK() end
	local vty_all = run_vtysh("show ip ospf route json", 9, 1)
	vty_all = vty_all:sub(2)
	vty_all = jsonc.parse(vty_neighbors..","..vty_all)

	return self:ResponseOK(vty_all)
end

return dynamic_ospf_status
