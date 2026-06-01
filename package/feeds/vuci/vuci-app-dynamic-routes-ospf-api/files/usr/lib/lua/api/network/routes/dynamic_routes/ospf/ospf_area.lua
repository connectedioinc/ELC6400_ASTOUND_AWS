local ConfigService = require("api/ConfigService")

local dynamic_ospf_area = ConfigService:new()

	local ospf_area = dynamic_ospf_area:section("ospf", "ospf_area")
	ospf_area:make_primary()
	ospf_area.default_options.id.maxlength = 32

		local area = ospf_area:option("area")
			-- Disabled till WebUI front-end stops creating empty configurations
			-- area.cfg_require = true
			function area:validate(value)
				local valid, err = self.dt:irange(value,0,4294967295)
				local valid2, err2 = self.dt:ip4addr(value)
				if not valid and not valid2 then return false, err .. " or " .. err2 end
				self:table_foreach("ospf", "ospf_area", function(s)
					if s.area == value and s[".name"] ~= self.sid then
						valid = false
						valid2 = false
						return
					end
				end)
				if not valid and not valid2 then return false, "Area already used in other configuration" end
				return true
			end

		local enabled = ospf_area:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end
		local stub = ospf_area:option("stub")
			function stub:validate(value)
				return self.dt:is_bool(value)
			end

return dynamic_ospf_area
