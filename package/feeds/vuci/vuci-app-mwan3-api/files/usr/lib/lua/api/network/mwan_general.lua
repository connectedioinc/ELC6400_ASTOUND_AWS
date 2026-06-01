local ConfigService = require("api/ConfigService")

local MWAN3 = ConfigService:new({
	create = false,
	delete = false
})

local MWAN3Global = MWAN3:section("mwan3", "globals")

	local opt_mode = MWAN3Global:option("mode")
		function opt_mode:validate(value)
			local modes = {
				"balance", "mwan"
			}
			self:table_foreach(self.config, "policy", function (s)
				if s[".name"]:match("^(.*)_default$") then return end
				table.insert(modes, s[".name"])
			end)
			return self.dt:check_array(value, modes)
		end
		function opt_mode:set(value)
			if self:table_get(self.config, self.sid, self.api_key) ~= value then
				self:table_set(self.config, self.sid, self.api_key, value)
				local rule = self:table_get(self.config, "default_rule")
				if not rule then
					self:table_foreach(self.config, "rule", function (s)
						rule = s
						return false
					end)
				end
				if rule then
					if value == "mwan" or value == "balance" then
						self:table_set(self.config, rule[".name"], "use_policy", value.."_default")
					else
						self:table_set(self.config, rule[".name"], "use_policy", value)
					end
				end
			end
		end
		function opt_mode:get(value)
			if value then
				return value
			end
			if self:table_get(self.config, "default_rule") then
				value = self:table_get(self.config, "default_rule", "use_policy")
			end
			return value and value:match("^(%a+)_default$")
		end

return MWAN3