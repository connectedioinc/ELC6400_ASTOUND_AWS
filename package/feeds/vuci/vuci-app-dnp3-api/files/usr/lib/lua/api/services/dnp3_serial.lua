local ConfigService = require("api/ConfigService")
local serial_utils = require("vuci.serial")
local dnp3_utils = require("api.services.dnp3_utils")
local util = require("vuci.util")

if not serial_utils:check_device_serial() then
	return nil
end

local function add_serial_options(s)
	local function get_serial_device(self)
		return self:get_abs_value(self.config, self.sid, "device") or
			(self.arguments.data and self.arguments.data.device)
	end
	local opts = {}

	opts.local_addr = s:option("local_addr")
	function opts.local_addr:validate(value)
		return self.dt:irange(value, 0, 65519)
	end

	opts.remote_addr = s:option("remote_addr")
	function opts.remote_addr:validate(value)
		return self.dt:irange(value, 0, 65519)
	end

	opts.timeout = s:option("timeout")
	function opts.timeout:validate(value)
		return self.dt:irange(value, 1, 60)
	end

	opts.device = s:option("device")
		function opts.device:validate(value)
			return self.dt:check_array(value, serial_utils:get_devices(true))
		end

	opts.baud_rate = s:option("baudrate")
	function opts.baud_rate:validate(value)
		local baudrates = serial_utils:get_baudrates(get_serial_device(self))
		return self.dt:check_array(value, baudrates)
	end

	opts.data_bits = s:option("databits")
	function opts.data_bits:validate(value)
		local databits = serial_utils:get_databits(get_serial_device(self))
		return self.dt:check_array(value, databits)
	end

	opts.flow_control = s:option("flowcontrol")
	function opts.flow_control:validate(value)
		local device = get_serial_device(self)
		local full_duplex = self:get_abs_value(self.config, self.sid, "full_duplex_enabled") or
			(self.arguments.data and self.arguments.data.full_duplex_enabled)

		local duplex = serial_utils:get_duplex(device)
		local options = serial_utils:get_flowcontrol(device)

		if not duplex.half and not duplex.full then
			return self.dt:check_array(value, options)
		end

		if full_duplex ~= "1" and full_duplex and full_duplex ~= "" then
			local filtered = {}
			for _, option in ipairs(options) do
				if option ~= "xon/xoff" then
					table.insert(filtered, option)
				end
			end
			options = filtered
		end

		return self.dt:check_array(value, options)
	end

	opts.parity = s:option("parity")
	function opts.parity:validate(value)
		local parity = serial_utils:get_parity(get_serial_device(self))
		return self.dt:check_array(value, parity)
	end

	opts.stop_bits = s:option("stopbits")
	function opts.stop_bits:validate(value)
		local stopbits = serial_utils:get_stopbits(get_serial_device(self))
		return self.dt:check_array(value, stopbits)
	end

	opts.time_duration = s:option("time_duration")
	function opts.time_duration:validate(value)
		return self.dt:irange(value, 1, 10000)
	end

	return opts
end

local function test_request(self)
	local data = self.arguments.data
	dnp3_utils.validate_request_overlap(self, data, "dnp3_serial_outstation")

	local result, errcode = dnp3_utils:send_serial_request(data, data)
	if errcode then
		self:ResponseOK("Tests failed")
	else
		self:ResponseOK({
			data = result
		})
	end
end

local serial = ConfigService:new { increment_name = true }

local serial_action = serial:action("test_request", test_request)

local serial_action_opts = add_serial_options(serial_action)
for _, opt in pairs(serial_action_opts) do
	opt.require = true
end

local data_type = serial_action:option("data_type")
data_type.require = true
function data_type:validate(value)
	return self.dt:check_array(value, { '1', '3', '20', '21', '30', '110', '40', '10' })
end

local index = serial_action:option("index")
index.require = true
function index:validate(value)
	return self.dt:irange(value, 0, 65535)
