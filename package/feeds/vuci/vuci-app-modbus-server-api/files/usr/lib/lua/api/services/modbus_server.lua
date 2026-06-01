local ConfigService = require("api/ConfigService")
local fs = require("nixio.fs")
local util = require("vuci.util")
local board = require("vuci.board")

local ModbusServer = ConfigService:new({ create = false, delete = false })

local s = ModbusServer:section("modbus_server", "modbus")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "port", "device_id", "timeout" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function enabled:set(val)
			if val == "1" then
				if not self:modbus_get_abs("port") then self:modbus_set("port", "502") end
				if not self:modbus_get_abs("timeout") then self:modbus_set("timeout", "0") end
				if not self:modbus_get_abs("device_id") then self:modbus_set("device_id", "1") end
			end
			self:add_overlap_message()
			self:modbus_set("enabled", val)
		end

	local port = s:option("port")
	port.cfg_require = true
		function port:validate(value)
			return self.dt:port(value)
		end

	local device_id = s:option("device_id")
	device_id.cfg_require = true
		function device_id:validate(value)
			return self.dt:irange(value, 0, 255)
		end

	if not board:is_switch() then
		local allow_access = s:option("allow_ra")
			function allow_access:validate(value)
				return self.dt:is_bool(value)
			end
			function allow_access:set()
				return
			end
			function allow_access:get()
				local fw_rule_inst_name = ""
				self:table_foreach("firewall", "rule", function(z)
					if z.name == "Enable_MODBUSD_WAN" then
						fw_rule_inst_name = z[".name"]
					end
				end)
				return self:modbus_get_abs(self.api_key) or self:table_get("firewall", fw_rule_inst_name, "enabled") or "0"
			end
	end

	local keep_connection = s:option("keepconn")
		function keep_connection:validate(value)
			return self.dt:is_bool(value)
		end

	local broadcasts = s:option("broadcasts")
		function broadcasts:validate(value)
			return self.dt:is_bool(value)
		end

	local timeout = s:option("timeout")
	timeout.cfg_require = true
		function timeout:validate(value)
			return self.dt:irange(value, 0, 60)
		end

	local client_register = s:option("clientregs")
	client_register.require = { ["1"] = { "regfile", "regfilestart", "regfilesize" }}
		function client_register:validate(value)
			return self.dt:is_bool(value)
		end

		function client_register:set(value)
			self:add_overlap_message()
			self:table_set(self.config, self.sid, "clientregs", value)
		end

	local reg_file_path = s:option("regfile")
		function reg_file_path:validate(value)
			-- TSWOS doesn't have users, so we can't prevent overwriting files owned by other users
			local prevent_overwrite = not board:is_switch()

			if not value:match("^/") then return false, "Absolute file path must be provided (must start with /).", 3 end

			local is_valid, err, err_code = self.dt:posix_path(value, "reg", true, prevent_overwrite, 533)
			if not is_valid then
				return false, err, err_code
			end

			value = ModbusServer:adjust_path(value)

			local regfile = self:modbus_get(self.api_key)
			local actual_path = value:gsub("^/var", "/tmp")
			if regfile and (regfile:gsub("^/var", "/tmp") == actual_path) then -- checks if path strings matches or are symlinked
				return true
			end

			local duplicate_regfile_instance
			self:table_foreach(self.main_config, "rtu_device", function(_s)
				if _s.regfile and _s.regfile:gsub("^/var", "/tmp") == actual_path then
					duplicate_regfile_instance = _s.name
					return false
				end
			end)
			if duplicate_regfile_instance then
				return false, string.format("Provided file path is already used by '%s' Modbus serial server instance.", duplicate_regfile_instance)
			end

			return self.dt:posix_path(value, "reg", true, prevent_overwrite, 533)
		end
		function reg_file_path:set(value)
			if value == "" then
				local regfile = self:modbus_get(self.api_key)
				if regfile then
					if not regfile:match("^/usr/local/share/modbus") then
						regfile = ModbusServer:adjust_path(regfile)
					end
					os.remove(regfile)
				end
			else
				value = ModbusServer:adjust_path(value)
			end
			self:modbus_set(self.api_key, value)
		end
		function reg_file_path:get()
			local value = self:modbus_get(self.api_key)
			if self:modbus_get_abs("clientregs") == "1" then
				if value and value:match("^/usr/local/share/modbus") then
					value = value:gsub("^/usr/local/share/modbus", "")
				end
				return value
			end
		end

	local first_reg_no = s:option("regfilestart")
		function first_reg_no:validate(value)
			local start_reg = board:is_switch() and 10000 or 1025
			return self.dt:irange(value, start_reg, 65536)
		end
		function first_reg_no:get()
			if self:modbus_get_abs("clientregs") == "1" then
				return self:modbus_get(self.api_key)
			end
		end

	local reg_count = s:option("regfilesize")
		function reg_count:validate(value)
			return self.dt:irange(value, 1, 64512)
		end
		function reg_count:get()
			if self:modbus_get_abs("clientregs") == "1" then
				return self:modbus_get(self.api_key)
			end
		end

	if not board:is_switch() then
		local mobile_data_type = s:option("md_data_type")
			function mobile_data_type:validate(value)
				return self.dt:irange(value, 0, 2)
			end
	end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

