local md = require("vuci.modem")
local ubus = require("ubus")

local ERR_CODES = {
	NOT_FOUND = 1,
	REBOOT_FAILED = 2,
	AT_EXEC_FAILED = 3
}

local function action_scan_network(self)
	local modem_id = self.modem_id
	if not md:operators_scan_supported(modem_id) then
		return self:add_critical_error(2, "Operator scan is not supported", "modem")
	end

	local _, sim_state = md:get_simstate(modem_id)
	if sim_state == md.SIM_STATE.NOT_INSERTED then
		return self:add_critical_error(3, "Operator scan is not available while SIM card is not inserted.", "modem")
	end

	local util = require("vuci.util")
	local res = util.ubus(md:get_ubus_modem_object(modem_id), "scan_operators", nil, 180)

	if not res then
		return self:add_critical_error(1, "Unknown error", "modem")
	end
	if res.errno then
		return self:add_critical_error(res.errno, res.error, "modem")
	end
	return self:ResponseOK(md:format_operators(res.operators))
end

local function action_reboot(self)
	local ok, err = md:reboot(self.modem_id)
	if not ok then
		return self:add_critical_error(ERR_CODES.REBOOT_FAILED, err, "modem")
	end
	return self:ResponseOK()
end

local function action_restart_connection(self)
	local res, err_msg, err_code = md:restart_connection(self.modem_id)
	if res then
		return self:ResponseOK()
	end
	return self:add_critical_error(err_code, err_msg, "modem")
end

local function action_execute_at(self)
    local response = md:exec_at(self.modem_id, self.arguments.data.command)
	if response then
		self:ResponseOK({
			response = response
		})
	end
	return self:add_critical_error(ERR_CODES.AT_EXEC_FAILED, "Failed to execute AT command.", "command")
end

local function action_switch_sim(self)
	local res, err_msg, err_code = md:switch_sim(self.modem_id)
	if res then
		return self:ResponseOK()
	end
	return self:add_critical_error(err_code, err_msg, "modem")
end

-- Updates active SIM card PIN code
---@param modem string Modem usb id (3-1, 1-1.2 ...) of the SIM to update pin for
---@param position number Position of the SIM to update pin for
---@param pin string PIN code to update
local function update_active_sim_pin(modem, position, pin)
	local uci = require("vuci.uci").cursor()
	uci:foreach("simcard", "sim", function (s)
		-- Only set PIN to config if SIM is active sim and primary.
		if s.modem == modem and s.position == tostring(position) and s.primary == "1" then
			uci:set("simcard", s[".name"], "pincode", pin)
			uci:commit("simcard")
			return false
		end
	end)
end

local function action_sim_unblock(self, data)
	local modem_id = self.modem_id
	local ok, code, err = md:reset_pin(modem_id, data.puk, data.pin)
	if not ok then
		if code == 2 then
			-- Notify front-end about modem PUK changes
			local con = ubus.connect()
			con:send("vuci.notify", { event = "puk_event", data = {modem_id = modem_id}})
			con:close()
		end
		return self:add_critical_error(code, err, "puk")
	end
	local active_sim = md:get_active_sim(modem_id)
	if active_sim then
		update_active_sim_pin(modem_id, active_sim, data.pin)
	end
	self:ResponseOK({["pin:set"] = "1"})
end

local function action_sim_unlock(self, data)
	local modem_id = self.modem_id
	local ok, code, err = md:set_pin(modem_id, data.pin)
	if not ok then
		if code == 2 then
			local con = ubus.connect()
			con:send("vuci.notify", { event = "pin_event", data = {modem_id = modem_id}})
			con:close()
		end
		self:add_critical_error(code, err, "pin")
	end
	local active_sim = md:get_active_sim(modem_id)
	if active_sim then
		update_active_sim_pin(modem_id, active_sim, data.pin)
	end
	self:ResponseOK()
end

local function action_change_pin(self, data)
	local modem_id = self.modem_id
	local ok, code, err = md:change_pin(modem_id, data.pin, data.new_pin)
	if not ok then
		self:add_critical_error(code, err, "pin")
	end
	local active_sim = md:get_active_sim(modem_id)
	if active_sim then
		update_active_sim_pin(modem_id, active_sim, data.new_pin)
	end
	self:ResponseOK({["new_pin:set"] = "1"})
end

local function action_pin_lock(self, data)
	local modem_id = self.modem_id
	local ok, code, err = md:set_pin_lock(modem_id,
		data.enabled == "1" and md.PIN_LOCK.LOCKED or md.PIN_LOCK.UNLOCKED,
		data.pin
	)
	if not ok then
		self:add_critical_error(code, err, "pin")
	end
	local active_sim = md:get_active_sim(modem_id)
	if active_sim then
		update_active_sim_pin(modem_id, active_sim, data.pin)
	end
	return self:ResponseOK()
