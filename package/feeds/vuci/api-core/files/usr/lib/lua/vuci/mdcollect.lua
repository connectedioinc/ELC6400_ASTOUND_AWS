local util = require("vuci.util")

local mdcollect = {}

-- Available intervals
---@enum mdcollect.INTERVALS
mdcollect.INTERVALS = {
	HOUR = "hour",
	DAY = "day",
	WEEK = "week",
	MONTH = "month",
	YEAR = "year",
	TOTAL = "total",
	CUSTOM = "custom"
}

local SECONDS_IN_HOUR = 3600
local SECONDS_IN_DAY = 86400
local SECONDS_IN_WEEK = 604800

-- Helper to get the last day of the month
-- works by getting the first day of the next month and moves one day backwards
---@param now number Timestamp to get the last month day of
---@return number time Timestamp the last months day
local function last_month_day(now)
	now = now or os.time()
	local date = os.date("*t", now)
	date.day = 1
	date.month = date.month + 1
	date = os.date("*t", os.time(date))
	date.day = date.day - 1
	return os.time(date)
end

--- Returns a start and an end timestamp of a given interval
---@param interval mdcollect.INTERVALS Interval
---@return integer time_from Timestamp of the start of interval
---@return integer time_to Timestamp of the end of interval
function mdcollect:get_time(interval)
	local time_from
	local time_to = os.time()

	if interval == self.INTERVALS.HOUR then
		time_from = time_to - SECONDS_IN_HOUR
	elseif interval == self.INTERVALS.DAY then
		time_from = time_to - SECONDS_IN_DAY
	elseif interval == self.INTERVALS.WEEK then
		time_from = time_to - SECONDS_IN_WEEK
	elseif interval == self.INTERVALS.MONTH then
		time_from = time_to - 2592000 --Last 30 days
	elseif interval == self.INTERVALS.YEAR then
		time_from = time_to - 31536000 --Last 365 days
	else
		time_from = 0
	end

	return time_from, time_to
end

-- Returns a start and an end  current timestamp of a given interval.
-- e.g if a day interval is given it will return the timestamp from the start of this day to the current time
---@param interval any
---@return integer
---@return number
function mdcollect:get_time_current(interval)
	local time_now = os.time()
	local time_from, time_to

	local t = os.date("*t", time_now)
	t.hour = 0
	t.min = 0
	t.sec = 0
	if interval == self.INTERVALS.HOUR then
		t = os.date("*t", time_now)
		t.min = 0
		t.sec = 0
		time_from = os.time(t)
		t.min = 59
		t.sec = 59
		time_to = os.time(t)
	elseif interval == self.INTERVALS.DAY then
		time_from = os.time(t)
		t.hour = 23
		t.min = 59
		t.sec = 59
		time_to = os.time(t)
	elseif interval == self.INTERVALS.WEEK then
		local week_day = tonumber(os.date("%w"))
		week_day = (week_day ~= 0 and week_day or 7) - 1
		t.day = t.day - week_day
		time_from = os.time(t)
		t.day = t.day + week_day
		t.hour = 23
		t.min = 59
		t.sec = 59
		time_to = os.time(t)
	elseif interval == self.INTERVALS.MONTH then
		t.day = 1
		time_from = os.time(t)
		t.hour = 23
		t.min = 59
		t.sec = 59
		time_to = last_month_day(os.time(t))
	elseif interval == self.INTERVALS.YEAR then
		t.year = tonumber(os.date("%Y"))
		t.month = 1
		t.day = 1
		t.hour = 0
		t.minute = 0
		t.sec = 0
		time_from = os.time(t)
		t.month = 12
		t.day = 31
		t.hour = 23
		t.minute = 59
		t.sec = 59
		time_to = os.time()
	else
		time_from = 0
	end

	return time_from, time_to
end

function mdcollect:get_usage_raw(modem, sim, interface, device, interval, current, range)

	local data_points = {}
	local time_from, time_to

	if range then
		time_from, time_to = range.from, range.to
	elseif current == true then
		time_from, time_to = self:get_time_current(interval)
	else
		time_from, time_to = self:get_time(interval)
	end

	local data

	if modem or sim then
		data = util.ubus("mdcollect", "get_raw", { from = time_from, to = time_to, modem = modem, sim = sim and tonumber(sim) or nil })
	elseif interface then
		data = util.ubus("mdcollect", "get_raw", { from = time_from, to = time_to, iface = interface })
	elseif device then
		data = util.ubus("mdcollect", "get_raw", { from = time_from, to = time_to, device = device })
	else
		data = util.ubus("mdcollect", "get_raw", { from = time_from, to = time_to, modem = "all_mobile_modems" })
	end

	if not data or not data.used_data or #data.used_data == 0 then
		return {}
	else
		data = data.used_data
		table.sort(data, function(a, b) return a.time < b.time end)

		for _, point in ipairs(data) do
			table.insert(data_points, { point.time, point.rx, point.tx })
		end

		return data_points
	end
end

--- Aggregates data into bigger chunks
---@param data any Data to aggregate
---@param interval mdcollect.INTERVALS Intervals into which aggregate the data
---@return any aggregated_data
function mdcollect:aggregate_data(data, interval)

	local aggregated_data = {}
	local timestamp

	local point_map = {}
	for _, point in ipairs(data) do
		local date = os.date("*t", point[1])
		if interval == self.INTERVALS.HOUR then
			timestamp = os.time({
				year = date.year,
				month = date.month,
				day = date.day,
				hour = date.hour
			})
		elseif interval == self.INTERVALS.DAY or interval == self.INTERVALS.TOTAL then
			timestamp = os.time({
				year = date.year,
				month = date.month,
				day = date.day,
				hour = 0
			})
		elseif interval == self.INTERVALS.WEEK then
			local week = math.floor((date.day-1) / 7)
			timestamp = os.time({
				year = date.year,
				month = date.month,
				day = 1 + 7*week,
				hour = 0
			})
		elseif interval == self.INTERVALS.MONTH then
			timestamp = os.time({
				year = date.year,
				month = date.month,
				day = 1,
				hour = 0
			})
		elseif interval == self.INTERVALS.YEAR  then
			timestamp = os.time({
				year = date.year,
				month = 1,
				day = 1,
				hour = 0
			})
		else return data end

		local k = tostring(timestamp)
		point_map[k] = point_map[k] and {
			point_map[k][1],
			point_map[k][2] + point[2],
			point_map[k][3] + point[3],
		} or { timestamp, point[2], point[3] }

	end

	for _, v in pairs(point_map) do table.insert(aggregated_data, v) end
	table.sort(aggregated_data, function(a, b) return a[1] < b[1] end)
	return aggregated_data
end

function mdcollect:get_auto_scale(data)

	if not data or #data < 2 then return nil end

	local hour_threshold = 168
	local day_threshold = 90
	local month_threshold = 36

	local timestamp_gap = tonumber(os.time(os.date("!*t"))) - data[1][1]

	if timestamp_gap/SECONDS_IN_HOUR <= hour_threshold then
		return self.INTERVALS.HOUR
	elseif timestamp_gap/SECONDS_IN_DAY <= day_threshold then
		return self.INTERVALS.DAY
	elseif timestamp_gap/(SECONDS_IN_WEEK*4) <= month_threshold then
		return self.INTERVALS.MONTH
	else
		return self.INTERVALS.YEAR
	end
end

return mdcollect