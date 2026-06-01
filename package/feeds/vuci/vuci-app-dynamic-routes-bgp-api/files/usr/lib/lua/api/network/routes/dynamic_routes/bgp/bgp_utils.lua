local bgp_utils = {}

function bgp_utils.parent_exists(self, binding)
	local parentSection = not self.binding and "general" or self.binding
	-- self.uci:get is used here because table_get cannot check if section exists or not
	if not self.uci:get("bgp", parentSection) then
		if parentSection == "general" then
			self.uci:set("bgp", "general", "bgp_instance")
		else
			self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				string.format("Parent section '%s' does not exist", parentSection),
				"UCI",
				HTTP_STATUS_CODES.NOT_FOUND
			)
		end
	end
end

function bgp_utils:section_limit(self, section, parent_instance, limit)
	local instances_count = 0
	self:table_foreach("bgp", section, function(sec)
		if sec.instance == parent_instance then
			instances_count = instances_count + 1
		end
	end)
	if instances_count >= limit then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, string.format("Maximum number of %s sections has been reached", section), "Validation")
	end
end

return bgp_utils
