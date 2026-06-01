local ConfigService = require("api/ConfigService")
local iec60870_utils = require("api.services.iec60870_server.utils")
local util = require("vuci.util")
local board = require("vuci.board")
local firewall_lib = require("api.network.firewall.firewall_lib")

local Instances = ConfigService:new({ increment_name = true })

local s = Instances:section("iec60870_server", "instance")

	local opt_name = s:option("name")
	function opt_name:validate(value)
		return self.dt:no_control_codes(value)
	end

	local opt_enabled = s:option("enabled")
	opt_enabled.require = {
		["1"] = { "common_address", "connection_type", "spontaneous_enabled", "cyclic_enabled" }
	}
	function opt_enabled:validate(value)
		return self.dt:is_bool(value)
	end

	local opt_common_address = s:option("common_address")
	function opt_common_address:validate(value)
		return self.dt:irange(value, 1, 65534)
	end

	local opt_spontaneous_enabled = s:option("spontaneous_enabled")
	function opt_spontaneous_enabled:validate(value)
		return self.dt:is_bool(value)
	end

	local opt_spontaneous_information_objects = s:option("spontaneous_information_objects", { list = true })
	function opt_spontaneous_information_objects:validate(value)
		return self.dt:check_array(value, self:list_available_information_objects(self.sid))
	end
	function opt_spontaneous_information_objects:set(value)
		self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
	end
	function opt_spontaneous_information_objects:get()
		local value = self:table_get(self.config, self.sid, self.api_key)
		if value then
			return util.split(value, " ")
		end
	end

	local opt_cyclic_enabled = s:option("cyclic_enabled")
	function opt_cyclic_enabled:validate(value)
		return self.dt:is_bool(value)
	end

	local opt_cyclic_period = s:option("cyclic_period")
	function opt_cyclic_period:validate(value)
		local milliseconds_per_second = 1000
		local seconds_per_day = 24 * 60 * 60
		return self.dt:irange(
			value,
			1 * milliseconds_per_second,
			seconds_per_day * milliseconds_per_second
		)
	end

	local opt_cyclic_information_objects = s:option("cyclic_information_objects", { list = true })
	function opt_cyclic_information_objects:validate(value)
		return self.dt:check_array(value, self:list_available_information_objects(self.sid))
	end
	function opt_cyclic_information_objects:set(value)
		self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
	end
	function opt_cyclic_information_objects:get()
		local value = self:table_get(self.config, self.sid, self.api_key)
		if value then
			return util.split(value, " ")
		end
	end

	local opt_connection_type = s:option("connection_type")
	function opt_connection_type:validate(value)
		local available_types = { "iec104" }
		if board:has_serial() then
			table.insert(available_types, "iec101")
		end
		return self.dt:check_array(value, available_types)
	end

	local opt_configure_pins
	if #iec60870_utils.list_available_pins() > 0 then
		opt_configure_pins = s:option("configure_pins")
		function opt_configure_pins:validate(value)
			return self.dt:is_bool(value)
		end

		local opt_pins = s:option("pins", { list = true })
		opt_pins.list_length = iec60870_utils.max_pin_count
		function opt_pins:validate(value)
			return self.dt:check_array(value, iec60870_utils.list_available_pins())
		end
	end

	local opt_port = s:option("port")
	function opt_port:validate(value)
		return self.dt:port(value)
	end

	local opt_allow_remote_access = s:option("allow_remote_access")
	function opt_allow_remote_access:validate(value)
		if value == "1" then
			if not firewall_lib:has_zone(self, "wan") then
				return false, "Firewall zone 'wan' not found"
			end

			local port = self:get_abs_value(self.config, self.sid, "port")
			if port == nil then
				return false, "Option 'port' must be defined"
			end
		end

		return self.dt:is_bool(value)
	end
	function opt_allow_remote_access:get()
		local firewall_rule_id = self:get_firewall_rule_id(self.sid)
		if not firewall_rule_id then
			return "0"
		end

		if self:get_abs_value("firewall", firewall_rule_id, "enabled") ~= "1" then
			return "0"
		end

		return "1"
	end
	function opt_allow_remote_access:set(allow_remote_access)
		local enabled = self:get_abs_value(self.config, self.sid, "enabled")
		local port = self:get_abs_value(self.config, self.sid, "port")
		self:set_firewall_rule_created(self.sid, allow_remote_access == "1", port, enabled == "1")
	end

	if board:has_serial() then
		local serial = require("vuci.serial")

		local opt_balanced = s:option("balanced")
		function opt_balanced:validate(value)
			return self.dt:is_bool(value)
		end

		local opt_link_layer_address = s:option("link_layer_address")
		function opt_link_layer_address:validate(value)
			return self.dt:irange(value, 1, 65534)
		end

		local opt_device = s:option("device")
		function opt_device:validate(value)
			if value:find("usb") then
				if self:table_get(self.config, self.sid, "device") == value then
					return true
				end
			end
			return self.dt:check_array(value, serial:get_devices(true))
		end

		local opt_baudrate = s:option("baudrate")
		function opt_baudrate:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_baudrates(serial_device))
		end

		local opt_databits = s:option("databits")
		function opt_databits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_databits(serial_device))
		end

		local opt_stopbits = s:option("stopbits")
		function opt_stopbits:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_stopbits(serial_device))
		end

		local opt_parity = s:option("parity")
		function opt_parity:validate(value)
			local serial_device = self:get_abs_value(self.config, self.sid, "device")
			return self.dt:check_array(value, serial:get_parity(serial_device))
		end

		local opt_flow_control = s:option("flowcontrol")
		function opt_flow_control:validate(value)
			local validated_opts = serial:validate_flowcontrol(self)
			return self.dt:check_array(value, validated_opts)
		end

		serial.append_duplex_option(s)
	end

