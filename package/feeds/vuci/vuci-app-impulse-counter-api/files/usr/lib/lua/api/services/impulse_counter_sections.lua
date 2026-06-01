local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local fs = require "nixio.fs"
local impulse_counter_utils = require("api.services.impulse_counter_utils")

local impulse_counter = ConfigService:new({	increment_name = true })

local s = impulse_counter:section("impulse_counter", "input")

	function s:create_defaults()
		return {
			enabled = "1",
			edge = "rising",
			debounce = "0"
		}
	end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local name = s:option("name")
	name.maxlength = 200
		function name:validate(value)
			return self.dt:string(value)
		end

	local gpio = s:option("gpio")
	gpio.cfg_require = true
		function gpio:validate(value)
			local found_gpio_duplication = false
			self:table_foreach(self.config, "input", function(s)
				if s[".name"] ~= self.sid and s.gpio == ("ioman.gpio." .. value) then
					found_gpio_duplication = true
					return false
				end
			end)
			if found_gpio_duplication then
				return false, "GPIO already in use"
			end
			return self.dt:check_array(value, impulse_counter_utils.list_available_inputs())
		end
		function gpio:get(value)
			return value and value:match("%.([^%.]+)$") or ""
		end
		function gpio:set(value)
			return self:table_set(self.config, self.sid, "gpio", "ioman.gpio." .. value)
		end
		
	local edge = s:option("edge")
		function edge:validate(value)
			return self.dt:check_array(value, { "rising", "falling", "both" })
		end

	local debounce = s:option("debounce")
		function debounce:validate(value)
			return self.dt:irange(value, 0, 1000)
		end

local function has_running_instance(object)
	if not object then return false end
	if not object.instances then return false end
	for _, instance in pairs(object.instances) do
		if instance.running then return true end
	end
	return false
end

function impulse_counter:GET_TYPE_status()
	local res = { state = "0" }
	if fs.access("/etc/config/impulse_counter") then
		local running = util.ubus("service", "list", {name="impulse_counter"}).impulse_counter
		res.state = has_running_instance(running) and "1" or "0"
	end
	self:ResponseOK(res)
end

function impulse_counter:clear_database()
	local success, error_msg = impulse_counter_utils.clear_db()
	if success then
		return self:ResponseOK("Database cleared.")
	else
		return self:ResponseError(error_msg)
	end
end

function impulse_counter:get_database_entries()
	local filter = self.arguments.data.filter
	if filter and type(filter) ~= "string" then
		return self:add_critical_error(
			STD_CODES.INVALID_QUERY,
			"Malformed query parameter 'filter'",
			HTTP_STATUS_CODES.BAD_REQUEST
		)
	end

	local entries = impulse_counter_utils.list_db_entries(filter)
	return self:ResponseOK(entries)
end

impulse_counter:action("clear_database", impulse_counter.clear_database)
local load_db = impulse_counter:action("get_database_entries", impulse_counter.get_database_entries)

local filter = load_db:option("filter")
	function filter:validate(value)
		return self.dt:check_array(value, { "day", "week", "month" })
	end

return impulse_counter
