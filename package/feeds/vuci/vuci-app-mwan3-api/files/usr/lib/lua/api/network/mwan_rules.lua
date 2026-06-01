local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local MWAN3 = ConfigService:new()
MWAN3.order_by = "priority"

function MWAN3:POST_init_hook()
	if not self.arguments.data then return end

	local name = self.arguments.data.name
	local generated_name = util.generate_name(self, self.config, "rule", "rule", { ".name", "name" })
	self.arguments.data.id = generated_name
	self.arguments.data.name = name or generated_name
end

function MWAN3:get_rule_priority(name)
	local priority = 1
	self:table_foreach(self.config, "rule", function (s)
		if s[".name"] ~= name then
			priority = priority + 1
		else
			return false
		end
	end)
	return tostring(priority)
end

local MWAN3Rules = MWAN3:section("mwan3", "rule")

function MWAN3Rules:create_defaults()
	return {
		proto = "all",
		sticky = "0"
	}
end

	local opt_name = MWAN3Rules:option("name")
		function opt_name:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "rule", function(s)
				if self.sid ~= s[".name"] and s.name == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed" end
			return self.dt:uciname(value)
		end
		function opt_name:get(value)
			return value or self.sid
		end

	local opt_priority = MWAN3Rules:option("priority")
		function opt_priority:validate(value)
			return self.dt:uinteger(value)
		end
		function opt_priority:set(_) end
		function opt_priority:get()
			return self:get_rule_priority(self.sid)
		end

	local opt_proto = MWAN3Rules:option("proto")
		function opt_proto:validate(value)
			return self.dt:check_array(value, {
				"all", "tcp", "udp", "icmp", "esp"
			})
		end

	local opt_src_ip = MWAN3Rules:option("src_ip", {list = true})
		function opt_src_ip:validate(value)
			return self.dt:ipmask4(value)
		end

	local opt_src_port = MWAN3Rules:option("src_port")
		function opt_src_port:validate(value)
			local proto = self:get_abs_value("mwan3", self.sid, "proto")
			if proto == "icmp" or proto == "esp" then
				return false, "Port number cannot be used with ICMP or ESP protocol"
			end
			return self.dt:portrange(value)
		end

	local opt_dest_ip = MWAN3Rules:option("dest_ip", {list = true})
		function opt_dest_ip:validate(value)
			return self.dt:ipmask4(value)
		end

	local opt_dest_port = MWAN3Rules:option("dest_port")
		function opt_dest_port:validate(value)
			local proto = self:get_abs_value("mwan3", self.sid, "proto")
			if proto == "icmp" or proto == "esp" then
				return false, "Port number cannot be used with ICMP or ESP protocol"
			end
			return self.dt:portrange(value)
		end

	local opt_sticky = MWAN3Rules:option("sticky")
		function opt_sticky:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_timeout = MWAN3Rules:option("timeout")
		function opt_timeout:validate(value)
			return self.dt:irange(value, 1, 1000000)
		end

	local opt_use_policy = MWAN3Rules:option("use_policy")
		function opt_use_policy:validate(value)
			local policies = {
				"unreachable", "blackhole", "default"
			}

			local ok = self.dt:check_array(value, policies)
			if ok then return ok end

			self:table_foreach(self.config, "policy", function (policy)
				table.insert(policies, policy[".name"])
			end)
			local ok, err = self.dt:check_array(value, policies)
			if not ok then return ok, err end

			local members = self:table_get(self.config, value, "use_member") or {}
			if #members <= 0 then return false, "Specified policy should have at least one member before being assigned to rule" end

			return true
		end
		function opt_use_policy:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)

			-- Only set mode for the default or first rule
			local default_rule = self:table_get(self.config, "default_rule")
			if not default_rule then
				self:table_foreach(self.config, "rule", function (s)
					default_rule = s
					return false
				end)
			end

			if default_rule[".name"] ~= self.sid or not self:table_get(self.config, value) then return end
			local mode = value:match("^(.*)_.*$") or value
			self:table_set(self.config, "globals", "mode", mode)
		end

return MWAN3