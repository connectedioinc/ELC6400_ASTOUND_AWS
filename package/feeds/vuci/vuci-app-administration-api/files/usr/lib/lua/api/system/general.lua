local ConfigService = require("api/ConfigService")
local pac = require("vuci.package_checker")
local fs = require("nixio.fs")
local board = require("vuci.board")
local util = require("vuci.util")

local administration = ConfigService:new({ delete = false, create = false, general_section = "main" })

function administration:get_installed_languages()

	local language_codes = {
		["Français"]="fr",
		["Deutsch"]="de",
		["日本語"]="ja",
		["Português"]="pt",
		["Русский"]="ru",
		["Español"]="es",
		["Türkçe"]="tr",
		["Українська"]="ua",
	}
	local control_packages = pac.list_control_files()
	local languages = {}
	for _, file_path in ipairs(control_packages) do
		local control = file_path:match("vuci%-i18n%-(%a+).control")
		if control then
			local file = "lib/opkg/info/vuci-i18n-" .. control ..".control"
			file = fs.access("/usr/" .. file) and "/usr/" .. file or "/usr/local/" .. file
			local content = fs.readfile(file)
			local description = content:match("Description:%s*([^%s].-)%s*\n")
			if description then
				local lang_name = description:match("%((.-)%)")
				local filename = ""
				local PATH_FILES = {
					"/www/i18n/" .. language_codes[lang_name] .. "*.json.gz",
					"/usr/local/www/i18n/" .. language_codes[lang_name] .. "*.json.gz"
				}
				for _, path_pattern in pairs(PATH_FILES) do
					for path in fs.glob(path_pattern) do
						filename = fs.basename(path)
					end
				end
				table.insert(languages, { language = lang_name, code = language_codes[lang_name], filename = filename })
			end
		end
	end
	table.insert(languages, { language = "English", code = "en", filename = nil})
	return languages
end

function administration:reboot()
	local util_tlt = require("vuci.util_tlt")
	local forked = util_tlt.fork_exec_fn(function()
		util.ubus("rc", "init", { name = "dropbear", action = "stop" })
		util.ubus("rc", "init", { name = "uhttpd", action = "stop" })

		util.ubus("rpc-sys", "reboot", { args = { "-w" }, safe = true })
	end, { after_exit = true })
	if not forked then
		self:ResponseError("Failed to reboot device")
	end
	self:ResponseOK()
end

function administration:network_restart()
	local util_tlt = require("vuci.util_tlt")
	local forked = util_tlt.fork_exec_fn(function()
		util.ubus("rc", "init", { name = "network", action = "restart" })
	end, { after_exit = true })
	if not forked then
		self:ResponseError("Failed to restart network")
	end
	local ok, opkg_multi = pcall(require, "vuci.opkg_multi")
	if ok then
		opkg_multi.clear_net_restart_messages()
	end

	self:ResponseOK()
end

function administration:change_password_firstlogin()
	local profiles = require("vuci.profiles")

	local user = self.user.username
	local group = self.user.group
	local pass1 = self.arguments.data.password
	local pass2 = self.arguments.data.password_confirm

	local firstlogin = self.uci:get("vuci", "main", "firstlogin") == "1"
	local expired_password = util.password_expired(user)
	if not firstlogin and not expired_password then
		self:add_critical_error(STD_CODES.INCORRECT_REQUEST, "First login is already done and password is not expired.", "Request")
	end
	if pass1 ~= pass2 then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Passwords do not match.", "Validation")
	end
	if util.checkpasswd(user, pass1) then
		self:add_critical_error(1, "Password is the same. Use a different new password.", "Validation")
	end

	local nixio = require("nixio")
	local pid = nixio.fork()
	if pid > 0 then
		local _, _, code = nixio.waitpid()
		if code > 0 then
			self:add_critical_error(STD_CODES.UCI_SET_ERROR, "Failed to set new password.", "Request")
		end
	else
		local user_password = util.getpasswd(user)
		local res = util.setpasswd(user, pass1)
		if res ~= 0 then os.exit(1) end
		if group == "root" then
			res = util.setpasswd("root", pass1)
			if res ~= 0 then
				if user_password then
					util.setpasswd(user, user_password, true)
				end
				os.exit(1)
			end
		end

		self.uci:set("vuci", "main", "firstlogin", "")
		self.uci:commit("vuci")
		profiles.update()

		local sessions = {util.ubus("session", "list")}
		for _, single_session in ipairs(sessions) do
			if single_session.data.username == user and single_session.ubus_rpc_session ~= self.user.sid then
				util.ubus("session", "destroy", { ubus_rpc_session = single_session.ubus_rpc_session })
			end
		end
		os.exit(0)
	end
	self:ResponseOK()
