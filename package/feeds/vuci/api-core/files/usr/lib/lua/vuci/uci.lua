local util  = require("vuci.util")
local log = require("vuci.log")
local uci_lib = {}

uci_lib._cursor = require("uci").cursor("/etc/config", "/tmp/.uci-vuci")
uci_lib.rpc_session_id = nil
uci_lib.rpc_username = nil
uci_lib.page_name = nil

uci_lib.supress_warnings = false
uci_lib.show_commit_or_revert_warning = false
uci_lib.show_after_commit_modifications_warning = false

-- By default UCI allows renaming to section which already exist.
-- UCI allows you to have multiple sections with the same id... Not great.
--
-- This will make it so now those renames will fail with an error.
-- And this also fix a race condition for when multiple requests are creating a section with the same ID,
-- the options from both of those section will be merged.
uci_lib._cursor:set_enforce_unique_section_names(true)

local function show_warning(message)
	if not uci_lib.supress_warnings then
		util.dbg("WARNING: %s", message)
	end
end

local function show_commit_warning(config)
	if uci_lib.show_commit_or_revert_warning then
		-- Because during a bulk request, if uci:commit() is used the changes made become permenant and can't
		-- be reverted. Even if later on that request fails.
		--
		-- There are plans to make this warning stricter in the future, to crash the request. When
		-- most of the endpoints have migrated of call uci:commit()
		show_warning(("don't use uci:commit('%s'), let API Core track changes and commit them when needed."):format(config))
	end
end

local function show_revert_warning(config)
	if uci_lib.show_commit_or_revert_warning then
		-- Endpoint shouldn't have a need to call uci:revert(), because it only removes changes
		-- that were saved with uci:save(). uci:revert() has no effect on changes that have been commited.
		--
		-- Might remove uci:revert() in the future, not sure. Because you should be able to achieve
		-- a similar result using uci:unload_all()
		show_warning(("don't use uci:revert('%s'), let API Core track changes and revert them when needed."):format(config))
	end
end

local function show_after_commit_modifications_warning(config)
	if uci_lib.show_after_commit_modifications_warning then
		-- Endpoints should be doing modifications after a commit, API Core assumes all of the changes
		-- needed will be made before it.
		--
		-- For the time being, for compatibility reasons, changes done after a commit will be saved.
		-- BUT THIS IS ONLY TEMPORARY, until code is migrated to be in a before commit hook.
		-- After everything is migrated there are plans to turn this into an error and crash the request.
		-- To enforce not modifying configurations after a commit.
		show_warning(("Detected modifications to '%s' config, don't modify configurations after the commit, these changes will not bet saved! Do any modifications in a hook before the commit."):format(config))
	end
end

function uci_lib:cursor()
	return uci_lib
end

function uci_lib:set_session_username(username)
	assert(type(username) == "string")
	self.rpc_username = username
end

function uci_lib:set_page_name(page)
	assert(type(page) == "string")
	self.page_name = page
end

function uci_lib:changes(config)
	if config then
		local result = self._cursor:changes(config)
		return result and result[config] or {}
	else
		return self._cursor:changes()
	end
end

function uci_lib:has_changes(config)
	local changes = self:changes(config)
	return changes and next(changes) ~= nil
end

local function get_rpc_username(session_id)
	local response = util.ubus("session", "get", {
		ubus_rpc_session = session_id,
		keys = { "username" }
	})
	return response and response.values.username
end

function uci_lib:commit_all()
	for config, _ in pairs(self._cursor:changes()) do
		self:commit(config)
	end
end

function uci_lib:commit(config)
	assert(type(config) == "string")

	show_commit_warning(config)
	show_after_commit_modifications_warning(config)

	if not self:has_changes(config) then
		return
	end

	local data, err = self:commit_without_event(config)
	if not data then
		return data, err
	end

	if not self._cursor:was_empty_commit() then
		util.ubus("service", "event", {
			type = "config.change",
			data = { package = config }
		})

		local username = self.rpc_username
		local logged_message
		if username and self.page_name then
			logged_message = ("User \"%s\" changed %s configuration in \"%s\" page"):format(username, config:gsub("^%l", string.upper), self.page_name)
		elseif username then
			logged_message = ("User \"%s\" changed %s configuration"):format(username, config:gsub("^%l", string.upper))
		else
			logged_message = ("%s configuration has been changed"):format(config:gsub("^%l", string.upper))
		end

		log:insert_eventslog({
			table = "events",
			sender = "CONFIG",
			priority = "notice",
			text = logged_message
		})
	end
