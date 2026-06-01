local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local sqlite3 = require("lsqlite3")
local uci
local fs = require("nixio.fs")
local file = "share/ip_block/attempts.db"
local api_utils = require("api/api_utils")
local DB_PATH = fs.access("/usr/" .. file) and "/usr/" .. file or "/usr/local/" .. file

local WAIT_FOR_LOCK = 5000 -- wait for lock for 5 seconds

local fields = {
	id = "attempt_id",
	ip = "ip",
	mac = "mac",
	destination_ip = "destination_ip",
	port = "port",
	proto = "proto",
	counter = "counter",
	iteration_count = "iteration_count",
	blocked_time = "blocked_time"
}

local LoginAttempts = FunctionService:new()

function LoginAttempts:is_ipblock_enabled()
	uci = uci or require("vuci.uci").cursor()
	if uci:get("ip_blockd", "ip_blockd", "enabled") ~= "1" then return false end
	while util.ubus("ip_block", "show") == nil do
		os.execute("sleep 1")
	end
	return true
end

LoginAttempts:action("unblock_all", function(self)
	if self:is_ipblock_enabled() then
		util.ubus("ip_block", "clear")
		return self:ResponseOK()
	end
	local db = sqlite3.open(DB_PATH)
	if db then
		db:busy_timeout(WAIT_FOR_LOCK)
		db:exec("PRAGMA foreign_keys=ON")
		db:exec("DELETE FROM login_attempts")
		db:exec("PRAGMA foreign_keys=OFF")
		db:close()
	end
	self:ResponseOK()
end)

