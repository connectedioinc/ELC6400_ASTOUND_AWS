local utils = {}

function utils.remove_from_bridge(self)
	self:table_foreach(self.config, "device", function (s)
		if s.type ~= "bridge" then return end
		local new_ports = {}
		for _, port in ipairs(self:table_get(self.config, s[".name"], "ports") or {}) do
			if port ~= self.sid then
				table.insert(new_ports, port)
			end
		end
		self:table_set(self.config, s[".name"], "ports", new_ports)
	end)
end

return utils
