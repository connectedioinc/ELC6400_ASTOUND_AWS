local fs = require "nixio.fs"
local json = require "luci.jsonc"
local mdm = require("vuci.modem")
local PLUGINS = "/usr/local/usr/share/vuci/menu.d/*.json"
local GPL_MENUS = "/usr/local/share/vuci/menu.d/*.json"
if not fs.access(fs.dirname(PLUGINS)) then
	PLUGINS = "/usr/share/vuci/menu.d/*.json"
end
local board = require("vuci.board")
local pac = require("vuci.package_checker")

---Checks if view has hash in filename (if installed as separate pkg) and returns the correct path
local function get_view(path)
	local root_view_dir = "/www/views/"
	local dir, file_name = path:match("^(.*/)(.*)$") or "", path
	local view_file = fs.glob(root_view_dir .. path .. "*")()
	return dir .. (view_file and view_file:match("/(" .. file_name .. ".-)%.") or file_name)
end

local function generate_menu_entry(title, index, view, acls, files)
	return {
		title = title,
		index = index,
		view = view and get_view(view) or view,
		acls = acls,
		files = files
	}
end

local function anyOf(flags, source)
	for _, flag in ipairs(flags) do
		if source(flag) then return true end
	end
	return false
end

local function allOf(flags, source)
	for _, flag in ipairs(flags) do
		if not source(flag) then return false end
	end
	return true
end

local function check_flags(flags, source, mode)
	if not flags then return false end

	local mode_opts = {
		notAllOf = function (f, s) return not allOf(f, s) end,
		notAnyOf = function (f, s) return not anyOf(f, s) end,
		allOf = allOf,
		anyOf = anyOf,
	}

	return mode_opts[mode] and mode_opts[mode](flags, source) or false
end

local function menu_dependencies(depends)
	local logic_modes = { "notAllOf", "notAnyOf", "allOf", "anyOf" }

	local sources = {
		board = function(flag) return board[flag] and board[flag](board) end,
		packages = pac.is_installed,
	}

	for section, source_fn in pairs(sources) do
		local section_depends = depends[section]
		if section_depends then
			for _, mode in ipairs(logic_modes) do
				if section_depends[mode] and not check_flags(section_depends[mode], source_fn, mode) then
					return false
				end
			end
		end
	end

	return true
end