end

local function action_send_ussd(self, options)
	local USSD_CODES = {
		SENDING_FAILED = 1,
		NOT_SUPPORTED = 4,
		TIMEOUT = 5,
		UNKNOWN = 6,
	}

	local modem_id = self.modem_id
	if md:get_mode(modem_id) == md.modes.LOW_POWER or md:no_ussd(modem_id) then
		return self:add_critical_error(
			USSD_CODES.NOT_SUPPORTED,
			"Modem does not support USSD sending.",
			"modem"
		)
	end

	local _, pinstate = md:get_pinstate(modem_id)
	if pinstate ~= md.PIN_STATE.OK then
		return self:add_critical_error(
			USSD_CODES.SENDING_FAILED,
			"SIM is not ready to send USSD code.",
			"sim"
		)
	end

	local result = md:send_ussd(modem_id, options.ussd)
	if result ~= 0 then
		return self:add_critical_error(USSD_CODES.SENDING_FAILED, "Failed to send USSD code.", "ussd")
	end

	local gsm_id = md:get_ubus_modem_object(modem_id)
	local uloop = require("uloop")
	local con = require("ubus").connect()
	local body = {}
	uloop.init()

	con:subscribe(gsm_id, {
		notify = function (data, event)
			if event == "service_data_value" and type(data) == "table" then
				data.state_id = data.state_id or USSD_CODES.UNKNOWN
				data.response = data.response or ""
				data.coding_scheme = data.coding_scheme or 15

				-- 2024-03-25 15:53:12 0,Service not available.,15
				---@deprecated 7.8
				body.response = ("%s %s,%s,%s"):format(
					os.date("%Y-%m-%d %X"),
					data.state_id,
					data.response,
					data.coding_scheme
				)
				body.timestamp = os.time()
				body.state_id = data.state_id
				body.message = data.response
				body.coding_scheme = data.coding_scheme
				con:close()
				uloop.cancel()
			end
		end
	})

	uloop.timer(function ()
		-- Timeout in 120s according to "quectel ec25 at commands" manual
		con:close()
		uloop.cancel()
	end):set(120000)

	uloop.run() -- Block till something happens

	if not body.message then
		return self:add_critical_error(USSD_CODES.TIMEOUT, "Timeout", "ussd")
	end
	return self:ResponseOK(body)
end

return function(ModemService)
	ModemService:action("scan_network", action_scan_network)
	ModemService:action("reboot", action_reboot)
	ModemService:action("restart_connection", action_restart_connection)
	ModemService:action("switch_sim", action_switch_sim)

	local execute_at = ModemService:action("exec_at", action_execute_at)
		local opt_command = execute_at:option("command")
			opt_command.require = true
			function opt_command:validate(value)
				return self.dt:string(value)
			end

	local sim_unblock = ModemService:action("sim_unblock", action_sim_unblock)
		local opt_pin = sim_unblock:option("pin")
			opt_pin.require = true
			function opt_pin:validate(value)
				return self.dt:pincode(value)
			end

		local opt_puk = sim_unblock:option("puk")
			opt_puk.require = true
			function opt_puk:validate(value)
				return self.dt:pukcode(value)
			end

	local sim_unlock = ModemService:action("sim_unlock", action_sim_unlock)
		local opt_pin2 = sim_unlock:option("pin")
			opt_pin2.require = true
			function opt_pin2:validate(value)
				return self.dt:pincode(value)
			end

	local change_pin = ModemService:action("change_pin", action_change_pin)
		local opt_pin3 = change_pin:option("pin")
			opt_pin3.require = true
			function opt_pin3:validate(value)
				return self.dt:pincode(value)
			end

		local opt_new_pin = change_pin:option("new_pin")
			opt_new_pin.require = true
			function opt_new_pin:validate(value)
				return self.dt:pincode(value)
			end

	local pin_lock = ModemService:action("pin_lock", action_pin_lock)
		local opt_pin4 = pin_lock:option("pin")
			opt_pin4.require = true
			function opt_pin4:validate(value)
				return self.dt:pincode(value)
			end

		local opt_pin_enabled = pin_lock:option("enabled")
			opt_pin_enabled.require = true
			function opt_pin_enabled:validate(value)
				return self.dt:is_bool(value)
			end

	local ussd = ModemService:action("send_ussd", action_send_ussd)
		local opt_ussd = ussd:option("ussd")
			opt_ussd.require = true
			opt_ussd.maxlength = 182
			function opt_ussd:validate(value)
				return self.dt:string(value)
			end

	return ModemService
end