local FunctionService = require("api/FunctionService")
local fs = require("nixio.fs")
local sqlite3 = require "lsqlite3"
local api_utils = require("api/api_utils")
local util = require "vuci.util"

if fs.access("/storage/log.db") then
	DB_PATH = "/storage/log.db"
else
	DB_PATH = "/log/log.db"
end

local types = { "events", "connections", "network", "system" }
local fields = {
	id = "id",
	date = "time",
	event_type = "name",
	event = "text",
	type = "type",
	group = "group_name",
	timestamp = "time"
}

local function logs_query(self, section, limit, offset, sortby, orderby, search, params)
	local db = sqlite3.open(DB_PATH)
	local log = {}
	local found_table = false
	local where_clause = ""
	local query = ""
	local amount = 0
	local metadata = {}

	-- if database is locked for more than 1.5s assume database is optimizing
	db:busy_timeout(1500)

	local formatted_tables
	if section == "all" then
		local union_parts = {}
		if type(params["group"]) == "string" then
			local tables = {}
			for value in string.gmatch(params["group"], "[^,]+") do
				table.insert(tables, value)
			end
			params["group"] = tables
		end

		local group_tables = params["group"] or types
		table.sort(group_tables)
		for _, group in ipairs(group_tables) do
			table.insert(union_parts, string.format("SELECT id, time, name, type, text, '%s' as group_name FROM %s", group, group))
		end
		formatted_tables = table.concat(group_tables, "' OR name='"):upper()
		query = "WITH numbered_rows AS (SELECT ROW_NUMBER() OVER (ORDER BY time) as id, time, name, type, text, group_name FROM ( " ..
		table.concat(union_parts, " UNION ALL ") ..
		" ) res) SELECT id, time, name, type, text, group_name FROM numbered_rows"
	else
		formatted_tables = section:upper()
		query =
			"SELECT id, time, name, type, text FROM " ..
			section:lower()
	end

	for _ in db:rows(string.format([[SELECT * FROM sqlite_master WHERE name='%s';]], formatted_tables)) do
		found_table = true
		break
	end
	if not found_table then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Unable to find section table in logs", section)
	end

	local search_values = {}
	local search_fields = { "id", "group_name", "name", "text", "type", "strftime('%Y-%m-%d %H:%M:%S', time, 'unixepoch', 'localtime')" }
	if search then
		where_clause = where_clause .. " WHERE " .. table.concat(search_fields, " LIKE '%' || ? || '%' OR ") .. " LIKE '%' || ? || '%'"
		for _ = 1, #search_fields do
			search_values[#search_values + 1] = search
		end
		query = query .. where_clause
	end

	if params and next(params) and section == "all" then
		local and_clauses = {}
		local or_clauses = {}

		for k, v in pairs(params) do
			if k ~= "group" then
				local values = util.split(v, ",")
				if values and #values>1 then
					for _, value in ipairs(values) do
						search_values[#search_values + 1] = value:gsub("%%", "\\%%"):gsub("_", "\\_")
						or_clauses[#or_clauses + 1] = fields[k] .. " LIKE ? ESCAPE '\\'"
					end
				else
					search_values[#search_values + 1] = v:gsub("%%", "\\%%"):gsub("_", "\\_")
					and_clauses[#and_clauses + 1] = fields[k] .. " LIKE ? ESCAPE '\\'"
				end
			end
		end
		if #or_clauses > 0 then
			where_clause = where_clause .. " WHERE (" .. table.concat(or_clauses, " OR ") .. ")"
		end
		if #and_clauses > 0 then
			where_clause = where_clause .. (where_clause:find("WHERE") and " AND " or " WHERE ") .. "(" .. table.concat(and_clauses, " OR ") .. ")"
		end
		query = query .. where_clause
	end

	if sortby then
		local validation_fields = {}
		for key, _ in pairs(fields) do
			table.insert(validation_fields, key)
		end
		local valid, err = self.dt:check_array(sortby, validation_fields)
		if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "sortby") end
		query = query .. " ORDER BY " .. fields[sortby]
	else
		query = query .. " ORDER BY id"
	end

	if orderby then
		local valid, err = self.dt:check_array(orderby, { "asc", "desc" })
		if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "orderby") end
		query = query .. " " .. string.upper(orderby)
	else
		query = query .. " DESC"
	end

	if limit then
		local valid, err = self.dt:uinteger(limit)
		if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "limit") end
		query = query .. " LIMIT " .. limit
		local amount_query

		if section == "all" then
			if search then
				local union_parts = {}
				for _, group in ipairs(types) do
				    table.insert(union_parts, string.format(
				        "SELECT id, time, name, type, text, '%s' AS group_name FROM %s", group, group
				    ))
				end
				amount_query =
				    "WITH numbered_rows AS (" ..
				    "SELECT ROW_NUMBER() OVER (ORDER BY time) AS id, time, name, type, text, group_name FROM (" ..
				    table.concat(union_parts, " UNION ALL ") ..
				    ") res) SELECT COUNT(1) FROM numbered_rows"
			else
				if params and next(params) then
					local union_parts = ""
					local group_tables = params["group"] or types
					table.sort(group_tables)
					params["group"] = nil

					for i, _ in pairs(params) do
						local column = fields[i]
						union_parts = union_parts .. column .. ", "
					end
					union_parts = union_parts:sub(1, -3)
					if union_parts == "" then union_parts = "id" end
					local union_queries = {}
					for _, table_name in ipairs(group_tables) do
						table.insert(union_queries, string.format("SELECT %s FROM %s", union_parts, table_name))
					end
					amount_query = "SELECT COUNT(*) FROM (" .. table.concat(union_queries, " UNION ALL ") .. ") res"
				else
					amount_query = "SELECT COUNT(*) FROM (" ..
					"SELECT id FROM " .. table.concat(types, " UNION ALL SELECT id FROM ") ..
					") res"
				end
			end
		else
			amount_query =
				"SELECT COUNT(1) FROM " ..
				section:lower()
		end
		if search or (params and next(params)) then
			amount_query = amount_query .. where_clause
		end
		local stmt = db:prepare(amount_query)
		if search or (params and next(params)) then
			stmt:bind_values(unpack(search_values))
		end
		for rows_count in stmt:rows() do
			amount = amount + tonumber(rows_count[1])
		end
		stmt:finalize()
	end

	if offset then
		local valid, err = self.dt:uinteger(offset)
		if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "offset") end
		if not limit then query = query .. " LIMIT ~0" end
		query = query .. " OFFSET " .. offset
	end

	local stmt = db:prepare(query)
	if search or (params and next(params)) then
		stmt:bind_values(unpack(search_values))
	end
	for row in stmt:rows() do
		log[#log + 1] = {
			id = row[1],                                           -- event id
			date = os.date('%Y-%m-%d %H:%M:%S', tonumber(row[2])), -- datetime
			event_type = row[3],                                   -- sender
			type = row[4],                                         -- type
			event = row[5],                                        -- event
			group = row[6],                                        -- db table
			timestamp = row[2]                                     -- unix timestamp
		}
	end
	stmt:finalize()

	metadata = {
		total = limit and tostring(amount) or nil,
		limit = limit,
		offset = offset
	}
	db:close()
	if not limit then metadata = nil end
	return log, metadata
end


local logs = FunctionService:new()

function logs:parse_params()
	local params = {}
	for i, _ in pairs(fields) do
		if self.query_parameters[i] then
			params[i] = self.query_parameters[i]
		end
	end

	return params
end

function logs:validate_query_parameters()
	local query_parsing = require("api/query")

	local params_to_check = {
		limit = "number",
		offset = "number",
		sortby = "string",
		orderby = "string",
		search = "string",
		id = "number",
		date = "string",
		event_type = "string",
		event = "string",
		type = "string",
		group = "string"
	}
	query_parsing:validate_query_format(params_to_check, self)
end

function logs:GET_TYPE_config()
	self:validate_query_parameters()
	local limit = self.query_parameters.limit
	local offset = self.query_parameters.offset

	local sortby = self.query_parameters.sortby
	local orderby = self.query_parameters.orderby

	local search = self.query_parameters.search
	local params = self:parse_params()
	if self.sid then
		local ok, err = self.dt:check_array(self.sid, types)
		if not ok then
			self:add_critical_error(STD_CODES.INVALID_SECTION, err, "Request", HTTP_STATUS_CODES.NOT_FOUND)
		end
	end
	if search and params and api_utils:table_length(params) > 0 then
		self:add_critical_error(STD_CODES.INVALID_QUERY, "2 search options in one request are not allowed", HTTP_STATUS_CODES.BAD_REQUEST)
	end
	local success, data, metadata = pcall(logs_query, self, self.sid or "all", limit, offset, sortby, orderby, search, params)
	if not success then
		self:add_critical_error(1,
			"Events Log could not be accessed because the database is being optimized. This process can take up to five minutes.",
			"Request")
	end
	return self:ResponseOK({ data, metadata })
end

function logs:ResponseOK(data, messages)
	if type(data) == "string" then data = { response = data } end
	messages = messages and messages or {}
	coroutine.yield(
		{
			payload = {
				success = true,
				data = data[1],
				metadata = data[2],
				messages = #messages > 0 and messages or nil
			},
			code = "200"
		})
end

return logs