function LoginAttempts:db_get_row_intf(id)
	local db = sqlite3.open(DB_PATH)
	if not db then return {} end

	db:busy_timeout(WAIT_FOR_LOCK)

	local data = {}
	local query = "SELECT ifname FROM interfaces WHERE attempt_id = " .. id
	for row in db:rows(query) do
		data[#data + 1] = row[1]
	end
	db:close()
	return data
end

function LoginAttempts:db_get_row(id)
	local db = sqlite3.open(DB_PATH)
	if not db then return {} end

	db:busy_timeout(WAIT_FOR_LOCK)

	local stmt = db:prepare(
	"SELECT attempt_id, ip, mac, phone, port, destination_ip FROM login_attempts WHERE attempt_id = ? AND counter > 0")
	if not stmt then
		db:close()
		return {}
	end

	stmt:bind_values(id)

	local row = stmt:step()
	if row ~= sqlite3.ROW then
		db:close()
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Section: %s for service does not exist", id),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	local data = stmt:get_named_values()
	db:close()
	return data
end

function LoginAttempts:db_delete_row(id)
	local db = sqlite3.open(DB_PATH)
	if not db then return false end

	db:busy_timeout(WAIT_FOR_LOCK)

	db:exec("PRAGMA foreign_keys=ON")
	db:exec("DELETE FROM login_attempts WHERE attempt_id = " .. id)
	local success = db:changes() ~= 0
	db:exec("PRAGMA foreign_keys=OFF")
	db:close()
	return success
end

function LoginAttempts:unblock_entry(id)
	local enabled = self:is_ipblock_enabled()
	local data = self:db_get_row(id)
	if enabled and data.mac then
		local intf_data = self:db_get_row_intf(id)
		if #intf_data > 0 then
			util.ubus("ip_block", "unblock_mac", {
				mac = data.mac,
				interface = intf_data,
			})
			return true
		end
		return false
	elseif enabled and data.phone then
		util.ubus("ip_block", "unblock_phone", {
			phone = data.phone
		})
		return true
	elseif enabled then
		util.ubus("ip_block", "unblock", {
			ip = data.ip,
			port = data.port and tostring(data.port) or nil,
			destination_ip = data.destination_ip
		})
		return true
	end
	return self:db_delete_row(data.attempt_id)
end

function LoginAttempts:DELETE()
	if self.sid then
		if self:unblock_entry(self.sid) then
			self:ResponseOK({ id = tostring(self.sid) })
		end
		self:ResponseNotFound("Failed to delete entry")
	end

	local api_utils = require("api/api_utils")
	if type(self.arguments.data) ~= "nil" and not api_utils:is_array(self.arguments.data) then
		self:add_critical_error(
			STD_CODES.INVALID_STRUCT,
			"Invalid data structure, only an array is acceptable",
			"Validation",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end
	if api_utils:is_table_empty(self.arguments) or type(self.arguments.data) ~= "table" or api_utils:is_table_empty(self.arguments.data) then
		self:add_critical_error(
			STD_CODES.CONF_DEL_DISALLOWED,
			"Deletion of whole configuration is not allowed",
			"Validation"
		)
	end

	local deleted = {}
	for _, s in ipairs(self.arguments.data) do
		if type(s) ~= "string" then
			self:add_critical_error(
				STD_CODES.INVALID_OPT,
				"Value must be a string",
				"Validation"
			)
		end
		if self:unblock_entry(s) then
			table.insert(deleted, { id = tostring(s) })
		end
	end
	if #deleted == 0 then
		self:add_critical_error(
			STD_CODES.INVALID_STRUCT,
			"Data not provided",
			"Validation",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end
	self:ResponseOK(deleted)
end

function LoginAttempts:parse_params()
	local params = {}
	for i, _ in pairs(fields) do
		if self.query_parameters[i] then
			params[i] = self.query_parameters[i]
		end
	end
	return params
end

function LoginAttempts:validate_query_parameters()
	local query_parsing = require("api/query")

	local params_to_check = {
		limit = "number",
		offset = "number",
		sortby = "string",
		orderby = "string",
		search = "string",
		id = "number",
		ip = "string",
		mac = "string",
		destination_ip = "string",
		port = "string",
		proto = "string",
		counter = "number",
		iteration_count = "number",
		blocked_time = "string"
	}
	query_parsing:validate_query_format(params_to_check, self)
end

function LoginAttempts:GET_TYPE_config()
	self:validate_query_parameters()
	local limit = self.query_parameters.limit
	local offset = self.query_parameters.offset

	local sortby = self.query_parameters.sortby
	local orderby = self.query_parameters.orderby

	local search = self.query_parameters.search

	local params = self:parse_params()
	if search and params and api_utils:table_length(params) > 0 then
		self:add_critical_error(STD_CODES.INVALID_QUERY, "2 search options in one request are not allowed", HTTP_STATUS_CODES.BAD_REQUEST)
	end

	if self.sid then
		local valid, err = self.dt:uinteger(self.sid)
		if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "sid", HTTP_STATUS_CODES.NOT_FOUND) end
	end

	local data, metadata = self:query(self.sid, limit, offset, sortby, orderby, search, params)
	coroutine.yield({
		payload = {
			success = true,
			data = data,
			metadata = metadata,
		},
		code = "200"
	})
end

function LoginAttempts:query(id, limit, offset, sortby, orderby, search, params)
	local db = sqlite3.open(DB_PATH)
	local data = {}
	local amount = 0
	local metadata = {}
	local search_values = {}
	local indexes = {}
	local search_fields = { "attempt_id", "ip", "mac", "phone", "destination_ip", "port", "proto", "counter", "iteration_count" }
	if not db then return data end

	db:busy_timeout(WAIT_FOR_LOCK)

	local query =
	"SELECT attempt_id, ip, mac, phone, destination_ip, port, proto, counter, iteration_count, blocked_time FROM login_attempts WHERE counter > 0"
	if id then
		query = query .. " AND attempt_id = " .. id
	else
		if search then
			query = query ..
			" AND " .. table.concat(search_fields, " LIKE '%' || ? || '%' OR ") .. " LIKE '%' || ? || '%'"
			for _ = 1, #search_fields do
				search_values[#search_values + 1] = search
			end
		end

		if params and next(params) then
			for k, v in pairs(params) do
				table.insert(indexes, fields[k])
				search_values[#search_values + 1] = v:gsub("%%", "\\%%"):gsub("_", "\\_")
			end
			query = query .. " AND " .. table.concat(indexes, " LIKE ? ESCAPE '\\' OR ") .. " LIKE ? ESCAPE '\\'"
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
			query = query .. " ORDER BY attempt_id"
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
			local amount_query = "SELECT COUNT(1) FROM login_attempts WHERE counter > 0"
			if search then
				amount_query = amount_query ..
					" AND " .. table.concat(search_fields, " LIKE '%' || ? || '%' OR ") .. " LIKE '%' || ? || '%'"
			end
			if params and next(params) then
				amount_query = amount_query ..
					" AND " .. table.concat(indexes, " LIKE ? ESCAPE '\\' OR ") .. " LIKE ? ESCAPE '\\' "
			end
			local stmt = db:prepare(amount_query)
			if stmt then
				if search or (params and next(params)) then
					stmt:bind_values(unpack(search_values))
				end
				for rows_count in stmt:rows() do
					amount = amount + tonumber(rows_count[1])
				end
				stmt:finalize()
			end
		end

		if offset then
			local valid, err = self.dt:uinteger(offset)
			if not valid then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "offset") end
			if not limit then query = query .. " LIMIT ~0" end
			query = query .. " OFFSET " .. offset
		end
	end

	local stmt = db:prepare(query)
	if stmt then
		if not id and search or (params and next(params)) then
			stmt:bind_values(unpack(search_values))
		end
		for row in stmt:rows() do
			data[#data + 1] = {
				id = row[1] and tostring(row[1]) or nil,
				[".type"] = "entry",
				ip = row[2],
				mac = row[3],
				phone = row[4],
				destination_ip = row[5],
				port = row[6] and tostring(row[6]) or nil,
				proto = row[7],
				counter = row[8] and tostring(row[8]) or nil,
				iteration_count = row[9] and tostring(row[9]) or nil,
				blocked_time = row[10] and tostring(row[10]) or nil
			}
		end
		stmt:finalize()
	end
	db:close()

	if id and #data == 0 then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Section: %s for service does not exist", id),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	elseif id and #data == 1 then
		return data[1], nil
	end

	metadata = {
		total = limit and tostring(amount) or nil,
		limit = limit,
		offset = offset
	}
	if not limit then metadata = nil end
	return data, metadata
end

return LoginAttempts
