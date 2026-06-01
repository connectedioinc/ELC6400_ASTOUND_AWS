local util  = require "vuci.util"
local class = {}

-- Custom loader needed to load a mocked Uci library when testing
-- Otherwise a normal library is loaded
local function load_uci()
	local loadedUci = require("vuci.uci").cursor()
	-- if testing environment, clear cache, so new uci modules are loaded everytime
	if os.getenv("LUA_TEST") == "true" then package.loaded["vuci.uci"] = nil end

	return loadedUci
end

function class:new()
	local o = {}
	self.__index = self
	-- config created sections table
	o.config_create_table = {}
	-- values that are set to the configuration from PUT/POST
	o.config_set_table = {}
	-- config deleted sections table via table_delete
	o.config_delete_section_table = {}
	-- table to hold loaded configurations
	o.uci_configs = {}

	o.uci = load_uci()

	setmetatable(o, self)

	return o
end

--[[
		{
			configuration = {
				.type = {
					{
						.name = {}
					}
					{
						anonymous = {}
					}
					{
						anonymous = {}
					}
				}
			}
		}
	]]
--
-- as uci:section it is used to create a new section in configuration
---@param config string
---@param type string
---@param name? string
---@param values? table
function class:table_section(config, type, name, values)
	values = values or {}
	if name then
		-- These options don't need to be marked as "needs to be deleted"
		local excluded_options = { ".name", ".type", ".index", ".anonymous" }

		local delete_table = self.config_delete_section_table
		local set_table = self.config_set_table
		delete_table[config] = delete_table[config] or {}

		-- If this section previously deleted and now is being created, then the all of the previous
		-- options also need to be marked for deletion.
		-- Otherwise the newly created empty section will contain options from before the deletion. #11028
		if delete_table[config][name] and self.uci_configs[config] and self.uci_configs[config][name] then
			set_table[config][name] = set_table[config][name] or {}

			for key, _ in pairs(self.uci_configs[config][name]) do
				if values[key] == nil then
					if util.contains(excluded_options, key) then
						set_table[config][name][key] = nil
					else
						set_table[config][name][key] = ""
					end
				end
			end
		end

		delete_table[config][name] = nil
	end

	local c = self.config_create_table
	if not c[config] then c[config] = {} end
	if not c[config][type] then c[config][type] = {} end
	if not name then
		name = "anonymous"
	end
	table.insert(c[config][type], { [name] = values })
end

-- as uci:foreach it is used to iterate configuration sections
function class:table_foreach(config, section, callback)
	local res = false
	if not self.uci_configs[config] then
		-- If failed to load config file, assume config file will not exist, so do nothing
		if not self:_get_config_safe(config) then return end
	end
	local sections = self:merge_config_tables()[config] or {}

	local stype_sections = {}
	local index = 1
	for _, s in pairs(sections) do
		if s[".type"] == section then
			stype_sections[index] = s
			index = index + 1
		end
	end

	table.sort(stype_sections, function(a, b)
		if a and a[".index"] and b and b[".index"] then
			return tonumber(a[".index"]) < tonumber(b[".index"])
		else
			return false
		end
	end)

	for _, s in pairs(stype_sections) do
		local continue = callback(s)
		res = true
		if continue == false then
			break
		end
	end
	return res
end

-- for getting loaded values
function class:table_get(config, section, option)
	-- first checks if there are any changes and tries to return them
	local s = self.config_set_table
	local c = self.uci_configs
	local section_id = self:parse_id(s[config], section)
	if not section_id then return nil end
	if s[config] and s[config][section_id] and s[config][section_id][option] then
		-- because table_delete sets values to "" this check returns nil if option is deleted.
		-- This is inline with missing options from config
		local opt = s[config][section_id][option]
		return opt ~= "" and opt or nil
	elseif s[config] and s[config][section_id] and not option then
		-- updates current configuration with new values if they are set
		if s[config][section_id] then
			-- solves an edge case where there are values that are set(in defaults for example)
			-- to a section that will be created in the same endpoint
			-- what happens is that set values want to be merged with config values, but that is not possible as there are no config values
			c[config][section_id] = c[config][section_id] or {}
			for k, v in pairs(s[config][section_id]) do
				c[config][section_id][k] = v
			end
		end
	end
	-- checks whether the section is deleted
	if self.config_delete_section_table[config] and self.config_delete_section_table[config][section] then
		return nil
	end
	-- checks created sections
	if self.config_create_table[config] then
		for type_name, sections in pairs(self.config_create_table[config]) do
			for index, section_pair in pairs(sections) do
				local section_name, options = next(section_pair)
				if section_name == section_id then
					if option == ".type" then
						return type_name
					elseif option == ".name" then
						return section_name
					elseif option then
						return options[option]
					else
						local new_section = {}
						new_section[".type"] = type_name
						new_section[".name"] = section_name
						for k, v in pairs(options) do
							new_section[k] = v
						end
						if s[config] and s[config][section_id] then
							for k, v in pairs(s[config][section_id]) do
								new_section[k] = v
							end
						end
						return new_section
					end
				end
			end
		end
	end
	-- if no changes are found then the function tries to return uci configuration values
	if not c[config] then self:_get_config_safe(config) end
	if not c[config] then return nil end
	section_id = self:parse_id(c[config], section)
	if not c[config][section_id] then return nil end

	if option then
		return c[config][section_id][option]
	end
	return c[config][section_id]
