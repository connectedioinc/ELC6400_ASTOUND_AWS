local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local bfd_profile = ConfigService:new()

function bfd_profile:POST_init_hook()
	if not self.arguments.data then return end

	local name = self.arguments.data.name
	local generated_name = util.generate_name(self, self.config, "profile", "profile", { ".name", "name" })
	self.arguments.data.id = generated_name
	self.arguments.data.name = name or generated_name
end

function bfd_profile:DELETE_before_commit_hook()
	self:table_foreach(self.config, "peer", function (s)
		if s.profile ~= self.sid then return end
		self:table_delete(self.config, s[".name"], "profile")
	end)
end

local s = bfd_profile:section("bfd", "profile")

	local name = s:option("name")
		name.cfg_require = true
		function name:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "profile", function(s)
				if self.sid ~= s[".name"] and s.name == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return self.dt:uciname(value)
		end
		function name:get(value)
			return value or self:table_get(self.config, self.sid, ".name")
		end

	local receive_interval = s:option("receive_interval")
		function receive_interval:validate(value)
			return self.dt:irange(value, 10, 4294967)
		end

	local transmit_interval = s:option("transmit_interval")
		function transmit_interval:validate(value)
			return self.dt:irange(value, 10, 4294967)
		end

return bfd_profile
