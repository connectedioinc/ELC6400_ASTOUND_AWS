local ConfigService = require("api.ConfigService")
local sqlite = require("lsqlite3")
local md = require("vuci.modem")

local APN_DB = "/tmp/apn.db"
local APN_DB_COMPRESSED = "/usr/local/share/mobifd/apn.db.gz"
local APN_COLS = {"carrier", "mcc", "mnc", "apn", "user", "password", "authtype", "type", "volte", "pdp", "pdptype"}
local db = sqlite.open(APN_DB)

db:busy_timeout(5000) -- In case of multiple requests

---Sends SQL prepared query and gets the results into an array
---@param query string SQL query
---@param values? table Values to insert into prepared query
---@return table rows Database data
local db_select = function (query, values)
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

---Wrapper to send SQL prepared query
---@param query string SQL query
---@param values? table Values to insert into prepared statement
---@return boolean OK Query status
local query = function (query, values)
	local stmt = db:prepare(query)
	local id
	if stmt then
		if values then stmt:bind_names(values) end
		stmt:step()
		id = stmt:last_insert_rowid()
	end
	return stmt and stmt:finalize() == sqlite.OK and id
end

local apn_database = ConfigService:new({
	anonymous = true
})

apn_database.AUTH_TYPE = {
	NONE = "0",
	PAP = "1",
	CHAP = "2"
}

apn_database.PDP_TYPE = {
	IPV4V6 = "0",
	IPV4 = "1",
	IPV6 = "2"
}

apn_database.DO_MOBIFD_RELOAD = {}

local uci = {}

uci.get = function (self, db_file, id, option)
	if not db_file or not id then return end
	local data = db_select("SELECT * FROM apn WHERE id = :id", {id = id})
	if #data > 0 then
		return option and data[1][option] or data[1]
	end
end

uci.section = function (self, db_file, _, _, values)
	values = values or {}
	if not db_file then return false, "No config provided." end
	local set_values = {}
	local options = {}
	local params = {}
	for _, v in pairs(APN_COLS) do
		if values[v] then
			set_values[v] = values[v]
			table.insert(options, v)
			table.insert(params, ":" .. v)
		end
	end

	local id = query(("INSERT INTO apn (%s) VALUES (%s)"):format(
		table.concat(options, ", "),
		table.concat(params, ", ")
	), set_values)
	if id then
		return tostring(id)
	end
	return false, db:errmsg()
end

uci.tset = function (self, db_file, id, values)
	if not db_file then return false, "No configuration provided" end
	if not id then return false, "No id provided" end
	local set_values = {}
	local params = {}
	for _, v in pairs(APN_COLS) do
		if values[v] then
			set_values[v] = values[v]
			table.insert(params, v .. " = :" .. v)
		end
	end
	set_values.id = id
	if query(("UPDATE apn SET %s WHERE id = :id"):format(
		table.concat(params, ", ")
	), set_values) then
		return true
	end
	return false, db:errmsg()
end

uci.delete = function (self, db_file, id)
	if not db_file then return false, "No configuration provided" end
	if not id then return false, "No id provided" end
	local ok = query("DELETE FROM apn WHERE id = :id", {id = id})
	if not ok then return false, db:errmsg() end
	return true
end

