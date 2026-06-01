--[[
	Dispatcher is responsible for HTTP method checking
	route parsing and endpoint functionality calling
--]]
require("api/standard_codes")

local disp_lib = require("api.dispatcher_lib")
local disp_common = require("api.dispatcher_common")

-- preload some modules to save time on requests
require("api/ConfigService")
require("api/options_logic")
require("api/get_logic")
require("api/delete_logic")
require("api/put_logic")
require("api/post_logic")

require("api/FunctionService")
require("api.Validations")
require("vuci.network")
require("vuci.firewall")
require("vuci.mwan")
require("vuci.uci")
require("vuci.util")
require("nixio.fs")
require("luci.jsonc")


-- Main body required by uhhtpd-lua plugin
function handle_request(env)
	local sender = uhttpd.send

	local response = disp_lib:handle_request(sender, io.stdin, env)

	if response then
		if env.INTERNAL then
			return disp_common:send_response_json(response)
		else
			disp_common:send_response(response, sender)
		end
	end
end
