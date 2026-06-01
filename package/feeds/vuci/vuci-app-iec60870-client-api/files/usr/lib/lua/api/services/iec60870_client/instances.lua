local ConfigService = require("api.ConfigService")
local utils = require("api.services.iec60870_client.utils")

local Instances = ConfigService:new({ increment_name = true })

local s = Instances:section("iec60870_client", "client")

	local opt_name = s:option("name")
		function opt_name:validate(value)
			return self.dt:no_control_codes(value)
		end

	local opt_enabled = s:option("enabled")
	opt_enabled.require = {
		["1"] = { "connection_type", "originator_address", "period", "timeout", "information_objects_selection" }
	}
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_period = s:option("period")
		function opt_period:validate(value)
			return self.dt:irange(value, 1, 86400)
		end

	local opt_originator_address = s:option("originator_address")
		function opt_originator_address:validate(value)
			local success, msg = self.dt:irange(value, 0, 100)
			if not success then
				return false, msg
			end

			local instances_with_same_connection = self:table_find_many(self.main_config, "client", {
				-- TODO: Support serial connection type
				proto = "104",
				ip = self:get_abs_value(self.config, self.sid, "ip"),
				port = self:get_abs_value(self.config, self.sid, "port")
			})

			for _, instance in ipairs(instances_with_same_connection) do
				if instance.oa and instance[".name"] ~= self.sid then
					if instance.oa == value then
						return false, "Already in use by another instance."
					end
				end
			end

			return true
		end
		function opt_originator_address:get()
			return self:table_get(self.main_config, self.sid, "oa")
		end
		function opt_originator_address:set(value)
			self:table_set(self.main_config, self.sid, "oa", value)
		end

	local opt_timeout = s:option("timeout")
		function opt_timeout:validate(value)
			return self.dt:irange(value, 1, 60)
		end

	local opt_connection_type = s:option("connection_type")
		function opt_connection_type:validate(value)
			local available_types = { "iec104" }
			-- TODO: Uncomment this when application supports serial
			-- if board:has_serial() then
			-- 	table.insert(available_types, "iec101")
			-- end
			return self.dt:check_array(value, available_types)
		end
		function opt_connection_type:get()
			local proto = self:table_get(self.main_config, self.sid, "proto")
			if proto == "101" then
				return "iec101"
			elseif proto == "104" then
				return "iec104"
			end
		end
		function opt_connection_type:set(value)
			if value == "iec101" then
				self:table_set(self.main_config, self.sid, "proto", "101")
			elseif value == "iec104" then
				self:table_set(self.main_config, self.sid, "proto", "104")
			end
		end

	local opt_port = s:option("port")
		function opt_port:validate(value)
			return self.dt:port(value)
		end

	local opt_ip = s:option("ip")
		function opt_ip:validate(value)
			-- TODO: Add IPv6 support
			return self.dt:ip4addr(value)
		end

	-- TODO: Uncomment this when application supports serial
	-- if board:has_serial() then
	-- 	local opt_serial_device_id = s:option("serial_device_id")
	-- 		function opt_serial_device_id:validate(value)
	-- 			local available_serial_devices = {}
	-- 			self:table_foreach(self.main_config, "serial_device", function(serial_device)
	-- 				table.insert(available_serial_devices, serial_device[".name"])
	-- 			end)
	-- 			return self.dt:check_array(value, available_serial_devices)
	-- 		end
	--
	-- 	local opt_link_layer_address = s:option("link_layer_address")
	-- 		function opt_link_layer_address:validate(value)
	-- 			return self.dt:irange(value, 1, 65534)
	-- 		end
	-- end

	local opt_information_objects_selection = s:option("information_objects_selection")
		function opt_information_objects_selection:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_information_objects = s:option("information_objects", { list = true })
	opt_information_objects.list_length = utils.max_information_objects_per_instance
		function opt_information_objects:validate(value)
			return utils.validate_io_triplet(value)
		end
		function opt_information_objects:get()
			return self:table_get(self.main_config, self.sid, "io")
		end
		function opt_information_objects:set(value)
			self:table_set(self.main_config, self.sid, "io", value)
		end

	local opt_common_addresses = s:option("common_addresses", { list = true })
	opt_common_addresses.list_length = utils.max_common_addresses
		function opt_common_addresses:validate(value)
			return self.dt:irange(value, 1, 2^16 - 1)
		end
		function opt_common_addresses:get()
			return self:table_get(self.main_config, self.sid, "ca")
		end
		function opt_common_addresses:set(value)
			self:table_set(self.main_config, self.sid, "ca", value)
		end

function Instances:POST_validate_hook()
	local instance_count = self:table_count(self.main_config, self:_retrieve_main_section_type())
	if instance_count >= utils.max_instances then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only %d instances are allowed", utils.max_instances)
	end
end

function Instances:UPDATE_validate_section_hook()
	local information_objects_selection = self:get_abs_value(self.main_config, self.sid, "information_objects_selection")
	if information_objects_selection == "1" then
		local information_objects = self:get_abs_value(self.main_config, self.sid, "io")
		if information_objects then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Option 'information_objects' must be empty if 'information_objects_selection' is '1'", "Validation")
		end
	end
end
Instances.PUT_after_validate_section_hook = Instances.UPDATE_validate_section_hook
Instances.POST_after_validate_section_hook = Instances.UPDATE_validate_section_hook

function Instances:UPDATE_section_init_hook()
	if self:get_abs_value(self.config, self.sid, "enabled") ~= "1" then
		return
	end

	opt_connection_type.require = {
		iec104 = { "ip", "port" },
		-- iec101 = { "serial_device_id", "link_layer_address" },
	}

	opt_information_objects_selection.require = {
		["0"] = { "information_objects" },
		["1"] = { "common_addresses" }
	}
end
Instances.POST_section_init_hook = Instances.UPDATE_section_init_hook
Instances.PUT_section_init_hook = Instances.UPDATE_section_init_hook

return Instances
