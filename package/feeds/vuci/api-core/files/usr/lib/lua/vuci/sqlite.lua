
local sqlite = require "lsqlite3"
local utl = require "vuci.util"
local fs = require "nixio.fs"
local type = type
local assert = assert
local table = table
local tonumber = tonumber
local pairs = pairs

module "vuci.sqlite"

function init()
	return _M
end

function create_where_clause(where_values)
	assert(type(where_values) == "table")

	local clauses = {}
	for key, _ in pairs(where_values) do
		table.insert(clauses, ("%s=:%s"):format(key, key))
	end

	if #clauses == 0 then
		return ""
	end

	return "WHERE " .. table.concat(clauses, " AND ")
end

function append_where_clause(where_clause, condition)
	if not condition or condition == "" then
		return where_clause
	end

	if where_clause == "" then
		return "WHERE " .. condition
	else
		return where_clause .. " AND " .. condition
	end
end

database = utl.class()

function database.__init__(self, opts)
	assert(type(opts) == "table")
	assert(type(opts.path) == "string")

	if fs.access(opts.path) then
		local flags = sqlite.OPEN_READWRITE
		if opts.create then
			flags = flags + sqlite.OPEN_CREATE
		end

		self.db = sqlite.open(opts.path, flags)
	end
end

function database.get_db(self)
	return self.db
end

function database.busy_timeout(self, timeout)
	if not self.db then
		return
	end

	self.db:busy_timeout(timeout)
end

function database.close(self)
	if self.db then
		self.db:close()
		self.db = nil
	end
end

function database.insert(self, query, values)
	return self:exec(query, values)
end

function database.select(self, query, values)
	if not self.db then
		return {}
	end

	local stmt = self.db:prepare(query)
	if not stmt then
		return {}
	end

	local list = {}
	if values then
		stmt:bind_names(values)
	end
	for row in stmt:nrows() do
		list[#list+1] = row
	end
	stmt:finalize()

	return list
end

function database.exec(self, query, values)
	if not self.db then
		return
	end

	local stmt = self.db:prepare(query)
	if not stmt then
		return
	end

	if values then
		stmt:bind_names(values)
	end

	stmt:step()
	stmt:finalize()
end

function database.row_count(self, table_name, where_clause, bind_values)
	if not self.db then
		return 0
	end

	local stmt = self.db:prepare("SELECT COUNT(*) as count FROM " .. table_name .. " " .. (where_clause or ""))
	if not stmt then
		return 0
	end

	if bind_values then
		stmt:bind_names(bind_values)
	end

	local first_row = nil
	for row in stmt:nrows() do
		first_row = row
		break
	end
	local row_count = first_row and tonumber(first_row.count)

	stmt:finalize()

	return row_count
end

function database.select_paginated(self, query, values, limit, offset)
	if limit then
		assert(type(limit) == "number")
		query = query .. (" LIMIT %s"):format(limit)
	end
	if offset then
		assert(type(offset) == "number")
		query = query .. (" OFFSET %s"):format(offset)
	end

	return self:select(query, values)
end
