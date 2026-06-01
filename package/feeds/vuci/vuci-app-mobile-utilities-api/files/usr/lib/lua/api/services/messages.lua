local FunctionService = require("api/FunctionService")
local mdm = require("vuci.modem")
local util = require "vuci.util"

if mdm:modem_count() == 0 then
	return nil
end

local SMS = FunctionService:new()
SMS.disable_service_group_check = true

local ERR_CODES = {
	NOT_VISIBLE = 1,
	FAILED_TO_SEND = 2,
	NO_MODEM = 3,
	NO_MESSAGE = 4,
	NO_NUMBER = 5,
	SMS_LIMIT = 6,
	NO_SIM = 7,
	SMS_INVALID = 8,
	SMS_COUNT = 9,
	MODEM_OFFLINE = 10,
}

function SMS:get_messages(modem_id, index)
	local messages = {}

	local md_info = mdm:get_info(modem_id)
	if not md_info then
		return nil, STD_CODES.INVALID_SECTION, "Modem does not exist", 404
	end
	if md_info.offline then
		return nil, ERR_CODES.MODEM_OFFLINE, "Modem is blocked or disabled"
	end

	local results = mdm:call_ubus_object(modem_id, "read_sms", { index = index })
	if not results or results == "N/A" then
		return nil, STD_CODES.INVALID_SECTION, "Modem does not exist", "modem", 404
	end

	if (results.messages and #results.messages > 0) then
		for _, msg in pairs(results.messages) do
			table.insert(messages, {
				id = tostring(msg.index),
				date = os.date('%Y-%m-%d %H:%M:%S', msg.timestamp),
				sender = msg.sender,
				message = msg.text,
				status = msg.stat_id_str,
				modem_id = modem_id
			})
		end
	end
	return messages
end

function SMS:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function SMS:GET_TYPE_status()
	local messages = {}
	local err_code, err_msg, http_code
	if self.binding and self.sid then
		messages, err_code, err_msg, http_code = self:get_messages(self.sid, tonumber(self.binding))
		if not messages then
			return self:add_critical_error(err_code, err_msg, "modem", http_code)
		end
		if #messages > 0 then
			return self:ResponseOK(messages[1])
		else
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "Message does not exist", "sms", 404)
		end
	end
	if self.sid and not self.binding then
		messages, err_code, err_msg, http_code = self:get_messages(self.sid, -1)
		if not messages then
			return self:add_critical_error(err_code, err_msg, "modem", http_code)
		end
	end
	if not self.binding and not self.sid then
		for _, m in pairs(mdm:get_all_modems()) do
			for _, msg in ipairs(self:get_messages(m.id, -1) or {}) do
				table.insert(messages, msg)
			end
		end
	end
	table.sort(messages, function(a, b) return a.date > b.date end)
	return self:ResponseOK(messages)
end

function SMS:delete_sms(modem_id, sms_id)
	if not modem_id then
		return false, "Modem id is missing", nil, nil, "modem_id"
	end

	if not tonumber(sms_id) then
		return false, "Wrong SMS id.", nil, nil, "sms_id"
	end

	local ok, err = self.dt:check_modem(modem_id)
	if not ok then return ok, err, nil, nil, "modem_id" end

	if tonumber(sms_id) ~= -1 then
		local messages, err_code, err_msg, http_code = self:get_messages(modem_id, tonumber(sms_id))
		if not messages then
			return false, err_msg, err_code, http_code, "sms_id"
		end
		if #messages == 0 then
			return false, "SMS with ID=%s was not found" % sms_id, STD_CODES.INVALID_SECTION, 404, "sms_id"
		end
	end

	local res = mdm:call_ubus_object(modem_id, "delete_sms", { index = tonumber(sms_id) })
	if not res or (res and not res.status_id) then
		return false, "failed to delete SMS. id: "..sms_id..", modem: "..modem_id, nil, nil, "sms_id"
	end
	return true
end

