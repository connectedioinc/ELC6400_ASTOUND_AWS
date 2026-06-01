local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local util = require("vuci.util")
local json = require("luci.jsonc")
local fs = require("nixio.fs")
local json = require("luci.jsonc")
local tmp_path = "/var/run/tailscale/"

local tailscale = ConfigService:new({
	delete = false,
	create = false,
	general_section = "settings"
})

local s = tailscale:section("tailscale", "settings")

local tailscale_command = "/usr/sbin/tailscale"
if not fs.access(tailscale_command, "x") then
	tailscale_command = "/usr/local" .. tailscale_command
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

local enabled
function tailscale:require_validation()
	local enable = self:get_abs_value(self.config, self.sid, "enabled")
	local required_options = {}
	if enable and enable == "1" then
		local default_route = self:get_abs_value(self.config, self.sid, "default_route")
		local auth_type = self:get_abs_value(self.config, self.sid, "auth_type")
		if default_route == "1" then table.insert(required_options, "exit_node_ip") end
		if auth_type == "key" then table.insert(required_options, "auth_key") end
		enabled.require = {["1"] = required_options}
	end
end
tailscale.PUT_validate_section_hook = tailscale.require_validation

enabled = s:option("enabled")
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

local auth_key = s:option("auth_key", { sensitive = true })
	auth_key.minlength = 22
	auth_key.maxlength = 64
	function auth_key:validate(value)
		return self.dt:fieldvalidation(value, "^[a-zA-Z0-9-]+$", 0)
	end

local advert_routes = s:option("advert_routes", { list = true })
	function advert_routes:validate(value)
		return self.dt:cidr4(value) or self.dt:cidr6(value), "IPv4 or IPv6 address/subnet is accepted."
	end

local accept_routes = s:option("accept_routes")
	function accept_routes:validate(value)
		return self.dt:is_bool(value)
	end

local exit_node = s:option("exit_node")
	function exit_node:validate(value)
		return self.dt:is_bool(value)
	end

local default_route = s:option("default_route")
	function default_route:validate(value)
		return self.dt:is_bool(value)
	end

local exit_node_ip = s:option("exit_node_ip")
	function exit_node_ip:validate(value)
		return self.dt:ip4addr(value) or self.dt:ip6addr(value), "IPv4 or IPv6 address is accepted."
	end

local auth_type = s:option("auth_type")
	function auth_type:validate(value)
		local types = { "url", "key" }
		return self.dt:check_array(value, types)
	end

local login_server = s:option("login_server")
	function login_server:validate(value)
		return self.dt:protourl(value)
	end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function tailscale:status_file_info(status_file)
	local status, url, ip, message
	if status_file and fs.access(status_file) then
		local parsed = json.parse(fs.readfile(status_file))
		if parsed and parsed[1] then
			local info = parsed[1]
			status = info.status
			url = info.url
			ip = info.ip
			message = info.message
		end
	end
	return status, url, ip, message
end

function tailscale:GET_TYPE_status()
	local STATUS = {
		DISCONNECTED = "0",
		CONNECTED = "1",
		STOPPED = "2",
		DISABLED = "3"
	}
	local data, data_f, add_err = {}, {}, false
	local state, url, ip, status_state
	local enabled = self:table_get(self.config, "settings", "enabled")
	local status_file = tmp_path .. "status"
	local err_file = tmp_path .. "err"

	if enabled == "1" then
		local ts = util.ubus("service", "list").tailscale
		if not ts or not ts.instances or not ts.instances.instance1 or not ts.instances.instance1.running then
			fs.writefile(status_file,"")
			state = STATUS.STOPPED
		else
			local status_pid = util.file_exec("/usr/bin/pgrep", {"-f", tailscale_command .. " |" .. tailscale_command .. "d --cleanup|/etc/init.d/tailscale"}).stdout or ""
			if status_pid == "" then
				status_state = util.file_exec(tailscale_command, {"status", "--json"}).stdout or ""
				if status_state ~= "" then
					status_state = json.parse(status_state)
					local message = status_state.Health or {}
					for _,v in pairs(message) do
						if v == "Tailscale is stopped." then
							add_err = true
							break
						end
					end
					if add_err and fs.access(err_file) then
						local f = io.open(err_file)
						if f then
							for ln in f:lines() do
								if not ln then break end
								table.insert(message, ln)
							end
						end
						f:close()
					end
					table.insert(data_f, {
						status = status_state.BackendState == "Running" and STATUS.CONNECTED or STATUS.DISCONNECTED,
						url = status_state.AuthURL or "",
						ip = status_state.TailscaleIPs or "",
						message = message or ""
					})
					fs.writefile(status_file, json.stringify(data_f))
				end
			end
			state, url, ip, message = self:status_file_info(status_file)
		end
	else
		fs.writefile(status_file,"")
		state = STATUS.DISABLED
	end
	util.set_file_permissions(status_file, "tailscale")

	table.insert(data, {
		status = state or "",
		url = url or "",
		ip = ip or "",
		message = message or ""
	})
	self:ResponseOK(data)
