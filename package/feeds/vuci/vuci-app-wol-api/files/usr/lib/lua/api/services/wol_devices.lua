local util = require("vuci.util")
local board = require("vuci.board")
local ConfigService = require("api/ConfigService")
local wol_interfaces = require("api/services/wol_interfaces")

if not board:has_ethernet() then
	return nil
end

local flags = {
	anonymous = true
}

local STATUS_CODES = {
	WAKE_FAILED = 1,
	VALIDATION_FAILED = 2
}

local wake_on_lan_devices = ConfigService:new(flags)

	local target = wake_on_lan_devices:section("etherwake", "target")

		local name = target:option("name")
			function name:validate(value)
				local name_exists = false
				self:table_foreach(self.config, self.section_type, function(s)
					if s[".name"] ~= self.sid and s.name == value then
						name_exists = true
						return false
					end
				end)
				if name_exists then
					return false, "Configuration with name '" .. value .. "' already exists"
				end
				return self.dt:default_validation(value)
			end

		local mac = target:option("mac")
			function mac:validate(value)
				local mac_exists = false
				self:table_foreach(self.config, self.section_type, function(s)
					if s[".name"] ~= self.sid and s.mac == value then
						mac_exists = true
						return false
					end
				end)
				if mac_exists then
					return false, "Configuration with mac '" .. value .. "' already exists"
				end
				return self.dt:macaddr(value)
			end

		local password = target:option("password", { sensitive = true })
			function password:validate(value)
				local result, msg = self.dt:exact_length(value, {8, 12})
				if result then return self.dt:hexstring(value) end
				return result, msg
			end

		local wakeonboot = target:option("wakeonboot")
			function wakeonboot:validate(value)
				local options = { "on", "off" }
				local res, msg = self.dt:check_array(value, options)
				local res2, msg2 = self.dt:is_bool(value)

				if res or res2 then
					return true
				else
					return false, msg .. " or " .. msg2
				end
			end

function wake_on_lan_devices:wake_device()
	local status = util.file_exec("/etc/init.d/etherwake", { "start", self.arguments.data.name })

	if status.code and status.code == 4 then
		return self:ResponseError({ status = STATUS_CODES.VALIDATION_FAILED,
		                            error = "Password validation failed." })
	end
	if status.code ~= 0 or not status.stdout or status.stderr then
		return self:ResponseError({
			status = STATUS_CODES.WAKE_FAILED,
			error = "Failed to wake device"
		})
	end

	return self:ResponseOK({
		status = STD_CODES.OK
	})
end

local wd = wake_on_lan_devices:action("wake_device", wake_on_lan_devices.wake_device)

	local wd_name = wd:option("name")
	wd_name.require = true
		function wd_name:validate(value)
			local names = {}
			self.uci:foreach("etherwake", "target", function (s)
				if s.name then
					table.insert(names, s.name)
				end
			end)
			return self.dt:check_array(value, names)
		end

	local wd_mac = wd:option("mac")
	wd_mac.require = true
		function wd_mac:validate(value)
			local macs = {}
			self.uci:foreach("etherwake", "target", function (s)
				if s.mac then
					table.insert(macs, s.mac)
				end
			end)
			return self.dt:check_array(value, macs)
		end

function wake_on_lan_devices:wake_all_devices()
	local failed_to_wake_devices = ""
	local failed_to_validate_devices = ""
	self:table_foreach(self.main_config, "target", function(s)
		if s.name and s.mac then
			local status = util.file_exec("/etc/init.d/etherwake", { "start", s.name })
			if status.code ~= 0 or not status.stdout or status.stderr then
				if status.code == 4 and #failed_to_validate_devices == 0 then
					failed_to_validate_devices = s.name
				elseif status.code == 4 and #failed_to_validate_devices > 0 then
					failed_to_validate_devices = failed_to_validate_devices .. ", " .. s.name
				elseif status.code ~= 4 and #failed_to_wake_devices == 0 then
					failed_to_wake_devices = s.name
				elseif status.code ~= 4 and #failed_to_wake_devices > 0 then
					failed_to_wake_devices = failed_to_wake_devices .. ", " .. s.name
				end
			end
		end
	end)

	if #failed_to_wake_devices == 0 and #failed_to_validate_devices == 0 then
		return self:ResponseOK({
			status = STD_CODES.OK
		})
	elseif #failed_to_validate_devices > 0 and #failed_to_wake_devices > 0 then
		return self:ResponseError({
			status = 3,
			error = "Password validation failed for " .. failed_to_validate_devices .. " and failed to wake " .. failed_to_wake_devices .. " device(s)"
		})
	elseif #failed_to_wake_devices > 0 then
		return self:ResponseError({
			status = STATUS_CODES.WAKE_FAILED,
			error = "Failed to wake '" .. failed_to_wake_devices .. "' device(s)"
		})
	elseif #failed_to_validate_devices > 0 then
		return self:ResponseError({
			status = STATUS_CODES.VALIDATION_FAILED,
			error = "Failed to validate '" .. failed_to_validate_devices .. "' device(s)"
		})
	end
end

function wake_on_lan_devices:GET_TYPE_options()
	return self:ResponseOK({interfaces = wol_interfaces()})
end

wake_on_lan_devices:action("wake_all_devices", wake_on_lan_devices.wake_all_devices)

return wake_on_lan_devices
