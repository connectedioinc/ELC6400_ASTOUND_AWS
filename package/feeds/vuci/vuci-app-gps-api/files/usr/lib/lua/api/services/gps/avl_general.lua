local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local api_utils = require("api/api_utils")
local util = require("vuci.util")

if not board:has_gps() then
	return nil
end

local AVL = ConfigService:new({
	create = false,
	delete = false
})

local AVLGeneral = AVL:section("avl", "section")
function AVLGeneral:filter(options)
	return options[".name"] == "avl"
end

	local opt_enabled = AVLGeneral:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_send_retry = AVLGeneral:option("send_retry")
		function opt_send_retry:validate(value)
			return self.dt:is_bool(value)
		end
	local host_info = AVLGeneral:option("host_info", { list = true })
		function host_info:validate(value)
			return self:host_info_validation(value)
		end
		function host_info:get(value)
			-- REMOVE_WITH_VERSION_UPGRADE
			if not value then
				local hostname = self:get_abs_value("avl", "avl", "hostname")
				local port = self:get_abs_value("avl", "avl", "port")
				local proto = self:get_abs_value("avl", "avl", "proto")
				local combination = (hostname or "192.168.0.1") .. ";" .. (port or "8500") .. ";" .. (proto or "tcp")
				return { combination }
			end
			return value
		end
		function host_info:set(value)
			-- set left in before commit
		end
		--REMOVE_WITH_VERSION_UPGRADE
		local opt_hostname = AVLGeneral:option("hostname")
		function opt_hostname:validate(value)
			return self.dt:host(value)
		end
		function opt_hostname:get(value)
			local host_info = self:get_abs_value("avl", "avl", "host_info")
			if host_info and  api_utils.is_array(host_info) then
				local str = string.split(host_info[1], ";")
				return str[1]
			end
		end
	-- REMOVE_WITH_VERSION_UPGRADE
	local opt_proto = AVLGeneral:option("proto")
		function opt_proto:validate(value)
			return self.dt:check_array(value, {"tcp", "udp"})
		end
		function opt_proto:get(value)
			local host_info = self:get_abs_value("avl", "avl", "host_info")
			if host_info and  api_utils.is_array(host_info) then
				local str = string.split(host_info[1], ";")
				return str[3]
			end
		end
	-- REMOVE_WITH_VERSION_UPGRADE
	local opt_port = AVLGeneral:option("port")
		function opt_port:validate(value)
			return self.dt:port(value)
		end
		function opt_port:get(value)
			local host_info = self:get_abs_value("avl", "avl", "host_info")
			if host_info and  api_utils.is_array(host_info) then
				local str = string.split(host_info[1], ";")
				return str[2]
			end
		end

	local opt_con_cont = AVLGeneral:option("con_cont")
		function opt_con_cont:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_static_navigation = AVLGeneral:option("static_navigation")
		function opt_static_navigation:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_send_empty = AVLGeneral:option("send_empty")
		function opt_send_empty:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_timeout_empty = AVLGeneral:option("timeout_empty")
		function opt_timeout_empty:validate(value)
			return self.dt:irange(value, 2, 86400)
		end

	function AVL:host_info_validation(value)
		local info_values = string.split(value, ";")
		local errmsg = "Incorrect host_info format, hostname;port;proto is the allowed format"
		if info_values and #info_values ~= 3 then return false, errmsg end
		local ok_host, err_host = self.dt:host(info_values[1])
		if not ok_host then return ok_host, err_host end
	
		local ok, err = self.dt:port(info_values[2])
		if not ok then return ok, err end
		return self.dt:check_array(info_values[3], {"tcp", "udp"})
	end

	function AVL:PUT_before_commit_hook()
		-- REMOVE_WITH_VERSION_UPGRADE
		local value = self:get_abs_value("avl", "avl", "host_info")
		if not value then
			local hostname = self:get_abs_value("avl", "avl", "hostname")
			local port = self:get_abs_value("avl", "avl", "port")
			local proto = self:get_abs_value("avl", "avl", "proto")
			if not hostname then
				self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: hostname", "host_info")
			end
			if not port then
				self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: port", "host_info")
			end
			if not proto then
				self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: proto", "host_info")
			end
			local combination = { hostname .. ";" .. port .. ";" .. proto }
			self:table_set("avl", "avl", "host_info", combination)
		else
			self:table_set("avl", "avl", "host_info", value)
		end
	end

-- STATUS

function AVL:GET_TYPE_status()
	local res = util.ubus("avl", "status") or {}
	res.current_distance = res.current_distance and string.format("%.5f", res.current_distance)
	res.current_angle = res.current_angle and string.format("%.1f", res.current_angle)
	res.current_accuracy = res.current_accuracy and string.format("%.1f", res.current_accuracy)
	return self:ResponseOK(res)
end

-- End of status

return AVL