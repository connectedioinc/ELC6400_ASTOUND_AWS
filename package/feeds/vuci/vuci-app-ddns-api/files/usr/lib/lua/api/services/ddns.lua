local ConfigService = require("api/ConfigService")
local DDNS = require("luci.tools.ddns")
local util = require("vuci.util")

local ddns = ConfigService:new()
function ddns:initialize_hook()
	self.service_options = {}
	self.iface_options = {}
	self.openvpn_map = {}
end

function ddns:section_init_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local service_name = self:get_abs_value(self.config, self.sid, "service_name")
	local update_url = self:get_abs_value(self.config, self.sid, "update_url")
	local service_name_exists = service_name ~= nil and service_name ~= ""
	local update_url_exists = update_url ~= nil and update_url ~= ""

	if enabled ~= "1" then return end
	if not service_name_exists and not update_url_exists then
		self:add_error(STD_CODES.INVALID_OPT, "missing required option: update_url or service_name", "enabled")
	end

	local authentication_type = self:getter_wrapped_abs_value(self.config, self.sid, "cloudflare_authentication_type")
	if service_name == "cloudflare.com-v4" then
		if not authentication_type or authentication_type == "" then
			self:add_error(STD_CODES.INVALID_OPT, "missing required option: cloudflare_authentication_type", "enabled")
		end
	elseif authentication_type then
		self:table_delete(self.config, self.sid, "cloudflare_authentication_type")
	end
end
ddns.PUT_section_init_hook = ddns.section_init_hook
ddns.POST_section_init_hook = ddns.section_init_hook

function ddns:before_commit_hook()
	if self:table_find(self.config, "service", {enabled = "1"}) then
		local rebind_protection = self.uci:get("dhcp", "@dnsmasq[0]", "rebind_protection")
		if rebind_protection ~= "0" then
			self:add_message(1, "DNS rebind protection is enabled. It is recommended to disable rebind protection when using DDNS in a private network.")
		end
	end

	if not self.current_data_block.lookup_host and self.current_data_block.domain then
		self:table_delete(self.config, self.sid, "lookup_host")
	end

	local authentication_type = self:getter_wrapped_abs_value(self.config, self.sid, "cloudflare_authentication_type")
	if authentication_type == "emailAPI" then
		local username = self:get_abs_value(self.config, self.sid, "username")
		if username and username ~= "" then
			local valid, err = self.dt:email(username)
			if not valid then self:add_error(STD_CODES.INVALID_OPT, err, "username") end
		end
	elseif authentication_type == "bearer" then
		self:table_set(self.config, self.sid, "username", "Bearer")
	end
end
ddns.PUT_before_commit_hook = ddns.before_commit_hook
ddns.POST_before_commit_hook = ddns.before_commit_hook
ddns.DELETE_before_commit_hook = ddns.before_commit_hook

function ddns:get_service_options()
	if #self.service_options > 0 then return self.service_options end
	local use_ipv6 = self:get_abs_value(self.config, self.sid, "use_ipv6") == "1"
	local services4 = {}
	local fd4 = io.open("/etc/ddns/services" .. (use_ipv6 and "_ipv6" or ""), "r")
	if fd4 then
		local ln, s, t
		repeat
			ln = fd4:read("*l")
			s  = ln and ln:match('^%s*".*')	-- "only handle lines beginning with {"}"
			s  = s  and  s:gsub('"','')	 -- "remove {"} "
			t  = s  and util.split(s,"(%s+)",nil,true)	-- "split on whitespaces"
			if t then services4[t[1]]=t[2] end

		until not ln
		fd4:close()
	else return false, "Service providers not found."
	end
	for k, v in pairs(services4) do
		table.insert(self.service_options, k)
	end
	table.insert(self.service_options, "")
	return self.service_options
end

function ddns:get_iface_options()
	if #self.iface_options > 0 then return self.iface_options end
	self:table_foreach("network", "interface", function(s)
		if s[".name"] ~= "loopback" then
			table.insert(self.iface_options, s.name or s[".name"])
		end
	end)
	self:table_foreach("openvpn", "openvpn", function(s)
		if s.type == "client" then
			local ifname = "openvpn_"..s[".name"]
			self.openvpn_map[ifname] = s.dev
			table.insert(self.iface_options, ifname)
		end
	end)
	return self.iface_options
end