local remove_messages = SMS:action("remove_messages", function(self, data)
	-- self.arguments.data.sms_id is sms ID
	-- self.arguments.data.modemm_id is modem ID
	local succ = "SMS deleted successfully"
	local args = self.arguments.data.sms_id
	local all_msgs = self:get_messages(self.arguments.data.modem_id, -1)
	
	local delete_all = #all_msgs > 0 -- if no messages - nothing to delete
	for _, msg in ipairs(all_msgs) do
		if not util.contains(args, msg.id) then
			delete_all = false
			break
		end
	end

	if delete_all then
		local ok, err, code, http_code, src = self:delete_sms(self.arguments.data.modem_id, -1)
		if not ok then
			return self:add_critical_error(code or STD_CODES.UCI_DELETE_ERROR, err, src or "id", http_code)
		end
		return self:ResponseOK(succ)
	end

	for _, v in ipairs(args) do
		local ok, err, code, http_code, src = self:delete_sms(self.arguments.data.modem_id, v)
		if not ok then
			return self:add_critical_error(code or STD_CODES.UCI_DELETE_ERROR, err, src or "id", http_code)
		end
	end
	return self:ResponseOK(succ)
end)

local remove_messages_modem_id = remove_messages:option("modem_id")
	remove_messages_modem_id.require = true
	function remove_messages_modem_id:validate(value)
		return self.dt:check_modem(value)
	end

local remove_messages_sms_id = remove_messages:option("sms_id", {list = true})
	remove_messages_sms_id.require = true
	function remove_messages_sms_id:validate(value)
		return self.dt:string(value)
	end

local SendAction = SMS:action("send", function(self, data)
	local function check_sim(res)
		local err, code = mdm:get_simstate(data.modem)
		local sim_inserted = code == mdm.SIM_STATE.INSERTED
		if res.errno and not sim_inserted then
			return self:add_critical_error(
				ERR_CODES.NO_SIM,
				("Failed to send message. SIM card %s."):format(err:lower()),
				"Message sending"
			)
		end
	end
	local function check_sms_limit(res)
		if res.errno and res.errno == 9 then
			return self:add_critical_error(
				ERR_CODES.SMS_LIMIT,
				"Failed to send message, because sms limit was reached",
				"Message sending"
			)
		end
	end
	-- used to return general error if ubus error occurs (e.g. AT command timeout)
	local function gsm_ubus_error()
		return self:add_critical_error(
			ERR_CODES.FAILED_TO_SEND,
			"Failed to send message",
			"Message sending"
		)
	end

	local res = mdm:call_ubus_object(data.modem, "send_sms",
		{ number = data.number, text = data.message:gsub("\r\n?", "\n"), validate = true }, 125) or {}
	if not res or res == "N/A" then
		gsm_ubus_error()
	end
	check_sim(res)
	check_sms_limit(res)
	if res.errno then
		gsm_ubus_error()
	end

	if not res.valid then
		return self:add_critical_error(
			ERR_CODES.SMS_INVALID,
			"SMS is invalid",
			"Message sending"
		)
	end
	if res.sms_used > 8 then
		return self:add_critical_error(
			ERR_CODES.SMS_COUNT,
			"Max SMS count is 8 messages",
			"Message sending"
		)
	end

	local res = mdm:call_ubus_object(data.modem, "send_sms", { number = data.number, text = data.message:gsub("\r\n?", "\n") }, 125) or {}
	if not res or res == "N/A" then
		gsm_ubus_error()
	end
	check_sim(res)
	check_sms_limit(res)

	-- if res.sms_used is nil that means some error occurred (for example this happens if simcard was ejected while sending the message)
	if res.errno or not res.sms_used then
		gsm_ubus_error()
	end
	return self:ResponseOK(res)
end)

	local opt_modem = SendAction:option("modem")
		opt_modem.require = true
		function opt_modem:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_message = SendAction:option("message")
		opt_message.require = true
		function opt_message:validate(value)
			return self.dt:string(value)
		end

	local opt_number = SendAction:option("number")
		opt_number.require = true
		function opt_number:validate(value)
			return self.dt:phonedigit(value)
		end

return SMS