-- STATUS

function ModbusServer:GET_TYPE_status()
	local res = {}

	local modbus_service = util.ubus("service", "list", { name = "modbus_server" })
	if modbus_service and modbus_service.modbus_server and modbus_service.modbus_server.instances then
		local sid = "modbus"
		local modbus_instances = modbus_service.modbus_server.instances
		if self:table_get(self.main_config, sid, "enabled") == "1" then
			res = util.ubus("modbus_server." .. sid, "status") or {}
			for _, instance in pairs(modbus_instances) do
				if sid == instance.command[3] then
					res.error_code = instance.exit_code ~= 0 and instance.exit_code or nil
					break
				end
			end
		end
	end

	return self:ResponseOK(res)
end

-- End of status

function ModbusServer:modbus_get_abs(key)
	return self:get_abs_value(self.main_config, self.sid, key)
end

function ModbusServer:modbus_get(key)
	return self:table_get(self.main_config, self.sid, key)
end

function ModbusServer:modbus_set(key, value)
	return self:table_set(self.main_config, self.sid, key, value)
end

function ModbusServer:adjust_path(path)
	if not path:match("^/tmp") and not path:match("^/mnt") and not path:match("^/var") then
		return "/usr/local/share/modbus" .. path
	end
	return path
end

function ModbusServer:PUT_validate_section_hook()
	if board:is_switch() then return end

	local enabled = self.current_data_block["enabled"] or nil
	local allow_ra = self.current_data_block["allow_ra"] or nil
	local s_port = self:get_abs_value(self.main_config, self.sid, "port")
	if s_port and allow_ra then
		local fval = enabled == "1" and allow_ra or "0"
		local fport = s_port
		local needs_update = false
		local fw_rule_inst_name = "nil"

		for _, z in ipairs(self:table_find_many("firewall", "rule", { name = "Enable_MODBUSD_WAN" })) do
			fw_rule_inst_name = z[".name"]
			if z.dest_port ~= fport then
				needs_update = true
			end
			if z.enabled ~= fval then
				needs_update = true
			end
		end

		if needs_update == true then
			self:table_set("firewall", fw_rule_inst_name, "dest_port", fport)
			self:table_set("firewall", fw_rule_inst_name, "enabled", fval)
		end
		if fw_rule_inst_name == "nil" then
			local fw = require("vuci.firewall").init()
			local wanZone = fw:get_zone("wan")
			if not wanZone then
				self:add_error(STD_CODES.UCI_CREATE_ERROR, "Could not add firewall rule", "Validation")
				self:modbus_set("allow_ra", "0")
			end
			local fw_rule = {
				name = "Enable_MODBUSD_WAN",
				target = "ACCEPT",
				proto = "tcp",
				dest_port = fport,
				enabled = fval
			}
			wanZone:add_rule(fw_rule)
		end
	end
end

function ModbusServer:add_overlap_message()
	if board:is_switch() then return end

	if self:modbus_get_abs("clientregs") == "1" and self:modbus_get_abs("enabled") == "1" then
		self:add_message(1, "Enabled custom register block may cause register overlapping in data sources.")
	end
end

return ModbusServer
