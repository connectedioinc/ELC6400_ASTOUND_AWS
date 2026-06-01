local ConfigService = require("api/ConfigService")
local board = require("vuci.board")

if not board:has_gps()then
	return nil
end

local GPS = ConfigService:new()

local Geofencing = GPS:section("gps", "geofencing")
function Geofencing:create_defaults(_)
	return {
		longitude = "0.000000",
		latitude = "0.000000",
		radius = "200"
	}
end
Geofencing:make_primary()
Geofencing.default_options.id.maxlength = 16

	local opt_enabled = Geofencing:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_longitude = Geofencing:option("longitude")
		function opt_longitude:validate(value)
			return self.dt:precision_range(value, -180.000000, 180.000000)
		end

	local opt_latitude = Geofencing:option("latitude")
		function opt_latitude:validate(value)
			return self.dt:precision_range(value, -90.000000, 90.000000)
		end

	local opt_radius = Geofencing:option("radius")
		function opt_radius:validate(value)
			return self.dt:irange(value, 1, 999999)
		end

	local opt_generate_event = Geofencing:option("generate_event")
		function opt_generate_event:validate(value)
			return self.dt:check_array(value, {"on_exit", "on_enter", "on_both"})
		end

	local switch_profile = Geofencing:option("switch_profile")
		function switch_profile:validate(value)
			local profiles = {}
			self:table_foreach("profiles", "profile", function(s)
				table.insert(profiles, s[".name"])
			end)
			return self.dt:check_array(value, profiles)
		end

return GPS