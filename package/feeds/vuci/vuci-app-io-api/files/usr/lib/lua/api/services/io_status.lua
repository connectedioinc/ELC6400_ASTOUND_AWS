local board = require("vuci.board")
if not board:has_ios() then return nil end

local FunctionService = require("api/FunctionService")
local nixio = require("nixio")
local util = require("vuci.util")
local io = require("vuci.io")

local LOCK_FILE = "/var/lock/io_change_state_%s.lock"
local MSG_CODES = {
	DELAY = 1,
	TIME = 2,
	DELAY_AND_TIME = 3,
}
local ERR_CODES = {
	BUSY = 1,
}

local IoStatus = FunctionService:new()

local function sleep_ms(ms)
	nixio.nanosleep(math.floor(ms / 1000), (ms % 1000) * 1000 * 1000)
end

function IoStatus:adc_acl_active(data)
	if not data.state or data.state == "" then return end
	local number = self.binding:match("adc(%d+)")
	if number then
		local pin = io:find_pin_ubus_obj("acl" .. number)
		util.ubus(pin, "update", { state = data.state == "active" and "inactive" or "active", save_conf = true })
		data.state = nil
	end
end

function IoStatus:change_state(data)
	local uci = require("vuci.uci").cursor()
	if data.direction then
		local pin_obj = io:get_pin_obj(self.binding)
		if pin_obj.direction ~= data.direction then
			local fs = require("nixio.fs")
			uci:set("event_juggler", "@general[0]", "reload_stamp", util.trim(fs.readfile("/proc/sys/kernel/random/uuid")))
		end
	end
	data.save_conf = true
	local pin = io:find_pin_ubus_obj(self.binding)
	self:adc_acl_active(data)
	util.ubus(pin, "update", data)
	uci:commit("event_juggler")
end

function IoStatus:lock_file(lock_file)
	local f = nixio.open(lock_file, nixio.open_flags("rdwr", "creat"))
	if not f then error("lock file open error") end
	local ok, errno, errmsg = f:lock("tlock")
	return ok, f
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

function IoStatus:POST_action_init_hook()
	if not self.binding or self.binding == ""  then self:add_critical_error(STD_CODES.INVALID_SECTION, "PIN not provided.", "Validation", HTTP_STATUS_CODES.NOT_FOUND) end
	local pin = io:find_pin_ubus_obj(self.binding)
	if not pin or pin == "" then self:add_critical_error(STD_CODES.INVALID_SECTION, "PIN not found.", "Validation", HTTP_STATUS_CODES.NOT_FOUND) end
	local status_data = util.ubus(pin, "status")
	if status_data.is_counter then self:add_critical_error(STD_CODES.INVALID_SECTION, "PIN cannot be modified because it is used by Impulse counter.", "Validation") end
end

function IoStatus:get_pin_obj(pin_name)
	local pin = io:get_pin_obj(pin_name)
	if not pin or pin.type ~= "adc" then return pin end
	local number = pin.id:match("adc(%d+)")
	if number then
		local acl_pin = io:get_pin_obj("acl" .. number, {"state"})
		if acl_pin and acl_pin.state then
			pin.state = (acl_pin.state == "active") and "inactive" or "active"
		end
	end
	return pin
end

