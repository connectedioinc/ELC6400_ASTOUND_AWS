local ConfigService = require("api/ConfigService")
local fs = require("nixio.fs")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")

local default_logfile = "/usr/local/var/log/messages"
local safety_size = 200 -- KB

local flags = {
	create = false,
	delete = false,
	general_section = "global"
}

local logging = ConfigService:new(flags)
function logging:create_defaults()
	return {
		log_size = "200",
		log_compress = "0"
	}
end

	local global = logging:section("log", "global")
		-- DEPRECATED
		local log_size = global:option("log_size")
			function log_size:validate(value)
				return self.dt:range(value, 10, 500)
			end
			function log_size:get(value)
				local size_opt = self:getter_wrapped_abs_value(self.config, self.sid, "size")
				if size_opt then return nil end
				return value
			end
		-- DEPRECATED
		local log_buffer_size = global:option("log_buffer_size")
			function log_buffer_size:validate(value)
				local valid, err = self.dt:uinteger(value)
				if not valid then return false, err end

				local log_type = self:getter_wrapped_abs_value(self.config, self.sid, "log_type")
				if log_type == "file" then
					local statvfs = fs.statvfs(util_tlt.get_mount_point(self:table_get(self.config, self.sid, "log_file") or default_logfile))
					local flash_free = (statvfs.bavail * statvfs.frsize) / 1024

					if tonumber(value) >= flash_free - safety_size then
						return false, "Not enough flash space on the device.", 104
					end
				elseif log_type == "circular" then
					local meminfo = util.ubus("system", "info").memory or { free = 0}
					local ram_free = meminfo.free / 1024
					if tonumber(value) >= ram_free - safety_size then
						return false, "Not enough RAM space on the device.", 105
					end
				end
				return true
			end
			function log_buffer_size:get(value)
				local size_opt = self:getter_wrapped_abs_value(self.config, self.sid, "size")
				if size_opt then return nil end
				return value
			end

		local log_level = global:option("log_levels", {list = true})
		log_level.list_length = 8
		log_level.min_list_length = 1
		log_level.maxlength = 1
			function log_level:validate(value)
				local numberized_value = tonumber(value)
				if not numberized_value or numberized_value < 0 or numberized_value > 6 then
					return false, "Log levels must be between 0 and 6"
				end
				return true
			end

		local size = global:option("size")
			size.require = { "log_type" }
			function size:validate(value)
				local valid, err = self.dt:uinteger(value)
				if not valid then return false, err end

				local log_type = self:getter_wrapped_abs_value(self.config, self.sid, "log_type")
				if log_type == "file" then
					local statvfs = fs.statvfs(util_tlt.get_mount_point(self:table_get(self.config, self.sid, "log_file") or default_logfile))
					local flash_free = (statvfs.bavail * statvfs.frsize) / 1024

					if tonumber(value) >= flash_free - safety_size then
						return false, "Not enough flash space on the device.", 104
					end
				elseif log_type == "circular" then
					local meminfo = util.ubus("system", "info").memory or { free = 0 }
					local ram_free = meminfo.free / 1024
					if tonumber(value) >= ram_free - safety_size then
						return false, "Not enough RAM space on the device.", 105
					end
				end
				return true
			end
			function size:get()
				return self:table_get(self.main_config, self.sid, "log_size_limit")
			end
			function size:set(value)
				self:table_set(self.main_config, self.sid, "log_size_limit", value)
				self:table_set(self.main_config, self.sid, "log_size", "")
				self:table_set(self.main_config, self.sid, "log_buffer_size", "")
			end

		local log_compress = global:option("log_compress")
			function log_compress:validate(value)
				return self.dt:is_bool(value)
			end

		local log_ip = global:option("log_ip")
			function log_ip:validate(value)
				return self.dt:host(value)
			end
			function log_ip:get()
				return self:table_get(self.main_config, "default", self.api_key)
			end
			function log_ip:set(value)
				return self:table_set(self.main_config, "default", self.api_key, value)
			end

		local log_port = global:option("log_port")
			function log_port:validate(value)
				return self.dt:port(value)
			end
			function log_port:get()
				return self:table_get(self.main_config, "default", self.api_key)
			end
			function log_port:set(value)
				return self:table_set(self.main_config, "default", self.api_key, value)
			end


		local log_proto = global:option("log_proto")
			function log_proto:validate(value)
				return self.dt:check_array(value, { "udp", "tcp" })
			end
			function log_proto:get()
				return self:table_get(self.main_config, "default", self.api_key)
			end
			function log_proto:set(value)
				return self:table_set(self.main_config, "default", self.api_key, value)
			end

		local log_hostname = global:option("log_hostname")
			function log_hostname:validate(value)
				return self.dt:is_bool(value)
			end
			function log_hostname:get()
				return self:table_get(self.main_config, "default", self.api_key)
			end
			function log_hostname:set(value)
				self:table_foreach(self.main_config, "remote_logger", function(s)
					self:table_set(self.main_config, s[".name"], self.api_key, value)
				end)
			end

		local remote_log = global:option("remote_logger", { list = true })
			function remote_log:validate(value)
				local values = util.split(value, ",")
				if not values or not values[1] or not values[2] then
					return false, "Incorrect option format, accepted format: 'log_ip:log_port,log_proto'"
				end
				local res, msg = self.dt:hostipport(values[1])
				if not res then
					return false, msg
				end
				res, msg = self.dt:check_array(values[2], { "udp", "tcp" })
				if not res then
					return false, msg
				end
				return true
			end
			function remote_log:set(value)
				local log_hostname = self:getter_wrapped_abs_value(self.config, self.sid, "log_hostname")
				if #value > 3 then
					self:add_error(STD_CODES.UCI_CREATE_ERROR, "Up to 3 remote log servers can be used.")
				end
				-- Delete old ones
				local old_values = {}
				self:table_foreach(self.main_config, "remote_logger", function(s)
					table.insert(old_values, s[".name"])
				end)
				if old_values then
					for _, v in ipairs(old_values) do
						self:table_delete(self.main_config, v)
					end
				end

				if #value == 0 or value == "" then
					self:table_section(self.main_config, "remote_logger", "default", {log_ip = "", log_port = "", log_proto = "", log_hostname = log_hostname or ""})
					return
				end

				-- Set new ones
				for i, v in ipairs(value) do
					local values = util.split(v, ",")
					local port = string.sub(string.match(values[1], ":%d+$"), 2)
					local host = string.gsub(string.sub(values[1], 1, -(#port+2)), "[%[%]]", "")
					local new_logger = i == 1 and "default" or "logger_"..tostring(i)
					self:table_section(self.main_config, "remote_logger", new_logger, {
						log_ip = host,
						log_port = port,
						log_proto = values[2],
						log_hostname = log_hostname
					})
				end
			end
			function remote_log:get(_)
				local values = {}
				self:table_foreach(self.main_config, "remote_logger", function(s)
					local ip = self:table_get(self.main_config, s[".name"], "log_ip")
					if ip and string.match(ip, ":")  then
						ip = "["..ip.."]"
					end
					local port = self:table_get(self.main_config, s[".name"], "log_port")
					local proto = self:table_get(self.main_config, s[".name"], "log_proto")
					if not ip or not port or not proto then return end
					if ip == "" or port == "" or proto == "" then return end
					table.insert(values, ip..":"..port..","..proto)
				end)
				return #values > 0 and values or nil
			end

		local log_type = global:option("log_type")
			log_type.require = { ["file"] = { "log_compress" }}
			function log_type:validate(value)
				return self.dt:check_array(value, { "circular", "file" })
			end

			function log_type:set(value)
				if value == "file" then
					self:table_set(self.config, self.sid, "log_file", default_logfile)
				else
					self:table_delete(self.config, self.sid, "log_file")
				end
			end

			function log_type:get(_)
				local log_file = self:table_get(self.config, self.sid, "log_file")
				if log_file then
					return "file"
				end
				return "circular"
			end

		local log_file = global:option("log_file")
		log_file.readonly = true

function logging:PUT_before_commit_hook()
	local size_cfg = self:get_data_from_arguments(self.sid, "size")
	if size_cfg == "" then size_cfg = nil end
	local log_location = self:get_abs_value(self.config, self.sid, "log_file")
	local log_type = log_location and "file" or "circular"
	log_location = log_location or default_logfile
	local log_size_abs = self:get_abs_value(self.config, self.sid, "log_size")
	local log_buffer_size_abs = self:get_abs_value(self.config, self.sid, "log_buffer_size")
	if not size_cfg and log_type == "circular" then
		if log_buffer_size_abs then
			size_cfg = log_buffer_size_abs
		elseif log_size_abs then
			size_cfg = log_size_abs
		else
			size_cfg = self.uci:get(self.config, self.sid, "log_size_limit")
		end
		self:table_delete(self.main_config, self.sid, "log_buffer_size")
	elseif not size_cfg and log_type == "file" then
		if log_size_abs then
			size_cfg = log_size_abs
		elseif log_buffer_size_abs then
			size_cfg = log_buffer_size_abs
		else
			size_cfg = self.uci:get(self.config, self.sid, "log_size_limit")
		end
		self:table_delete(self.main_config, self.sid, "log_size")
	end
	local size_requirement = size_cfg
	if fs.access(log_location) then
		local log_info = fs.stat(log_location) or {}
		if type(log_info.size) == "number" then
			size_requirement = tonumber(size_cfg) - (log_info.size / 1024)
		end
	end
	local statvfs = fs.statvfs(util_tlt.get_mount_point(log_location))
	local free_space = (statvfs.bavail * statvfs.frsize) / 1024
	if free_space <= size_requirement + safety_size then
		self:add_critical_error(STD_CODES.NO_SPACE, "Cannot save logs in Flash Memory. Not enough free space.")
	end
	self:table_set(self.main_config, self.sid, "log_size_limit", size_cfg)
end

function logging:delete_logfile()
	local logfile = self:table_get(self.main_config, "global", "log_file") or default_logfile
	local deleted = false

	if logfile and fs.access(logfile) then
		fs.remove(logfile)
		if not fs.access(logfile) then deleted = true end
		local dir = fs.dirname(logfile)
		local logfile_name = string.sub(logfile, #dir+2)
		for file in fs.dir(dir) do
			if string.match(file, "^"..logfile_name.."%.%d+%.gz$") or string.match(file, "^"..logfile_name.."%.%d+") then
				fs.remove(dir.."/"..file)
			end
		end
		util.ubus("rc", "init", { name = "log", action = "restart" })
	else return self:ResponseNotFound("Log file is not found.") end

	if deleted then return self:ResponseOK({ message = "Log file deleted."})
	else self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Unexpected error occurred.", "Request") end
end

logging:action("delete_log", logging.delete_logfile)

function logging:GET_TYPE_status()
	local logfile = self:table_get(self.main_config, "global", "log_file") or default_logfile
	if logfile and fs.access(logfile) then
		if fs.stat(logfile).size > 0 then
			return self:ResponseOK({	exists = "1", logfile_not_empty = "1" })
		else
			return self:ResponseOK({	exists = "1", logfile_not_empty = "0" })
		end
	else
		return self:ResponseOK({ exists = "0" })
	end
end

return logging
