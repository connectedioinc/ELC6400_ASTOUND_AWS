local ConfigService = require("api/ConfigService")
local all_modems = require("vuci.modem"):get_all_modems()
local board = require("vuci.board")
local util = require("vuci.util")
local fs = require("nixio.fs")
local poe = board:has_poe()
local all_ports = {}
local port_count = 0

local AutoReboot = ConfigService:new({
	anonymous = true
})

if poe and fs.access("/etc/config/poe") then
	local uci = AutoReboot.uci
	local poe_data = board:poe() or {}
	local ports = poe_data.ports or {}
	for _, port in ipairs(ports) do
		if port.name then
			uci:foreach("poe", nil, function (s)
				if s.name == port.name then
					table.insert(all_ports, s[".name"])
					return false
				end
			end)
		end
	end
end

port_count = #all_ports

if port_count > 0 then 
	function AutoReboot:GET_TYPE_options()
		local options = {}
		options["available_ports"] = all_ports
		return self:ResponseOK(options)
	end
end

local ip_types = {
	"ipv4", "ipv6"
}

-- Returns device sim count.
---@param modems table Device modem list.
---@return number sim_count Device sim count.
local function get_device_sim_count(modems)
	local count = 0
	for _, v in pairs(modems) do
		local sim_count = tonumber(v.sim_count)
		if sim_count then
			count = count + sim_count
		end
	end
	return count
end

function AutoReboot:get_ip_type(option_name, flag)
	if not option_name then
		return
	end
	local val = flag and self:get_abs_value(self.config, self.sid, option_name) or self:table_get(self.config, self.sid, option_name)
	return val or "ipv4"
end

local opt_enable

