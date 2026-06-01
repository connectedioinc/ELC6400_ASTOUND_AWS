local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local rule_utils = require("api.services.gps.avl_rule_utils")

if not board:has_gps()then
	return nil
end

local AVL = ConfigService:new({
	create = false,
	delete = false
})

local AVLMain = AVL:section("avl", "section")
function AVLMain:filter(options)
	return options[".name"] == "avl_rule_main"
end

rule_utils.append_rule_options(AVLMain)

return AVL
