local fs = require ("nixio.fs")
local board = require("vuci.board")

local versioned_paths = {}
local existing_versions = {}
local unique_paths = {}
local variable_patterns = {}
local variable_first_prefix_index = {}
local function convert_result(str)
	if not str then return nil end
	if #str == 0 then return nil end
	return str
end

local function load_external_paths(paths_index)
	local json = require("luci.jsonc")
	local PATH_DIRECTORIES = {
		["/usr/share/vuci/path.d/*.json"] = "/usr/lib/lua/api/",
		["/usr/local/usr/share/vuci/path.d/*.json"] = "/usr/local/usr/lib/lua/api/"
	}

	for path_pattern, base_path in pairs(PATH_DIRECTORIES) do
		for file in fs.glob(path_pattern) do
			local file_content = fs.readfile(file)
			if file_content then
				local paths = json.parse(file_content)
				if type(paths) == "table" then
					for _, pair in pairs(paths) do
						local k, route = next(pair)
						if k and route then
							table.insert(paths_index, { [k] = base_path .. route })
						end
					end
				end
			end
		end
	end
	return paths_index
end

local function split_slash(str)
	local chunks = {}
	for token in string.gmatch(str, "[^%/]+") do
		table.insert(chunks, token)
	end
	return chunks
end

local function convert_to_pattern(url)
	local new_url = "^/"
	local parts = split_slash(url)

	local variables = {}
	local first_done = false
	for i, part in pairs(parts) do
		if part:find("{") then
			table.insert(variables, part:sub(2, #part - 1))
			if not first_done or i == #parts then parts[i] = "?([^/]*)"
			else parts[i] = "([^/]*)" end
			first_done = true
		end
	end
	new_url = new_url .. table.concat(parts, "/") .. "$"
	return new_url, variables
end

-- Helper to extract static prefix from a pattern key
local function get_static_prefix(key)
	local prefix = {}
	for token in string.gmatch(key, "[^/]+") do
		if token:find("{") then break end
		prefix[#prefix + 1] = token
	end
	return table.concat(prefix, "/")
end


-- Cache external paths at startup

local function parse_custom_path(url)
	if url:sub(#url, #url) == "/" then
		url = url:sub(1, #url - 1)
	end

	-- If url starts with /v1/, treat as default version
	local latest_version = "v1"
	local prefix = "/" .. latest_version .. "/"
	if url:sub(1, #prefix) == prefix then
		url = "/" .. url:sub(#prefix + 1)
	end


	-- Direct lookup for main endpoints
	local entry = versioned_paths["default"] and versioned_paths["default"][url]
	if entry then
		local result = {string.match(url, entry.pattern)}
		if #result > 0 then
			local key_value = {}
			for i, var in ipairs(entry.vars) do
				key_value[var] = convert_result(result[i])
			end
			if key_value.service_group or #entry.vars <= 1 then
				return key_value, entry.file
			end
		end
	end

	-- Variable pattern matching: use first-segment prefix index
	local first_segment = url:match("^/([^/]+)")
	local candidates = variable_first_prefix_index[first_segment] or {}
	for _, vpat in ipairs(candidates) do
		local result = {string.match(url, vpat.pattern)}
		if #result > 0 then
			local key_value = {}
			for i, var in ipairs(vpat.vars) do
				key_value[var] = convert_result(result[i])
			end
			if key_value.service_group or #vpat.vars <= 1 then
				return key_value, vpat.file
			end
		end
	end

	-- Use dynamic external path reloading for endpoint resolution (last)
	for _, pair in ipairs(load_external_paths({})) do
		local k, route = next(pair)
		if k and route then
			local pattern, vars = convert_to_pattern(k)
			if k == url then
				local result = {string.match(url, pattern)}
				if #result > 0 then
					local key_value = {}
					for i, var in ipairs(vars) do
						key_value[var] = convert_result(result[i])
					end
					if key_value.service_group or #vars <= 1 then
						return key_value, route
					end
				end
			end
		end
	end
	return nil
end

-- validates version count and add fake latest version to existing versions
local function map_all_versions()
	local highest_version = nil
	local current_version = nil
	if #existing_versions == 0 then
		-- allowing first version to be called with v1
		table.insert(existing_versions, "v1")
		return
	end
	if #existing_versions < 3 then
		for _, entry in ipairs(existing_versions) do
			local version = tonumber(string.match(entry, "v(%d+)"))
			if version then
				if not highest_version then
					highest_version = version
				elseif version > highest_version then
					highest_version = version
				end
				current_version = highest_version + 1
			end
		end
		table.insert(existing_versions, "v" .. current_version)
	else
		error("Too many API versions present in the current configuration")
	end
end

-- Maps all folders in main directories
local function filter_sub_directories(path)
	local sub_paths = {}
	for entry in fs.dir(path) do
		if entry ~= "." and entry ~= ".." and entry ~= "api_versions" then
			local sub_path = path .. "/" .. entry
			if fs.stat(sub_path, "type") == "dir" then
				table.insert(sub_paths, sub_path)
			end
		end
	end
	return sub_paths
end

-- Creates existing version list
local function map_unique_paths(paths)
	for _, base_path in ipairs(paths) do
		local api_versions_path = base_path .. "/api_versions"
		-- Check if api_versions directory exists and is a directory
		if fs.stat(api_versions_path, "type") == "dir" then
			for entry in fs.dir(api_versions_path) do
				if not unique_paths[entry] then
					table.insert(existing_versions, entry)
					unique_paths[entry] = true
				end
			end
		end
	end
end

-- Filters all existing versions from unique folders
local function filter_versions()
	local base_paths = {
			"/usr/lib/lua/api/services",
			"/usr/lib/lua/api/network",
			"/usr/lib/lua/api/status",
			"/usr/lib/lua/api/system",
			"/usr/local/usr/lib/lua/api/services",
			"/usr/local/usr/lib/lua/api/network",
			"/usr/local/usr/lib/lua/api/status",
			"/usr/local/usr/lib/lua/api/system"
	}
	for _, base_path in ipairs(base_paths) do
		-- Check if base_path exists and is a directory
		if fs.stat(base_path, "type") == "dir" then
			local paths = filter_sub_directories(base_path)
			if #paths == 0 then
				map_unique_paths({base_path})
			else
				table.insert(paths, base_path)
				map_unique_paths(paths)
			end
		end
	end
end

local function get_versioned_file(route, version, pattern, vars)
	local file = string.match(route, "/([^/]+)$")
	local path_dir = route:match("^(.-)/[^/]+$") or ""
	local versioned_path = path_dir .. "/api_versions/" .. version .. "/" .. file .. ".lua"
	local result_file = route
	if file and path_dir ~= "" and fs.access(versioned_path) then
		result_file = versioned_path
	end
	return {
		file = result_file,
		pattern = "^/" .. version .. pattern:sub(2),
		vars = vars
	}
end

-- Helper to count static segments after last variable
local function static_segments_after_vars(key)
	local last_var = 0
	local static_count = 0
	local total_parts = 0
	for token in string.gmatch(key, "[^/]+") do
		total_parts = total_parts + 1
		if token:find("{", nil, true) then
			last_var = total_parts
		elseif last_var > 0 and total_parts > last_var then
			static_count = static_count + 1
		end
	end
	return static_count, total_parts
end

local function load_paths()
	local util = require("vuci.util")
	local paths_index = require("api.paths_index")
	paths_index = load_external_paths(paths_index)
	filter_versions()
	map_all_versions()
	local seen_patterns = {}
	for i, pair in ipairs(paths_index) do
		local k, route = next(pair)
		if k and route then
			local pattern, vars = convert_to_pattern(k)
			if seen_patterns[k] then
				util.perror("Duplicate pattern detected: " .. tostring(k))
			else
				seen_patterns[k] = true
			end
			if not fs.stat(route .. ".lua", "type") and not board:is_switch() then
				route = "/usr/local" .. route
			end
			if not versioned_paths["default"] then versioned_paths["default"] = {} end
			versioned_paths["default"][k] = {
				file = route,
				pattern = pattern,
				vars = vars
			}
			if #vars > 0 then
				local static_count, total_parts = static_segments_after_vars(k)
				local prefix = get_static_prefix(k)
				local vpat = {
						key = k,
						file = route,
						pattern = pattern,
						vars = vars,
						static_count = static_count,
						total_parts = total_parts,
						prefix = prefix
				}
				table.insert(variable_patterns, vpat)
				-- Add to first-segment prefix index
				local first_segment = k:match("^/([^/]+)")
				if first_segment then
					if not variable_first_prefix_index[first_segment] then variable_first_prefix_index[first_segment] = {} end
					table.insert(variable_first_prefix_index[first_segment], vpat)
				end
			end
			for _, version in ipairs(existing_versions) do
				if not versioned_paths[version] then versioned_paths[version] = {} end
				versioned_paths[version][k] = get_versioned_file(route, version, pattern, vars)
			end
		end
	end
end

load_paths()
return { parse_url = parse_custom_path }
