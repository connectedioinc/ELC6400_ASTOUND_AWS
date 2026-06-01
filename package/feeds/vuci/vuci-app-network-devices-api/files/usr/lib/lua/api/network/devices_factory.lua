local pac = require("vuci.package_checker")
local board = require("vuci.board")

local has_dsa = board:has_dsa()
local is_switch = board:is_switch()
local is_access_point = board:is_ap()

local devices_factory = {}

-- Factory which contains different types of specific device options
local function import_bridge()
	if is_access_point then
		return function () return { options = { { name = "ports", params = { list = true } } } } end
	elseif has_dsa then
		return require("api.network.devices_bridge")
	end
	return nil
end

local function import_ethernet()
	if is_switch then
		return nil
	elseif has_dsa then
		return require("api.network.devices_ethernet")
	end
	return function () return {} end
end


local FACTORY = {
	bridge = import_bridge(),
	ethernet = import_ethernet(),
	vxlan = pac.is_installed("kmod-vxlan") and require("api.network.devices_vxlan") or nil
}

-- Retrieves provided type data
function devices_factory:get_data(type, super)
	return FACTORY[type] and FACTORY[type](super) or nil
end

-- Retrieves available device types
function devices_factory:get_types()
	local types = {}
	for t in pairs(FACTORY) do
		table.insert(types, t)
	end
	return types
end

return devices_factory