end

function uci_lib:commit_without_event(config)
	show_after_commit_modifications_warning(config)
	return self._cursor:commit(config)
end

function uci_lib:revert(config)
	show_after_commit_modifications_warning(config)
	show_revert_warning(config)

	self._cursor:revert(config)
end

function uci_lib:get(config, section, option)
	if option then
		if not config or not section then
			return nil
		end

		return self._cursor:get(config, section, option)
	elseif section then
		if not config then
			return nil
		end

		return self._cursor:get(config, section)
	elseif config then
		return self._cursor:get_all(config)
	end
end

function uci_lib:get_all(config, section)
	if section then
		if not config then
			return nil
		end

		return self._cursor:get_all(config, section)
	else
		return self._cursor:get_all(config)
	end
end

function uci_lib:foreach(config, section_type, callback)
	self._cursor:foreach(config, section_type, callback)
end

function uci_lib:section(config, section_type, name, values)
	local section_id

	show_after_commit_modifications_warning(config)

	if name then
		local s_type = self._cursor:get(config, name)
		if s_type then
			if s_type == section_type then
				-- Check if section with this name and type already exist,
				-- if it does, don't create it.
				section_id = name
			else
				-- if types differ then delete section so it gets recreated with a new type
				local ok, err = self._cursor:delete(config, name)
				if not ok then
					return nil, err
				end
			end
		end
	end
	if not section_id then
		local err
		section_id, err = self._cursor:add(config, section_type)
		if not section_id then
			return nil, err
		end

		if name then
			local ok, err = self._cursor:rename(config, section_id, name)
			if not ok then
				return nil, err
			end

			section_id = name
		end
	end

	if values then
		for key, value in pairs(values) do
			local ok, err = self:set(config, section_id, key, value)
			if not ok then
				return nil, err
			end
		end
	end

	return section_id
end

function uci_lib:add(config, section_type)
	show_after_commit_modifications_warning(config)
	return self:section(config, section_type)
end

function uci_lib:set(config, section_id, option, value)
	show_after_commit_modifications_warning(config)

	if value == nil then
		local name = section_id
		local section_type = option
		return self:section(config, section_type, name)
	elseif type(value) == "table" and #value == 0 then
		local ok, err = self._cursor:delete(config, section_id, option)
		if not ok and err == "uci: Entry not found" then
			-- Ignore error for trying to to set an option to an empty list.
			-- This can occur when that option is not set.
			return true
		end

		return ok, err
	else
		return self._cursor:set(config, section_id, option, value)
	end
end

function uci_lib:tset(config, section_id, options)
	assert(type(options) == "table")
	for option, value in pairs(options) do
		local ok, err = self:set(config, section_id, option, value)
		if not ok then
			return nil, err
		end
	end
end

function uci_lib:reorder(config, order_table)
	assert(type(order_table) == "table")
	show_after_commit_modifications_warning(config)
	for i, section_id in ipairs(order_table) do
		self._cursor:reorder(config, section_id, i)
	end
end

function uci_lib:delete(config, section_id, option)
	show_after_commit_modifications_warning(config)
	if config and section_id and option then
		return self._cursor:delete(config, section_id, option)
	else
		return self._cursor:delete(config, section_id)
	end
end

function uci_lib:delete_all(config, section_type, comparator)
	if type(comparator) == "function" then
		self:foreach(config, section_type, function(section)
			if comparator(section) then
				self:delete(config, section[".name"])
			end
		end)

	elseif comparator == nil then
		self:foreach(config, section_type, function(section)
			self:delete(config, section[".name"])
		end)
	else
		return false, "Invalid argument"
	end

	return true
end

function uci_lib:set_savedir(path)
	self._cursor:set_savedir(path)
end

function uci_lib:add_delta(path)
	self._cursor:add_delta(path)
end

function uci_lib:save(config)
	show_after_commit_modifications_warning(config)
	self._cursor:save(config)
end

function uci_lib:save_all()
	for config, _ in pairs(self._cursor:changes()) do
		self:save(config)
	end
end

function uci_lib:unload(config)
	self._cursor:unload(config)
end

function uci_lib:unload_all()
	for config, _ in pairs(self._cursor:changes()) do
		self:unload(config)
	end
end

function uci_lib:load(config)
	self._cursor:load(config)
end

function uci_lib:load_all()
	for _, config in ipairs(self._cursor:list_configs()) do
		self:load(config)
	end
end

return uci_lib
