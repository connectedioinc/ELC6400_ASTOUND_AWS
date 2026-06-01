local ConfigService = require("api/ConfigService")
local fs = require("nixio.fs")
local util = require("vuci.util")
local board = require("vuci.board")

if not board:has_mobile() then return nil end

local ERROR_CODES = {
	INVALID_FILE = 1,
	DUPLICATE_NUMBER = 2,
	MULPTIPLE_FILES = 3,
}

local Recipients = ConfigService:new({
	increment_name = true
})

function Recipients:before_update()
	local name = self.current_data_block.name
	if name then
		local old_name = self:table_get(self.config, self.sid, "name")
		if old_name and old_name ~= name then
			local configs = {
				{config = "sms_utils", section = "rule", option = "group"},
				{config = "call_utils", section = "rule", option = "group"},
				{config = "event_juggler", section = "action", option = "sms_group"},
				{config = "sms_gateway", section = "reply", option = "group"},
				{config = "sms_gateway", section = "fwd_to_http", option = "group"},
				{config = "sms_gateway", section = "fwd_to_sms", option = "group"},
				{config = "sms_gateway", section = "fwd_to_smtp", option = "group"}
			}

			for _, cfg in ipairs(configs) do
				if fs.access("/etc/config/"..cfg.config) then
					self:table_foreach(cfg.config, cfg.section, function(s)
						if s[cfg.option] == old_name then
							self:table_set(cfg.config, s[".name"], cfg.option, name)
						end
					end)
				end
			end
		end
	end
end

function Recipients:before_tel_update(current_data_block)
	local uci_self = self.uci
	local table_set = uci_self.set
	local table_delete = uci_self.delete
	local commit = true
	if not current_data_block then
		current_data_block = self.current_data_block
		uci_self = self
		table_set = uci_self.table_set
		table_delete = uci_self.table_delete
		commit = false
	end
	local configs = {
		{ config = "modbus_client", section_pattern = "alarm_", foreign_option = "phone_group_id", linked_option = "id", related_options = { ["tel"] = { name = "telnum", list_length = 16 } } } -- tcp and serial alarms
	}

	for _, cfg in ipairs(configs) do
		if fs.access("/etc/config/" .. cfg.config) and self.t_func:_get_config_safe(cfg.config) then
			for _, s in pairs(self.t_func:get_uci_config(cfg.config)) do
				if s[".type"]:find(cfg.section_pattern) and s[cfg.foreign_option] == current_data_block[cfg.linked_option] then
					for opt, opt_data in pairs(cfg.related_options) do
						if opt_data.list_length and opt_data.list_length < #current_data_block[opt] then
							table_delete(uci_self, cfg.config, s[".name"], cfg.foreign_option)
							if s.enabled and s.enabled == "1" then
								table_set(uci_self, cfg.config, s[".name"], "enabled", "0")
							end
						else
							table_set(uci_self, cfg.config, s[".name"], opt_data.name, current_data_block[opt])
						end
					end
				end
			end
			if commit then
				uci_self:commit(cfg.config)
			end
		end
	end
end

local PhoneGroups =  Recipients:section("user_groups", "phone")

	local opt_name = PhoneGroups:option("name")
		opt_name.cfg_require = true
		opt_name.maxlength = 16
		function opt_name:validate(value)
			self:table_foreach(self.config, "phone", function (s)
				if s.name == value and s[".name"] ~= self.sid then
					self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "name already exists")
				end
			end)
			return self.dt:default_validation(value)
		end
		function opt_name:set(value)
			self:before_update()
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local opt_tel = PhoneGroups:option("tel", {list = true})
		function opt_tel:validate(value)
			return self.dt:phonedigit(value)
		end
		function opt_tel:set(value)
			self:before_tel_update()
			self:table_set(self.config, self.sid, self.api_key, value)
		end

