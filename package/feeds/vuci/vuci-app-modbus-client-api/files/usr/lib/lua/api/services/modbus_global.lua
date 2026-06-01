local ConfigService = require("api/ConfigService")
local modbus_utils = require("vuci.modbus_utils")

local Modbus = ConfigService:new({
	create = false,
	delete = false,
	general_section = "main",
	global_settings = true
})
	-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------
	local modbus_section = Modbus:section("modbus_client", "main")

	local enabled = modbus_section:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_db_path = modbus_section:option("db_path")
	function opt_db_path:validate(value)
		return self.dt:check_array(value, modbus_utils:available_db_paths())
	end
	function opt_db_path:set(value)
		-- This is to force data sender to restart so it could read database from new location
		self:table_set("data_sender", "settings", "_modbus_timestamp", tostring(os.time()))

		value = modbus_utils:convert_legacy_path(value)
		self:table_set(self.main_config, self.sid, self.api_key, value)
	end

	function opt_db_path:get(value)
		return modbus_utils:convert_legacy_path(value, true)
	end

	-- This value must not be required for backwards compatibility, even if it is required in frontend.
	-- Application will default to 340 if option is not set.
	local opt_db_max_page_count = modbus_section:option("db_max_page_count")
	function opt_db_max_page_count:validate(value)
		if self:is_db_in_ram() then
			return false, "This option cannot be configured when saving to RAM."
		end

		local is_in_range = self.dt:irange(value, 4, 1000000)
		local msg = "Value must be an integer and range of the value must be from 4 to 1000000 or it can be 0."
		return is_in_range or value == "0", msg
	end

function Modbus:is_db_in_ram()
	local ram_path = "/var/run/modbus_client/modbus.db"
	local db_path = modbus_utils:convert_legacy_path(self:get_abs_value(self.main_config, self.sid, "db_path")) or ram_path
	return db_path == ram_path
end

function Modbus:PUT_validate_section_hook()
	if self:is_db_in_ram() then
		self:table_delete(self.main_config, self.sid, "db_max_page_count")
	end
end

return Modbus

