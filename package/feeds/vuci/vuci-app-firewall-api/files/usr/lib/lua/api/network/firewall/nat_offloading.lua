local ConfigService = require("api/ConfigService")
local board = require("vuci.board")

if not board:has_sw_nat() then
	return nil
end

local flags = {
	anonymous = true,
	delete = false,
	create = false,
	general_section = function(self)
		local sid
		self:table_foreach("firewall", "defaults", function(c)
			sid = c[".name"]
		end)
		return sid
	end,
	global_settings = true
}

local nat_offloading = ConfigService:new(flags)

	function nat_offloading:PUT_validate_section_hook()
		local flow_offloading = self:get_abs_value(self.config, self.sid, "flow_offloading")
		if board:has_hw_nat() then
			local flow_offloading_hw = self:get_abs_value(self.config, self.sid, "flow_offloading_hw")
			if (not flow_offloading or flow_offloading == "" or flow_offloading == "0") and flow_offloading_hw == "1" then
				self:add_critical_error(STD_CODES.INVALID_OPT, "'flow_offloading' must be enabled before configuring 'flow_offloading_hw'", "Validation")
			end
		end
		if board:has_xfrm_offload() then
			local flow_offloading_xfrm = self:get_abs_value(self.config, self.sid, "flow_offloading_xfrm")
			if (not flow_offloading or flow_offloading == "" or flow_offloading == "0") and flow_offloading_xfrm == "1" then
				self:add_critical_error(STD_CODES.INVALID_OPT, "'flow_offloading' must be enabled before configuring 'flow_offloading_xfrm'", "Validation")
			end
		end
	end

	local defaults = nat_offloading:section("firewall", "defaults")

		local flow_offloading = defaults:option("flow_offloading")
			function flow_offloading:validate(value)
				return self.dt:is_bool(value)
			end
			function flow_offloading:get(value)
				return value or "0"
			end

		if board:has_hw_nat() then
			local flow_offloading_hw = defaults:option("flow_offloading_hw")
				function flow_offloading_hw:validate(value)
					return self.dt:is_bool(value)
				end
				function flow_offloading_hw:get(value)
					return value or "0"
				end
		end

		if board:has_xfrm_offload() then
			local flow_offloading_xfrm = defaults:option("flow_offloading_xfrm")
				function flow_offloading_xfrm:validate(value)
					return self.dt:is_bool(value)
				end
				function flow_offloading_xfrm:get(value)
					return value or "0"
				end
		end

return nat_offloading