function Recipients:PUT_validate_section_hook()
	if not self:get_abs_value(self.config, self.sid, "tel") or (not self.current_data_block.tel or #self.current_data_block.tel == 0)
	 or (self.current_data_block.tel[1] == "" and #self.current_data_block.tel == 1) then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Phone number is required and can not be deleted.")
	end
end

function Recipients:DELETE_before_section_delete_hook()
	local group_name = self:table_get(self.config, self.sid, "name")
	-- check events reporting sections
	self:table_foreach("event_juggler", "action", function(s)
		if s.action == "smtp" and s.sms_group == group_name then
			self:table_delete("event_juggler", s[".name"], "smtp_email_group")
			if s.enabled and s.enabled == "1" then
				self:table_set("event_juggler", s[".name"], "enabled", "0")
			end
			self:table_foreach("event_juggler", "event", function(event)
				if event.action and util.contains(event.action, s[".name"]) then
					self:table_set("event_juggler", event[".name"], "enabled", "0")
				end
			end)
		end
	end)
	-- check sms utils auto reply
	self:table_foreach("sms_gateway", "reply", function(c)
		if c.mode and c.mode == "user_group" and c.group == group_name then
			self:table_delete("sms_gateway", c[".name"], "group")
			if c.enabled and c.enabled == "1" then
				self:table_set("sms_gateway", c[".name"], "enabled", "0")
			end
		end
	end)
	-- check sms utils forwarding
	self:table_foreach("sms_gateway", "fwd_to_http", function(c)
		if c.mode and c.mode == "user_group" and c.group == group_name then
			self:table_delete("sms_gateway", c[".name"], "group")
			if c.enabled and c.enabled == "1" then
				self:table_set("sms_gateway", c[".name"], "enabled", "0")
			end
		end
	end)
	self:table_foreach("sms_gateway", "fwd_to_sms", function(c)
		if c.mode and c.mode == "user_group" and c.group == group_name then
			self:table_delete("sms_gateway", c[".name"], "group")
			if c.enabled and c.enabled == "1" then
				self:table_set("sms_gateway", c[".name"], "enabled", "0")
			end
		end
	end)
	self:table_foreach("sms_gateway", "fwd_to_smtp", function(c)
		if c.mode and c.mode == "user_group" and c.group == group_name then
			self:table_delete("sms_gateway", c[".name"], "group")
			if c.enabled and c.enabled == "1" then
				self:table_set("sms_gateway", c[".name"], "enabled", "0")
			end
		end
	end)
	-- check sms rules
	self:table_foreach("sms_utils", "rule", function(c)
		if c.allowed_phone and c.allowed_phone == "group" and c.group == group_name then
			self:table_delete("sms_utils", c[".name"], "group")
			if c.enabled and c.enabled == "1" then
				self:table_set("sms_utils", c[".name"], "enabled", "0")
			end
		end
	end)
	-- check call rules
	self:table_foreach("call_utils", "rule", function(c)
		if c.allowed_phone and c.allowed_phone == "group" and c.group == group_name then
			self:table_delete("call_utils", c[".name"], "group")
			if c.enabled and c.enabled == "1" then
				self:table_set("call_utils", c[".name"], "enabled", "0")
			end
		end
	end)

	if fs.access("/etc/config/iojuggler") then
		-- check io juggler action
		self:table_foreach("iojuggler", "action", function(c)
			if c.ui_recipient_format and c.ui_recipient_format == "group" and c.phone_group and c.phone_group == group_name then
				self:table_delete("iojuggler", c[".name"], "phone_group")
			end 
		end)
	end

	-- check modbus tcp/serial client alarms
	if self.t_func:_get_config_safe("modbus_client") then
		for _, c in pairs(self.t_func:get_uci_config("modbus_client")) do
			if c[".type"]:find("alarm_") then
				if c.phone_group_id and c.phone_group_id == self.sid then
					self:table_delete("modbus_client", c[".name"], "phone_group_id")
					if c.enabled and c.enabled == "1" then
						self:table_set("modbus_client", c[".name"], "enabled", "0")
					end
				end
			end
		end
	end
end

function Recipients:UPLOAD_init()
	if not self.sid then
		self:add_critical_error(STD_CODES.NAME_NOT_PROVIDED, "Configuration name must be provided", "Upload")
	end

	self:Exists()

	local function handle_request(upload_request)
		if #upload_request.files > 1 then
			return false, { code = ERROR_CODES.MULPTIPLE_FILES, error = "Only uploading a single file is allowed", source = "file" }
		end
		if upload_request.files[1].size > 1024 * 5 then
			return self:get_file_upload_too_large_error()
		end
		upload_request.files[1].location = os.tmpname()
		return true
	end

	local function list_files_to_delete()
		return {}
	end

	return { handle_request = handle_request, list_files_to_delete = list_files_to_delete }
end

function Recipients:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	local data = fs.readfile(path)
	fs.remove(path)

	if not data or data == "" then
		self:add_critical_error(ERROR_CODES.INVALID_FILE, "No phone numbers found in the file.", "file")
	end

	local trimmed_lines = {}
	for _, line in ipairs(util.split(data)) do
		line = util.trim(line)
		if line ~= "" then
			local valid, msg = opt_tel:validate(line)
			if not valid then
				self:add_error(STD_CODES.INVALID_OPT, msg, "tel: " .. line)
			end
			if valid and util.contains(trimmed_lines, line) then
				valid = false
				self:add_error(ERROR_CODES.DUPLICATE_NUMBER, "Duplicate phone number found.", "tel: " .. line)
			end
			if valid then
				trimmed_lines[#trimmed_lines+1] = line
			end
		end
	end
	self:return_if_error()

	if #trimmed_lines == 0 then
		self:add_critical_error(ERROR_CODES.INVALID_FILE, "No phone numbers found in the file.", "file")
	end

	self:before_tel_update({
		id = self.sid,
		tel = trimmed_lines
	})
	self.uci:set(self.config, self.sid, "tel", trimmed_lines)
	self.uci:commit(self.config)

	self:ResponseOK({
		[".type"] = "phone",
		id = self.sid,
		name = self.uci:get(self.config, self.sid, "name"),
		tel = trimmed_lines
	})
end

return Recipients
