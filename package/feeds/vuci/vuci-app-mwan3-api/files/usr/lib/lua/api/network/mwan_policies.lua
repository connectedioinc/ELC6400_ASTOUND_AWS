local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local MWAN3 = ConfigService:new()

function MWAN3:POST_init_hook()
	if not self.arguments.data then return end

	local name = self.arguments.data.name
	local generated_name = util.generate_name(self, self.config, "policy", "policy", { ".name", "name" })
	self.arguments.data.id = generated_name
	self.arguments.data.name = name or generated_name
end

function MWAN3:DELETE_before_section_delete_hook()
	if string.match(self.sid, "_default$") then
		self:add_critical_error(
			STD_CODES.UCI_DELETE_ERROR,
			string.format("DELETE of section '%s' failed. Message (%s) ",
				self.sid,
				"Can not delete default sections."
			),
			"Validation"
		)
	end

	self:table_foreach(self.config, "rule", function (s)
		if s.use_policy ~= self.sid then return end
		self:table_delete(self.config, s[".name"], "use_policy")
	end)
end

local MWAN3Policies = MWAN3:section("mwan3", "policy")

function MWAN3:validate_section_hook()
	local used_members = self:get_abs_value(self.config, self.sid, "use_member") or {}
	local member_iface_lookup = {}
	for _, member in pairs(used_members) do
		local member_instance = self:table_get(self.config, member)
		if not member_instance then
			self:add_error(
				STD_CODES.INVALID_OPT,
				string.format("Provided member '%s' does not exist", member),
				"Validation"
			)
		else
			member_iface_lookup[member_instance.interface or member] = member_iface_lookup[member_instance.interface or member] and member_iface_lookup[member_instance.interface or member]+1 or 1
		end
	end

	for member, occurrences in pairs(member_iface_lookup) do
		if occurrences > 1 then
			self:add_error(
				STD_CODES.INVALID_OPT,
				string.format("Same member interface '%s' cannot be used multiple times in the same policy", member),
				"Validation"
			)
		end
	end
end

function MWAN3:POST_validate_section_hook()
	if self.t_func:get_uci_config(self.main_config)[self.main_section:_get_sid(self.sid)] then
		self:add_error(
			STD_CODES.NAME_USED,
			"Name already used for a configuration",
			"Validation"
		)
	end

	self:validate_section_hook()
end

MWAN3.PUT_validate_section_hook = MWAN3.validate_section_hook

	local opt_name = MWAN3Policies:option("name")
		function opt_name:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "policy", function(s)
				if self.sid ~= s[".name"] and s.name == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return self.dt:uciname(value)
		end
		function opt_name:get(value)
			return value or self.sid:match("^(.*)_default$") or self.sid
		end

	local opt_mode = MWAN3Policies:option("mode")
		function opt_mode:validate(value)
			return self.dt:check_array(value, {
				"mwan", "balance"
			})
		end
		function opt_mode:set() end
		function opt_mode:get() end

	local opt_use_member = MWAN3Policies:option("use_member", {list = true})
		function opt_use_member:validate(value)
			local available_members = {}
			self:table_foreach(self.config, "member", function (s)
				table.insert(available_members, s[".name"])
			end)
			return self.dt:check_array(value, available_members)
		end

	local opt_last_resort = MWAN3Policies:option("last_resort")
		function opt_last_resort:validate(value)
			return self.dt:check_array(value, { "unreachable", "blackhole", "default" })
		end

return MWAN3