local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local siteman_utils = require("api/services/site_manager/siteman_utils")
local all_ports = {"port1", "port2", "port3", "port4", "port5", "port6", "port7", "port8"}
local port_count = 0

local AutoReboot = ConfigService:new({
	increment_name = true
})


port_count = #all_ports

function AutoReboot:GET_TYPE_options()
	local options = {}
	options["available_ports"] = all_ports
	return self:ResponseOK(options)
end

local ip_types = {
	"ipv4", "ipv6"
}

function AutoReboot:get_ip_type(option_name, flag)
	if not option_name then
		return
	end
	local option_value = nil
	if flag then
		option_value = self:get_abs_value(self.config, self.sid, option_name)
	else
		option_value = self:table_get(self.config, self.sid, option_name)
	end
	if not option_value  or option_value == "" then
		return "ipv4"
	else
		return option_value
	end
end

function AutoReboot:custom_require_check(current, absolute, option_name)
	if not current or not absolute or current == "" or absolute == "" then
		return
	end
	local opt_value = self.current_data_block[current] or self:get_abs_value(self.config, self.sid, absolute)
	if not opt_value or opt_value == "" then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required option: " .. option_name, "enable")
	end
end

function AutoReboot:custom_require_check(value)
	local opt_value = nil
	if value and value == "url" then
		opt_value = self.current_data_block["url"] or self:get_abs_value(self.config, self.sid, "host")
	else
		opt_value = self:get_abs_value(self.config, self.sid, value) or self.current_data_block[value]
	end
	if not opt_value or opt_value == "" then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required option: " .. value, "enable")
	end
end

local opt_enable

function AutoReboot:require_validation()
	local enabled = self:get_abs_value(self.config, self.sid, "enable") or self.current_data_block["enable"]
	if enabled and enabled == "1" then
		local option_type = self:get_abs_value(self.config, self.sid, "type") or self.current_data_block["type"]
		local action = self:get_abs_value(self.config, self.sid, "action") or self.current_data_block["action"]
		local required_options = {"type", "action", "time", "retry", "time_out"}
		if option_type then
			if option_type == "wget" then
				self:custom_require_check("url", "host", "url")
			end
		end
		opt_enable.require = {["1"] = required_options}
	end
end

AutoReboot.PUT_validate_section_hook = AutoReboot.require_validation
AutoReboot.POST_validate_section_hook = AutoReboot.require_validation

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

local PingReboot = AutoReboot:section("siteman_ping_reboot", "ping_reboot")
	function PingReboot:create_defaults()
		return {
			time_out = "10",
			packet_size = "56",
			retry = "2",
			interface = "1"
		}
	end

	opt_enable = PingReboot:option("enable")
		function opt_enable:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_stop_action = PingReboot:option("stop_action")
		function opt_stop_action:validate(value)
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
			if option_type == "port" then
				table.insert(actions, "7") -- Restart port
			end
			return self.dt:check_array(value, actions)
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
			return self.dt:check_array(value, interfaces)
		end

	local opt_ip_type = PingReboot:option("ip_type")
		function opt_ip_type:validate(value)
			return self.dt:check_array(value, ip_types)
		end
		function opt_ip_type:get(_)
			return self:get_ip_type(self.api_key)
		end

	local opt_host = PingReboot:option("host")
		function opt_host:validate(value)
			local is_ipv6 = self:get_ip_type("ip_type", true) == "ipv6"
			if is_ipv6 then
				return self.dt:ipv6host(value)
			end
			return self.dt:ipv4host(value)
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

AutoReboot = siteman_utils:wrap_endpoint(AutoReboot)

return AutoReboot