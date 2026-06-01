local ConfigService = require("api/ConfigService")
local ntm

local gre_routes = ConfigService:new({ increment_name = true})

function gre_routes:parent_exists()
	local proto = self.uci:get("network", self.binding, "proto")
	if self.binding and (proto ~= "gre" and proto ~= "grev6") then
		self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				string.format("Parent section '%s' does not exist", self.binding),
				"UCI",
				HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

local route6 = gre_routes:section("network", "route6")
function route6:create_defaults(sid)
	return {
		dep = self.binding,
		interface = self.binding .. "_static"
	}
end
function route6:filter(s)
	return s.dep == self.binding
end

	local target = route6:option("target")
		function target:validate(value)
			return self.dt:cidr6(value)
		end
		function target:set(value)
			if self:table_get(self.config, self.sid, "service") == "dmvpn" then
				self:table_set(self.config, self.sid, "dmvpn_user_mod", "1")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

return gre_routes
