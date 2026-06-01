local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local api_utils = require("api/api_utils")
local fs = require "nixio.fs"
local util = require("vuci.util")

if not board:has_gps()then
	return nil
end

local GPS = ConfigService:new({
	delete = false,
	create = false
})

GPS.ERROR_CODES = {
	FILE_INVALID_PREFIX = 3,
	FORWARDING_CACHE_INVALID = 4,
	COLLECTING_FILE_INVALID = 5
}

local NMEAFWD = GPS:section("gps", "section")

function NMEAFWD:filter(options)
	return options[".name"] == "nmea_forwarding"
end

function NMEAFWD:validate_mnt_path(value)
	local success, err = self.dt:validate_prefix(value, "/mnt/")
	if not success then return false, err, GPS.ERROR_CODES.FILE_INVALID_PREFIX end

	return self.dt:posix_path(value, "reg", false, true, 576)
end

	local opt_enabled = NMEAFWD:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local host_info = NMEAFWD:option("host_info", { list = true })
		function host_info:validate(value)
			return self:host_info_validation(value)
		end

	-- REMOVE_WITH_VERSION_UPGRADE: Remove option 'hostname'
	local opt_hostname = NMEAFWD:option("hostname")
	opt_hostname.cfg_require = true
		function opt_hostname:validate(value)
			return self.dt:host(value)
		end
		function opt_hostname:get()
			return self:get_host_info_part(1, 1)
		end
		function opt_hostname:set(value)
			self:set_host_info_part(1, 1, value)
		end

	-- REMOVE_WITH_VERSION_UPGRADE: Remove option 'proto'
	local opt_proto = NMEAFWD:option("proto")
	opt_proto.cfg_require = true
		function opt_proto:validate(value)
			return self.dt:check_array(value, {"tcp", "udp"})
		end
		function opt_proto:get()
			return self:get_host_info_part(1, 3)
		end
		function opt_proto:set(value)
			self:set_host_info_part(1, 3, value)
		end

	-- REMOVE_WITH_VERSION_UPGRADE: Remove option 'port'
	local opt_port = NMEAFWD:option("port")
	opt_port.cfg_require = true
		function opt_port:validate(value)
			return self.dt:port(value)
		end
		function opt_port:get()
			return self:get_host_info_part(1, 2)
		end
		function opt_port:set(value)
			self:set_host_info_part(1, 2, value)
		end

	local opt_con_contain = NMEAFWD:option("con_contain")
		function opt_con_contain:validate(value)
			return self.dt:is_bool(value)
		end

	local send_prefix = NMEAFWD:option("send_prefix")
	send_prefix.maxlength = 64
		function send_prefix:validate(_)
			return self.dt:string()
		end

	local cache_setter = function (self, value)
		self:table_set("gps", "nmea_forwarding_cache", self.api_key, value)
	end
	local cache_getter = function (self, _)
		return self:table_get("gps", "nmea_forwarding_cache", self.api_key)
	end

	---- NMEA forwarding cache options

	local opt_type = NMEAFWD:option("type")
		function opt_type:validate(value)
			return self.dt:check_array(value, {"ram", "flash"})
		end
		opt_type.set = cache_setter
		opt_type.get = cache_getter

	local opt_sentences_max = NMEAFWD:option("sentences_max")
		opt_sentences_max.maxlength = 16
		function opt_sentences_max:validate(value)
			return self.dt:uinteger(value)
		end
		opt_sentences_max.set = cache_setter
		opt_sentences_max.get = cache_getter

	local opt_location = NMEAFWD:option("location")
		opt_location.maxlength = 4095
		function opt_location:validate(value)
			local location = self:get_abs_value(self.config, self.sid, "collecting_location")
			if location == value then return false, "NMEA forwarding cache file cannot be the same as collecting file", GPS.ERROR_CODES.FORWARDING_CACHE_INVALID end
			return self:validate_mnt_path(value)
		end
		opt_location.set = cache_setter
		opt_location.get = cache_getter

if board:has_serial() then
	local serial_forwarding_setter = function (self, value)
		self:table_set("gps", "nmea_serial_forwarding", self.api_key:gsub("^serial_", ""), value)
	end
	local serial_forwarding_getter = function (self, _)
		return self:table_get("gps", "nmea_serial_forwarding", self.api_key:gsub("^serial_", ""))
	end

	---- NMEA serial forwarding options

	local opt_serial_enabled = NMEAFWD:option("serial_enabled")
		function opt_serial_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		opt_serial_enabled.set = serial_forwarding_setter
		opt_serial_enabled.get = serial_forwarding_getter

	local opt_serial_send_prefix = NMEAFWD:option("serial_send_prefix")
	opt_serial_send_prefix.maxlength = 64
		function opt_serial_send_prefix:validate(_)
			return self.dt:string()
		end
		opt_serial_send_prefix.set = serial_forwarding_setter
		opt_serial_send_prefix.get = serial_forwarding_getter
