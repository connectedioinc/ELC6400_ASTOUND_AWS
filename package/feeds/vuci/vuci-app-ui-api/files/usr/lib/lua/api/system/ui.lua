local FunctionService = require("api/FunctionService")
local ui = FunctionService:new()
local fs = require "nixio.fs"
local json = require "luci.jsonc"
local util = require "vuci.util"
local menu = require "vuci.menu_generate"

local function batch_menu_access(sid, acls_list)
	local checks = {}
	local results = {}

	for _, acl in ipairs(acls_list) do
		table.insert(checks, {
			object = acl,
			["function"] = "read"
		})
		table.insert(checks, {
			object = acl,
			["function"] = "write"
		})
	end

	local r = util.ubus("session", "access", {
		ubus_rpc_session = sid,
		scope = "access-group",
		checks = checks
	})

	if r and r.results then
		for i, acl in ipairs(acls_list) do
			local read_key = acl .. ":read"
			local write_key = acl .. ":write"
			results[acl] = {
				read = r.results[read_key] or false,
				write = r.results[write_key] or false
			}
		end
	end

	return results
end

function ui:modify_by_group(sid, menu)
	local acls_to_check = {}
	local acl_map = {}

	local function collect_acls(item)
		if type(item) == "table" and #item > 0 then
			for _, subitem in ipairs(item) do
				collect_acls(subitem)
			end
		end

		if item.acls and item.acls[1] and not acl_map[item.acls[1]] then
			table.insert(acls_to_check, item.acls[1])
			acl_map[item.acls[1]] = true
		end

		if item.children then
			collect_acls(item.children)
		end
	end

	collect_acls(menu)

	local access_results = batch_menu_access(sid, acls_to_check)

	local function apply_permissions(item)
		if item.acls and item.acls[1] then
			local acl = item.acls[1]
			local result = access_results[acl] or {read = false, write = false}
			item.read_access = result.read
			item.write_access = result.write
		end
		
		if type(item) == "table" and #item > 0 then
			for _, subitem in ipairs(item) do
				apply_permissions(subitem)
			end
		end
		
		if item.children then
			apply_permissions(item.children)
			
			item.read_access = false
			item.redirect = nil
			
			for _, child in ipairs(item.children) do
				if child.read_access and child.index then
					item.read_access = true
					item.redirect = child.path
					break
				end
			end
		end
	end

	apply_permissions(menu)
	return menu
end

function ui:modify_by_group_lvl4(sid, menu)
	for _, group in pairs(menu) do
		self:modify_by_group(sid, group)
	end
	return menu
end

function ui:GET_TYPE_config()
	if self.sid == "menu" then
		local menu_response = menu:get_merged_list()
		if self.user.group == "root" then
			return self:ResponseOK({menu = menu_response})
		else
			self:modify_by_group(self.user.sid, menu_response[1])
			self:modify_by_group_lvl4(self.user.sid, menu_response[2])
			return self:ResponseOK({menu = menu_response})
		end
	elseif self.sid == "acls" then
		local acls = {}

		for file in fs.glob("/usr/share/rpcd/acl.d/*.json") do
			local acl = json.parse(fs.readfile(file))
			for k, v in pairs(acl) do
				acls[#acls + 1] = {
					[k] = v
				}
			end
		end

		return self:ResponseOK(acls)
	else
		return self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "URL", "404")
	end
end

return ui
