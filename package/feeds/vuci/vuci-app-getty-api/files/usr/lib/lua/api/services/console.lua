local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local util = require("vuci.util")
local fs = require "nixio.fs"
local board = require("vuci.board")

local Console = ConfigService:new({
	increment_name = true
})

if not board:has_serial_without_mbus() then
	return nil
end

local RSConsole = Console:section("rs_console", "console")
function RSConsole:create_defaults()
	return {
		enabled = "0",
		baudrate = "9600",
		databits = "8",
		stopbits = "1"
	}
end

	local opt_device = RSConsole:option("device")
		opt_device.cfg_require = true
		function opt_device:validate(value)
			if value and value == self:table_get(self.config, self.sid, self.api_key) then
				return true -- If its the same one then its valid (This is mainly for disconnected device configs)
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

	local opt_enabled = RSConsole:option("enabled")
		opt_enabled.require = { ["1"] = { "device", "parity", "flowcontrol" } }
		opt_enabled.cfg_require = true
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_baudrate = RSConsole:option("baudrate")
		opt_baudrate.cfg_require = true
		function opt_baudrate:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_baudrates(device))
		end

	local opt_databits = RSConsole:option("databits")
		function opt_databits:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_databits(device))
		end

	local opt_stopbits = RSConsole:option("stopbits")
		function opt_stopbits:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_stopbits(device))
		end

	local opt_parity = RSConsole:option("parity")
		function opt_parity:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_parity(device))
		end

	local opt_flowcontrol = RSConsole:option("flowcontrol")
		function opt_flowcontrol:validate(value)
			local device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_flowcontrol(device))
		end

	local opt_name = RSConsole:option("name")
		opt_name.maxlength = 200

serial.append_duplex_option(RSConsole)

-- STATUS

function Console:GET_TYPE_status()
	local function read_process_start_time(path)
		local proc_start_time
		if fs.access(path) then
			local proc_stat = fs.readfile(path)
			proc_start_time = util.split(proc_stat, " ")[22]
		end
		return proc_start_time
	end
	local res = {}

	local console_service = util.ubus("service", "list", { name = "rs_console" })
	if console_service and console_service.rs_console and console_service.rs_console.instances then
		local system_uptime_stats = fs.access("/proc/uptime") and fs.readfile("/proc/uptime")
		local self_start_time = read_process_start_time("/proc/self/stat")
		if system_uptime_stats and self_start_time then
			local instances_by_id = {}
			for _, instance in pairs(console_service.rs_console.instances) do
				instance.exit_code = instance.exit_code ~= 0 and instance.exit_code or nil
				instances_by_id[instance.data.config_id] = instance
			end
			self:table_foreach(self.main_config, "console", function(s)
				local config_id = s[".name"]
				local current_instance = instances_by_id[config_id]
				if s.enabled == "1" and current_instance then
					local instance_status = { section = config_id }
					if current_instance.exit_code or not current_instance.pid then
						instance_status.error_code = current_instance.exit_code or 1
					else
						local instance_start_time = read_process_start_time("/proc/" .. current_instance.pid .. "/stat")
						if instance_start_time then
							local truncated_current_system_uptime = util.split(system_uptime_stats, ".")[1]
							local ticks_in_sec = util.round(self_start_time / truncated_current_system_uptime)
							local proc_uptime = util.round(instance_start_time / ticks_in_sec)
							local instance_uptime = truncated_current_system_uptime - proc_uptime
							local ok, _ = self.dt:ufloat(tostring(instance_uptime))
							if ok then
								instance_status.uptime = instance_uptime
							end
						end
					end
					table.insert(res, instance_status)
				end
			end)
		end
	end

	return self:ResponseOK(res)
end

-- End of status

function Console:POST_validate_section_hook()
	local device = self.current_data_block.device
	serial:assert_device_is_available(self, device)
	serial:handle_duplex(self)
end

function Console:PUT_validate_section_hook()
	local device = self:get_abs_value(self.main_config, self.sid, "device")

	serial:assert_device_is_available(self, device)
	if device and type(device) == "string" and device:find("usb") then
		serial:assert_device_is_connected(self, device)
	end
	serial:handle_duplex(self)
end


return Console
