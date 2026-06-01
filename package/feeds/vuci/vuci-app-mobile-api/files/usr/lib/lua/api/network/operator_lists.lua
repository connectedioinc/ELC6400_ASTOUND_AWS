
local ConfigService = require("api/ConfigService")
local mdm = require("vuci.modem")

if mdm:modem_count() == 0 then
	return nil
end

-- No operator lists if device has only low power modems
if mdm:has_mode(mdm.modes.LOW_POWER, true) then
	return nil
end

local op_lists = ConfigService:new({ anonymous = true })

function op_lists:DELETE_before_section_delete_hook()
	local name = self:table_get(self.config, self.sid, "name")
	if not name then return end
	self:table_foreach("simcard", "sim", function(s)
		if s.operlist_name == name then
			self:table_delete("simcard", s[".name"], "operlist_name")
			self:table_delete("simcard", s[".name"], "operlist")
			self:table_delete("simcard", s[".name"], "opermode")
			self:table_delete("simcard", s[".name"], "operator")
		end
	end)
end

function op_lists:PUT_validate_section_hook()
	local current_name = self:table_get(self.config, self.sid, "name")
	local new_name = self:get_abs_value(self.config, self.sid, "name")
	if current_name == new_name then return end

	self:table_foreach("simcard", "sim", function(s)
		if s.operlist_name == current_name then
			self:table_set("simcard", s[".name"], "operlist_name", new_name)
		end
	end)
end

local s = op_lists:section("operctl", "operlist")

	local name = s:option("name")
		name.cfg_require = true
		name.maxlength = 16
		function name:validate(value)
			local ok, err = true, ""
			self:table_foreach(self.config, "operlist", function(s)
				if s[".name"] ~= self.sid and s.name == value then
					ok, err = false, "Configuration with this name already exists."
					return false -- break
				end
			end)
			if not ok then return ok, err end
			return self.dt:uciname(value)
		end

	local mcc_mnc = s:option("mcc_mnc", { list = true })
		function mcc_mnc:validate(value)
			if not (#value == 3 or #value == 5 or #value == 6) then
				return false, "Only 3, 5 or 6 character operator codes are accepted."
			end
			return self.dt:fieldvalidation(value, "^%d+$")
		end

return op_lists
