local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local api_utils = require("api/api_utils")
local sqlite = require("vuci.sqlite").init()
local fs = require("nixio.fs")

local USERS_DB_PATH = "/etc/chilli/users.db"
local SESSIONS_DB_PATH = "/var/run/chilli/hotspot.db"
if not fs.access(SESSIONS_DB_PATH) then
	SESSIONS_DB_PATH = "/etc/chilli/hotspot.db"
end

local hotspot_user_management = FunctionService:new()

local function logout_user(self)
	local mac = string.gsub(self.arguments.data.macaddress, "-", ":")
	util.ubus("chilli", "logout", { mac = mac})
	return self:ResponseOK()
end

local logout = hotspot_user_management:action("logout_user", logout_user)

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local mac_address = logout:option("macaddress")
	mac_address.require = true
		function mac_address:validate(value)
			value = string.gsub(value, "-", ":")
			return self.dt:macaddr(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function hotspot_user_management:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

local function create_user_structure(user)
	local accounting = {
		idleTime = user.idletime,
		sessionTime = user.sessiontime,
		outputOctets = user.output_octets,
		inputOctets = user.input_octets
	}
	local session = {
		userName = user.username,
		sessionId = user.sessionid,
		startTime = user.start_time
	}
	local userData = {
		accounting = accounting,
		session = session,
		macAddress = user.mac,
		clientState = tonumber(user.session) ~= 0,
		ipAddress = user.ip,
		url = user.url
	}
	return userData
end

function hotspot_user_management:GET_TYPE_status()
	local data = {}
	local db = sqlite.database({ path = SESSIONS_DB_PATH })
	if not db:get_db() then
		self:ResponseOK(data)
	end

	if self.sid then
		local user = db:select("SELECT username, ip, mac, output_octets, input_octets, idletime, sessiontime, sessionid, start_time, session FROM statistics WHERE sessionid = :sessionid", {
			sessionid = self.sid
		})
		if #user == 0 then
			self:add_critical_error(STD_CODES.INVALID_SECTION, "Section not found.", "URL", HTTP_STATUS_CODES.NOT_FOUND)
		end
		self:ResponseOK(create_user_structure(user[1]))
	end

	local users = db:select("SELECT username, ip, mac, output_octets, input_octets, idletime, sessiontime, sessionid, start_time, url, session FROM statistics")
	for i = 1, #users do
		local userData = create_user_structure(users[i])
		table.insert(data, userData)
	end
	self:ResponseOK(data)
end

function hotspot_user_management:GET_TYPE_config()
	local data = {}
	local db = sqlite.database({ path = USERS_DB_PATH })
	if self._single then
		if self.query_parameters.type then
			local valid, err = self.dt:check_array(self.query_parameters.type, { "sms_user", "user" })
			if not valid then
				self:add_critical_error(STD_CODES.INVALID_QUERY, err, "type")
			end
		end

		local user, sms_user = {}, {}
		if not self.query_parameters.type or self.query_parameters.type == "user" then
			user = db:select("SELECT username, expiration, created, id, phone, mac, email FROM users WHERE id = :sid LIMIT 1", { sid = self.sid })
		end
		if not self.query_parameters.type or self.query_parameters.type == "sms_user" then
			sms_user = db:select("SELECT username, expiration, created, id, phone, mac FROM sms_users WHERE id = :sid LIMIT 1", { sid = self.sid })
		end

		if #sms_user == 1 then
			for key, value in pairs(sms_user[1]) do
				data[key] = type(value) ~= "string" and tostring(value) or value
			end
		elseif #user == 1 then
			for key, value in pairs(user[1]) do
				data[key] = type(value) ~= "string" and tostring(value) or value
			end
		else
			self:add_critical_error(STD_CODES.INVALID_SECTION, "Section not found.", "URL", HTTP_STATUS_CODES.NOT_FOUND)
		end
		db:close()
	else
		local users = db:select("SELECT username, expiration, created, id, phone, mac, email FROM users")
		local sms_users = db:select("SELECT username, expiration, created, id, phone, mac FROM sms_users")
		data.users = users
		data.sms_users = sms_users
		for i = 1, #data.users do
			for key, value in pairs(data.users[i]) do
				if type(value) ~= "string" then data.users[i][key] = tostring(data.users[i][key]) end
			end
		end
		for i = 1, #data.sms_users do
			for key, value in pairs(data.sms_users[i]) do
				if type(value) ~= "string" then data.sms_users[i][key] = tostring(data.sms_users[i][key]) end
			end
		end
		db:close()
	end

	return self:ResponseOK(data)
end

function hotspot_user_management:validate_delete_data(arguments, single_section)
	if type(arguments) ~= "table" or (type(arguments) == "table" and api_utils:is_array(arguments)) then
		self:add_critical_error(STD_CODES.INVALID_STRUCT, "Invalid data structure", "Validation", HTTP_STATUS_CODES.BAD_REQUEST)
	end
	if (single_section and not self.sid) or (not single_section and not arguments.id) then
		self:add_critical_error(STD_CODES.INVALID_SECTION, "Database entry identifier not found.", "Validation", HTTP_STATUS_CODES.NOT_FOUND)
	end
	for opt in pairs(arguments) do
		if not (opt == "user_type" or (opt == "id" and not single_section)) then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Invalid option", opt)
		end
	end
	if not arguments.user_type then
		self:add_critical_error(STD_CODES.INVALID_STRUCT, "User type not found.", "Validation", HTTP_STATUS_CODES.BAD_REQUEST)
	end
	if arguments.user_type ~= "user" and arguments.user_type ~= "sms_user" then
		self:add_critical_error(STD_CODES.INVALID_OPT, "User type is incorrect, accepted values: [user, sms_user].", "Validation", HTTP_STATUS_CODES.BAD_REQUEST)
	end
end

function hotspot_user_management:logout_sessions(sessions, username)
	if not sessions or not sessions.sessions then return end

	for _, session in ipairs(sessions.sessions) do
		if session.clientState and session.clientState ~= ""
			and session.session and session.session.userName and session.macAddress
			and session.session.userName == username then
				util.ubus("chilli", "logout", { mac = string.gsub(session.macAddress, "-", ":") })
		end
	end
end

function hotspot_user_management:remove_session_data(username)
	if not fs.access(SESSIONS_DB_PATH) then return end

	local sessions_db = sqlite.database({ path = SESSIONS_DB_PATH })
	if not sessions_db:get_db() then return end

	sessions_db:select("DELETE FROM statistics WHERE username = :username", { username = username })
	sessions_db:close()
end

function hotspot_user_management:DELETE()
	local deleted_ids = {}
	local db = sqlite.database({ path = USERS_DB_PATH })
	if self.sid then
		self:validate_delete_data(self.arguments.data, true)
		local db_table = self.arguments.data.user_type == "user" and "users" or "sms_users"
		local db_select = self.arguments.data.user_type == "user" and "id, email AS username" or "id, phone AS username"
		local res = db:select(("SELECT %s FROM %s WHERE id = :sid"):format(db_select, db_table), {
			sid = self.sid
		})
		if #res == 0 then self:add_critical_error(STD_CODES.INVALID_SECTION, string.format("Section: %s for service does not exist", self.sid), "UCI", HTTP_STATUS_CODES.NOT_FOUND) end
		db:select(("DELETE FROM %s WHERE id = :sid"):format(db_table), {
			sid = self.sid
		})
		db:close()
		if res[1].username then
			self:logout_sessions(util.ubus("chilli", "list"), res[1].username)
			self:remove_session_data(res[1].username)
		end
		return self:ResponseOK({ id = self.sid })
	else
		if type(self.arguments.data) ~= "nil" and not api_utils:is_array(self.arguments.data) then
			self:add_critical_error(
				STD_CODES.INVALID_STRUCT,
				"Invalid data structure, only an array is acceptable",
				"Validation",
				HTTP_STATUS_CODES.BAD_REQUEST
			)
		end
		if api_utils:is_table_empty(self.arguments) or type(self.arguments.data) ~= "table" or api_utils:is_table_empty(self.arguments.data) then
			self:add_critical_error(
				STD_CODES.CONF_DEL_DISALLOWED,
				"Deletion of whole configuration is not allowed",
				"Validation"
			)
		end
		for _, section in ipairs(self.arguments.data) do
			self:validate_delete_data(section, false)
			local db_table = section.user_type == "user" and "users" or "sms_users"
			local db_select = section.user_type == "user" and "id, email AS username" or "id, phone AS username"
			local res = db:select(("SELECT %s FROM %s WHERE id = :sid"):format(db_select, db_table),{
				sid = section.id
			})
			if #res == 0 then self:add_error(STD_CODES.INVALID_SECTION, string.format("Section: %s for service does not exist", section.id), "UCI") end
			if #res ~= 0 and res[1].username then
				section.username = res[1].username
			end
		end
		self:return_if_error(HTTP_STATUS_CODES.NOT_FOUND)
		local ubus_sessions = util.ubus("chilli", "list")
		for _, section in ipairs(self.arguments.data) do
			local db_table = section.user_type == "user" and "users" or "sms_users"
			db:select(("DELETE FROM %s WHERE id = :sid"):format(db_table), {
				sid = section.id
			})
			table.insert(deleted_ids, { id = section.id })
			if section.username then
				self:logout_sessions(ubus_sessions, section.username)
				self:remove_session_data(section.username)
			end
		end
	end

	db:close()
	return self:ResponseOK(deleted_ids)
end

return hotspot_user_management
