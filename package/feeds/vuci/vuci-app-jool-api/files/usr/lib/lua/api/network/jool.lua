local ConfigService = require("api/ConfigService")
local jool_common = require("api/network/jool_common")
local util = require("vuci.util")

local jool = ConfigService:new({ increment_name = true })

local function get_zones_names(self)
	local zones_names = { "*" }
	self:table_foreach("firewall", "zone", function(s)
		table.insert(zones_names, s.name)
	end)
	return zones_names
end

local _zones = nil
function jool:zones()
	if not _zones then
		_zones = get_zones_names(self)
	end
	return _zones
end

function jool:get_secondary_ref_opt(option)
	local opt
	local instance = self:table_get(self.config, self.sid, "instance")
	self:table_foreach(self.config, "jool", function (s)
		if s.instance == instance and s.family == "ipv6" then
			opt = s[option]
			return false
		end
	end)
	return opt
end

function jool:set_secondary_ref_opt(option, value)
	self:table_set(self.config, self:get_secondary_ref_opt(".name"), option, value)
end

function jool:DELETE_before_section_delete_hook()
	self:table_delete(self.config, self:get_secondary_ref_opt(".name"))
end

function jool:find_and_set_zone()
	local src = self:get_secondary_ref_opt("src")
	if src then return end
	local iface = self:table_get("jool", "general", "interface")
	local iface_zone = jool_common.get_iface_zone(self, iface)
	if not iface_zone then return end
	self:set_secondary_ref_opt("src", iface_zone)
end

jool.POST_before_commit_hook = jool.find_and_set_zone

local s = jool:section("firewall", "jool")

	function s:filter(section)
		return section.family == "ipv4"
	end

	function s:create_defaults()
		if self:table_find(self.config, "jool", { target = "JOOL" }) then
			self:add_critical_error(
				STD_CODES.NO_CREATE,
				"Only a single rule can be added at the time",
				"Validation"
			)
		end
		self:table_section(self.config, "jool", self:next_id("firewall"), {
			target = "JOOL",
			family = "ipv6",
			enabled = "0",
			instance = "default"
		})
		return {
			target = "JOOL",
			family = "ipv4",
			enabled = "0",
			instance = "default"
		}
	end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
		function enabled:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			self:set_secondary_ref_opt(self.api_key, value)
		end

	local name = s:option("name")
		name.maxlength = 64
		function name:validate(value)
			local name_exists = false
			local instance = self:table_get(self.config, self.sid, "instance")
			self:table_foreach(self.config, self.section_type, function (s)
				if s.instance ~= instance and s.name == value then
					name_exists = true
					return false
				end
			end)
			if name_exists then
				return false, "Configuration with name '" .. value .. "' already exists"
			end
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9_ -]+$")
		end
		function name:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			self:set_secondary_ref_opt(self.api_key, value)
		end

		local src = s:option("src")
			function src:validate(value)
				return self.dt:check_array(value, self:zones())
			end
			function src:get()
				return self:get_secondary_ref_opt(self.api_key)
			end
			function src:set(value)
				self:set_secondary_ref_opt(self.api_key, value)
			end

		local proto = s:option("proto", { list = true })
			function proto:validate()
				return self.dt:string()
			end
			function proto:get(value)
				if value and type(value) == "string" then
					value = util.split(value, " ")
				end
				return value
			end
			function proto:set(value)
				self:table_set(self.config, self.sid, self.api_key, value)
				self:set_secondary_ref_opt(self.api_key, value)
			end

		local dest_ipv4 = s:option("dest_ipv4", { list = true })
			dest_ipv4.maxlength = 64
			function dest_ipv4:validate(value)
				local values = {}
				value:gsub("[%a%d%p]+", function(s) table.insert(values, s) end)
				for _, v in pairs(values) do
					local new_value, err = self.dt:neg(v)
					if err then
						return false, err
					end
					local ok, mask_err = self.dt:ipmask4(new_value)
					if not ok then
						return ok, mask_err
					end
				end
				return true
			end
			function dest_ipv4:get()
				return self:table_get(self.config, self.sid, "src_ip")
			end
			function dest_ipv4:set(value)
				self:table_set(self.config, self.sid, "src_ip", value)
			end

		local src_ipv6 = s:option("src_ipv6", { list = true })
			function src_ipv6:validate(value)
				local values = {}
				value:gsub("[%a%d%p]+", function(s) table.insert(values, s) end)
				for _, v in pairs(values) do
					local new_value, err = self.dt:neg(v)
					if err then
						return false, err
					end
					local ok, mask_err = self.dt:ipmask6(new_value)
					if not ok then
						return ok, mask_err
					end
				end
				return true
			end
			function src_ipv6:get()
				return self:get_secondary_ref_opt("src_ip")
			end
			function src_ipv6:set(value)
				self:set_secondary_ref_opt("src_ip", value)
			end

		local src_port = s:option("src_port", { list = true })
			function src_port:validate(value)
				local res, msg, value_table = nil, nil, {}
				value:gsub("[%a%d%p]+", function(s) table.insert(value_table, s) end)
				for _, v in pairs(value_table) do
					res, msg = self.dt:neg(v)
					if res == false then
						return res, msg
					end
					res, msg = self.dt:portrange(res)
					if not res then
						return res, msg
					end
				end
				return true
			end
			function src_port:get()
				return self:get_secondary_ref_opt(self.api_key)
			end
			function src_port:set(value)
				self:set_secondary_ref_opt(self.api_key, value)
			end

		local dest_ipv6 = s:option("dest_ipv6", { list = true })
			dest_ipv6.maxlength = 64
			function dest_ipv6:validate(value)
				local values = {}
				value:gsub("[%a%d%p]+", function(s) table.insert(values, s) end)
				for _, v in pairs(values) do
					local new_value, err = self.dt:neg(v)
					if err then
						return false, err
					end
					local ok, mask_err = self.dt:ipmask6(new_value)
					if not ok then
						return ok, mask_err
					end
				end
				return true
			end 
			function dest_ipv6:get()
				return self:get_secondary_ref_opt("dest_ip")
			end
			function dest_ipv6:set(value)
				self:set_secondary_ref_opt("dest_ip", value)
			end

		local dest_port = s:option("dest_port", { list = true })
			function dest_port:validate(value)
				local res, msg, value_table = nil, nil, {}
				value:gsub("[%a%d%p]+", function(s) table.insert(value_table, s) end)
				for _, v in pairs(value_table) do
					res, msg = self.dt:neg(v)
					if res == false then
						return res, msg
					end
					res, msg = self.dt:portrange(res)
					if not res then
						return res, msg
					end
				end
				return true
			end
			function dest_port:get()
				return self:get_secondary_ref_opt(self.api_key)
			end
			function dest_port:set(value)
				self:set_secondary_ref_opt(self.api_key, value)
			end

return jool