-- If "time" or "delay" parameters are provided, the action will be forked and run in the background.
-- Child process tries to lock a file, and writes a code ("0" if ok, "1" if file already locked) for the parent process using pipe.
-- Parent process reads the code and returns a response (success or error)
local change_state = IoStatus:action("change_state", function(self, data)
	if data.time == "" then data.time = nil end
	if data.delay == "" then data.delay = nil end
	local inv_inp = data.invert_input
	if inv_inp then
		if inv_inp == "1" then data.invert_input = true
		elseif inv_inp == "0" or inv_inp == "" then data.invert_input = false end
	end

	local orig_state
	if data.time then
		orig_state = io:get_pin_obj(self.binding, nil, false)
		for k in pairs(orig_state) do
			if data[k] == nil then
				orig_state[k] = nil
			end
		end
		for k in pairs(data) do
			if orig_state[k] == nil then
				orig_state[k] = ""
			end
		end
	end

	local function check_child_response(read_stdout)
		local code = read_stdout:read(1)
		read_stdout:close()
		if tonumber(code) == ERR_CODES.BUSY then
			return self:add_critical_error(ERR_CODES.BUSY, "change_state action is already running for this I/O pin.")
		end
	end

	local read_stdout, write_stdout, ok, lock_ref
	local forked = false
	if data.delay then
		read_stdout, write_stdout = nixio.pipe()
		forked = true
		local pid = nixio.fork()
		if pid > 0 then
			-- parent
			check_child_response(read_stdout)
			if data.time then
				self:add_message(MSG_CODES.DELAY_AND_TIME, "State will be changed after %sms. It will be changed back to the current state after another %sms"
					% {data.delay, data.time})
			else
				self:add_message(MSG_CODES.DELAY, "State will be changed after %sms." % data.delay)
			end
			return self:ResponseOK(nil, self.messages)
		end
		read_stdout:close()

		ok, lock_ref = self:lock_file(LOCK_FILE % self.binding)
		write_stdout:write(ok and "0" or tostring(ERR_CODES.BUSY))
		write_stdout:close()
		if not ok then os.exit(0) end

		sleep_ms(tonumber(data.delay))
	end

	self:change_state(data)
	if data.time then
		if not forked then
			read_stdout, write_stdout = nixio.pipe()
			forked = true
			local pid = nixio.fork()
			if pid > 0 then
				-- parent
				check_child_response(read_stdout)
				self:add_message(MSG_CODES.TIME, "State will be changed back after %sms." % data.time)
				return self:ResponseOK(io:get_pin_obj(self.binding), self.messages)
			end
			read_stdout:close()

			ok, lock_ref = self:lock_file(LOCK_FILE % self.binding)
			write_stdout:write(ok and "0" or tostring(ERR_CODES.BUSY))
			write_stdout:close()
			if not ok then os.exit(0) end
		end

		sleep_ms(tonumber(data.time))
		self:change_state(orig_state)
	end

	if forked then
		-- child process, exit after changing state
		lock_ref:close()
		os.exit(0)
	end
	return self:ResponseOK(self:get_pin_obj(self.binding), self.messages)
end)

	local section_value = change_state:option("value")
		function section_value:validate(value)
			local ok, err = io:not_adc_validation(self.binding)
			if not ok then return ok, err end
			local pin = io:find_pin_ubus_obj(self.binding)
			local status_data = util.ubus(pin, "status")
			if status_data and status_data.direction == "out" then
				return self.dt:is_bool(value)
			end
			if pin and pin:find("dio") then
				return self.dt:is_bool(value)
			end
			return false, "PIN value is not supported."
		end

	local invert_input = change_state:option("invert_input")
		function invert_input:validate(value)
			local ok, err = io:not_adc_validation(self.binding)
			if not ok then return ok, err end
			local pin = io:find_pin_ubus_obj(self.binding)
			local status_data = util.ubus(pin, "status")
			if pin and pin:find("dio") then
				return self.dt:is_bool(value)
			end
			if status_data and status_data.direction == "in" or pin:find("dwi") then
				return self.dt:is_bool(value)
			end
			return false, "PIN inversion is not supported."
		end

	local state = change_state:option("state")
		function state:validate(value)
			local pin = io:find_pin_ubus_obj(self.binding)
			local pin_state_map = {
				["dwi"]   = { "dry", "wet" },
				["acl"]   = { "active", "inactive" },
				["adc"]   = { "active", "inactive" },
				["relay"] = { "open", "closed" },
			}
			for key, options in pairs(pin_state_map) do
				if pin and pin:find(key) then
					return self.dt:check_array(value, options)
				end
			end
			return false, "PIN state is not supported."
		end

	local direction = change_state:option("direction")
		function direction:validate(value)
			local ok, err = io:not_adc_validation(self.binding)
			if not ok then return ok, err end
			local pin = io:find_pin_ubus_obj(self.binding)
			local direction_options = {}
			if pin and pin:find("dio") then
				direction_options = { "in", "out" }
				return self.dt:check_array(value, direction_options)
			end
			return false, "PIN direction is not supported."
		end

	local custom_name = change_state:option("custom_name")
		custom_name.maxlength = 15
		function custom_name:validate(value)
			return self.dt:string(value)
		end

	local custom_unit = change_state:option("custom_unit")
		custom_unit.maxlength = 15
		function custom_unit:validate(value)
			local ok, err = io:acl_adc_validation(self.binding)
			if not ok then return ok, err end
			return self.dt:string(value)
		end

	local custom_add = change_state:option("custom_add")
		function custom_add:validate(value)
			local ok, err = io:acl_adc_validation(self.binding)
			if not ok then return ok, err end
			return self.dt:float_scientific(value)
		end

	local custom_mul = change_state:option("custom_mul")
		function custom_mul:validate(value)
			local ok, err = io:acl_adc_validation(self.binding)
			if not ok then return ok, err end
			return self.dt:float_scientific(value)
		end

	local custom_div = change_state:option("custom_div")
		function custom_div:validate(value)
			local ok, err = io:acl_adc_validation(self.binding)
			if not ok then return ok, err end
			if tonumber(value) == 0 then
				return false, "Value can not be 0."
			end
			return self.dt:float_scientific(value)
		end

	local custom_off = change_state:option("custom_off")
		function custom_off:validate(value)
			local ok, err = io:acl_adc_validation(self.binding)
			if not ok then return ok, err end
			return self.dt:float_scientific(value)
		end

	local hr_state_low = change_state:option("hr_state_low")
		hr_state_low.maxlength = 15
		function hr_state_low:validate(value)
			local ok, err = io:hr_state_low_high_validation(self.binding, self.arguments.data)
			if not ok then return ok, err end
			return self.dt:string(value)
		end

	local hr_state_high = change_state:option("hr_state_high")
		hr_state_high.maxlength = 15
		function hr_state_high:validate(value)
			local ok, err = io:hr_state_low_high_validation(self.binding, self.arguments.data)
			if not ok then return ok, err end
			return self.dt:string(value)
		end

	local hr_state_open = change_state:option("hr_state_open")
		hr_state_open.maxlength = 15
		function hr_state_open:validate(value)
			local ok, err = io:hr_state_open_validation(self.binding, self.arguments.data)
			if not ok then return ok, err end
			return self.dt:string(value)
		end

	local hr_state_closed = change_state:option("hr_state_closed")
		hr_state_closed.maxlength = 15
		function hr_state_closed:validate(value)
			local ok, err = io:hr_state_closed_validation(self.binding)
			if not ok then return ok, err end
			return self.dt:string(value)
		end

	local hr_state_shorted = change_state:option("hr_state_shorted")
		hr_state_shorted.maxlength = 15
		function hr_state_shorted:validate(value)
			local ok, err = io:hr_state_shorted_validation(self.binding, self.arguments.data)
			if not ok then return ok, err end
			return self.dt:string(value)
		end

	local opt_time = change_state:option("time")
		function opt_time:validate(value)
			return self.dt:irange(value, 1, 3600000)
		end

	local opt_delay = change_state:option("delay")
		function opt_delay:validate(value)
			return self.dt:irange(value, 1, 3600000)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function IoStatus:GET_validate_section() -- we don't need section validation as IO isn't based on config
	local pin = io:find_pin_ubus_obj(self.sid)
	if not pin or pin == "" then self:add_critical_error(STD_CODES.INVALID_SECTION, "PIN not found.", "Validation", HTTP_STATUS_CODES.NOT_FOUND) end
end

function IoStatus:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function IoStatus:GET_TYPE_status()
	if self._single then
		self:GET_validate_section()
		return self:ResponseOK(self:get_pin_obj(self.sid))
	else
		local res = {}
		local acl_status = {}
		local ubus_objs = io:ioman_list() or {}
		for _, obj in ipairs(ubus_objs) do
			local id = obj:match("^.*%.(.*)$")
			local pin = io:get_pin_obj(id)
			if pin and pin.type == "acl" then
				acl_status[id] = pin.state
			end
			res[#res+1] = pin
		end
		for _, obj in ipairs(res) do
			if obj.type == "adc" then
				local number = obj.id:match("adc(%d+)")
				if number and acl_status["acl" .. number] then
					obj.state = (acl_status["acl" .. number] == "active") and "inactive" or "active"
				end
			end
		end
		return self:ResponseOK(res)
	end
end

return IoStatus