end

-- as uci:delete it is used to delete values of whole sections from the configuration
function class:table_delete(config, section, option)
	if not config then
		error("Config not provided in table_delete")
	end
	if not section then
		error("Section not provided in table_delete")
	end

	local delete_table = self.config_delete_section_table
	local set_table = self.config_set_table
	set_table[config] = set_table[config] or {}

	if not option then
		delete_table[config] = delete_table[config] or {}
		delete_table[config][section] = true
		set_table[config][section] = nil
	else
		set_table[config][section] = set_table[config][section] or {}
		set_table[config][section][option] = ""
	end
end

function class:parse_id(sections, section_name)
	if not sections then return section_name end
	if not section_name or not string.match(section_name, "^@.*%[%-?%d+%]$") then return section_name end
	local type, index = string.match(section_name, "^@(.*)%[(-?%d+)%]")
	local id = section_name
	local index = tonumber(index)
	if index < 0 then
		index = #sections + index
	end
	for name, s in pairs(sections) do
		if s[".type"] == type and s[".index"] == index then
			id = name
		end
	end
	return id
end

-- if the config is not loaded initially, but is used in hooks or other places
-- this function load the config using uci.lua logic -> ubus call
function class:_get_config(config)
	if not self:_get_config_safe(config) then
		error(string.format("Configuration: %s does not exist", config))
	end
end

-- '_get_config_safe' returns bool if it was successful,
-- '_get_config' raises an error if it was not successful
function class:_get_config_safe(config)
	local sections, err = self.uci:get_all(config)
	if sections and err == nil then
		self.uci_configs[config] = sections
		return true
	else
		return false
	end
end

--helper function for returning errors
local function table_set_errors(config, section, option, value)
	if not config then
		error("Config not provided in table_set")
	end
	if not section then
		error("Section not provided in table_set")
	end
	if not option then
		error("Option not provided in table_set")
	end
	if not value then
		error(string.format("Value not provided in table_set. Config: %s, section: %s, option: %s", config, section,
			option))
	end
end

-- for setting values for uci
function class:table_set(config, section, option, value)
	table_set_errors(config, section, option, value)
	-- throw error if value is being set for deleted section as it might result in unwanted behavior for recreated sections
	if self.config_delete_section_table[config] and self.config_delete_section_table[config][section] then 
		error(string.format("Cannot set option value for deleted sections. Section %s in configuration %s", section, config))
	end

	local c = self.config_set_table
	if not c[config] then c[config] = {} end
	if not c[config][section] then c[config][section] = {} end
	-- sets empty tables to empty values, otherwise setting in uci breaks with "Invalid argument"
	if type(value) == "table" and #value == 0 then
		value = ""
	end
	c[config][section][option] = value
end

local function iterate_config_table(new_table, conf_table)
	for conf, sections in pairs(conf_table) do
		if not new_table[conf] then new_table[conf] = {} end
		for section, options in pairs(sections) do
			if not new_table[conf][section] then new_table[conf][section] = {} end
			for k, v in pairs(options) do
				new_table[conf][section][k] = v
			end
		end
	end
end

function class:get_uci_config(conf)
	if not conf then return self.uci_configs end
	return self.uci_configs[conf]
end

