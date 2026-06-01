local ConfigService = require("api/ConfigService")
local sqlite = require("lsqlite3")

local DB_PATH = "/etc/chilli/users.db"
local DB_COLS = {"username", "password", "user_group"}
local db = sqlite.open(DB_PATH)

local function db_select(query, values)
	local stmt = db:prepare(query)
	local rows = {}
	if stmt then
		if values then stmt:bind_names(values) end
		for row in stmt:nrows() do
			table.insert(rows, row)
		end
		stmt:finalize()
	end
	return rows
end

local function query(query, values)
	local stmt = db:prepare(query)
	local id
	if stmt then
		if values then stmt:bind_names(values) end
		stmt:step()
		id = stmt:last_insert_rowid()
	end
	return stmt and stmt:finalize() == sqlite.OK and id
end


local hotspot_users = ConfigService:new({ anonymous = true })

hotspot_users.uci.get = function (self, _, id, option)
	if not id then return end
	local data = db_select("SELECT * FROM local_users WHERE id = :id", {id = id})
	if #data > 0 then
		return option and data[1][option] or data[1]
	end
end

hotspot_users.uci.section = function (self, _, _, _, values)
	values = values or {}
	local set_values = {}
	local options = {}
	local params = {}
	for _, v in pairs(DB_COLS) do
		if values[v] then
			set_values[v] = values[v]
			table.insert(options, v)
			table.insert(params, ":" .. v)
		end
	end

	local id = query(("INSERT INTO local_users (%s) VALUES (%s)"):format(
		table.concat(options, ", "),
		table.concat(params, ", ")
	), set_values)
	if id then
		return tostring(id)
	end
	return false, db:errmsg()
end

hotspot_users.uci.tset = function (self, _, id, values)
	if not id then return false, "No id provided" end
	local set_values = {}
	local params = {}
	for _, v in pairs(DB_COLS) do
		if values[v] then
			set_values[v] = values[v]
			table.insert(params, v .. " = :" .. v)
		end
	end
	set_values.id = id
	if query(("UPDATE local_users SET %s WHERE id = :id"):format(
		table.concat(params, ", ")
	), set_values) then
		return true
	end
	return false, db:errmsg()
end

hotspot_users.uci.delete = function (self, _, id)
	if not id then return false, "No id provided" end
	local ok = query("DELETE FROM local_users WHERE id = :id", {id = id})
	if not ok then return false, db:errmsg() end
	return true
end

hotspot_users.uci.commit = function () end

hotspot_users.uci.get_all = function (self, _)
	local return_data = {}
	for i, row in ipairs(db_select("SELECT * FROM local_users")) do
		local id = tostring(row.id)
		return_data[id] = {
			[".name"] = id,
			[".index"] = i,
			[".type"] = "user",
			[".anonymous"] = false,
		}
		for k, v in pairs(row) do
			if k ~= "id" then
				local value = tostring(v)
				return_data[id][k] = value ~= "" and value or nil
			end
		end
	end
	return return_data
end

function hotspot_users:before_response_hook()
	if db:isopen() then db:close() end
	package.loaded["vuci.uci"] = nil
end

local s = hotspot_users:section("chilli", "user")
function s:create_defaults()
	return {
		user_group = "default"
	}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local username = s:option("username")
	username.cfg_require = true
	username.maxlength = 255
		function username:validate(value)
			local exists = false
			self:table_foreach(self.config, "user", function(s)
				if s.username == value then exists = true end
			end)
			if exists then
				return false, "User with this name already exists."
			end
			return self.dt:credentials_validate(value)
		end

	local password = s:option("password")
	password.cfg_require = true
	password.maxlength = 512
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end
		function password:get()
			return nil
		end

	local group = s:option("group")
		function group:validate(value)
			local group_options = {}
			local uci = require("uci").cursor()
			uci:foreach(self.config, "group", function(s)
				table.insert(group_options, s.name)
			end)
			return self.dt:check_array(value, group_options)
		end
		function group:get()
			return self:table_get(self.config, self.sid, "user_group")
		end
		function group:set(value)
			self:table_set(self.config, self.sid, "user_group", value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function hotspot_users:POST_init_hook()
	db:exec([[CREATE TABLE IF NOT EXISTS local_users (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
		username TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		user_group TEXT NOT NULL
	);]])
end

function hotspot_users:DELETE_before_commit_hook()
	local amount = 0
	self:table_foreach(self.config, "user", function(c)
		amount = amount + 1
	end)
	if amount ~= 0 then return end
	local uci = require("uci").cursor()
	uci:foreach(self.config, "chilli", function (c)
		if c.enabled == "1" and c._mode == "local" then
			uci:set(self.config, c[".name"], "enabled", "0")
			uci:set("uhttpd", "hotspot", "disabled", "1")
		end
	end)
	uci:commit(self.config)
end

function hotspot_users:DELETE_before_section_delete_hook()
	local fs = require("nixio.fs")
	local username = self.uci:get(self.config, self.sid, "username")
	if not username then return end

	local SESSIONS_DB_PATH = "/var/run/chilli/hotspot.db"
	if not fs.access(SESSIONS_DB_PATH) then
		SESSIONS_DB_PATH = "/etc/chilli/hotspot.db"
	end
	if not fs.access(SESSIONS_DB_PATH) then return end

	local sessions_db = sqlite.open(SESSIONS_DB_PATH)
	if not sessions_db then return end

	local stmt = sessions_db:prepare("DELETE FROM statistics WHERE username = :username")
	if not stmt then
		sessions_db:close()
		return
	end
	stmt:bind_names({username = username})
	stmt:step()
	stmt:finalize()
	sessions_db:close()
end

return hotspot_users