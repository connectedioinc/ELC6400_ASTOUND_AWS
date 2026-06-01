local util = require("vuci.util")
local ConfigService = require("api/ConfigService")

local mwan3 = ConfigService:new()
mwan3.sort_response_by = "metric"

function mwan3:POST_init_hook()
	if not self.arguments.data then return end

	local name = self.arguments.data.name
	local metric = self.arguments.data.metric
	local generated_name = util.generate_name(self, self.config, "member", "member", { ".name", "name" })
	self.arguments.data.id = generated_name
	self.arguments.data.name = name or generated_name
	self.arguments.data.metric = metric or self:find_highest_metric()
end

function mwan3:find_highest_metric()
	local metric = 1
	self:table_foreach(self.config, "member", function(s)
		if not s.metric then return end
		metric = math.max(metric, tonumber(s.metric))
	end)
	return tostring(metric + 1)
end

function mwan3:reorder_network_interfaces()
	local ifaces = {}
	self:table_foreach("mwan3", "member", function (member)
		if member[".name"]:match("_member_mwan$") and member.interface and member.metric then
			table.insert(ifaces, {
				interface = member.interface,
				metric = member.metric
			})
		end
	end)

	table.sort(ifaces, function(a, b)
		if a[self.sort_response_by] and b[self.sort_response_by] then
			return tonumber(a[self.sort_response_by]) < tonumber(b[self.sort_response_by])
		end
	end)

	for i, iface in ipairs(ifaces) do
		self:table_set("network", iface.interface, "metric", tostring(i))
	end

	self.needs_interfaces_reorder = false
end

function mwan3:PUT_before_commit_hook()
	if not self.needs_interfaces_reorder then
		return
	end

	self:reorder_network_interfaces()
end

function mwan3:reorder_mwan(old_value, new_value)
	old_value = tonumber(old_value)
	new_value = tonumber(new_value)
	self:table_foreach(self.config, "member", function(m)
		if m[".name"] ~= self.sid and m[".name"]:match("_member_mwan$") then
			local metric = tonumber(m.metric)
			if new_value > old_value and metric > old_value and metric <= new_value then
				self:table_set(self.config, m[".name"], "metric", tostring(metric - 1))
			elseif new_value < old_value and metric < old_value and metric >= new_value then
				self:table_set(self.config, m[".name"], "metric", tostring(metric + 1))
			end
		end
	end)
end

function mwan3:DELETE_before_section_delete_hook()
	self:table_foreach(self.config, "policy", function (s)
		local new_members = {}
		for _, member in pairs(s.use_member or {}) do
			if member ~= self.sid then
				table.insert(new_members, member)
			end
		end
		self:table_set(self.config, s[".name"], "use_member", new_members)
	end)
end

	local members = mwan3:section("mwan3", "member")

		local metric = members:option("metric")
		metric.cfg_require = true
			function metric:validate(value)
				return self.dt:uinteger(value)
			end
			function metric:set(value)
				if self.sid:match("_member_mwan$") then
					local value_cfg = self:get_abs_value(self.config, self.sid, "metric")
					self:reorder_mwan(value_cfg, value)
					mwan3.needs_interfaces_reorder = true
				end
				self:table_set(self.config, self.sid, self.api_key, value)
			end
			function metric:get(value)
				return value or "1"
			end

		local weight = members:option("weight")
			function weight:validate(value)
				return self.dt:irange(value, 1, 99)
			end

		local name = members:option("name")
			function name:validate(value)
				local duplicates = false
				self:table_foreach(self.config, "member", function(s)
					if self.sid ~= s[".name"] and s.name == value then
						duplicates = true
						return false
					end
				end)
				if duplicates then return false, "Duplicate names are not allowed" end
				return self.dt:uciname(value)
			end
			function name:get(value)
				if value then return value end
				local iface = self:get_abs_value(self.config, self.sid, "interface")
				local iface_name = util.network_mapper_get(self, iface)
				local group = self.sid:match(".*_(.*)$")
				return iface_name and group and (iface_name.."_member_"..group) or self.sid
			end

		local interface = members:option("interface")
			function interface:validate(value)
				local old_value = self:table_get(self.config, self.sid, self.api_key)
				local iface_internal_map = util.get_network_map(self)
				local ivalue = iface_internal_map[value] or value
				local policy_map = {}
				local policy_instance
				self:table_foreach(self.config, "policy", function (s)
					policy_map[s[".name"]] = {}
					for _, member in pairs(s.use_member or {}) do
						local member_iface = self:table_get(self.config, member, "interface")
						if member_iface then
							policy_map[s[".name"]][member_iface] = true
						end
						if member == self.sid then
							policy_instance = s
						end
					end
				end)

				if policy_instance and old_value ~= ivalue and policy_map[policy_instance[".name"]][ivalue] then
					return false, "Interface is already used in a policy"
				end

				local ifaces = {}
				local iface_map = util.get_network_map(self, true)
				self:table_foreach(self.config, "interface", function (s)
					table.insert(ifaces, iface_map[s[".name"]] or s[".name"])
				end)
				return self.dt:check_array(value, ifaces)
			end
			function interface:get(value)
				return util.network_mapper_get(self, value)
			end
			function interface:set(value)
				util.network_mapper_set(self, value)
			end

return mwan3