-- FIXME dumb, should not be required
function class:merge_config_tables()
	local newT = {}
	iterate_config_table(newT, self.uci_configs)
	-------------------------------------------------------
	-- adds newly created sections
	for conf, types in pairs(self.config_create_table) do
		for type, sections in pairs(types) do
			for _, section_pair in pairs(sections) do
				local section_name, options = next(section_pair)
				if not newT[conf] then newT[conf] = {} end
				if not newT[conf][section_name] then newT[conf][section_name] = {} end
				newT[conf][section_name][".type"] = type
				newT[conf][section_name][".name"] = section_name
				for k, v in pairs(options) do
					newT[conf][section_name][k] = v
				end
			end
		end
	end
	iterate_config_table(newT, self.config_set_table)
	-------------------------------------------------------
	-- removed deleted sections from iteration
	for conf, sections in pairs(self.config_delete_section_table) do
		for name, is_deleted in pairs(sections) do
			if is_deleted and newT[conf] then
				newT[conf][name] = nil
			end
		end
	end
	return newT
end

-- checks all tables for used configs to commit
function class:general_commit()
	for config, _ in pairs(self.uci:changes()) do
		self:commit(config)
	end
	self.uci.show_after_commit_modifications_warning = true
end

--commit wrapper, does not execute if endpoint is part of the bulk request
function class:commit(config)
	self.uci.show_commit_or_revert_warning = false
	if not self.bulk then
		self.uci:commit(config)
	else
		-- During bulk request this will save the made changes and commit them later
		self.uci:save(config)
		self.uci:load(config)
	end
	self.uci.show_commit_or_revert_warning = true
end

----------------- Utilities -----------------

local function array_index_of(haystack, needle)
	for i, value in ipairs(haystack) do
		if value == needle then
			return i
		end
	end
end

-- How the `table_match` should work:
-- table_match("a", "a") == true
-- table_match("1", 1) == false
-- table_match({ a = 1        }, { a = 1        }) == true
-- table_match({ a = 1, b = 2 }, { a = 1        }) == true
-- table_match({ a = 1        }, { a = 1, b = 2 }) == false
-- table_match({ 1, 2, 3      }, { 1            }) == true
-- table_match({ 1, 2, 3      }, { 1, 1         }) == false
-- table_match({ 1, 2, 1      }, { 1, 1         }) == true
-- table_match({ 1, 2, 3      }, { 3, 2, 1      }) == true
-- table_match({ 1, 2, 3, a=1 }, { 1            }) == true
-- table_match({ 1, 2, a=2    }, { 1, a=2       }) == true
-- table_match({ 1, 2, a=2    }, { 1, a=3       }) == false
local function table_match(actual, expected)
	if type(actual) ~= "table" or type(expected) ~= "table" then
		return actual == expected
	end

	local used_expected_indexes = {}
	if #expected > 0 then
		-- This `if` block is for when `expected` is an array.
		-- When it is an array, the order of the value which are in actual do not matter.
		local used_actual_indexes = {}
		for i, expected_value in ipairs(expected) do
			local found_index
			for j, actual_value in ipairs(actual) do
				if table_match(actual_value, expected_value) and not array_index_of(used_actual_indexes, j) then
					found_index = j
                    break
				end
			end

			if not found_index then
				return false
			end

			table.insert(used_expected_indexes, i)
			table.insert(used_actual_indexes, found_index)
		end
	end

	for k, _ in pairs(expected) do
		if not table_match(actual[k], expected[k]) and not array_index_of(used_expected_indexes, k) then
			return false
		end
	end

	return true
end

function class:table_find(config, section_type, options)
	assert(type(config) == "string")
	assert(type(section_type) == "string")
	assert(type(options) == "table")

	local found_section
	self:table_foreach(config, section_type, function(section)
		if table_match(section, options) then
			found_section = section
			return false
		end
	end)
	return found_section
end

function class:table_find_many(config, section_type, options)
	assert(type(config) == "string")
	assert(type(section_type) == "string")
	assert(type(options) == "table" or options == nil)

	local found_sections = {}
	self:table_foreach(config, section_type, function(section)
		if not options or table_match(section, options) then
			table.insert(found_sections, section)
		end
	end)
	return found_sections
end

function class:table_count(config, section_type, options)
	assert(type(config) == "string")
	assert(type(section_type) == "string")
	assert(type(options) == "table" or options == nil)

	local count = 0
	self:table_foreach(config, section_type, function(section)
		if not options or table_match(section, options) then
			count = count + 1
		end
	end)
	return count
end

return class
