local uci = require "vuci.uci".cursor()
local ConfigService = require("api/ConfigService")
local util = require("vuci.util")


local general_section
local wan_zone
uci:foreach("firewall", "defaults", function(s)
	general_section = s[".name"]
end)

uci:foreach("firewall", "zone", function(s)
	if s["name"] == "wan" then
		wan_zone = s[".name"]
	end
end)

local flags = {
	create = false,
	delete = false,
	general_section = general_section
}

local port_scan_prevention = ConfigService:new(flags)

	local include = port_scan_prevention:section("firewall", "defaults")
		local port_scan = include:option("port_scan")
		port_scan.require = { ["1"] = { "hitcount", "seconds" } }
			function port_scan:validate(value)
				return self.dt:is_bool(value)
			end
			function port_scan:get()
				if not wan_zone then return nil end
				return self:table_get(self.config, wan_zone, self.api_key)

			end
			function port_scan:set(value)
				if not wan_zone then return end
				self:table_set(self.config, wan_zone, self.api_key, value)
			end

		local hitcount = include:option("hitcount")
			function hitcount:validate(value)
				return self.dt:irange(value, 5, 255)
			end

			function hitcount:get()
				if not wan_zone then return nil end
				return self:table_get(self.config, wan_zone, self.api_key)
			end

			function hitcount:set(value)
				if not wan_zone then return end
				self:table_set(self.config, wan_zone, self.api_key, value)
			 end

		local seconds = include:option("seconds")
			function seconds:validate(value)
				return self.dt:irange(value, 10, 1000)
			end

			function seconds:get()
				if not wan_zone then return nil end
				return self:table_get(self.config, wan_zone, self.api_key)
			end

			function seconds:set(value) 
				if not wan_zone then return end
				self:table_set(self.config, wan_zone, self.api_key, value)
			end

		local syn_fin = include:option("syn_fin")
			function syn_fin:validate(value)
				return self.dt:is_bool(value)
			end
			function syn_fin:get(value)
				return value or "0"
			end

		local syn_rst = include:option("syn_rst")
			function syn_rst:validate(value)
				return self.dt:is_bool(value)
			end
			function syn_rst:get(value)
				return value or "0"
			end

		local x_max = include:option("x_max")
			function x_max:validate(value)
				return self.dt:is_bool(value)
			end
			function x_max:get(value)
				return value or "0"
			end

		local nmap_fin = include:option("nmap_fin")
			function nmap_fin:validate(value)
				return self.dt:is_bool(value)
			end
			function nmap_fin:get(value)
				return value or "0"
			end

		local null_flags = include:option("null_flags")
			function null_flags:validate(value)
				return self.dt:is_bool(value)
			end
			function null_flags:get(value)
				return value or "0"
			end

return port_scan_prevention
