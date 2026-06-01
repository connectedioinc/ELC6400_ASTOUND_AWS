local ConfigService = require("api/ConfigService")

local flags = {
	increment_name = true
}

local interface_based = ConfigService:new(flags)
interface_based.ifaces = {}
interface_based.ifaces_filter = {}
interface_based.devices = {}

function interface_based:section_init_hook()
	local net = require "vuci.network".init(self.uci)
	self.devices = net:get_devices()

	local board = require("vuci.board")
	local dsa_support = board:has_dsa()
	local lan_devs = board:get_default_lan_ifname() or {}
	local wan_dev = board:get_default_wan_ifname()
	local ifaces_map = {}
	local ifaces_filter_map = {}

	if type(lan_devs) ~= "table" then
		lan_devs = { lan_devs }
	end

	for device, value in pairs(self.devices) do
		if device and value.virtual == false then
			ifaces_filter_map[device] = true
		end
	end

	if dsa_support then
		local used_vlans = {}
		self:table_foreach("network", "device", function(s)
			if s.name == "vlan" then
				for _, d in pairs(s.ports or {}) do
					used_vlans[d] = true
				end
			end
		end)

		for _, p in pairs(lan_devs) do
			if not used_vlans[p] then
				ifaces_map[p] = true
			end
		end

		if wan_dev then
			ifaces_map[wan_dev] = true
		end

		for device, value in pairs(self.devices) do
			if device and not device:match("^wwan") and not device:match("^wlan") and
				value.virtual == false and not value.dsa_cpu and value.type ~= "VLAN" then
				ifaces_map[device] = true
				ifaces_filter_map[device] = true
			end
		end
	else
		local function check_if_default_device(dev)
			for _, p in pairs(lan_devs) do
				if p == dev then
					return true
				end
			end
			if dev == wan_dev then return true end
			return false
		end

		for device, value in pairs(self.devices) do
			if device and not device:match("^wwan") and not device:match("^wlan") and
				(value.virtual == false or check_if_default_device(device)) then
				ifaces_map[device] = true
				ifaces_filter_map[device] = true
			end
		end
	end

	self:table_foreach("network", "interface", function(s)
		if s.proto and s.proto == "l2tpv3" and s[".name"] then
			ifaces_map["l2v3-"..s[".name"]] = true
			ifaces_filter_map["l2v3-"..s[".name"]] = true
		end
	end)

	for dev, _ in pairs(ifaces_map) do
		table.insert(self.ifaces, dev)
	end

	for dev, _ in pairs(ifaces_filter_map) do
		table.insert(self.ifaces_filter, dev)
	end

	table.sort(self.ifaces, function(a, b) return a < b end)
end
interface_based.GET_init_hook = interface_based.section_init_hook
interface_based.PUT_init_hook = interface_based.section_init_hook
interface_based.DELETE_init_hook = interface_based.section_init_hook

function interface_based:POST_section_init_hook()
	self:section_init_hook()
	if #self.ifaces == 0 then
		return self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create interface based VLAN. All parent interfaces are used.")
	end
end

	local device = interface_based:section("network", "device")
	device.filter = function (self, options)
		if options.ifname and vuci.util.contains(self.ifaces_filter, options.ifname) then
			return true
		end
		return false
	end
	device.create_defaults = function (self)
		return {
			ifname = interface_based.ifaces[1]
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

		local device_type = device:option("type")
			function device_type:validate(value)
				return self.dt:check_array(value, { "8021ad", "8021q" })
			end

		local ifname = device:option("ifname")
		ifname.cfg_require = true
			function ifname:validate(value)
				return self.dt:check_array(value, self.ifaces)
			end

function interface_based:validate_empty_option(option)
	if self.current_data_block[option] then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"'" .. option .. "' cannot be edited",
			"Validation"
		)
	end
end

function interface_based:remove_from_interfaces(sec_name)
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
				-- table_set doesn't work here when multiple interfaces are deleted with the same request
				-- because section deletion happens earlier then option set
				self.uci:set(self.main_config, "br_"..s[".name"], "ports", devices)
				self.t_func:_get_config("network")
			elseif update then
				self.uci:delete(self.main_config, s[".name"], "device")
				self.t_func:_get_config("network")
				if self:table_get(self.main_config, "br_"..s[".name"]) then
					self.uci:delete(self.main_config, "br_"..s[".name"])
					self.t_func:_get_config("network")
				end
			end
		end
	end)
end

function interface_based:remove_recursive(delete_name)
	self:table_foreach(self.main_config, "device", function(s)
		if s.ifname and s.ifname == delete_name then
			self:remove_recursive(s.name)
			self:remove_from_interfaces(s.name)
			self:table_delete(self.main_config, s[".name"])
		end
	end)
end

function interface_based:PUT_validate_section_hook()
	self:validate_empty_option("name")
end

function interface_based:POST_validate_section_hook()
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

	if new_name and (self.devices[new_name] or used_device) then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Name '".. self.current_data_block["name"] .."' is already in use",
			"Validation"
		)
	end
end

function interface_based:DELETE_before_section_delete_hook()
	local section_name = self:table_get(self.main_config, self.sid, "name")
	if section_name then
		self:remove_recursive(section_name)

		self:remove_from_interfaces(section_name)
	end
end

return interface_based