local s = ddns:section("ddns", "service")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"ip_source"} }
		function enabled:validate(value) return self.dt:is_bool(value) end

	local use_https = s:option("use_https")
		function use_https:validate(value)
			if DDNS.env_info("has_ssl") then return self.dt:is_bool(value) end
			return false, "Environment does not support https."
		end
		function use_https:set(value)
			local cacert = value == "1" and "/etc/cacert.pem" or "IGNORE"
			self:table_set(self.config, self.sid, "cacert", cacert)
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local use_ipv6 = s:option("use_ipv6")
		function use_ipv6:validate(value)
			if DDNS.env_info("has_ipv6") then return self.dt:is_bool(value) end
			return false, "Environment does not support ipv6."
		end

	local lookup_host = s:option("lookup_host")
		function lookup_host:validate(value) return self.dt:hostname(value) end

	local service_name = s:option("service_name")
		service_name.require = { ["bind-nsupdate"] = {"dns_server"} }
		function service_name:validate(value) return self.dt:check_array(value, self:get_service_options()) end

	local dns_server = s:option("dns_server")
		function dns_server:validate(value) return self.dt:ipaddr(value) end

	local authentication_type = s:option("cloudflare_authentication_type")
	function authentication_type:validate(value)
		return self.dt:check_array(value, {"emailAPI", "bearer"})
	end
	function authentication_type:set(value)
		self:table_set(self.config, self.sid, "_authentication_type", value)
	end
	function authentication_type:get()
		return self:table_get(self.config, self.sid, "_authentication_type")
	end

	local update_url = s:option("update_url")
		function update_url:validate(value)
			if string.match(value, "^[a-zA-Z0-9!@#%$%%&%*%+%-/=%?%^_`{|}~:%.%[%]]+$") ~= nil then
				return true
			end
			return false, "Only alphanumericals and special characters are accepted"
		end

	local domain = s:option("domain")
		function domain:validate(value)
			if string.match(value, "^[a-zA-Z0-9!@#%$%%&%*%+%-/=%?%^_`{|}~:%.%[%]]+$") ~= nil then
				return true
			end
			return false, "Only alphanumericals and special characters are accepted"
		end

	local username = s:option("username")
		username.maxlength = 64
		function username:validate(value) return self.dt:credentials_validate(value) end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 88
		function password:validate(value) return self.dt:credentials_validate(value) end

	local ip_source = s:option("ip_source")
		ip_source.require = {
			script = {"interface"},
			network = {"interface"},
			web = {"ip_url"}
		}
		function ip_source:validate(value) return self.dt:check_array(value, {"network", "web", "interface", "script"}) end

	local interface = s:option("interface", { always_set = true })
		function interface:validate(value) return self.dt:check_array(value, self:get_iface_options()) end
		function interface:get(value) return util.network_mapper_get(self, value) end
		function interface:set(value)
			util.network_mapper_set(self, value)
			local val = self.openvpn_map[value] or util.get_network_map(self)[value] or value
			local use_ipv6 = self:get_abs_value(self.config, self.sid, "use_ipv6") == "1"
			if self:table_get("network", value, "proto") == "wwan" then val = val .. (use_ipv6 and "_6" or "_4") end
			self:table_set(self.config, self.sid, "ip_network", val)
		end

	local ip_url = s:option("ip_url")
		function ip_url:validate(value) return self.dt:protourl(value) end

	local ip_script = s:option("ip_script")
		function ip_script:validate(value) return self.dt:string(value) end

	local check_interval = s:option("check_interval")
		function check_interval:validate(value)
			local values = util.split(value or "", ",")
			local valid, err
			if values[2] == "seconds" then valid, err = self.dt:irange(values[1], 300, 600000)
			elseif values[2] == "minutes" then valid, err = self.dt:irange(values[1], 5, 600000)
			elseif values[2] == "hours" then valid, err = self.dt:irange(values[1], 1, 600000)
			else return false, "Option is invalid, accepted format: 'time_amount,time_unit' ('time_unit' can be 'seconds', 'minutes' or 'hours')" end

			if not valid then return valid, err end

			local force_interval_value = self:getter_wrapped_abs_value(self.config, self.sid, "force_interval")

			local force_values = util.split(tostring(force_interval_value or ""), ",")
			local check = DDNS.calc_seconds(tonumber(values[1]), values[2])
			local force = DDNS.calc_seconds(tonumber(force_values[1]), force_values[2])
			if check and force and force < check then
				return false, "Force interval must be greater or equal to Check Interval"
			end
			return true
		end
		function check_interval:get(value)
			local v1 = self:table_get(self.config, self.sid, "check_interval")
			local v2 = self:table_get(self.config, self.sid, "check_unit")
			if v1 and v2 then
				return v1 .. "," .. v2
			end
		end
		function check_interval:set(value)
			local values = util.split(value or "", ",")
			self:table_set(self.config, self.sid, "check_interval", values[1] or "")
			self:table_set(self.config, self.sid, "check_unit", values[2] or "")
		end

	local force_interval = s:option("force_interval")
		function force_interval:validate(value)
			local values = util.split(value or "", ",")
			local valid, err
			if values[2] == "minutes" then valid, err = self.dt:irange(values[1], 5, 600000)
			elseif values[2] == "hours" then valid, err = self.dt:irange(values[1], 1, 600000)
			elseif values[2] == "days" then valid, err = self.dt:irange(values[1], 1, 600000)
			else return false, "Option is invalid, accepted format: 'time_amount,time_unit' ('time_unit' can be 'minutes', 'hours' or 'days')" end

			if not valid then return valid, err end

			local check_interval_value = self:getter_wrapped_abs_value(self.config, self.sid, "check_interval")

			local check_values = util.split(tostring(check_interval_value or ""), ",")
			local check = DDNS.calc_seconds(tonumber(check_values[1]), check_values[2])
			local force = DDNS.calc_seconds(tonumber(values[1]), values[2])
			if check and force and force < check then
				return false, "Force interval must be greater or equal to Check Interval"
			end
			return true
		end
		function force_interval:get(value)
			local v1 = self:table_get(self.config, self.sid, "force_interval")
			local v2 = self:table_get(self.config, self.sid, "force_unit")
			if v1 and v2 then
				return v1 .. "," .. v2
			end
		end
		function force_interval:set(value)
			local values = util.split(value or "", ",")
			self:table_set(self.config, self.sid, "force_interval", values[1] or "")
			self:table_set(self.config, self.sid, "force_unit", values[2] or "")
		end