uci.get_all = function (self, db_file)
	if not db_file then return end

	local full_query = "SELECT apn.*, countries.country FROM apn LEFT JOIN countries ON apn.mcc = countries.mcc"
	local params = {}

	if apn_database.GROUP_BY then
		apn_database.GROUP_BY = apn_database.GROUP_BY:gsub("([^,]+)", function (v)
			if v == "country" then return v end
			return "apn."..v
		end)
		full_query = full_query .. " GROUP BY " .. apn_database.GROUP_BY
	end

	if apn_database.APN_LIMIT then
		full_query = full_query .. " LIMIT :limit"
		params.limit = apn_database.APN_LIMIT
	end
	if apn_database.APN_LIMIT and apn_database.APN_OFFSET then
		full_query = full_query .. " OFFSET :offset"
		params.offset = apn_database.APN_OFFSET
	end

	local return_data = {}
	for i, row in ipairs(db_select(full_query, params)) do
		local id = tostring(row.id)
		return_data[id] = {
			[".name"] = id,
			[".index"] = i,
			[".type"] = "apn",
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

uci.commit = function () end
uci.revert = function () end
uci.reorder = function () end

apn_database.t_func.uci = setmetatable(uci, { __index = require("vuci.uci") })
apn_database.uci = apn_database.t_func.uci
apn_database.t_func.general_commit = function (self)
	-- Compresses and stores updated database
	os.execute("gzip -kc " .. APN_DB .. " > " .. APN_DB_COMPRESSED)
	-- Reloads modems to update existing connections
	for modem in pairs(apn_database.DO_MOBIFD_RELOAD or {}) do
		local modem_id = modem:match("^gsm(.*)")
		if modem_id then
			os.execute("ubus -t 180 call mobifd'" .. modem_id .. "' reload > /dev/null 2>&1 &")
		end
	end
end

function apn_database:GET_commit()
	-- Override this method, so self.t_func:general_commit() wouldn't be called.
end

function apn_database:get_total_rows()
	local data
	local total_query = "SELECT COUNT(*) as total FROM apn LEFT JOIN countries ON apn.mcc = countries.mcc"
	if self.GROUP_BY then
		total_query = ("SELECT COUNT(total) as total FROM (%s GROUP BY %s)"):format(
			total_query,
			self.GROUP_BY
		)
	end

	data = db_select(total_query)
	if #data > 0 then
		return data[1].total
	end
	return 0
end

function apn_database:before_response_hook()
	if self.APN_LIMIT then
		self.total_rows = self:get_total_rows()
	end
end

function apn_database:ResponseOK(data, messages)
	local response = {
		payload = {
			success = true,
			data = data,
			messages = #messages > 0 and messages or nil
		},
		code = "200"
	}
	-- Metadata for front-end
	if self.total_rows then
		response.payload.metadata = {
			total = self.total_rows
		}
	end
	coroutine.yield(response)
end

function apn_database:GET_init_hook()
	local params = self.query_parameters
	if params then
		-- Replaces query validation for limit and offset
		-- because we are dealing with a sqlite database
		local query_parsing = require("api/query")
		local limit = params.limit
		local offset = params.offset
		local group_by = params.group_by

		query_parsing:validate_query({
			limit = limit,
			offset = offset
		}, self)

		-- Saving limits for further use
		if limit and self.dt:uinteger(limit) then self.APN_LIMIT = limit end
		if offset and self.dt:uinteger(offset) then self.APN_OFFSET = offset end
		if group_by and self.dt:fieldvalidation(group_by, "^[a-zA-Z_,]+$") then self.GROUP_BY = group_by end

		-- Setting limit and offset as used
		params.limit = nil
		params.offset = nil
		params.group_by = nil
	end
end

local function handle_mobifd_reload(self)
	local apn_mcc = self:table_get(self.config, self.sid, "mcc")
	local apn_mnc = self:table_get(self.config, self.sid, "mnc")
	if not apn_mcc or not apn_mnc then return end
	for info in md:info_iterator() do
		if type(info.cache) == "table" and type(info.cache.imsi) == "string" then
			local mcc, mnc = info.cache.imsi:match("^(%d%d%d)(%d%d%d)")
			if mcc == apn_mcc and (mnc == apn_mnc or mnc:sub(1, 2) == apn_mnc) then
				self.DO_MOBIFD_RELOAD[info.id] = true
			end
		end
	end
end

apn_database.DELETE_before_section_delete_hook = handle_mobifd_reload
apn_database.PUT_after_data_hook = handle_mobifd_reload
apn_database.POST_after_data_hook = handle_mobifd_reload

local s = apn_database:section(APN_DB, "apn")
function s:create_defaults(_)
	return {
		authtype = "0",
		volte = "1",
		pdp = "1",
		type = "default,supl",
		user = "",
		password = ""
	}
end

	local opt_carrier = s:option("carrier")
		opt_carrier.cfg_require = true
		opt_carrier.maxlength = 32
		function opt_carrier:validate(value)
			return self.dt:string(value)
		end

	local opt_mcc = s:option("mcc")
		opt_mcc.cfg_require = true
		opt_mcc.minlength = 3
		opt_mcc.maxlength = 3
		function opt_mcc:validate(value)
			return self.dt:fieldvalidation(value, "^%d+$")
		end

	local opt_mnc = s:option("mnc")
		opt_mnc.cfg_require = true
		opt_mnc.maxlength = 3
		opt_mnc.minlength = 1
		function opt_mnc:validate(value)
			return self.dt:fieldvalidation(value, "^%d+$")
		end

	local opt_apn = s:option("apn")
		opt_apn.cfg_require = true
		opt_apn.maxlength = 62
		function opt_apn:validate(value)
			local main_validation = "^[a-zA-Z0-9.-]+$"
			local err = ("Value must match the format: %s and should not start or end with '.' or '-'"):format(main_validation)
			return self.dt:fieldvalidation(value, main_validation) and
				not self.dt:fieldvalidation(value, "^[.-]") and -- No . or - in front
				not self.dt:fieldvalidation(value, "[.-]$"), err -- No . or - in back
		end

	local opt_user = s:option("user")
		opt_user.maxlength = 64
		opt_user.require = {"password"}
		function opt_user:validate(value)
			return self.dt:string(value)
		end

	local opt_password = s:option("password")
		opt_password.maxlength = 64
		opt_password.require = {"user"}
		function opt_password:validate(value)
			return self.dt:string(value)
		end

	local opt_authtype = s:option("authtype")
		opt_authtype.cfg_require = true
		function opt_authtype:validate(value)
			local types = {}
			for _, auth_type in pairs(self.AUTH_TYPE) do
				table.insert(types, auth_type)
			end
			return self.dt:check_array(value, types)
		end
		function opt_authtype:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if value == self.AUTH_TYPE.NONE then
				self:table_delete(self.config, self.sid, opt_user.api_key, value)
				self:table_delete(self.config, self.sid, opt_password.api_key, value)
			end
		end

	local opt_pdp_type = s:option("pdptype")
		function opt_pdp_type:validate(value)
			local types = {}
			for _, pdp_type in pairs(self.PDP_TYPE) do
				table.insert(types, pdp_type)
			end
			return self.dt:check_array(value, types)
		end

	local opt_country = s:option("country")
		opt_country.readonly = true
		function opt_country:get(value)
			if value then return value end
			local data = self.arguments.data or {}
			if type(data.mcc) == "string" then -- Mainly for POST when there is no data yet
				local country = db_select("SELECT country FROM countries WHERE mcc = :mcc", {
					mcc = data.mcc
				})
				if #country > 0 then value = country[1].country end
			end
			return value or "Other"
		end

return apn_database