end

administration:action("reboot", administration.reboot)

administration:action("network_restart", administration.network_restart)

local firstlogin = administration:action("change_password_firstlogin", administration.change_password_firstlogin)
	local psw = firstlogin:option("password")
	psw.require = true
	psw.maxlength = 256
		function psw:validate(value)
			return self.dt:system_password(value)
		end

	local psw_confirm = firstlogin:option("password_confirm")
	psw_confirm.require = true
	psw_confirm.maxlength = 256
		function psw_confirm:validate(value)
			return self.dt:system_password(value)
		end

function administration:PUT_after_commit_hook()
	local ubus = require("ubus")
	local con = ubus.connect()
	con:send("vuci.notify", {
		event = "update_language"
	})
	con:close()
end

local vuci = administration:section("vuci", "core")
	local lang = vuci:option("lang_code")
		function lang:validate(value)
			local lang_options = self:get_installed_languages()
			local langs = {}
			for _, opt in pairs(lang_options) do
					table.insert(langs, opt.code)
			end
			return self.dt:check_array(value, langs)
		end
		function lang:get()
			return self:table_get(self.config, self.sid, "lang")
		end
		function lang:set(value)
			self:table_set(self.config, self.sid, "lang", value)
		end

	if not board:is_ap() and not board:is_industrial_ap() then
		-- DEPRECATED
		local advanced = vuci:option("advanced")
			function advanced:validate(value)
				return self.dt:is_bool(value)
			end
			function advanced:get(value)
				return value and value or "0"
			end
	end

	local firstlogin = vuci:option("firstlogin")
	firstlogin.readonly = true
		function firstlogin:get()
			return self:table_get(self.config, self.sid, self.api_key) == "1" and "1" or "0"
		end

	local devicename = vuci:option("devicename")
		function devicename:validate(value)
			return self.dt:string(value)
		end
		function devicename:get()
			return self:table_get("system", "system", "devicename")
		end
		function devicename:set(value)
			self:table_set("system", "system", "devicename", value)
		end

	local hostname = vuci:option("hostname")
		function hostname:validate(value)
			return self.dt:system_host(value)
		end
		function hostname:get()
			return self:table_get("system", "system", "hostname")
		end
		function hostname:set(value)
			local is_snmp = pac.is_installed("snmp")
			if (is_snmp) then
				self:table_foreach("snmpd", "system", function(c)
					self:table_set("snmpd", c[".name"], "sysName", value)
				end)
			end
			self:table_set("system", "system", "hostname", value)
		end

	local api_timeout = vuci:option("api_session_timeout")
		function api_timeout:validate(value)
			return self.dt:irange(value, 1, 2147483) -- max, min values
		end

	local session_timeout = vuci:option("session_timeout")
		function session_timeout:validate(value)
			return self.dt:min(value, 1) -- min value
		end

	local data_analytics = vuci:option("data_analytics")
		function data_analytics:validate(value)
			return self.dt:is_bool(value)
		end
		function data_analytics:get(value)
			return value or "0"
		end

	local notifications_enabled = vuci:option("notifications_enabled")
		function notifications_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function notifications_enabled:get(value)
			return value or "1"
		end

	local alerts_enabled = vuci:option("alerts_enabled")
		function alerts_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function alerts_enabled:get(value)
			return value or "1"
		end

function administration:GET_TYPE_languages()
	if self.sid ~= "options" then
		self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, "Endpoint not implemented.", "Request", "404")
	end
	local languages = self:get_installed_languages() or {}
	local langs_arr = {}
	for _, language in pairs(languages) do
		-- there are default uci options that start with a dot
		if string.sub(language.code, 1, 1) ~= "." then
			langs_arr[#langs_arr + 1] = { code = language.code, name = language.language, filename = language.filename }
		end
	end
	return self:ResponseOK(langs_arr)
end

return administration