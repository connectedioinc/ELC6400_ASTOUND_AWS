local ConfigService = require("api/ConfigService")
local Devices = ConfigService:new()
local util = require("vuci.util")
local board = require("vuci.board")
local factory = require("api.network.devices_factory")
local network_lib = require("vuci.network_lib")
local has_dsa = board:has_dsa()
local is_switch = board:is_switch()
local is_access_point = board:is_ap()

local section

--------------------- Start of hooks ---------------------

function Devices:initialize_hook()
	local function disable_config()
		self.flags.create = false
		self.flags.delete = false
		function self:PUT_init_hook()
			self:add_critical_error(
				STD_CODES.NO_EDIT,
				"Section edit is not allowed",
				"Validation",
				HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
			)
		end
	end
	if is_switch then
		function self:GET_init_hook()
			self:add_critical_error(
				STD_CODES.INCORRECT_REQUEST,
				"Endpoint not implemented",
				"Validation",
				HTTP_STATUS_CODES.NOT_FOUND
			)
		end
	end
	if not self.type then disable_config() end
	-- Reposition variable values if the first parameter is `config` or `status`
	-- to allow the structure of `/network/devices/{service_group}/{sid}` endpoint
	if self.type == "config" or self.type == "status" then
		self.sid = self.service_group
		self.service_group = self.type
		self.type = nil
		if self.sid then
			self._single = true
		end
		if not self.type then disable_config() end
		return
	end
	self.type_data = factory:get_data(self.type, self)
	if self.type and not self.type_data then
		self:add_critical_error(STD_CODES.INVALID_SECTION, string.format("Device type '%s' does not exist. Available types '[%s]'.", self.type, table.concat(factory:get_types(), ", ")), "Validation")
	end
	-- Contains device specific options that are loaded based
	-- on the `self.type`
	self.extra_options = {}
	local skip
	local param_keys = { "cfg_require", "readonly", "validate", "get", "set" }
	for _, opt in ipairs(self.type_data and self.type_data.options or {}) do
		skip = false
		-- check if option is already present and override it's parameters
		for _, sec_opt in ipairs(section.options or {}) do
			if sec_opt[opt.name] then
				for _, key in ipairs(param_keys) do
					if opt[key] ~= nil then
						sec_opt[opt.name][key] = opt[key]
					end
				end
				skip = true
				break
			end
		end
		-- generate additional options
		if not skip then
			self.extra_options[opt.name] = section:option(opt.name, opt.params or {})
			for _, key in ipairs(param_keys) do
				self.extra_options[opt.name][key] = opt[key] or self.extra_options[opt.name][key]
			end
		end
	end

	for key, value in pairs(self.type_data and self.type_data.hooks or {}) do
		self[key] = value
	end
end

function Devices:POST_init_hook()
	if not self.arguments.data or not self.type then return end
	self.arguments.data.id = network_lib:generate_device_name(self, self.type)
end

--------------------- End of hooks ---------------------

--------------------- Start of general options ---------------------