end

local count = serial_action:option("count")
count.require = true
function count:validate(value)
	local valid1, err1 = self.dt:irange(value, 0, 65535)
	if not valid1 then return false, err1 end
	local index = tonumber(self.arguments.data.index)
	if index and tonumber(value) < index then
		return false, 'End of the index must be greater or equal to the start. Values between 0 and 65535.'
	end
	return true
end

function serial:validate_address(local_address, serial)
	self.uci:foreach(self.main_config, "serial_client",
		function(s)
			if s.local_addr == local_address and s.device == serial and s['.name'] ~= self.sid then
				return false
			end
		end
	)
	return true
end

-- deletes instance requests
function serial:DELETE_after_data_hook()
	self:table_foreach(self.main_config, "instance",
		function(s)
			if s.client_id == self.sid then
				self:table_delete(self.main_config, s['.name'])
			end
		end
	)
end

local s = serial:section("dnp3_client", "serial_client")
function s:create_defaults()
	return {
		baudrate = "9600",
		databits = "8",
		stopbits = "1",
		parity = "none",
		flowcontrol = "none",
	}
end

local serial_opts = add_serial_options(s)
serial_opts.device.cfg_require = true
serial_opts.baud_rate.cfg_require = true
serial_opts.data_bits.cfg_require = true
serial_opts.stop_bits.cfg_require = true
serial_opts.parity.cfg_require = true
serial_opts.flow_control.cfg_require = true

local name = s:option("name")
name.maxlength = 32

local enabled = s:option("enabled")
enabled.require = { ["1"] = { "name", "device", "time_duration", "local_addr", "remote_addr", "integrity_period", "timeout" } }
function enabled:validate(value)
	return self.dt:is_bool(value)
end

local save_to_flash = s:option("save_to_flash")
function save_to_flash:validate(value)
	return self.dt:is_bool(value)
end

local integrity_period = s:option("integrity_period")
function integrity_period:validate(value)
	return self.dt:irange(value, 1, 60)
end

serial_utils.append_duplex_option(s)

-- STATUS

function serial:GET_TYPE_status()
	local res = {}

	local dnp3_status = util.ubus("dnp3_client", "status")
	if dnp3_status then
		res.uptime = dnp3_status.uptime
		res.clients = {}
		local client_statuses = {}
		for _, client_status in pairs(dnp3_status.clients) do
			client_statuses[client_status.id] = client_status
		end
		self:table_foreach(self.main_config, "serial_client", function(_s)
			if _s.enabled == "1" and client_statuses[_s[".name"]] then
				table.insert(res.clients, client_statuses[_s[".name"]])
			end
		end)
	end

	return self:ResponseOK(res)
end

-- End of status

function serial:POST_validate_section_hook()
	local device = self.current_data_block.device
	serial_utils:handle_duplex(self)
	serial_utils:assert_device_is_available(self, device)
end

function serial:PUT_validate_section_hook()
	local device = self:get_abs_value(self.main_config, self.sid, "device")

	serial_utils:assert_device_is_available(self, device)
	serial_utils:handle_duplex(self)
	if type(device) == "string" and device:find("usb") then
		serial_utils:assert_device_is_connected(self, device)
	end
end

function serial:UPDATE_before_commit_hook()
	local local_address_lookup = {}
	self:table_foreach(self.config, "serial_client", function(config)
		if not (config.device and config.local_addr) then return end

		local key = config.device .. ":" .. config.local_addr
		if local_address_lookup[key] then
			self:add_critical_error(
				STD_CODES.INVALID_STRUCT,
				("Current Local Address already set in the same layer."):format(),
				"Validation"
			)
		end
		local_address_lookup[key] = true
	end)
end

serial.POST_before_commit_hook = serial.UPDATE_before_commit_hook
serial.PUT_before_commit_hook = serial.UPDATE_before_commit_hook

return serial
