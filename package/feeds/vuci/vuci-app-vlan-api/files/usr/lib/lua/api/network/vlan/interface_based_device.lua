local ConfigService = require("api/ConfigService")

local flags = {
	increment_name = true
}

local interface_based_device = ConfigService:new(flags)

function interface_based_device:find_devices_recursive(name, find_name)
	local belongs = false
	self:table_foreach(self.main_config, "device", function(s)
		if s.ifname == name then
			if s.name == find_name then
				belongs = true
			elseif not belongs then
				belongs = self:find_devices_recursive(s.name, find_name)
			end
		end
	end)
	return belongs
end

	local device = interface_based_device:section("network", "device")
	device.filter = function (self, options)
		if options.macaddr or not options[".name"]:match("^%d+$") then
			return false
		end
		local slave_name = options.name
		local slave_ifname = options.ifname
		local current_name = self:table_get(self.config, self.binding, "name")
		local exists_in_chain = self:find_devices_recursive(current_name, slave_name)
		return (not slave_ifname or exists_in_chain)
	end
	device.create_defaults = function (self)
		return {
			["ifname"] = self:table_get(self.config, self.binding, "name"),
			["type"] = "8021q"
		}
	end

		local name = device:option("name")
		name.cfg_require = true
		name.maxlength = 8
			function name:validate(value)
				if not value:match("%a") then
					return false, "Option must contain a single letter"
				end
				return self.dt:default_validation(value)
			end

		local vid = device:option("vid")
			function vid:validate(value)
				return self.dt:irange(value, 1, 4094)
			end

		local ifname = device:option("ifname")
		ifname.cfg_require = true
			function ifname:validate(value)
				local parent_name = self:table_get(self.config, self.binding, "name")
				local device_name = self:table_get(self.config, self.sid, "name")
				local black_list = {}
				local val_list = {}

				table.insert(val_list, parent_name)
				table.insert(black_list, device_name)

				-- Finds device chain of current device
				local function recursive_find_chain(cur_name)
					self:table_foreach(self.config, self.section_type, function(s)
						if s.ifname == cur_name then
							table.insert(black_list, s.name)
							recursive_find_chain(s.name)
						end
					end)
				end

				-- Adds possible interfaces and excludes anything from own chain
				local function recursive_add_val(name)
					self:table_foreach(self.config, self.section_type, function(s)
						if s.ifname == name then
							local add = true
							for _, v in pairs(black_list) do
								if s.name == v then
									add = false
								end
							end
							if add then
								table.insert(val_list, s.name)
								recursive_add_val(s.name)
							end
						end
					end)
				end

				recursive_find_chain(device_name)
				recursive_add_val(parent_name)

				return self.dt:check_array(value, val_list)
			end

function interface_based_device:validate_empty_option(option)
	if self.current_data_block[option] then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"'" .. option .. "' cannot be edited",
			"Validation"
		)
	end
end

function interface_based_device:remove_from_interfaces(sec_name)
	self:table_foreach(self.main_config, "interface", function(s)
		local update = false
		if s.device then
			local devices, old_devices, type = {}, nil, ""
			if self:table_get(self.main_config, "br_"..s[".name"]) then
				old_devices = self:table_get(self.main_config, "br_"..s[".name"], "ports")
				type = self:table_get(self.main_config, "br_"..s[".name"], "type")
			else
				old_devices = {s.device}
			end
			for _, device in pairs(old_devices or {}) do
				if device ~= sec_name then
					table.insert(devices, device)
				else
					update = true
				end
			end
			if update and #devices > 0 and type == "bridge" then
				self:table_set(self.main_config, "br_"..s[".name"], "ports", devices)
			elseif update then
				self:table_delete(self.main_config, s[".name"], "device")
				if self:table_get(self.main_config, "br_"..s[".name"]) then
					self:table_delete(self.main_config, "br_"..s[".name"])
				end
			end
		end
	end)
end

function interface_based_device:remove_recursive(delete_name)
	self:table_foreach(self.main_config, "device", function(s)
		if s.ifname and s.ifname == delete_name then
			self:remove_recursive(s.name)
			self:remove_from_interfaces(s.name)
			self:table_delete(self.main_config, s[".name"])
		end
	end)
end

function interface_based_device:PUT_validate_section_hook()
	self:validate_empty_option("name")
end

function interface_based_device:POST_validate_section_hook()
	if not self.current_data_block["name"] then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Option: 'name' must be provided",
			"Validation"
		)
	end

	local new_name = self.current_data_block["name"]

	local used_device = false
	self:table_foreach(self.main_config, "device", function(s)
		if s.name and new_name == s.name then
			used_device = true
			return false
		end
	end)

	local net = require "vuci.network".init(self.uci)

	local devices = net:get_devices()
	local ifaces = {}
	for device in pairs(devices) do
		table.insert(ifaces, device)
	end
	self:table_foreach("network", "interface", function(s)
		if s.proto and s.proto == "l2tpv3" and s[".name"] then
			table.insert(ifaces, "l2v3-"..s[".name"])
		end
	end)

	if used_device or vuci.util.contains(ifaces, new_name) then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Name '".. self.current_data_block["name"] .."' is already in use",
			"Validation"
		)
	end
end

function interface_based_device:DELETE_before_section_delete_hook()
	local section_name = self:table_get(self.main_config, self.sid, "name")
	if section_name then
		self:remove_recursive(section_name)

		self:remove_from_interfaces(section_name)
	end
end

return interface_based_device
