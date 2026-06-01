local ConfigService = require("api/ConfigService")
local mdm = require("vuci.modem")

if mdm:modem_count() == 0 then
	return nil
end

local SMS = ConfigService:new({
	create = false,
	delete = false
})

function SMS:get_available_storage(msg_storage, modem_id)
	local modem_storage = self.modem_storage[modem_id]
	local storage_id = 0
	local available_storage

	if msg_storage == "sm" then
		storage_id = 1
	elseif msg_storage == "me" then
		storage_id = 2
	end

	if modem_storage and storage_id ~= 0 then
		if modem_storage["storage_id"] == storage_id then
			available_storage = modem_storage["total"]
		elseif modem_storage["alt_storage_id"] == storage_id then
			available_storage = modem_storage["alt_total"]
		end
	end

	return available_storage
end

function SMS:set_modem_storage_data()
	local data = {}
	local modems = mdm:get_all_modems()
	for _, modem in ipairs(modems) do
		if modem.id then
			mdm:set_modem_id(modem.id)
			local storage = mdm:get_msg_storage()

			local modem_type = "External"
			if modem.builtin == 1 then
				if #modems > 1 then
					modem_type = modem.primary == 1 and "Primary" or "Secondary"
				else
					modem_type = "Internal"
				end
			end

			local sim_inserted = mdm:get_simstate() == "Inserted" and "1" or "0"

			data[modem.id] = {
				used 			= storage.used,
				total			= storage.total,
				storage_id		= storage.storage_id,
				alt_used		= storage.alt_used,
				alt_total		= storage.alt_total,
				alt_storage_id  = storage.alt_storage_id,
				modem_type		 = modem_type,
				modem_index 	= modem.index,
				sim_inserted	= sim_inserted
			}

			if modem.index then
				data[modem.id].modem_index = tostring(modem.index)
			end
		end
	end
	self.modem_storage = data
end

function SMS:GET_TYPE_status()
	self:set_modem_storage_data()
	local storage_data = {}
	for k, v in pairs(self.modem_storage) do
		v.modem_id = k
		table.insert(storage_data, v)
	end
	self:ResponseOK(storage_data)
end

function SMS:GET_init_hook()
	self:set_modem_storage_data()
end

function SMS:PUT_init_hook()
	self:set_modem_storage_data()
end

SMS.ERROR_CODES = {
	MODEM_NOT_AVAILABLE = 1,
	STORAGE_ADJUSTED = 3
}

function SMS:PUT_section_init_hook()
	local info_modem_id = self:table_get(self.config, self.sid, "info_modem_id")
	if not self.modem_storage[info_modem_id] then
		self:add_message(
			self.ERROR_CODES.MODEM_NOT_AVAILABLE,
			"Modem "..(info_modem_id and string.format("'%s' ", info_modem_id) or "").."not found.",
			self.sid
		)
	end
end

local SMSStorage = SMS:section("simcard", "simman")
function SMSStorage:filter(options)
	if options[".type"] == "simman" and options.info_modem_id and self.modem_storage then
		if self.request_method ~= "PUT" then
			return self.modem_storage[options.info_modem_id] ~= nil
		end
		return true
	end
	return false
end

	local opt_msg_storage = SMSStorage:option("msg_storage")
		opt_msg_storage.cfg_require = true
		function opt_msg_storage:validate(value)
			return self.dt:check_array(value, {
				"sm", -- SIM card
				"me"  -- Modem storage
			})
		end
		function opt_msg_storage:get()
			return self:table_get(self.config, self.sid, self.api_key) or "sm"
		end
		function opt_msg_storage:set(value)
			local modem = self:table_get(self.config, self.sid, "info_modem_id")
			self:table_set(self.config, self.sid, self.api_key, value)
			if value == "sm" then
				mdm:call_ubus_object(modem, "set_msg_storage", { mem1 = "usim", mem2 = "usim", mem3 = "usim" })
			end
			if value == "me" then
				mdm:call_ubus_object(modem, "set_msg_storage", { mem1 = "me", mem2 = "me", mem3 = "me" })
			end
		end

	local opt_free = SMSStorage:option("free")
		function opt_free:validate(value)
			return self.dt:irange(value, 1, 4095)
		end
		function opt_free:set(value)
			local val_to_set = value
			if tonumber(value) then
				local msg_storage_val = self:getter_wrapped_abs_value(self.config, self.sid, "msg_storage")
				local available_storage = self:get_available_storage(msg_storage_val, self:table_get(self.config, self.sid, "info_modem_id"))
				if available_storage and available_storage < tonumber(value) then
					val_to_set = tostring(available_storage)
					self:add_message(self.ERROR_CODES.STORAGE_ADJUSTED, "'free' value '%s' is greater than available storage, setting to '%s'." % {value, val_to_set}, self.sid)
				end
			end
			self:table_set(self.config, self.sid, self.api_key, val_to_set)
		end

	local opt_info_modem_id = SMSStorage:option("modem_id")
		opt_info_modem_id.readonly = true
		function opt_info_modem_id:get()
			return self:table_get(self.config, self.sid, "info_modem_id")
		end

return SMS
