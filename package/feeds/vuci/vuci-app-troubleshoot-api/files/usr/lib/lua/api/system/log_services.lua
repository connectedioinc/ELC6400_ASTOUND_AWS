local fs = require("nixio.fs")
local util = require("vuci.util")

local ConfigService = require("api/ConfigService")
local log_services = ConfigService:new()

local SERVICE_LOG_DIR = "/var/run/logd/services/"

function log_services:find_service_log_files(service_name)
	local log_files = {}
	if not fs.access(SERVICE_LOG_DIR) then
		return log_files
	end

	local escaped_name = service_name:gsub("([%^%$%(%)%%%.%[%]%*%+%-%?])", "%%%1")

	local pattern = "^" .. escaped_name .. "@?[%w_%-]*%.log%.?%d*$"
	for file in fs.dir(SERVICE_LOG_DIR) do
		if file:match(pattern) then
			table.insert(log_files, file)
		end
	end

	return log_files
end

function log_services:sort_log_files(log_files, service_name, newest_first)
	newest_first = (newest_first == nil) and true or newest_first

	table.sort(log_files, function(a, b)
		if a == service_name .. ".log" then return newest_first end
		if b == service_name .. ".log" then return not newest_first end

		local num_a = tonumber(a:match(service_name .. "%.(%d+)%.log")) or 0
		local num_b = tonumber(b:match(service_name .. "%.(%d+)%.log")) or 0

		if newest_first then
			return num_a < num_b
		else
			return num_a > num_b
		end
	end)

	return log_files
end

function log_services:combine_log_files(log_files, chronological_order)
	local combined_log = ""
	local files_to_process = {}

	if chronological_order then
		for i = #log_files, 1, -1 do
			table.insert(files_to_process, log_files[i])
		end
	else
		files_to_process = log_files
	end

	for _, file in ipairs(files_to_process) do
		local file_path = SERVICE_LOG_DIR .. file

		local content = fs.readfile(file_path)
		if content then
			if combined_log ~= "" then
				combined_log = combined_log
			end
			combined_log = combined_log .. content
		end
	end

	return combined_log
end

local log_service_section = log_services:section("log", "logservice")

local function delete_logfiles(self)
	local service = self:table_get(self.config, self.sid, "name")
	if not service then
		return
	end
	local log_files = self:find_service_log_files(service)
	for _, lfile in ipairs(log_files) do
		table.insert(self._removed_files, { file = SERVICE_LOG_DIR .. lfile, type = "default" })
	end
end

local opt_name = log_service_section:option("name")
	opt_name.maxlength = 255
	function opt_name:validate(value)
		if value:find("[/\\]") or value:find("%.%.") then
			return false, "Invalid name: path characters are not allowed", STD_CODES.UCI_CREATE_ERROR
		end
		self:table_foreach(self.config, "logservice", function(s)
			if s.name == value and s[".name"] ~= self.sid then
				self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "name '" .. value .. "' already exists")
			end
		end)
		return self.dt:string(value)
	end
	function opt_name:set(value)
		delete_logfiles(self)
		self:table_set(self.config, self.sid, self.api_key, value)
	end

local log_levels = log_service_section:option("log_levels", { list = true })
	function log_levels:validate(value)
		local numberized_value = tonumber(value)
		if not numberized_value or numberized_value < 0 or numberized_value > 7 then
			return false, "Log levels must be between 0 and 7"
		end
		return true
	end

function log_services:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

log_services.DELETE_before_section_delete_hook = delete_logfiles

function log_services:GET_TYPE_status()
	local chronological_order = true
	if not self.sid or self.sid == "" then
		return self:ResponseError("Invalid or missing service name")
	end

	if not fs.access(SERVICE_LOG_DIR) then
		return self:ResponseOK({
			service = name,
			log = "",
			message = "Service log directory not found"
		})
	end

	local name = self:table_get(self.config, self.sid, "name")
	if not name then
		return self:ResponseError("Service name not found in configuration")
	end

	local log_files = self:find_service_log_files(name)

	if #log_files == 0 then
		return self:ResponseOK({
			service = name,
			log = "",
			message = "No log files found"
		})
	end

	local grouped_logs = {}
	local has_instances = false

	for _, file in ipairs(log_files) do
		local instance = file:match(name .. "@([%w_%.-]+)%.log")
		if not instance then
			instance = file:match(name .. "@([%w_%.-]+)%.%d+%.log")
		end

		if instance then
			has_instances = true
			grouped_logs[instance] = grouped_logs[instance] or {}
			table.insert(grouped_logs[instance], file)
		else
			grouped_logs["_base"] = grouped_logs["_base"] or {}
			table.insert(grouped_logs["_base"], file)
		end
	end

	local result_log

	if has_instances then
		result_log = {}
		for inst, files in pairs(grouped_logs) do
			local sorted = self:sort_log_files(files, name, true)
			local combined = self:combine_log_files(sorted, chronological_order)
			result_log[inst] = combined
		end
	else
		local sorted = self:sort_log_files(log_files, name, true)
		result_log = self:combine_log_files(sorted, chronological_order)
	end

	return self:ResponseOK({
		service = name,
		log = result_log
	})
end

return log_services