section = Devices:section("network", "device")

	function section:filter(s)
		if self.type then
			local extra_filter = self.type_data and self.type_data.section_hooks and self.type_data.section_hooks.filter
			if extra_filter then
				return extra_filter(self, s)
			end
			return s.type == self.type
		end
		local filter_types = { ["8021q"] = false, ["8021ad"] = false, ["vrf"] = false } -- TODO: remove after 8021q, 8021ad and vrf are implemented
		if not has_dsa and not is_access_point then -- TODO: remove after bridge is implemented
			filter_types.bridge = false
		end
		return filter_types[s.type] == nil
	end

	function section:create_defaults()
		local defaults = {
			type = self.type
		}
		-- Option `name` is overriden when setting the `description` as `name`
		-- which removes its value completely, as to why the set is needed
		self:table_set(self.config, self.sid, "name", self.sid)
		local extra_defaults = self.type_data and self.type_data.section_hooks and self.type_data.section_hooks.create_defaults
		if extra_defaults then
			for key, value in pairs(extra_defaults(self) or {}) do
				defaults[key] = value
			end
		end
		return defaults
	end

	local opt_name = section:option("name")
		function opt_name:validate(value)
			local duplicates = false
			self:table_foreach(self.config, "device", function(s)
				if self.sid ~= s[".name"] and s.description == value then
					duplicates = true
					return false
				end
			end)
			if duplicates then return false, "Duplicate names are not allowed." end
			return self.dt:default_validation(value)
		end
		function opt_name:get(value)
			return self:table_get(self.config, self.sid, "description") or value
		end
		function opt_name:set(value)
			self:table_set(self.config, self.sid, "description", value)
		end

	local opt_type = section:option("type")
		opt_type.readonly = true
		function opt_type:get()
			return self:table_get(self.config, self.sid, self.api_key) or "ethernet"
		end

	local opt_macaddr = section:option("macaddr")
		function opt_macaddr:validate(value)
			return self.dt:macaddr(value)
		end

	local mtu = section:option("mtu")
		function mtu:validate(value)
			local max_mtu = self.type == "bridge" and 65535 or board:get_max_mtu() or 1500
			return self.dt:irange(value, 68, max_mtu)
		end

--------------------- End off general options ---------------------

--------------------- Start of status ---------------------

function Devices:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function Devices:GET_TYPE_status()
	if is_switch then
		local devices_status = require("vuci.devices_status_lib"):new(self.uci)
		self:ResponseOK(devices_status:get_device_status(self.sid))
	end

	local pac = require("vuci.package_checker")
	local ntm = require "vuci.network".init()
	local devices = ntm:get_devices()
	local devices_map, wlan_map, updated_devices = {}, {}, {}
	local type_map = {
		bridge = function () return { "bridge" } end,
		ethernet = function () return { "Network device" } end,
		vxlan = pac.is_installed("kmod-vxlan") and function () return { "vxlan" } end or nil
	}

	self:table_foreach(self.config, "device", function (s)
		if s.name then
			devices_map[s.name] = s
		end
	end)

	network_lib:get_non_active_bridges(self, devices)
	if has_dsa then
		network_lib:get_dsa_vlans(self, devices, devices_map)
	end
	network_lib:get_wlan_devices(self, devices, wlan_map)

	for dev_name, dev in pairs(devices) do
		local device = devices_map[dev_name] or {}
		dev.id = device[".name"] or dev_name
		dev.name = dev_name
		dev.description = device.description
		if dev.type == "bridge" then
			if not dev["bridge-members"] then
				dev["bridge-members"] = {}
			end
			for _, ifname in ipairs(wlan_map[dev_name] or {}) do
				if not util.contains(dev["bridge-members"], ifname) then
					table.insert(dev["bridge-members"], ifname)
				end
			end
			for _, port in ipairs(device.ports or {}) do
				if not util.contains(dev["bridge-members"], port) then
					table.insert(dev["bridge-members"], port)
				end
			end
		end
		updated_devices[dev.id] = dev
	end

	local dev_type = type_map[self.type] and type_map[self.type]() or {}
	local key = "type"
	if self.sid then
		local device = updated_devices[self.sid]
		if not device then
			self:add_critical_error(STD_CODES.INVALID_SECTION, "Device '" .. self.sid .. "' not found", "URL", "404")
		end
		if self.type then
			if not util.contains(dev_type, device[key]) then
				self:add_critical_error(STD_CODES.INVALID_SECTION, "Device '" .. self.sid .. "' by type '" .. self.type .. "' not found", "URL", "404")
			end
		end
		self:ResponseOK(device)
	end

	local res = {}
	for _, d in pairs(updated_devices) do
		if self.type then
			for _, v in ipairs(dev_type) do
				if v == d[key] then
					res[#res+1] = d
				end
			end
		else
			res[#res+1] = d
		end
	end
	self:ResponseOK(res)
end

--------------------- End of status ---------------------

return Devices
