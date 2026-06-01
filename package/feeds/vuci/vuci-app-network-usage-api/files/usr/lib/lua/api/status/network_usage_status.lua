local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local json = require("luci.jsonc")
local fs = require("nixio.fs")
local uci = require("vuci.uci").cursor()

local network_usage = FunctionService:new()

local function get_field(data, val, field)
	return val[data.columns[field]]
end

local function parse_columns(data)
	local columns = {}
	for idx, val in ipairs(data.columns or {}) do
		columns[val] = idx
	end
	data.columns = columns
	return data
end

local function convert_to_unix_timestamp(ts)
	local year = tonumber(ts:sub(1, 4)) or 0
	local month = tonumber(ts:sub(5, 6)) or 0
	local day = tonumber(ts:sub(7, 8)) or 0
	local hour = 0

	if #ts == 10 then
		hour = tonumber(ts:sub(9, 10)) or hour
	end

	local time_table = {
		year = year,
		month = month,
		day = day,
		hour = hour,
		min = 0,
		sec = 0,
	}

	return os.time(time_table)
end

local function is_month(ts)
	return os.date("%Y%m") == os.date("%Y%m", ts)
end

local function is_day(ts)
	return os.date("%Y%m%d") == os.date("%Y%m%d", ts)
end

local function is_week(ts)
	return os.date("%U") == os.date("%U", ts)
end

local function get_current_week_range()
	local current_day = os.date("*t")

	local day_of_week
	if current_day.wday == 1 then
		day_of_week = 7
	else
		day_of_week = current_day.wday - 1
	end

	local start_of_week = os.date("*t", os.time({
		year = current_day.year,
		month = current_day.month,
		day = current_day.day - (day_of_week - 1),
		hour = 0,
		min = 0,
		sec = 0
	}))
	local end_of_week = os.date("*t", os.time({
		year = current_day.year,
		month = current_day.month,
		day = current_day.day + (7 - day_of_week),
		hour = 23,
		min = 59,
		sec = 59
	}))

	if start_of_week.month ~= current_day.month then
		start_of_week = os.date("*t", os.time({
			year = current_day.year,
			month = current_day.month,
			day = 1,
			hour = 0,
			min = 0,
			sec = 0
		}))
	end
	if end_of_week.month ~= current_day.month then
		end_of_week = os.date("*t", os.time({
			year = current_day.year,
			month = current_day.month + 1,
			day = 0,
			hour = 23,
			min = 59,
			sec = 59
		}))
	end

	return start_of_week.day, end_of_week.day
end

function network_usage:parse_entries(data, func)
	local ret = {}

	for _, val in ipairs(data.data or {}) do
		local ts = convert_to_unix_timestamp(tostring(get_field(data, val, "ts")))
		if func(ts) then
			ret[tostring(ts)] = ret[tostring(ts)] or {}
			local new_entry = {
				src_ip = get_field(data, val, "ip"),
				dst_ip = get_field(data, val, "dst_ip"),
				src_mac = get_field(data, val, "mac"),
				layer7 = get_field(data, val, "layer7") or "other",
				conns = get_field(data, val, "conns"),
				rx_bytes = get_field(data, val, "rx_bytes"),
				rx_pkts = get_field(data, val, "rx_pkts"),
				tx_bytes = get_field(data, val, "tx_bytes"),
				tx_pkts = get_field(data, val, "tx_pkts"),
			}
			table.insert(ret[tostring(ts)], new_entry)
		end
	end
	return ret
end

function network_usage:append_entries_db(table_ts, data, entries)
	for _, val in ipairs(data or {}) do
		local new_entry = {}
		if entries.columns["mac"] then
			new_entry[entries.columns["mac"]] = val.src_mac
		end
		if entries.columns["ip"] then
			new_entry[entries.columns["ip"]] = val.src_addr
		end
		if table_ts and val.day and entries.columns["ts"] then
			new_entry[entries.columns["ts"]] = math.floor(tonumber(table_ts) / 100) * 100 + tonumber(val.day)
		end
		if entries.columns["conns"] then
			new_entry[entries.columns["conns"]] = val.count
		end
		if entries.columns["rx_bytes"] then
			new_entry[entries.columns["rx_bytes"]] = val.out_bytes
		end
		if entries.columns["rx_pkts"] then
			new_entry[entries.columns["rx_pkts"]] = val.out_pkts
		end
		if entries.columns["tx_bytes"] then
			new_entry[entries.columns["tx_bytes"]] = val.in_bytes
		end
		if entries.columns["tx_pkts"] then
			new_entry[entries.columns["tx_pkts"]] = val.in_pkts
		end
		if entries.columns["layer7"] then
			new_entry[entries.columns["layer7"]] = val.proto
		end
		table.insert(entries.data, new_entry)
	end
end