local function get_mobile_connection_route(sid, modem_title, sim_name, idx, modems, esim_num)
	local title = ""
	local esim_profile = ""
	local offset_num = (tonumber(esim_num) or 0) + 1
	if esim_num then
		esim_profile = (" (eSIM%d)"):format(offset_num)
	end

	-- Doesn't show Internal modem name when external modem connected
	title = (#modems > 1 and modem_title ~= mdm.modem_names[4]) and string.format("%s%s (%s)", sim_name, esim_profile, modem_title) or ("%s%s"):format(sim_name, esim_profile)

	local route = "network/mobile/connection/" .. sid
	local acls = { "network/mobile/connection" }
	local view = "network/MobileConnection"

	local routeObj = generate_menu_entry(title, idx, view, acls)
	return route, routeObj
end


--[[ --------------------------------------------------------------------------
===============================================================================
	Router generation:
		* Start
===============================================================================
--]] --------------------------------------------------------------------------

local function get_modem_name(modem_name, index)
	local name = modem_name
	if index then
		name = name .. " " .. index
	end
	return name
end

local function generate_dynamic_modem_mobile_routes (routes, idx, modems, simIdleProtection)
	local menu_entry
	for _, modem in ipairs(modems) do
		local name = get_modem_name(modem.name, modem.index)

		menu_entry = generate_menu_entry(name, idx, "network/MobileGeneral", {"network/mobile/general"})
			routes["network/mobile/general/" .. modem.id] = menu_entry
			idx = idx + 1

		if pac.is_installed("esim-lpac") and board:has_esim() then
			menu_entry = generate_menu_entry(name, idx, "network/MobileProfiles", {"network/mobile/esim_profiles"})
			routes["network/mobile/esim_profiles/" .. modem.id] = menu_entry
			idx = idx + 1
		end

		if pac.is_installed("sim_switch") and (board:has_dual_sim() or board:has_esim()) and modem.builtin == 1 then
			menu_entry = generate_menu_entry(name, idx, "network/MobileSimSwitch", {"network/mobile/sim_switch"})
			routes["network/mobile/sim_switch/" .. modem.id] = menu_entry
			idx = idx + 1
		end

		if simIdleProtection and modem.builtin == 1 then
			menu_entry = generate_menu_entry(name, idx, "network/SimIdleProtection", {"network/mobile/sim_idle_protection"})
			routes["network/mobile/sim_idle_protection/" .. modem.id] = menu_entry
			idx = idx + 1
		end
	end
	return idx
end

local function generate_mobile_routes (routes, modems)
	routes["network/mobile"] = generate_menu_entry("Mobile", 10)
	routes["network/mobile/general"] = generate_menu_entry("General", 10, "network/MobileGeneral", {"network/mobile/general"})

	if pac.is_installed("esim-lpac") and board:has_esim() then
		routes["network/mobile/esim_profiles"] = generate_menu_entry("eSIM Profiles", 20, "network/MobileProfiles", {"network/mobile/esim_profiles"})
	end

	routes["network/mobile/connection"] = generate_menu_entry("Connection", 30, "network/MobileConnection", {"network/mobile/connection"})

	if pac.is_installed("sim_switch") and (board:has_dual_sim() or board:has_esim()) then
		routes["network/mobile/sim_switch"] = generate_menu_entry("SIM Switch", 50, "network/MobileSimSwitch", {"network/mobile/sim_switch"})
	end
end

local function generate_dynamic_mobile_routes (routes, modems)
	local uci = require "vuci.uci".cursor()
	local function generation_function(route_path, config, s)
		if not routes[route_path..s[".name"]] then
			if #modems > 0 then
				local modem_title = mdm:get_name(s.modem)
				local sim_name, index = mdm:get_sim_name(s.modem, s.position)
				local num = (index or 1) * 100

				if not s.esim_profile and mdm:is_card_esim(s.modem, s.position) then
					-- Adjust esim_profile from mnf
					s.esim_profile = "0"
				end

				if s.esim_profile then
					num = num + (tonumber(s.esim_profile) or 0)
				end
				-- Doesn't create path if modem is unknown or external
				if modem_title ~= mdm.modem_names[5] and modem_title ~= mdm.modem_names[3] then
					local path, route = get_mobile_connection_route(
						s[".name"],
						modem_title,
						sim_name or "SIM1", -- Fallback
						num,
						modems,
						s.esim_profile
					)
					if path then routes[path] = route end
				end
			end
		end
	end

	uci:foreach("simcard", "sim", function(s)
		generation_function("network/mobile/connection/", "connection", s)
	end)
end

--[[ --------------------------------------------------------------------------
===============================================================================
	Router generation:
		* End
===============================================================================
--]] --------------------------------------------------------------------------

local function table_filter (tbl, cb)
	local tmp = {}
	for _, value in ipairs(tbl) do
		if cb(value) then
			tmp[#tmp + 1] = value
		end
	end
	return tmp
end

local function generate_dynamic_routes(modems, menus)
	local routes = {}

	local sim_idle_protection = menus["network/mobile/sim_idle_protection"]
	local idx = 1

	if #modems > 0 then
		idx = generate_dynamic_modem_mobile_routes(routes, idx, modems, sim_idle_protection)

		generate_mobile_routes(routes, modems)
		generate_dynamic_mobile_routes(routes, modems)
	end

	return routes
end

local function check_menu(menu, menus)
	for path, item in pairs(menu) do
		if item.index ~= nil then
			local depends = true
			local tmp = {}

			for k, v in pairs(item) do
				if k == "acls" then
					if v then tmp[k] = v end
				elseif k == "depends" then
					depends = menu_dependencies(v)
				else
					tmp[k] = v
					if k == "view" then
						tmp.css_exists = (fs.access("/www/views/"..v..".css") or fs.access("/www/views/"..v..".css.gz")) and true or false
					end
				end
			end
			tmp.read_access = true
			tmp.write_access = true
			if depends then
				menus[path] = tmp
			end
		end
	end
end

local function process_plugins(pattern, menus)
	for file in fs.glob(pattern) do
		if fs.basename(file) ~= "menu.json" then
			local menu = json.parse(fs.readfile(file) or "{}")
			check_menu(menu, menus)
		end
	end
end

local function get_menus(menus, modems)
	local dot1x_duplicated = (pac.is_installed("dsa-dot1x-server") or pac.is_installed("dot1x-server")) and pac.is_installed("dot1x-client")
	local call_service = #modems > 0 and true or false
	for _, modem in ipairs(modems) do
		if modem.id and not mdm:call_functionality_supported(modem.id) then
			call_service = false
		end
	end

	process_plugins(PLUGINS, menus)
	process_plugins(GPL_MENUS, menus)

	if mdm:has_mode(mdm.modes.LOW_POWER, true) then
		menus["network/mobile/operators/list"] = nil
	end
	if not call_service then
		menus["services/mobile_utilities/call_utilities"] = nil
	end
	if dot1x_duplicated then
		-- 802.1X server takes priority since it has children
		menus["network/ports/port_security_client"] = nil
		if menus["network/ports/port_security_server"] then
			menus["network/ports/port_security_server"].title = "802.1X"
		end
	end
	return menus
end

local function gmatch_to_tbl (gmatch)
	local tbl = {}
	for val in gmatch do
		tbl[#tbl + 1] = val
	end
	return tbl
end

local function transform_menu_entry(menuLvl4, newMenus, menus, parentRoute)
	for key, _ in pairs(menus) do
		local element = menus[key]
		local currentPath = parentRoute .. key
		element.path = currentPath

		newMenus[#newMenus+1] = {}
		for k, v in pairs(element) do
			newMenus[#newMenus][k] = v
		end

		if #gmatch_to_tbl(string.gmatch(currentPath, "([^/]+)")) == 3 and element.children then
			local arr = {}
			for key, value in pairs(element.children) do
				arr[#arr + 1] = value
				arr[#arr].route = key
			end
			table.sort(arr, function(a, b)
					if a.index and b.index then
						return tonumber(a.index) < tonumber(b.index)
					end
					return false
				end)
			menuLvl4[currentPath] = arr
		end

		if element.children then
			newMenus[#newMenus].children = {}

			transform_menu_entry(
				menuLvl4,
				newMenus[#newMenus].children,
				element.children,
				currentPath .. "/"
			)
			local child_read = false
			local child_write = false
			for _, child in pairs(newMenus[#newMenus].children) do
				if child.read_access then
					child_read = true
				end
				if child.write_access then
					child_write = true
				end
			end
			newMenus[#newMenus].read_access = child_read
			newMenus[#newMenus].write_access = child_write

			for _, child in ipairs(newMenus[#newMenus].children or {}) do
				if child.read_access and child.index then
					newMenus[#newMenus].redirect = child.path
					break
				end
			end

			if not element.view then
				local readAccess = false
				for childKey, _ in pairs(element.children) do
					if element.children[childKey].read_access then
						readAccess = true
					end
				end
				newMenus[#newMenus].read_access = readAccess
				element.read_access = readAccess
			end
		end
	end
	table.sort(newMenus, function(a, b)
		if a.index and b.index then
			return tonumber(a.index) < tonumber(b.index)
		else
			return false
		end
	end)
end

local function count_str_occurences(haystack, needle)
	local _, count = haystack:gsub(needle, "")
	return count
end

local function append_route_to_tree(menus_tree_root, route_path, route)
	local route_path_segments = gmatch_to_tbl(route_path:gmatch("([^/]+)"))
	assert(#route_path_segments >= 1)

	local menu_tree_node = menus_tree_root
	for i=1, #route_path_segments-1 do
		local path_segment = route_path_segments[i]
		if not menu_tree_node[path_segment] then
			return -- Parent path does not exist, the this sub-path also doesn't need to be added
		end

		menu_tree_node[path_segment].children = menu_tree_node[path_segment].children or {}
		menu_tree_node = menu_tree_node[path_segment].children
	end

	local last_segment = route_path_segments[#route_path_segments]
	menu_tree_node[last_segment] = route
end

local function parse_menus (routes)
	-- Sort route paths by the number "/" in them, so that parent paths would be added
	-- first to the `menus_tree` compared to the children.
	-- E.g. "network/mobile" will be added earlier than "network/mobile/operators"
	--
	-- This is to make checking if a parent paths exists. If it doesn't then all sub-paths
	-- also don't need to be added to the tree.
	local route_paths = {}
	for route_path, _ in pairs(routes) do
		table.insert(route_paths, route_path)
	end
	table.sort(route_paths, function(a, b)
		return count_str_occurences(a, "/") < count_str_occurences(b, "/")
	end)

	local menus_tree = {}
	for _, route_path in ipairs(route_paths) do
		append_route_to_tree(menus_tree, route_path, routes[route_path])
	end

	local newMenus = {}
	local menuLvl4 = {}
	transform_menu_entry(menuLvl4, newMenus, menus_tree, "/")

	for _, newMenu in ipairs(newMenus) do
		local readAccess = false
		for _ , child in ipairs(newMenu.children or {}) do
			if child.read_access then
				readAccess = true
			end
		end
		newMenu.read_access = readAccess
	end

	return table_filter(newMenus, function(s) return s.children end), menuLvl4
end

local Menu = {}

function Menu:generate_dynamics(modems, menus)
	local routes = {}

	local ok, dynMenu = pcall(generate_dynamic_routes, modems, menus)
	if ok and dynMenu then check_menu(dynMenu, routes) end

	return routes
end

function Menu:get_merged_list()
	local menus = {}
	local modems = mdm:get_all_modems()
	-- Load the static menu
	local data = fs.readfile("/usr/share/vuci/menu.d/menu.json") or {}
	data = json.parse(data)
	for key, item in pairs(data) do
	    check_menu({ [key] = item }, menus)
	end
	menus = get_menus(menus, modems)

	-- Generate dynamic menu
	local dynamic_routes = self:generate_dynamics(modems, menus)

	for path, route in pairs(dynamic_routes) do
		menus[path] = route
	end
	return {parse_menus(menus)}
end

return Menu