end

	local collector_setter = function (self, value)
		self:table_set("gps", "nmea_collecting", self.api_key:gsub("^collecting_", ""), value)
	end
	local collector_getter = function (self, _)
		return self:table_get("gps", "nmea_collecting", self.api_key:gsub("^collecting_", ""))
	end

	----NMEA collecting options

	local opt_collecting_enabled = NMEAFWD:option("collecting_enabled")
		opt_collecting_enabled.require = {
			["1"] = {"collecting_location"}
		}
		function opt_collecting_enabled:validate(value)
			return self.dt:is_bool(value)
		end
		opt_collecting_enabled.set = collector_setter

		opt_collecting_enabled.get = collector_getter

	local opt_collecting_location = NMEAFWD:option("collecting_location")
		opt_collecting_location.maxlength = 4095
		function opt_collecting_location:validate(value)
			local location = self:get_abs_value(self.config, self.sid, "location")
			if location == value then return false, "Collecting file cannot be the same as NMEA forwarding cache file", GPS.ERROR_CODES.COLLECTING_FILE_INVALID end
			return self:validate_mnt_path(value)
		end
		opt_collecting_location.set = collector_setter
		opt_collecting_location.get = collector_getter

	function GPS:validate_multicast(host)
		local ok_ip4, _ = self.dt:ip4addr(host)
		local ok_ip6, _ = self.dt:ip6addr(host)
		local range_err_msg = "Interface cannot be provided when IP address is not in multicast range"
		if ok_ip4 then
			local first_octet = tonumber(string.split(host, ".", 1)[1])
			if 224 <= first_octet and first_octet <= 239 then return true end
			return false, range_err_msg
		elseif ok_ip6 then
			local first_octet = tonumber(string.split(host, ":", 1)[1], 16)
			if 0xff00 <= first_octet then return true end
			return false, range_err_msg
		end
		return false, "Incorrect multicast IP address"
	end

	function GPS:host_info_validation(value)
		local info_values = string.split(value, ";")
		local errmsg = "Incorrect host_info format, hostname;port;proto(;interface) is the allowed format"
		if info_values and #info_values ~= 3 and #info_values ~= 4 then return false, errmsg end
		local ok_host, err_host = self.dt:host(info_values[1])
		if not ok_host then return ok_host, err_host end

		local ok_port, err_port = self.dt:port(info_values[2])
		if not ok_port then return ok_port, err_port end
		local ok_proto, err_proto = self.dt:check_array(info_values[3], {"tcp", "udp"})
		if not ok_proto then return ok_proto, err_proto end

		local ok_multicast, err_multicast = self:validate_multicast(info_values[1])
		if #info_values == 4 then
			if info_values[3] ~= "udp" then return false, "Interface is only allowed with udp protocol" end
			if not ok_multicast then return false, err_multicast end

			local interfaces = {}
			self:table_foreach("network", "interface", function (s)
				if s[".name"] ~= "loopback" then
					table.insert(interfaces, s[".name"])
				end
			end)
			local ok_if, err_if = self.dt:check_array(info_values[4], interfaces)
			if not ok_if then return ok_if, err_if end
		elseif info_values[3] == "udp" and ok_multicast then
			return false, "Interface not provided in host_info"
		end

		return true
	end

	-- REMOVE_WITH_VERSION_UPGRADE: Remove `:get_host_info_part()` function, it is only used for API compatability
	function GPS:get_host_info_part(host_idx, part_idx)
		local host_info = self:get_abs_value("gps", "nmea_forwarding", "host_info")
		if type(host_info) ~= "table" or type(host_info[host_idx]) ~= "string" then
			return
		end

		local host_info_parts = string.split(host_info[host_idx], ";")
		if host_info_parts[part_idx] == "" then
			return
		end
		return host_info_parts[part_idx]
	end

	-- REMOVE_WITH_VERSION_UPGRADE: Remove `:set_host_info_part()` function, it is only used for API compatability
	function GPS:set_host_info_part(host_idx, part_idx, value)
		local host_info = self:get_abs_value("gps", "nmea_forwarding", "host_info")
		if not host_info then
			host_info = {}
		end

		local host_info_parts = {"", "", ""}
		if host_info[host_idx] then
			host_info_parts = string.split(host_info[host_idx], ";")
		end

		host_info_parts[part_idx] = value

		host_info[host_idx] = table.concat(host_info_parts, ";")
		self:table_set("gps", "nmea_forwarding", "host_info", host_info)
	end

-- STATUS

function GPS:GET_TYPE_status()
	local res = {}
	local gps_status = util.ubus("gpsd", "status") or {}
	local nmea_status = util.ubus("gpsd", "nmea_status")
	if nmea_status and nmea_status.hosts then
		res = nmea_status
		res.uptime = gps_status.uptime
	end
	return self:ResponseOK(res)
end

-- End of status

function GPS:delete_section_opt(sid, opt)
	return self:table_delete(self.config, sid, opt)
end

function GPS:UPDATE_validate_section_hook()
	if not board:has_serial() then
		self:delete_section_opt("nmea_serial_forwarding", "enabled")
		self:delete_section_opt("nmea_serial_forwarding", "send_prefix")
	end
end

GPS.PUT_validate_section_hook = GPS.UPDATE_validate_section_hook
GPS.POST_validate_section_hook = GPS.UPDATE_validate_section_hook

function GPS:UPDATE_before_commit_hook()
	-- checks if legacy options were used to modify host_info. If so, removes non legacy parts from it
	local proto = self.arguments.data.proto
	local hostname = self.arguments.data.hostname
	if proto or hostname then
		local host_info = self:get_abs_value("gps", "nmea_forwarding", "host_info")
		if not host_info or not host_info[1] then
			return
		end
		local host_info_parts = string.split(host_info[1], ";")
		if host_info_parts[1] == "" then
			return
		end
		if #host_info_parts == 4 then
			host_info_parts[4] = nil
			host_info[1] = table.concat(host_info_parts, ";")
			self:table_set("gps", "nmea_forwarding", "host_info", host_info)
		end
	end
end

GPS.PUT_before_commit_hook = GPS.UPDATE_before_commit_hook

return GPS