end

tailscale:action("logout", function (self)
	local log = require("vuci/log")
	local status_pid = util.file_exec("/usr/bin/pgrep", {"-f", "tailscale logout"}).stdout or ""
	if status_pid ~= "" then
		self:ResponseError("Logout process is already running")
	end
	if util.file_exec(tailscale_command, {"logout"}).code == 0 then
		local t = {table = "events", sender = "Web UI", priority = "notice", text = "Disconnect from Tailscale"}
		log:insert_eventslog(t)
		fs.writefile(tmp_path .. "logout","1")
		util.set_file_permissions(tmp_path .. "logout", "tailscale")
		util.ubus("rc", "init", { name = "tailscale", action = "restart" })
		return self:ResponseOK()
	else
		local t = {table = "events", sender = "Web UI", priority = "notice", text = "Failed to disconnect from Tailscale"}
		log:insert_eventslog(t)
		self:ResponseError("Failed to disconnect from Tailscale")
	end
end)

function tailscale:check_changes(opt)
	local function is_table_empty(t)
		if type(t) ~= "table" then return false end
		if type(next(t)) == "nil" then return true end
		for _, v in ipairs(t) do
			if v ~= "" and v ~= nil then
				return false
			end
		end
		return true
	end
	for p, o in pairs(opt) do
		local param = self.uci:get(self.main_config, self.sid, o) or ""
		local param_abs = self:get_abs_value(self.main_config, self.sid, o) or ""
		if is_table_empty(param) then param = "" end
		if is_table_empty(param_abs) then param_abs = "" end
		if not util.deep_compare(param, param_abs) then
			return true
		end
	end
	return false
end

function tailscale:PUT_before_commit_hook()
	local auth_type = self.uci:get(self.config, self.sid, "auth_type")
	local auth_type_ = self:get_abs_value(self.config, self.sid, "auth_type")
	if auth_type == "key" and auth_type_ == "url" then
		util.file_exec(tailscale_command, {"logout"})
	end

	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if enabled == "1" then
		local zone = {
			device = "tailscale0",
			name = "tailscale",
			input = "ACCEPT",
			forward = "REJECT",
			output = "ACCEPT",
			masq = "1"
		}
		local zone_name = util_tlt.ensure_zone_exists(self, zone, nil, zone.device).name
		if zone_name == zone.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name, true) end
	end

	local default_route = self:get_abs_value(self.config, self.sid, "default_route")
	if default_route == "1" then
		self:table_delete(self.config, self.sid, "exit_node")
	else
		self:table_delete(self.config, self.sid, "exit_node_ip")
	end

	local logout_state = fs.readfile(tmp_path .. "logout")
	if logout_state and (logout_state == "1" or logout_state == "2") then
		local opt = {"enabled", "auth_key", "advert_routes", "accept_routes", "exit_node", "auth_type", "default_route", "exit_node_ip", "login_server"}
		local change = self:check_changes(opt)
		if not change then
			util.ubus("service", "event", { type = "config.change", data = { package = "tailscale" } })
		end
		fs.writefile(tmp_path .. "logout","")
	end
end

return tailscale