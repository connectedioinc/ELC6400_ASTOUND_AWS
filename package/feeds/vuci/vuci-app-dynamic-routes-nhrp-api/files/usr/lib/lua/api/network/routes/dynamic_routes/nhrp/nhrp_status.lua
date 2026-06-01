local FunctionService = require("api/FunctionService")
local dynamic_nhrp_status = FunctionService:new()


function dynamic_nhrp_status:GET_TYPE_status()
	local jsonc = require("luci.jsonc")
	local util = require("vuci.util")
	local pac = require("vuci.package_checker")
	-- this connects to the service using a hardcoded pass, otherwise FRR does not allow any connectons to it.
	-- Password has nothing to do with the system itself and service is only reachable via localhost
	local function run_vtysh(cmd)
		local shell_cmd = string.format(
			[[ ( usleep 0; echo admin01; usleep 0; echo '%s'; ) 2>/dev/null | nc 127.0.0.1 2610 2>/dev/null | sed '1,9d' | head -n -1 ]],
			cmd
		)
		local result = util.file_exec("/bin/sh", { "-c", shell_cmd })
		return result.stdout or ""
	end
	local vty = run_vtysh("show ip nhrp cache json")
	if not vty or vty == "" then return self:ResponseOK() end
	vty = jsonc.parse(vty)
	return self:ResponseOK(vty.table)
end

return dynamic_nhrp_status