function AutoReboot:require_validation()
	if self:get_abs_value(self.config, self.sid, "enable") ~= "1" then return end

	local option_type = self:get_abs_value(self.config, self.sid, "type")
	local action = self:get_abs_value(self.config, self.sid, "action")
	local r = {"type", "action", "time", "retry", "time_out"}

	if option_type == "wget" then
		r[#r+1]="url"
	elseif option_type == "ping" then
		local interface = self:get_abs_value(self.config, self.sid, "interface")
		r[#r+1]="interface"
		r[#r+1]="packet_size"
		local sim_count = get_device_sim_count(all_modems)
		if interface == "1" then
			r[#r+1]="host"
			r[#r+1]="ip_type"
		elseif interface == "2" and sim_count > 1 then
			r[#r+1]="host1"
			r[#r+1]="ip_type1"
			r[#r+1]="host2"
			r[#r+1]="ip_type2"
		elseif interface == "2" and sim_count == 1 then
			r[#r+1]="host1"
			r[#r+1]="ip_type1"
		end
	elseif option_type == "port" and port_count >= 1 then
		r[#r+1]="ping_port_type"
		local ping_port_type = self:get_abs_value(self.config, self.sid, "ping_port_type")
		if ping_port_type == "ping_ip" then
			r[#r+1]="ip_type"
			r[#r+1]="host"
		elseif ping_port_type == "ping_port" then
			r[#r+1]="port_host"
		end
	end

	if (action == "2" or action == "4" or action == "5") and #all_modems > 1 then
		r[#r+1]="modem"
	end
	if action == "6" then
		if #all_modems > 1 then
			r[#r+1]="modem_id_sms"
		end
		r[#r+1]="number"
		r[#r+1]="message"
	end
	opt_enable.require = {["1"] = r}
end

---Handles options which can be accepted as a list or as a single value.
function AutoReboot:list_opt_wrapper()
	for _, sec in ipairs(self.sections) do
		for _, opt_wrapper in ipairs(sec.options) do
			local _, opt = next(opt_wrapper)
			if opt.list_allowed then
				opt.list = type(self:getter_wrapped_abs_value(self.config, self.sid, opt.api_key)) == "table"
			end
		end
	end
end

function AutoReboot:validate_section_hook()
	self:require_validation()
	self:list_opt_wrapper()
end

AutoReboot.GET_section_init_hook = AutoReboot.list_opt_wrapper
AutoReboot.PUT_section_init_hook = AutoReboot.validate_section_hook
AutoReboot.POST_section_init_hook = AutoReboot.validate_section_hook

function AutoReboot:check_port_host_duplication()
	local port_host = self:get_abs_value(self.config, self.sid, "port_host")
	if port_host and type(port_host) == "table" then
		local used_duplicates = {}
		local duplicates = {}
		local found = {}
		for _, value in ipairs(port_host) do
			local port, _ = string.match(value, "(%a+%s*%d+)=(%w+)")
			if found[port] then
				if not used_duplicates[port] then
					table.insert(duplicates, port)
				end
				used_duplicates[port] = true
			end
			if value and value ~= "" then
				found[port] = true
			end
		end
		if #duplicates > 0 then
			self:add_critical_error(
				STD_CODES.INVALID_OPT,
				string.format("No duplicate ports allowed. Found duplicate ports [%s].", table.concat(duplicates, ", ")),
				"port_host"
			)
		end
	end
end

AutoReboot.PUT_before_commit_hook = AutoReboot.check_port_host_duplication
AutoReboot.POST_before_commit_hook = AutoReboot.check_port_host_duplication

local PingReboot = AutoReboot:section("ping_reboot", "ping_reboot")
	function PingReboot:create_defaults()
		return {
			time_out = "10",
			packet_size = "56",
			retry = "2"
		}
	end

	opt_enable = PingReboot:option("enable")
		function opt_enable:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_stop_action = PingReboot:option("stop_action")
		function opt_stop_action:validate(value)
			if #all_modems == 0 then
				return false, "stop_action can only be set if device has a modem"
			end

			local pac = require("vuci.package_checker")
			if not pac.is_installed("quota_limit") then
				return false, "stop_action is not supported on this device"
			end
			return self.dt:is_bool(value)
		end

	local opt_type = PingReboot:option("type")
		function opt_type:validate(value)
			local available_types = {"ping", "wget"}
			if port_count >= 1 then
				table.insert(available_types, 'port')
			end
			return self.dt:check_array(value, available_types)
		end

	local opt_action = PingReboot:option("action")
		function opt_action:validate(value)
			local option_type = self:get_abs_value(self.config, self.sid, "type") or self.current_data_block["type"]
			local actions = {
				"1", -- Device reboot
				"3"  -- None
			}
			if #all_modems > 0 then
				table.insert(actions, "2") -- Modem reboot
				table.insert(actions, "4") -- (Re)register
				table.insert(actions, "5") -- Restart mobile connection
				table.insert(actions, "6") -- Send SMS
			end
			if port_count >= 1 and option_type == "port" then
				table.insert(actions, "7") -- Restart port
			end
			return self.dt:check_array(value, actions)
		end

	local opt_modem_id_sms = PingReboot:option("modem_id_sms")
		function opt_modem_id_sms:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_number = PingReboot:option("number", {list = true})
		function opt_number:validate(value)
			return self.dt:phonedigit(value)
		end

	local opt_message = PingReboot:option("message")
		opt_message.maxlength = 480
		function opt_message:validate(value)
			if not value:match("^[a-zA-Z0-9!@#$%&*+-/=?^_`{|}~. ]+$") then
				return false, "A message containing a-zA-Z0-9!@#$%&*+-/=?^_`{|}~. characters is accepted."
			end
			return true
		end

	local opt_modem = PingReboot:option("modem")
		function opt_modem:validate(value)
			return self.dt:check_modem(value)
		end

	local opt_time = PingReboot:option("time")
		function opt_time:validate(value)
			local intervals = {"1", "2", "3", "4", "5", "15", "30", "60", "120"}
			local action_value = self:get_abs_value(self.config, self.sid, "action")
			if action_value == "1" then
				intervals = {"5", "15", "30", "60", "120"}
			end
			return self.dt:check_array(value, intervals)
		end

	local opt_time_out = PingReboot:option("time_out")
		function opt_time_out:validate(value)
			return self.dt:irange(value, 1, 9999)
		end

	local opt_packet_size = PingReboot:option("packet_size")
		function opt_packet_size:validate(value)
			return self.dt:irange(value, 0, 1000)
		end

	local opt_retry = PingReboot:option("retry")
		function opt_retry:validate(value)
			return self.dt:irange(value, 1, 9999)
		end

	local opt_interface = PingReboot:option("interface")
		function opt_interface:validate(value)
			local interfaces = {
				"1", -- Automatically selected
			}
			if #all_modems > 0 then
				table.insert(interfaces, "2") -- Ping from mobile
			end
			return self.dt:check_array(value, interfaces)
		end
		function opt_interface:set(value)
			if value == "1" then
				self:table_delete(self.config, self.sid, "ip_type1")
				self:table_delete(self.config, self.sid, "host1")
				self:table_delete(self.config, self.sid, "ip_type2")
				self:table_delete(self.config, self.sid, "host2")
			elseif value == "2" then
				self:table_delete(self.config, self.sid, "ip_type")
				self:table_delete(self.config, self.sid, "host")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local opt_ip_type = PingReboot:option("ip_type")
		function opt_ip_type:validate(value)
			return self.dt:check_array(value, ip_types)
		end
		function opt_ip_type:get(_)
			return self:get_ip_type(self.api_key)
		end

	local opt_action_when = PingReboot:option("action_when")
		function opt_action_when:validate(value)
			return self.dt:check_array(value, {"all", "any"})
		end

	local opt_host = PingReboot:option("host")
		opt_host.list_allowed = true
		function opt_host:validate(value)
			local is_ipv6 = self:get_ip_type("ip_type", true) == "ipv6"
			if is_ipv6 then
				return self.dt:ipv6host(value)
			end
			return self.dt:ipv4host(value)
		end
		function opt_host:get(value)
			local _type = self:get_abs_value(self.config, self.sid, "type")
			if _type == "ping" or _type == "port" then
				return value
			end
		end
		function opt_host:set(value)
			local _type = self:get_abs_value(self.config, self.sid, "type")
			if _type == "ping" or _type == "port" then
				self:table_set(self.config, self.sid, self.api_key, value)
			end
		end

	if port_count >= 1 then
		local opt_port_type = PingReboot:option("ping_port_type")
			function opt_port_type:validate(value)
				return self.dt:check_array(value, {
					"ping_ip", "ping_port"
				})
			end

		local opt_port_host = PingReboot:option("port_host", {list = true})
			function opt_port_host:validate(value)
				local split_value = util.split(value, "=")
				if #split_value <= 1 or #split_value > 2 then 
					return false, "Incorrect format. Accepted format: [port=number]"
				end
				local port, digital = split_value[1], split_value[2]
				if tonumber(digital) == nil then
					return false, "Only digits are allowed after the '=' symbol."
				end
				local ok, _ = self.dt:uinteger(split_value[2])
				if not ok then
					return false, "After the '=' symbol value must be a valid unsigned integer."
				end
				local ok, _ = self.dt:min(split_value[2], "1")
				if not ok then
					return false, "After the '=' symbol minimum value is 1"
				end
				local ok, _ = self.dt:check_array(port, all_ports)
				if not ok then
					return false, string.format("Port '%s' not found.", port)
				end
				return true
			end
	end

	local opt_url = PingReboot:option("url")
		opt_url.list_allowed = true
		function opt_url:validate(value)
			local type_wget = self:get_abs_value(self.config, self.sid, "type") == "wget"
			local is_ipv6 = self:get_ip_type("ip_type", true) == "ipv6"
			if type_wget then
				return self.dt:protourl(value)
			end
			if is_ipv6 then
				return self.dt:ipv6host(value)
			end
			return self.dt:ipv4host(value)
		end
		function opt_url:get(_)
			if self:table_get(self.config, self.sid, "type") == "wget" then
				return self:table_get(self.config, self.sid, "host")
			end
		end
		function opt_url:set(value)
			local reboot_type = self:get_abs_value(self.config, self.sid, "type")
			if reboot_type == "wget" then
				self:table_set(self.config, self.sid, "host", value)
			end
		end

	local opt_ip_type1 = PingReboot:option("ip_type1")
		function opt_ip_type1:validate(value)
			if #all_modems > 0 then
				return self.dt:check_array(value, ip_types)
			end
			return false, "ip_type1 can only be set if device has a modem"
		end

	local opt_host1 = PingReboot:option("host1")
		opt_host1.list_allowed = true
		function opt_host1:validate(value)
			if #all_modems > 0 then
				local ip_type = self:get_ip_type("ip_type1", true)
				if ip_type == "ipv4" then
					return self.dt:ipv4host(value)
				end
				return self.dt:ipv6host(value)
			end
			return false, "host1 can only be set if device has a modem"
		end

	local opt_ip_type2 = PingReboot:option("ip_type2")
		function opt_ip_type2:validate(value)
			if #all_modems > 1 or get_device_sim_count(all_modems) > 1 then
				return self.dt:check_array(value, ip_types)
			end
			return false, "ip_type2 can only be set if device has more than one modem or more than one sim"
		end

	local opt_host2 = PingReboot:option("host2")
		opt_host2.list_allowed = true
		function opt_host2:validate(value)
			if #all_modems > 1 or get_device_sim_count(all_modems) > 1 then
				local ip_type = self:get_ip_type("ip_type2", true)
				if ip_type == "ipv4" then
					return self.dt:ipv4host(value)
				end
				return self.dt:ipv6host(value)
			end
			return false, "host2 can only be set if device has more than one modem or more than one sim"
		end

function AutoReboot:POST_validate_hook()
	local interfaces = 0
	self:table_foreach("ping_reboot", "ping_reboot", function (_)
			interfaces = interfaces + 1
	end)
	if interfaces >= 30 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 30 instances are allowed")
	end
end

return AutoReboot