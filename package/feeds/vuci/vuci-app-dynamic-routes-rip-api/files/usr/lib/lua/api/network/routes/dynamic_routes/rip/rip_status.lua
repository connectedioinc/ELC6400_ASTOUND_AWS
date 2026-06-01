local FunctionService = require("api/FunctionService")
local utils = require("api.network.routes.utils")

local dynamic_rip_status = FunctionService:new()

function dynamic_rip_status:GET_TYPE_status()
	local util = require("vuci.util")
	local json = require("luci.jsonc")
	-- this connects to the service using a hardcoded pass, otherwise FRR does not allow any connectons to it.
	-- Password has nothing to do with the system itself and service is only reachable via localhost
	local function run_vtysh(cmd)
		local shell_cmd = string.format(
			[[ ( usleep 0; echo admin01; usleep 0; echo '%s'; ) 2>/dev/null | nc 127.0.0.1 2602 2>/dev/null | sed '1,9d' | head -n -1 | sed 's/\r//' ]],
			cmd
		)
		local result = util.file_exec("/bin/sh", { "-c", shell_cmd })
		return result.stdout or ""
	end
	local vty = run_vtysh("show ip rip status")
	if not vty or vty == "" then return self:ResponseOK() end
	local vty2 = run_vtysh("show ip rip")

	local _, _, interface, send, receive, key= string.find(vty,"Key%-chain%s*(%S*)%s*(%d*)%s*(%d*)")
	if send and receive then
		send = send .."/".. receive
	end

	local sources_name = {"Gateway","Badpackets","Badroutes","Distance","LastUpdate"}
	local routes_name = {"Type","Network","NextHop","Metric","From","Tag","Time"}
	local sources = utils.parse_text_routes(vty,"Update%s*(.*)Distance","%S*")
	local routes = utils.parse_text_routes(vty2,"Time%s*(.*)","%S*", #routes_name)
	routes[#routes+1] = "0" --makes array even

	local dec_string = "{"
	dec_string = dec_string .. "\"sources\" :{"
	interface = interface == nil and "" or interface
	send = send == nil and "" or send
	dec_string = dec_string ..'"Interface":\"'.. interface ..'\","sendreceive":\"'.. send ..'\",'

	dec_string = utils.array_to_json(sources_name, sources, dec_string, "neighbor")
	dec_string = dec_string.. ","
	dec_string = utils.array_to_json(routes_name, routes, dec_string, "route")
	dec_string = dec_string.. "}"

	local json_full = json.parse(dec_string)
	return self:ResponseOK(json_full)
end

return dynamic_rip_status
