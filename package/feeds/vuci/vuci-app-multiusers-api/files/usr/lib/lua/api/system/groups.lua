
local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local pac = require("vuci.package_checker")
local menu = require "vuci.menu_generate"

local no_page_permissions = {
	"status/widget*",
	"services/hotspot/general/userscripts*",
	"system/reboot*"
}

local rpcd = ConfigService:new()
rpcd.access = {
	read = false,
	write = false
}
function rpcd:initialize_hook()
	if self.user.group == "root" then
		self.access.read = true
		self.access.write = true
	else
		local rights = util.load_rights(self.user.group)
		if rights["target_write"] == "allow" and
				(rights["write"]["*"] or
				rights["write"]["system/admin/multiusers/users_configuration*"] or
				rights["write"]["system/admin/multiusers*"] or
				rights["write"]["system/admin*"] or
				rights["write"]["system*"]) then
			self.access.write = true
		elseif rights["target_write"] == "deny" and
				not rights["write"]["core"] and
				not rights["write"]["!system/admin/multiusers/users_configuration*"] and
				not rights["write"]["!system/admin/multiusers*"] and
				not rights["write"]["!system/admin*"] and
				not rights["write"]["!system*"] then
			self.access.write = true
		end
		if rights["target_read"] == "allow" and
				(rights["read"]["*"] or
				rights["read"]["system/admin/multiusers/users_configuration*"] or
				rights["read"]["system/admin/multiusers*"] or
				rights["read"]["system/admin*"] or
				rights["read"]["system*"]) then
			self.access.read = true
		elseif rights["target_read"] == "deny" and
				not rights["read"]["core"] and
				not rights["read"]["!system/admin/multiusers/users_configuration*"] and
				not rights["read"]["!system/admin/multiusers*"] and
				not rights["read"]["!system/admin*"] and
				not rights["read"]["!system*"] then
			self.access.read = true
		end
	end
	if not self.access.write and self.request_method == "PUT" then
		self:add_critical_error(STD_CODES.UNAUTHORIZED, "Unauthorized", "Authorization", "403")
	end
end
rpcd.modified_sections = {}
rpcd.paths = {}
rpcd.paths_by_index = {}
rpcd.paths_by_index["*"] = true
rpcd.paths_by_index["system/reboot"] = true
if pac.is_installed("coova-chilli") then
	rpcd.paths_by_index["services/hotspot/general/userscripts"] = true
end
if pac.is_installed("vuci-app-side-widget-api") then
	rpcd.paths_by_index["status/widget"] = true
end

function rpcd:find_paths_recursive(entries)
	for k, v in pairs(entries) do
		if k == "path" and type(v) == "string" and entries.index then
			if entries.acls and type(entries.acls) == "table" then
				for _, acl in pairs(entries.acls) do
					self.paths_by_index[acl] = true
				end
			elseif not v:find(":") then
				self.paths_by_index[v:sub(2)] = true
			end
		elseif type(v) == "table" then
			self:find_paths_recursive(v)
		end
	end
end

function rpcd:get_paths()
	if #self.paths > 0 then return end
	local menus_entries = menu:get_merged_list()
	for _, v in pairs(menus_entries) do
		self:find_paths_recursive(v)
	end
	for k, _ in pairs(self.paths_by_index) do
		table.insert(self.paths, k)
	end
	local rpcd_config = self:table_get(self.config, self.sid)
	local sms_send = "services/mobile_utilities/sms_messages/send"
	if not util.contains(self.paths, sms_send) and rpcd_config and ( 
			rpcd_config.read and util.contains(rpcd_config.read, sms_send) or
			rpcd_config.write and util.contains(rpcd_config.write, sms_send)
		) then
		table.insert(self.paths, sms_send)
	end
end

function rpcd:contains_partial(paths, match_path)
	local found = false
	for _, path in ipairs(paths) do
		local path_replaced = path:gsub("%-", "%%-")
		if tostring(match_path):match("^" .. path_replaced .. ".*") or path == "*" then
			found = true
		end
	end
	return found
end

function rpcd:convert_path(str, target)
	local marked
	if #str > 1 then
		if string.sub(str, 1, 1) == '!' then
			if target == "allow" then
				return nil
			end
			marked = true
			str = string.sub(str, 2)
		end
		if string.sub(str, -1) == '*' then
			if target == "deny" and not marked then
				return nil
			end
			str = string.sub(str, 1, -2)
		end
	end
	self:get_paths()
	if not util.contains(self.paths, str) then
		return nil
	end
	return str
