local ConfigService = require("api/ConfigService")
local bgp_utils = require ("api/network/routes/dynamic_routes/bgp/bgp_utils")
local dynamic_bgp_route_maps = ConfigService:new()

	local maps = dynamic_bgp_route_maps:section("bgp", "bgp_route_maps")
	maps:make_primary()
	maps.default_options.id.maxlength = 32

	function dynamic_bgp_route_maps:reorder_sequence()
		local sequence_table = {}
		local sequence = self:table_get(self.config, self.sid, "sequence")
		local last_sequence = 0
		self:table_foreach(self.config, "bgp_route_maps", function(c)
			local seq = tonumber(c.sequence) or 0
			table.insert(sequence_table, {map = c[".name"], sequence = seq})
		end)
		if sequence then
			for _, entry in ipairs(sequence_table) do
				if entry.map ~= self.sid and entry.sequence == tonumber(sequence) then
					self:add_critical_error(STD_CODES.INVALID_OPT, "This sequence is already used", "Validation")
					break
				end
			end
			local replaced = false
			for _, entry in ipairs(sequence_table) do
				if entry.map == self.sid then
					entry.sequence = tonumber(sequence)
					replaced = true
					break
				end
			end
			if not replaced then
				table.insert(sequence_table, {map = self.sid, sequence = tonumber(sequence)})
			end
		end
		table.sort(sequence_table, function(a, b) return a.sequence < b.sequence end)
		local new_sequence = 0
		for _, entry in ipairs(sequence_table) do
			new_sequence = new_sequence + 10
			entry.sequence = new_sequence
			self:table_set(self.config, entry.map, "sequence", tostring(entry.sequence))
			last_sequence=entry.sequence
		end
		return last_sequence + 10
	end

	dynamic_bgp_route_maps.PUT_before_commit_hook = dynamic_bgp_route_maps.reorder_sequence
	dynamic_bgp_route_maps.POST_before_commit_hook = dynamic_bgp_route_maps.reorder_sequence

	function maps:create_defaults()
		return {
			sequence = tostring(dynamic_bgp_route_maps:reorder_sequence()),
			action = "permit"
		}
	end

		local enabled = maps:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

		local action = maps:option("action")
		function action:validate(value)
			return self.dt:check_array(value, {"permit", "deny"})
		end

		local sequence = maps:option("sequence")
		function sequence:validate(value)
			return self.dt:irange(value, 1, 65535)
		end

		local metric = maps:option("metric")
		function metric:validate(value)
			return self.dt:irange(value, 0, 4294967295)
		end

		local local_preference = maps:option("local_preference")
		function local_preference:validate(value)
			return self.dt:irange(value, 0, 4294967295)
		end

	function dynamic_bgp_route_maps:PUT_validate_section_hook()
		local action = self:get_abs_value(self.config, self.sid, "action")
		if not action or action == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: action")
		end
	end

	function dynamic_bgp_route_maps:POST_validate_section_hook()
		local action = self:get_abs_value(self.config, self.sid, "action")
		if action == "" then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: action")
		end
		bgp_utils:section_limit(self, "bgp_route_maps", nil, 30)
	end

	function dynamic_bgp_route_maps:DELETE_before_section_delete_hook()
		self:table_foreach(self.config, "bgp_route_map_filters", function(s)
			if s.route_map == self.sid then
				self:add_critical_error(STD_CODES.INVALID_OPT, "This instance is used by a route map filter")
			end
		end)
	end

return dynamic_bgp_route_maps