function network_usage:concat_entries(ret, data)
	for _, val in ipairs(data.data or {}) do
		local src_ip = get_field(data, val, "ip") or ""
		local src_mac = get_field(data, val, "mac") or ""
		local conns = tonumber(get_field(data, val, "conns")) or 0
		local rx_bytes = tonumber(get_field(data, val, "rx_bytes")) or 0
		local rx_pkts = tonumber(get_field(data, val, "rx_pkts")) or 0
		local tx_bytes = tonumber(get_field(data, val, "tx_bytes")) or 0
		local tx_pkts = tonumber(get_field(data, val, "tx_pkts")) or 0

		local key = src_ip .. src_mac
		ret[key] = ret[key] or {}
		ret[key].src_ip = src_ip
		ret[key].src_mac = src_mac
		ret[key].conns = conns + (ret[key].conns or 0)
		ret[key].rx_bytes = rx_bytes + (ret[key].rx_bytes or 0)
		ret[key].rx_pkts = rx_pkts + (ret[key].rx_pkts or 0)
		ret[key].tx_bytes = tx_bytes + (ret[key].tx_bytes or 0)
		ret[key].tx_pkts = tx_pkts + (ret[key].tx_pkts or 0)
	end
	return ret
end

function network_usage:get_data_from_db(db, entries, include_ts, query_clause, params)
	query_clause = query_clause or ""

	local tables = db:select("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'records_%'" .. (not include_ts and " or name='total_records'" or "") .. " ORDER BY name")
	for _, table in ipairs(tables or {}) do
		local table_ts = include_ts and table.name:match("_(%d+)") or nil
		if not include_ts or (table_ts and is_month(convert_to_unix_timestamp(table_ts))) then
			local table_data = db:select("SELECT * FROM " .. table.name .. query_clause, params)
			self:append_entries_db(table_ts, table_data, entries)
		end
	end
end

function network_usage:GET_TYPE_metrics()
	local data = {}

	if self.type ~= "status" then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end

	local result = util.exec("nlbw -c json 2> /dev/null")
	local entries = parse_columns(json.parse(util.trim(result or "")) or {})

	local db_path = uci:get("nlbwmon", "nlbwmon[0]", "database_directory") or "/usr/local/share/nlbwmon/data.db"
	local sqlite = require("vuci.sqlite").init()
	local db = sqlite.database({ path = db_path })

	if not entries.data and db:get_db() then
		entries.columns = {
			mac = 1,
			ip = 2,
			ts = 3,
			conns = 4,
			rx_bytes = 5,
			rx_pkts = 6,
			tx_bytes = 7,
			tx_pkts = 8,
			layer7 = 9,
		}
		entries.data = {}
	end

	if not entries.data then
		self:ResponseOK(data)
	end

	if self.sid == "day" then
		if db:get_db() then
			self:get_data_from_db(db, entries, true, " WHERE day = :day", { day = os.date("%d") })
		end
		data = self:parse_entries(entries, is_day)
	elseif self.sid == "week" then
		if db:get_db() then
			local start_day, end_day = get_current_week_range()
			self:get_data_from_db(db, entries, true, " WHERE day >= :start_day AND day <= :end_day", { start_day = start_day, end_day = end_day })
		end
		data = self:parse_entries(entries, is_week)
	elseif self.sid == "month" then
		if db:get_db() then
			self:get_data_from_db(db, entries, true)
		end
		data = self:parse_entries(entries, is_month)
	elseif self.sid == "total" then
		if db:get_db() then
			self:get_data_from_db(db, entries, false)
		end
		local entry_dict = {}
		entry_dict = self:concat_entries(entry_dict, entries)
		for _, value in pairs(entry_dict) do
			table.insert(data, value)
		end
	else
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end
	db:close()
	self:ResponseOK(data)
end

function network_usage:GET_TYPE_transfers()
	local data = {}

	if self.type ~= "status" then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end

	local result = util.exec("nlbw -c json -g family,host,dst_ip,layer7,ts 2> /dev/null")
	local initial = parse_columns(json.parse(util.trim(result or "")) or {})

	if not initial.data then
		self:ResponseOK(data)
	end

	if self.sid ~= "day" then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end

	data = self:parse_entries(initial, is_day)

	self:ResponseOK(data)
end

local delete_data = network_usage:action("delete_data", function (self)
	local data = self.arguments.data
	if data.type ~= "metrics" then
		util.exec("nlbw -c commit 2> /dev/null")
	end

	local db_path = uci:get("nlbwmon", "nlbwmon[0]", "database_directory") or "/usr/local/share/nlbwmon/data.db"
	if fs.access(db_path) and data.type ~= "transfers" then
		fs.remove(db_path)
	end
	self:ResponseOK("Data deleted successfully.")
end)
	local type = delete_data:option("type")
	type.require = true
	function type:validate(value)
		local types = { "metrics", "transfers", "all" }
		return self.dt:check_array(value, types)
	end

return network_usage
