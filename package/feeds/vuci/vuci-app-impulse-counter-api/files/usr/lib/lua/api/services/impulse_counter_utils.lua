local fs = require("nixio.fs")
local io = require("vuci.io")
local sqlite = require("vuci.sqlite")
local util = require("vuci.util")
local utils = {}

utils.db_path = "/var/run/icounter/impulse_counter.db"

function utils.open_db()
	return sqlite.database({
		path = utils.db_path
	})
end

function utils.list_available_inputs()
	local io_info = io:ioman_info() or {}

	local io_input_options = {}
	for _, single_pin in ipairs(io_info) do
		if single_pin.type == "gpio" and (single_pin.direction == "in" or not single_pin.direction) and single_pin.counter_support ~= false then
			table.insert(io_input_options, single_pin.name)
		end
	end

	return io_input_options
end

function utils.clear_db()
	if not fs.access(utils.db_path) then
		return false, "Database does not exist."
	end

	local db = utils.open_db()
	db:exec("DELETE FROM count_data")
	db:close()

	for _, pin in pairs(utils.list_available_inputs()) do
		util.ubus("ioman.gpio." .. pin, "counter")
		util.ubus("ioman.gpio." .. pin, "update", { count = 0 })
	end

	return true
end

function utils.list_db_entries(filter)
	local current_time = os.time()

	local filter_period = {
		day = 24 * 60 * 60,
		week = 7 * 24 * 60 * 60,
		month = 30 * 24 * 60 * 60
	}

	local sql = "SELECT * FROM count_data"
	if filter and filter_period[filter] then
		if filter == "week" or filter == "month" then
			local end_of_today = os.date("*t", current_time)
			assert(type(end_of_today) == "table")

			end_of_today.hour = 23
			end_of_today.min = 59
			end_of_today.sec = 59
			current_time = os.time(end_of_today)
		end
		local start_time = current_time - filter_period[filter]
		sql = string.format("%s WHERE timestamp >= %d", sql, start_time)
	end

	local db = utils.open_db()
	local entries = db:select(sql)
	db:close()

	return entries
end

return utils
