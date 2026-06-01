local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local gps_utils = require("api.services.gps.utils")

if not board:has_gps() then
	return nil
end

local GPS = ConfigService:new({ increment_name = true })

local HTTPS = GPS:section("gps", "https_tavl_rule")

	local opt_enabled = HTTPS:option("enabled")
	function opt_enabled:validate(value)
		local success, msg = self.dt:is_bool(value)
		if not success then return false, msg end

		local name = self:get_abs_value(self.config, self.sid, "name")
		local io_type = gps_utils.get_tavl_type(name)
		local is_readonly = false
		if gps_utils.is_acl_active() then
			is_readonly = (io_type == "adc")
		else
			is_readonly = (io_type == "acl")
		end
		if is_readonly and value == "1" then
			return false, "ADC and ACL cannot be used the same time"
		end

		return true
	end

	local opt_type = HTTPS:option("type")
	opt_type.readonly = true
	function opt_type:get()
		local name = self:get_abs_value(self.config, self.sid, "name")
		return gps_utils.get_tavl_type(name)
	end

	local opt_name = HTTPS:option("name")
	function opt_name:validate(value)
		return self.dt:check_array(value, gps_utils.list_available_tavl_names(false))
	end

	local acl = HTTPS:option("acl")
	function acl:validate(value)
		local acl_options = { "current", "percent" }
		return self.dt:check_array(value, acl_options)
	end

function GPS:POST_validate_hook()
	local rule_name = self.arguments.data.name
	if rule_name then
		local existing_rule = self:table_find(self.config, "https_tavl_rule", { name = rule_name }) 
		if existing_rule then
			self:add_critical_error(STD_CODES.INVALID_OPT, "TAVL rule with name '" .. rule_name .. "' already exists", opt_name.api_key)
		end
	end
end

return GPS
