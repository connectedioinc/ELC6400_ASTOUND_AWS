local ConfigService = require("api/ConfigService")

local hotspot_groups = ConfigService:new({ anonymous = true })

local s = hotspot_groups:section("chilli", "group")

local function convert_mb(action, value)
	if value == nil then return nil end
	if value == "" then return "" end
	local multiplier = 1000000
	if action == "set" then
		return tonumber(value) * multiplier
	elseif action == "get" then
		return tonumber(value) / multiplier
	end
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local name = s:option("name")
	name.maxlength = 16
	name.cfg_require = true
		function name:validate(value)
			local found = false
			if self.request_method == "PUT" then return false, "Name cannot be changed." end
			self:table_foreach(self.config, "group", function(c)
				if c.name == value and c[".name"] ~= self.sid then found = true end
			end)
			if found then return false, "Name is already used." end
			return self.dt:string()
		end

	local idle_timeout = s:option("defidletimeout")
		function idle_timeout:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 86400)
		end

	local time_limit = s:option("defsessiontimeout")
		function time_limit:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 86400)
		end

	local download_speed = s:option("downloadbandwidth")
		function download_speed:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 1000000)
		end
		function download_speed:set(value)
			self:table_set(self.config, self.sid, self.api_key, convert_mb("set", value))
		end
		function download_speed:get(value)
			return convert_mb("get", value) and tostring(convert_mb("get", value)) or nil
		end

	local upload_speed = s:option("uploadbandwidth")
		function upload_speed:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 1000000)
		end
		function upload_speed:set(value)
			self:table_set(self.config, self.sid, self.api_key, convert_mb("set", value))
		end
		function upload_speed:get(value)
			return convert_mb("get", value) and tostring(convert_mb("get", value)) or nil
		end

	local download_limit = s:option("downloadlimit")
		function download_limit:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 1000000)
		end
		function download_limit:set(value)
			self:table_set(self.config, self.sid, self.api_key, convert_mb("set", value))
		end
		function download_limit:get(value)
			return convert_mb("get", value) and tostring(convert_mb("get", value)) or nil
		end

	local upload_limit = s:option("uploadlimit")
		function upload_limit:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 1000000)
		end
		function upload_limit:set(value)
			self:table_set(self.config, self.sid, self.api_key, convert_mb("set", value))
		end
		function upload_limit:get(value)
			return convert_mb("get", value) and tostring(convert_mb("get", value)) or nil
		end

	local warning = s:option("warning")
		function warning:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 1000000)
		end
		function warning:set(value)
			self:table_set(self.config, self.sid, self.api_key, convert_mb("set", value))
		end
		function warning:get(value)
			return convert_mb("get", value) and tostring(convert_mb("get", value)) or nil
		end

	local period = s:option("period")
		function period:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 1, 3)
		end

	local day = s:option("day")
		function day:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 1, 28)
		end

	local hour = s:option("hour")
		function hour:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 23)
		end

	local week_day = s:option("weekday")
		function week_day:validate(value)
			if tonumber(value) ~= nil and tostring(math.floor(value)) ~= value then return false, "Decimal numbers are not allowed." end
			return self.dt:range(value, 0, 6)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return hotspot_groups