function Instances:setup_requires()
	if self:get_abs_value(self.config, self.sid, "enabled") == "1" then
		opt_cyclic_enabled.require = {
			["1"] = { "cyclic_period" }
		}

		opt_connection_type.require = {
			iec104 = { "port" },
			iec101 = { "balanced", "link_layer_address", "device", "baudrate", "databits", "stopbits", "parity", "flowcontrol" },
		}

		if opt_configure_pins then
			opt_configure_pins.require = {
				["1"] = { "pins" }
			}
		end
	else
		-- reset requires for disabled instances when multiple sections are being updated
		opt_cyclic_enabled.require = nil
		opt_connection_type.require = nil
		if opt_configure_pins then
			opt_configure_pins.require = nil
		end
	end
end

function Instances:POST_validate_section_hook()
	local connection_type = self:get_abs_value(self.main_config, self.sid, "connection_type")
	if connection_type == "iec101" then
		local serial = require("vuci.serial")

		serial:handle_duplex(self)
		local device = self.current_data_block["device"]
		if type(device) == "string" then
			serial:assert_device_is_available(self, device)
		end
	end

	self:setup_requires()
end

function Instances:PUT_validate_section_hook()
	local connection_type = self:get_abs_value(self.main_config, self.sid, "connection_type")
	local device = self:get_abs_value(self.main_config, self.sid, "device")
	if connection_type == "iec101" and device and type(device) == "string" then
		local serial = require("vuci.serial")

		serial:handle_duplex(self)
		serial:assert_device_is_available(self, device)
		if device:find("usb") then
			serial:assert_device_is_connected(self, device)
		end
	end

	self:setup_requires()
end

function Instances:DELETE_before_section_delete_hook()
	self:set_firewall_rule_created(self.sid, false, nil, false)
end

function Instances:UPDATE_after_data_hook()
	local firewall_rule_id = self:get_firewall_rule_id(self.sid)
	if firewall_rule_id ~= nil then
		local port = self:get_abs_value(self.config, self.sid, "port")
		self:table_set("firewall", firewall_rule_id, "dest_port", port)

		local enabled = self:get_abs_value(self.config, self.sid, "enabled")
		self:table_set("firewall", firewall_rule_id, "enabled", enabled == "1" and "1" or "0")
	end
end

Instances.PUT_after_data_hook = Instances.UPDATE_after_data_hook
Instances.POST_after_data_hook = Instances.UPDATE_after_data_hook

function Instances:list_available_information_objects(instance_id)
	local configured_pins = nil
	if self:get_abs_value(self.main_config, instance_id, "configure_pins") == "1" then
		configured_pins = self:get_abs_value(self.main_config, instance_id, "pins")
	end

	return iec60870_utils.list_available_information_objects(configured_pins)
end

function Instances:get_firewall_rule_id(server_id)
	local rules = firewall_lib:list_rules(self, "iec60870_server", server_id)
	if #rules > 0 then
		return rules[1]
	end
end

function Instances:set_firewall_rule_created(server_id, expected_exists, port, enabled)
	local rule_id = self:get_firewall_rule_id(server_id)
	local rule_exists = rule_id ~= nil

	if not rule_exists and expected_exists then
		-- Expected to exist, but doesn't. Need to create

		assert(port ~= nil)

		local rule = {
			proto = "tcp",
			name = ("IEC60870 Server %s"):format(server_id),
			target = "ACCEPT",
			dest_port = port,
			src = "wan",
			enabled = enabled and "1" or "0"
		}
		firewall_lib:set_rule(self, rule, nil, "iec60870_server", server_id)
	elseif rule_exists and not expected_exists then
		-- Expected to NOT exist, but does. Need to delete

		self:table_delete("firewall", rule_id)
	end
end

function Instances:POST_validate_hook()
	local instance_count = self:table_count(self.main_config, "instance")
	if instance_count >= iec60870_utils.max_instances then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only %d instances are allowed", iec60870_utils.max_instances)
	end
end

return Instances