end

	local s = rpcd:section("rpcd", "group")
	function s:create_defaults()
		local privilege_lvl = 1
		self:table_foreach(self.config, "group", function(s)
			if tonumber(s.privilege_lvl) >= privilege_lvl then
				privilege_lvl = tonumber(s.privilege_lvl) + 1
			end
		end)

		return {
			hide_sensitive = "1",
			privilege_lvl = privilege_lvl,
			target_write = "allow",
			target_read = "allow",
			read = {
				"!superuser",
				"*"
			},
			write = {
				"!superuser",
				"*"
			}
		}
	end

	function s:filter(options)
		local group = self.user.group
		if group ~= "root" and not self.access.read then
			return options[".name"] == group
		end
		return true
	end

		local hide_sensitive = s:option("hide_sensitive")
			function hide_sensitive:validate(value)
				return self.dt:is_bool(value)
			end

		local target_read = s:option("target_read")
			function target_read:validate(value)
				return self.dt:check_array(value, {"allow", "deny"})
			end

		local read = s:option("read", { list = true })
			read.cfg_require = true
			function read:validate(value)
				self:get_paths()
				return self.dt:check_array(value, self.paths)
			end
			function read:set(_) end
			function read:get(value)
				local target_read = self:get_abs_value(self.config, self.sid, "target_read")
				local paths = {}
				for _, v in pairs(value or {}) do
					local path = self:convert_path(v, target_read)
					if path and path ~= "*" and not util.contains(paths, path) then
						paths[#paths+1] = path
					end
				end
				if #paths == 0 then return { "*" } end
				return paths
			end

			local target_write = s:option("target_write")
			function target_write:validate(value)
				local valid, err = self.dt:check_array(value, {"allow", "deny"})
				if not valid then return valid, err end
				if value ~= "allow" then return true end

				local target_read = self:get_abs_value(self.config, self.sid, "target_read")
				local read = util.to_table(self:getter_wrapped_abs_value(self.config, self.sid, "read"))
				local write = util.to_table(self:getter_wrapped_abs_value(self.config, self.sid, "write"))

				for _, write_path in ipairs(write) do
					if write_path ~= "*" and
						((target_read == "deny" and self:contains_partial(read, write_path)) or
						(target_read == "allow" and not self:contains_partial(read, write_path))) then
						return false, "Access to " .. write_path .. " can not be write-only", 1
					end
				end
				return true
			end

		local write = s:option("write", { list = true })
			write.cfg_require = true
			function write:validate(value)
				self:get_paths()
				return self.dt:check_array(value, self.paths)
			end
			function write:set(_) end
			function write:get(value)
				local write_access = self:get_abs_value(self.config, self.sid, "target_write")
				local write_all = self:table_get(self.config, self.sid, "target_write_all")
				local read_rules = self:table_get(self.config, self.sid, "read") or {}
				if value and write_access ~= "deny" and util.deep_compare(value, read_rules) and write_all then return { "*" } end
				local paths = {}
				for _, v in pairs(value or {}) do
					local path = self:convert_path(v, write_access)
					if path and path ~= "*" and not util.contains(paths, path) then
						paths[#paths+1] = path
					end
				end
				if #paths == 0 then return { "*" } end
				return paths
			end

function rpcd:PUT_section_init_hook()
	if self.sid == "root" then
		return self:add_error(STD_CODES.INVALID_SECTION, "root group can not be modified.", "id")
	end
	table.insert(self.modified_sections, self.sid)
end

function rpcd:DELETE_section_init_hook()
	local initial_sections = {"root", "admin", "user"}
	if util.contains(initial_sections, self.sid) then
		self:add_critical_error(
			STD_CODES.NO_DELETE,
			self.sid .. " section deletion is not allowed",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end

	local users = self:table_count(self.config, "login", { group = self.sid })
	if users > 0 then
		self:add_critical_error(
			STD_CODES.NO_DELETE,
			self.sid .. " group has users assigned",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end
end

function rpcd:after_data_hook()
	local read_access = self:getter_wrapped_abs_value(self.config, self.sid, "target_read")
	local read_rules = self:getter_wrapped_abs_value(self.config, self.sid, "read") or {}
	local write_access = self:getter_wrapped_abs_value(self.config, self.sid, "target_write")
	local write_rules = self:getter_wrapped_abs_value(self.config, self.sid, "write") or {}

	for idx in pairs(read_rules) do
		if not read_rules[idx]:find("*") then
			read_rules[idx] = read_rules[idx].."*"
		end
	end

	for idx in pairs(write_rules) do
		if not write_rules[idx]:find("*") then
			write_rules[idx] = write_rules[idx].."*"
		end
	end

	local parsed_read_rules = {}
	local parsed_write_rules = {}

	local write_all = false
	local read_all = false
	local su = (self.sid == "root") and "superuser" or "!superuser"

	for _, rule in ipairs(read_rules) do
		if read_access == "deny" then
			table.insert(parsed_read_rules, "!" .. rule)
		elseif read_access == "allow" then
			table.insert(parsed_read_rules, rule)
		end
		if rule == "*" then read_all = true end
	end
	
	local restricted_set = {}
	for _, rule in ipairs(no_page_permissions) do
		restricted_set[rule] = true
	end
	
	local all_restricted = true
	for _, rule in ipairs(parsed_read_rules) do
		if not restricted_set[rule] then
			all_restricted = false
			break
		end
	end
	if all_restricted then
		return self:add_error(STD_CODES.INVALID_OPT, "please select at least 1 page level permission.", self.sid)
	end
	if read_all then
		if read_access == "allow" then
			parsed_read_rules = { su, "*" }
		elseif read_access == "deny" then
			parsed_read_rules = { su }
		end
	else
		if read_access == "deny" then
			table.insert(parsed_read_rules, su)
			table.insert(parsed_read_rules, "*")
		elseif read_access == "allow" then
			table.insert(parsed_read_rules, su)
			table.insert(parsed_read_rules, "core")
		end
	end

	for _, rule in ipairs(write_rules) do
		if write_access == "deny" then
			table.insert(parsed_write_rules, "!" .. rule)
		elseif write_access == "allow" then
			table.insert(parsed_write_rules, rule)
		end
		if rule == "*" then write_all = true end
	end

	if write_all and write_access == "allow" and not read_all then
		self:table_set(self.config, self.sid, "target_write_all", 1)
	else
		self:table_delete(self.config, self.sid, "target_write_all")
	end
	if read_all and write_all then
		if read_access == "deny" and write_access == "deny" then
			parsed_write_rules = { su }
		elseif read_access == "deny" or write_access == "deny" then
			if read_access == "allow" then
				parsed_write_rules = { su, "core" }
				parsed_read_rules = { su, "*" }
			else
				parsed_write_rules = { su }
			end
		else
			parsed_write_rules = { su, "*" }
		end
	elseif read_all then
		if read_access == "deny" and write_access == "deny" then
			parsed_write_rules = { su }
		elseif read_access == "deny" or write_access == "allow" then
			table.insert(parsed_write_rules, su)
			table.insert(parsed_write_rules, "core")
		else
			table.insert(parsed_write_rules, su)
			table.insert(parsed_write_rules, "*")
		end
	elseif write_all then
		if write_access == "deny" then
			parsed_write_rules = { su, "core" }
		else
			parsed_write_rules = util.clone(parsed_read_rules)
		end
	else
		if write_access == "deny" then
			for _, rule in ipairs(read_rules) do
				if read_access == "allow" then
					table.insert(parsed_write_rules, rule)
				elseif read_access == "deny" then
					table.insert(parsed_write_rules, "!" .. rule)
				end
			end
		end

		if read_access == "deny" and write_access == "deny" then
			table.insert(parsed_write_rules, su)
			table.insert(parsed_write_rules, "*")
		else
			table.insert(parsed_write_rules, su)
			table.insert(parsed_write_rules, "core")
		end
	end

	self:table_set(self.config, self.sid, "write", parsed_write_rules)
	self:table_set(self.config, self.sid, "read", parsed_read_rules)
end

rpcd.PUT_after_data_hook = rpcd.after_data_hook
rpcd.POST_after_data_hook = rpcd.after_data_hook

if not pac.is_installed("vuci-app-change-password-ui") then
	return rpcd
else
	return nil
end
