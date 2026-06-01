
local FunctionService = require("api/FunctionService")
local info = FunctionService:new()
local fs = require "nixio.fs"
local nixio = require "nixio"
local util = require "vuci.util"
local json = require "luci.jsonc"
local pac = require("vuci.package_checker")
local nixio = require("nixio")
local util_tlt = require("vuci.util_tlt")

local output_file = "/tmp/loadavg_data"
local pid_file = "/tmp/run/loadavg_monitor.pid"
local signal_file = "/tmp/loadavg_signal"

local function generate_entry()
	local f = io.open("/proc/loadavg", "r")
	local load_1, load_5, load_15 = f:read("*l"):match("([^ ]+) ([^ ]+) ([^ ]+)")
	f:close()

	local timestamp = os.time()

	return string.format("[ %d, %.2f, %.2f, %.2f ],\n", timestamp,
                         load_1,
                         load_5,
                         load_15)
end

function info:GET_TYPE_load()
	if fs.access(pid_file) then
		fs.writefile(signal_file, "")
	else
		util_tlt.fork_exec("/sbin/load_avg_monitor", {})
	end

	local data = fs.readfile(output_file)
	if not data or data == "" then
		data = generate_entry()
	end
	data = "[" .. data .. "]"
	return self:ResponseOK(json.parse(data))
end

local function validate_query(self, query, query_param)
	if type(query) ~= "string" then
		return self:add_critical_error(
			STD_CODES.INVALID_QUERY,
			string.format("Malformed query parameter '%s'", query_param),
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end
end

function info:parse_params()
	local params = {
		uptime = true,
		uptime_seconds = true,
		localtime = true,
		memory = true,
		load = true,
		loadavg = true
	}
	if self.query_parameters then
		if self.query_parameters.data then
			validate_query(self, self.query_parameters.data, "data")
			for k in pairs(params) do
				params[k] = false
			end
			for _, v in ipairs(util.split(self.query_parameters.data, ",")) do
				v = string.gsub(v, "%s+", "")
				if params[v] ~= nil then
					params[v] = true
				else
					return nil
				end
			end
		elseif self.query_parameters.exclude then
			validate_query(self, self.query_parameters.exclude, "exclude")
			for _, v in ipairs(util.split(self.query_parameters.exclude, ",")) do
				v = string.gsub(v, "%s+", "")
				if params[v] ~= nil then
					params[v] = false
				else
					return nil
				end
			end
		end
	end

	return params
end

function info:GET_TYPE_packages()
	return self:ResponseOK(pac.list_control_files())
end

local function read_cpu_stats()
	local file_content = fs.readfile("/proc/stat")

	local total_time = 0
	local idle_time = 0

	for line in file_content:gmatch("[^\n]+") do
		if line:match("^cpu ") then
			local i = 1
			for value in line:gmatch("%S+") do
				local num_value = tonumber(value)
				if num_value then
					if i == 5 then
						idle_time = num_value
					end
					total_time = total_time + num_value
				end
				i = i + 1
			end
			break
		end
	end

	return total_time, idle_time
end

local function get_cpu_usage()
	local start_total, start_idle = read_cpu_stats()
	nixio.nanosleep(0, 400000000)
	local end_total, end_idle = read_cpu_stats()
	local total_diff = end_total - start_total
	local idle_diff = end_idle - start_idle
	local cpu_usage = ((total_diff - idle_diff) / total_diff) * 100
	return cpu_usage
end

function info:GET_TYPE_usage()
	local util_tlt = require "vuci.util_tlt"
	local st = require "vuci.status"
	local sysinfo = util.ubus("system", "info") or {}
	local stat = {}
	local params = self:parse_params()

	if not params then
		self:ResponseError({
			code = STD_CODES.INVALID_QUERY,
			source = "Query",
			error = "Query param key value is invalid, accepted values: ['uptime', 'uptime_seconds', 'localtime', 'memory', 'load', 'loadavg']"
		})
	end

	if params.uptime then
		stat.uptime = util_tlt.seconds_to_days_hours_minutes_seconds(tonumber(sysinfo.uptime))
	end

	if params.uptime_seconds then
		stat.uptime_seconds = tonumber(sysinfo.uptime)
	end

	if params.localtime then
		stat.localtime = os.time()
	end

	if params.memory then
		stat.memory = st.memory_usage(_, sysinfo)
	end

	if params.load then
		stat.load = {}
		stat.load.min1 = sysinfo.load[1] / 65535
		stat.load.min5 = sysinfo.load[2] / 65535
		stat.load.min15 = sysinfo.load[3] / 65535
	end

	if params.loadavg then
		stat.loadavg = get_cpu_usage()
		stat.loadavg = math.min(100, tonumber(stat.loadavg)) / 100
	end
	return self:ResponseOK(stat)
end

function info:GET_TYPE_parameters()
	local param = require("vuci.param")
	local params = param:get_params()

	if self._single then
		for _, p in ipairs(params) do
			if p.id == self.sid then
				return self:ResponseOK(p)
			end
		end
		return self:add_critical_error(STD_CODES.INVALID_SECTION, "Parameter not found", "id", 404, self.sid)
	end

	return self:ResponseOK(params)
end

return info