--------------------------------------------- /ddns/status -----------------------------------------
local nixio  = require ("nixio")
local luci_helper = "/usr/lib/ddns/dynamic_dns_lucihelper.sh"

local function remove_empty_fields(data)
	for key, value in pairs(data) do
		local v = util.trim(tostring(value))
		if v == "" or v == "-" then
			data[key] = nil
		end
	end
end

function ddns:get_status(sid)
	local data = {}
	self.uci:foreach("ddns", "service", function (s)
		if self.sid and s[".name"] ~= self.sid then return end
		local section	= s[".name"]
		local enabled	= tonumber(s["enabled"]) or 0
		local datelast	= "_empty_"	-- formatted date of last update
		local datenext	= "_empty_"	-- formatted date of next update
		local datelaststat = nil
		local datenextstat = nil
		local check	 = s["check_interval"] or "-"
		local force  = s["force_interval"] or "-"
		local c_unit = s["check_unit"] or ""
		local f_unit = s["force_unit"] or ""

		if check ~= "-" and c_unit == "" then
			c_unit = "minutes"
		end

		if force ~= "-" and f_unit == "" then
			f_unit = "hours"
		end

		-- get force seconds
		local force_seconds = DDNS.calc_seconds(
			tonumber(s["force_interval"]) or 72 ,
			s["force_unit"] or "hours"
		)

		-- get/validate pid and last update
		local pid      = DDNS.get_pid(section)
		local uptime = nixio.sysinfo().uptime
		local lasttime = DDNS.get_lastupd(section)
		if lasttime > uptime then 	-- /var might not be linked to /tmp
			lasttime = 0 		-- and/or not cleared on reboot
		end

		if lasttime == 0 then -- no last update happen
			datelast = "_never_"
			datelaststat = "Never"
		else -- we read last update
			local epoch = os.time() - uptime + lasttime -- sys.epoch - sys uptime   + lastupdate(uptime)
			-- use linux date to convert epoch
			datelast = DDNS.epoch2date(epoch)
			datelaststat = datelast
			-- calc and fill next update
			datenext = DDNS.epoch2date(epoch + force_seconds)
			datenextstat = datenext
		end

		-- process running but update needs to happen
		-- problems if force_seconds > uptime
		force_seconds = (force_seconds > uptime) and uptime or force_seconds

		if lasttime == 0 then -- never run
			datenext = "_neverupdated_"
			datenextstat = "-"
		elseif force_seconds == 0 then -- run once
			datenext = "_runonce_"
			datenextstat = "Run once"
		elseif pid == 0 and enabled == 0 then -- no process running and NOT enabled
			datenext  = "_disabled_"
			datenextstat = "Disabled"
		elseif pid == 0 and enabled ~= 0 then -- no process running and enabled
			datenext = "_stopped_"
			datenextstat = "Stopped"
		end

		-- get/set monitored interface and IP version
		local iface	= s["interface"] or "wan"
		local use_ipv6	= tonumber(s["use_ipv6"]) or 0
		local ipv = (use_ipv6 == 1) and "IPv6" or "IPv4"
		iface = ipv .. " / " .. iface

		-- try to get registered IP
		local lookup_host = s["lookup_host"] or "-"

		local chk_sec  = DDNS.calc_seconds(
			tonumber(s["check_interval"]) or 10,
			s["check_unit"] or "minutes"
		)
		local reg_ip = DDNS.get_regip(section, chk_sec)

		if reg_ip == "NOFILE" then
			local force_ipversion = tonumber(s["force_ipversion"] or 0)
			local force_dnstcp    = tonumber(s["force_dnstcp"] or 0)
			local is_glue   = tonumber(s["is_glue"] or 0)
			local dnsserver	= s["dns_server"] or ""

			local luci_helper_args = {}
			if use_ipv6 == 1		then luci_helper_args[#luci_helper_args+1] = "-6" end
			if force_ipversion == 1	then luci_helper_args[#luci_helper_args+1] = "-f" end
			if force_dnstcp == 1	then luci_helper_args[#luci_helper_args+1] = "-t" end
			if is_glue == 1			then luci_helper_args[#luci_helper_args+1] = "-g" end

			if #dnsserver > 0 then
				luci_helper_args[#luci_helper_args+1] = "-d"
				luci_helper_args[#luci_helper_args+1] = dnsserver
			end

			luci_helper_args[#luci_helper_args+1] = "-l"
			luci_helper_args[#luci_helper_args+1] = lookup_host
			luci_helper_args[#luci_helper_args+1] = "-S"
			luci_helper_args[#luci_helper_args+1] = section
			luci_helper_args[#luci_helper_args+1] = '--'
			luci_helper_args[#luci_helper_args+1] = 'get_registered_ip'


			local luci_helper_response = util.file_exec(
				luci_helper,
				luci_helper_args,
				nixio.getuid() == 0 and {
					username = "ddns"
				}
			)
			reg_ip = luci_helper_response.stdout or ""
		end

		-- fill transfer array
		local res = {
			section  = section,
			iface    = iface,
			lookup   = lookup_host,
			reg_ip   = reg_ip,
			is_up    = pid ~= 0,
			datelast = datelast,
			datenext = datenext,
			datelaststat = datelaststat,
			datenextstat = datenextstat,
			check = check .. " " .. c_unit,
			force = force .. " " .. f_unit
		}
		remove_empty_fields(res)
		data[#data+1] = res
	end)

	return not self.sid and data or data[1]
end

function ddns:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function ddns:GET_TYPE_status()
	if self._single then
		local res = self:get_status(self.sid)
		if not res then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "Section not found.", "URL", "404")
		end
		return self:ResponseOK(res)
	end
	local res = self:get_status()
	return self:ResponseOK(res)
end

--------------------------------------------- /ddns/options -----------------------------------------
local function get_service_providers(path)
	local services4 = {}
	local fd4 = io.open(path, "r")
	if fd4 then
		local ln, s, t
		repeat
			ln = fd4:read("*l")
			s  = ln and ln:match('^%s*".*')	-- only handle lines beginning with "
			s  = s  and  s:gsub('"','')	-- remove "
			t  = s  and util.split(s,"(%s+)",nil,true)	-- split on whitespaces
			if t then services4[t[1]]=t[2] end
		until not ln
		fd4:close()
	end
	return services4
end

function ddns:GET_TYPE_options()
	local res = {}
	res.service_providers = get_service_providers("/etc/ddns/services")
	if DDNS.env_info("has_ipv6") then
		res.service_providers_ipv6 = get_service_providers("/etc/ddns/services_ipv6")
	end
	res.env_info = DDNS.env_info_full()

	return self:ResponseOK(res)
end

return ddns
