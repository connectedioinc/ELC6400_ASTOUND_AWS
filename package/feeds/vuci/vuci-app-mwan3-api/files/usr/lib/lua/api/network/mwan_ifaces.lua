local ConfigService = require("api/ConfigService")
local network_lib = require("vuci.network_lib")

local MWAN3 = ConfigService:new()

local MWAN3Interface = MWAN3:section("mwan3", "interface")


function MWAN3:POST_validate_section_hook()
	local network_section = self:table_get("network", self.sid)
	if not network_section or network_section[".type"] ~= "interface" then
		self:add_error(STD_CODES.INVALID_SECTION, "Failover interface configuration ID must match an ID of a network interface configuration.", "URL")
		return
	end
end

	function MWAN3Interface:create_defaults()
		self:table_section(self.config, "condition", nil, {
			interface = self.sid,
			track_method = "ping",
			track_ip = { "1.1.1.1", "8.8.8.8" },
			reliability = "1",
			count = "1",
			timeout = "2",
			down = "3",
			up = "3"
		})
		return {
			enabled = "0",
			interval = "3",
			family = "ipv4"
		}
	end

	local opt_name = MWAN3Interface:option("name")
		opt_name.readonly = true
		function opt_name:get()
			return self:table_get("network", self.sid, "name") or self.sid
		end

	local opt_enabled = MWAN3Interface:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_network_type = MWAN3Interface:option("network_type")
		opt_network_type.readonly = true
		function opt_network_type:get()
			return network_lib:get_network_type(self.sid, self.uci)
		end

	local opt_interval = MWAN3Interface:option("interval")
		function opt_interval:validate(value)
			return self.dt:irange(value, 0, 65000)
		end

	local opt_flush_conntrack = MWAN3Interface:option("flush_conntrack", {list = true})
		function opt_flush_conntrack:validate(value)
			return self.dt:check_array(value, {
				"connected", "disconnected", "ifup", "ifdown"
			})
		end

		-- Gets condition section for interface.
		---@param iface string Interface name to get condition data for.
		---@return table | nil condition Condition section table or nil if not found.
		function MWAN3Interface:get_condition(iface)
			local data
			self:table_foreach(self.config, "condition", function (condition)
				if condition.interface == iface then
					data = condition[".name"]
					return false
				end
			end)
			return data
		end

		-- Default condition getter.
		local default_condition_getter = function (self)
			local condition = self:get_condition(self.sid)
			if condition then
				return self:table_get(self.config, condition, self.api_key)
			end
		end

		-- Default condition setter.
		local default_condition_setter = function (self, value)
			local condition = self:get_condition(self.sid)
			if condition then
				self:table_set(self.config, condition, self.api_key, value)
			end
		end

		local opt_track_method = MWAN3Interface:option("track_method")
			opt_track_method.require = { ping = {"family", "track_ip"}, wgetping = { "track_ip" }}
			function opt_track_method:validate(value)
				return self.dt:check_array(value, {"ping", "wgetping"})
			end
			opt_track_method.get = default_condition_getter
			opt_track_method.set = default_condition_setter
		local opt_family = MWAN3Interface:option("family")
			function opt_family:validate(value)
				return self.dt:check_array(value, {"ipv6", "ipv4"})
			end
		local opt_track_ip = MWAN3Interface:option("track_ip", {list = true})
			function opt_track_ip:validate(value)
				if self:get_abs_value(self.config, self.sid, "track_method") == "wgetping" then
					return self.dt:url(value)
				else
					local family = self:get_abs_value(self.config, self.sid, "family")
					if family == "ipv4" then
						return self.dt:ipv4host(value)
					elseif family == "ipv6" then
						return self.dt:ipv6host(value)
					end
				end
			end
			opt_track_ip.get = default_condition_getter
			opt_track_ip.set = default_condition_setter

		local opt_reliability = MWAN3Interface:option("reliability")
			function opt_reliability:validate(value)
				local track_ip = self:get_abs_value(self.config, self.sid, "track_ip")
				return self.dt:irange(value, 1, track_ip and #track_ip or 1)
			end
			opt_reliability.get = default_condition_getter
			opt_reliability.set = default_condition_setter

		local opt_count = MWAN3Interface:option("count")
			function opt_count:validate(value)
				return self.dt:irange(value, 1, 65000)
			end
			opt_count.get = default_condition_getter
			opt_count.set = default_condition_setter

		local opt_up = MWAN3Interface:option("up")
			function opt_up:validate(value)
				return self.dt:irange(value, 1, 65000)
			end
			opt_up.get = default_condition_getter
			opt_up.set = default_condition_setter

		local opt_down = MWAN3Interface:option("down")
			function opt_down:validate(value)
				return self.dt:irange(value, 1, 65000)
			end
			opt_down.get = default_condition_getter
			opt_down.set = default_condition_setter

function MWAN3:DELETE_before_section_delete_hook()
	self:table_foreach(self.config, "condition", function (s)
		if s.interface ~= self.sid then return end
		self:table_delete(self.config, s[".name"])
		return false
	end)

	local members_to_remove = {}
	self:table_foreach(self.config, "member", function (s)
		if s.interface ~= self.sid then return end
		members_to_remove[s[".name"]] = true
		self:table_delete(self.config, s[".name"])
	end)

	self:table_foreach(self.config, "policy", function (s)
		local new_members = {}
		for _, member in pairs(s.use_member or {}) do
			if not members_to_remove[member] then
				table.insert(new_members, member)
			end
		end
		self:table_set(self.config, s[".name"], "use_member", new_members)
	end)
end

return MWAN3
