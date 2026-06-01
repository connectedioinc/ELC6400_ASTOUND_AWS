local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local api_utils = require("api/api_utils")
local util = require("vuci.util")

if not board:has_gps()then
	return nil
end

local GPS = ConfigService:new({
	create = false,
	delete = false
})

local HTTPSGeneral = GPS:section("gps", "section")

function HTTPSGeneral:filter(options)
	return options[".name"] == "https"
end

	local opt_enabled = HTTPSGeneral:option("enabled")
		opt_enabled.require = {
			["1"] = {"hostname", "interval"}
		}
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end
	local opt_hostname = HTTPSGeneral:option("hostname", { skip_validation = true })
		function opt_hostname:validate(value)
			return self.dt:url(value)
		end
		function opt_hostname:set(value)
			local hostname = {}
			local is_array = api_utils:is_array(value)
			if not is_array and type(value) == "table" then
				if #value ~= 0 then
					self:add_critical_error(STD_CODES.INVALID_OPT, "Invalid option format, object is not allowed.", "hostname")
				end
			elseif not is_array then
				table.insert(hostname, value)
			else
				hostname = value
			end
			self:table_set("gps", "https", "hostname", hostname)
		end

	local opt_interval = HTTPSGeneral:option("interval")
		function opt_interval:validate(value)
			return self.dt:irange(value, 1, 4294967296)
		end

-- STATUS

function GPS:GET_TYPE_status()
	local res = {}
	local gps_status = util.ubus("gpsd", "status") or {}
	local https_status = util.ubus("gpsd", "https_status")
	if https_status and https_status.servers then
		res = https_status
		res.uptime = gps_status.uptime
	end
	return self:ResponseOK(res)
end

-- End of status

return GPS