local ConfigService = require("api/ConfigService")
local serial = require("vuci.serial")
local util = require("vuci.util")
local dlms_utils = require("api.services.dlms_utils")

local DLMS = ConfigService:new({ increment_name = true })

local s = DLMS:section("dlms_client", "physical_device")

function s:create_defaults()
		return {
			server_addr = "1",
			log_server_addr = "0",
			client_addr = "16",
			access_security = "0",
			interface = "0",
			transport_security = "0",
			use_ln_ref = "1"
		}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------
	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "connection", "name", "server_addr_type" } }
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

	local name = s:option("name")
	function name:validate(value)
		local exists = false
		self:table_foreach(self.config, "physical_device", function(c)
			if c.name == value and c[".name"] ~= self.sid then
				exists = true
			end
		end)
		if exists then
			return false, "Device name is already in use"
		end
		if string.find(value, "\"") then
			return false, "Value can not contain \""
		end
		return self.dt:string(value)
	end
	name.maxlength = 200

	local connection = s:option("connection")
	function connection:validate(value)
		local connections = {}
		self:table_foreach(self.config, "connection", function(c)
			table.insert(connections, c[".name"])
		end)
		return self.dt:check_array(value, connections)
	end

	local server_addr_type = s:option("server_addr_type")
		function server_addr_type:validate(value)
			return self.dt:check_array(value, {
				"0", -- Default
				"1", -- Serial number
			})
		end

	local server_addr = s:option("server_addr")
		function server_addr:validate(value)
			local address_type = self:get_abs_value(self.config, self.sid, "server_addr_type") or "0"
			if address_type == "0" then
				return self.dt:irange(value, 0, 16383)
			elseif address_type == "1" then
				return self.dt:uinteger(value)
			end

			return false, "Can't set this option without a valid 'server_addr_type' option"
		end

	local log_server_addr = s:option("log_server_addr")
		function log_server_addr:validate(value)
			return self.dt:irange(value, 0, 16383)
		end

	local client_addr = s:option("client_addr")
		function client_addr:validate(value)
			return self.dt:irange(value, 0, 255)
		end

	local access_security = s:option("access_security")
	access_security.require = {
		["1"] = { "password" },
		["2"] = { "password" },
		["3"] = { "password" },
		["4"] = { "password" },
		["5"] = { "authentication_key", "block_cipher_key" },
		["6"] = { "password" }
	}
		function access_security:validate(value)
			return self.dt:check_array(value, dlms_utils.available_access_security)
		end

	local interface = s:option("interface")
		function interface:validate(value)
			local connection_type = self:get_current_connection_type()
			local options = dlms_utils.get_available_device_interfaces(connection_type)
			return self.dt:check_array(value, options)
		end

	local password = s:option("password", { sensitive = true })
		function password:validate(_)
			return self.dt:string()
		end

	local transport_security = s:option("transport_security")
	transport_security.require = {
		["16"] = { "authentication_key", "invocation_counter" },
		["32"] = { "invocation_counter", "block_cipher_key" },
		["48"] = { "invocation_counter", "block_cipher_key", "authentication_key"}
	}
		function transport_security:validate(value)
			return self.dt:check_array(value, {"0", "16", "32", "48"})
		end

	local invocation_counter = s:option("invocation_counter")
	invocation_counter.maxlength = 32
		function invocation_counter:validate(_)
			return self.dt:string()
		end

	local authentication_key = s:option("authentication_key", { sensitive = true })
	authentication_key.maxlength = 32
	authentication_key.minlength = 32
		function authentication_key:validate(_)
			return self.dt:string()
		end

	local block_cipher_key = s:option("block_cipher_key", { sensitive = true })
	block_cipher_key.maxlength = 32
	block_cipher_key.minlength = 32
		function block_cipher_key:validate(_)
			return self.dt:string()
		end

	local dedicated_key = s:option("dedicated_key", { sensitive = true })
	dedicated_key.maxlength = 32
	dedicated_key.minlength = 32
		function dedicated_key:validate(_)
			return self.dt:string()
		end
	local use_logical_name_ref = s:option("use_ln_ref")
		function use_logical_name_ref:validate(value)
			return self.dt:is_bool(value)
		end
		function use_logical_name_ref:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)

			local fixed_value = value == "" and "1" or value
			local reference_option_map = {
				["0"] = "short_name",
				["1"] = "logical_name"
			}
			local cosems_with_missing_ref_option = {}
			self:table_foreach(self.config, "cosem", function(s)
				if s.enabled == "1" and util.contains(s.physical_device, self.sid) and not s[reference_option_map[fixed_value]] then
					table.insert(cosems_with_missing_ref_option, s[".name"])
				end
			end)
			if #cosems_with_missing_ref_option > 0 then
				local cosem_ids_str = table.concat(cosems_with_missing_ref_option, ", ")
				self:add_message(
					1,
					string.format("'%s' option is missing in the following COSEM configuration(s): %s. Referencing may be incorrect.", reference_option_map[fixed_value], cosem_ids_str),
					"use_ln_ref"
				)
			end
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function DLMS:get_current_connection_type()
	local connection_sid = self:get_abs_value(self.main_config, self.sid, "connection") or self.current_data_block["connection"]
	if not connection_sid or connection_sid == "" then return end
	local connection_section = self:table_get(self.main_config, connection_sid)
	return connection_section and connection_section.connection_type or ""
end

function DLMS:count_physical_devices()
	local count = 0
	self:table_foreach("dlms_client", "physical_device", function (_)
		count = count + 1
	end)
	return count
end

function DLMS:POST_validate_hook()
	if self:count_physical_devices() >= 30 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 30 instances are allowed")
	end
end

function DLMS:DELETE_before_section_delete_hook()
	self:table_foreach(self.main_config, "cosem", function(r)
		if r.physical_device then
			for opt, val in pairs(r.physical_device) do
				if val == self.sid then
					self:add_critical_error(STD_CODES.INVALID_SECTION, "Physical device that is used in COSEM configuration cannot be deleted.")
				end
			end
		end
	end)
end

function DLMS:DELETE_after_commit_hook()
	local ids = self._single and {self.sid} or self.arguments.data
	dlms_utils.delete_db_device_parameters(ids)
end

function DLMS:test()
	local data = self.arguments.data

	return self:ResponseOK(
		dlms_utils.test_device(data, data)
	)
end

local function validate_serial_option(self, value, getter_name)
	if self.arguments.data.connection_type == "0" then return true end

	assert(serial[getter_name], "Invalid getter function")

	local serial_device = self.arguments.data.device
	local allowed_values = serial[getter_name](serial, serial_device)
	if #allowed_values == 0 then
		return false, "There are no allowed values, check if your serial device is available"
	end

	return self.dt:check_array(value, allowed_values)
end

local test = DLMS:action("test", DLMS.test)

local opt_connection_type = test:option("connection_type")
	opt_connection_type.require = true
	function opt_connection_type:validate(value)
		return self.dt:check_array(value, { "0", "1" })
	end

local opt_address = test:option("address")
	function opt_address:validate(value)
		return self.dt:ipaddr(value)
	end
local opt_port = test:option("port")
	function opt_port:validate(value)
		return self.dt:port(value)
	end
local opt_device = test:option("device")
	function opt_device:validate(value)
		if self.arguments.data.connection_type == "0" then return true end
		return self.dt:check_array(value, serial:get_devices(true))
	end
local opt_baudrate = test:option("baudrate")
	function opt_baudrate:validate(value)
		return validate_serial_option(self, value, "get_baudrates")
	end
local opt_databits = test:option("databits")
	function opt_databits:validate(value)
		return validate_serial_option(self, value, "get_databits")
	end
local opt_stopbits = test:option("stopbits")
	function opt_stopbits:validate(value)
		return validate_serial_option(self, value, "get_stopbits")
	end
local opt_parity = test:option("parity")
	function opt_parity:validate(value)
		return validate_serial_option(self, value, "get_parity")
	end
local opt_flowcontrol = test:option("flowcontrol")
	function opt_flowcontrol:validate(value)
		return validate_serial_option(self, value, "get_flowcontrol")
	end
local client_addr = test:option("client_addr")
client_addr.require = true
	function client_addr:validate(value)
		return self.dt:irange(value, 0, 255)
	end

local server_addr_type = test:option("server_addr_type")
	function server_addr_type:validate(value)
		return self.dt:check_array(value, {
			"0", -- Default
			"1", -- Serial number
		})
	end
local server_addr = test:option("server_addr")
server_addr.require = true
	function server_addr:validate(value)
		local address_type = self.arguments.data.server_addr_type or "0"
		if address_type == "0" then
			return self.dt:irange(value, 0, 16383)
		elseif address_type == "1" then
			return self.dt:uinteger(value)
		end
	end
local log_server_addr = test:option("log_server_addr")
log_server_addr.require = true
	function log_server_addr:validate(value)
		return self.dt:irange(value, 0, 16383)
	end
local transport_security = test:option("transport_security")
	function transport_security:validate(value)
		return self.dt:check_array(value, {"0", "16", "32", "48"})
	end
local opt_use_logical_name_ref = test:option("use_ln_ref")
	function opt_use_logical_name_ref:validate(value)
		return self.dt:is_bool(value)
	end
local interface = test:option("interface")
	function interface:validate(value)
		local connection_type = self.arguments.data.connection_type
		local options = dlms_utils.get_available_device_interfaces(connection_type)
		return self.dt:check_array(value, options)
	end
local access_security = test:option("access_security")
	function access_security:validate(value)
		return self.dt:check_array(value, {"0", "1", "2", "3", "4", "5", "6"})
	end
local password = test:option("password")
local authentication_key = test:option("authentication_key")
authentication_key.maxlength = 32
authentication_key.minlength = 32
local block_cipher_key = test:option("block_cipher_key")
block_cipher_key.maxlength = 32
block_cipher_key.minlength = 32
local dedicated_key = test:option("dedicated_key")
dedicated_key.maxlength = 32
dedicated_key.minlength = 32
local invocation_counter = test:option("invocation_counter")
invocation_counter.maxlength = 32

function DLMS:POST_action_init_hook()
	if type(self.arguments.data) ~= "table" then return end
	if not self.arguments.data.connection_type then return end

	local connection_type = self.arguments.data.connection_type
	local required_options = {}
	if connection_type == "0" then
		required_options = { opt_address, opt_port }
	elseif connection_type == "1" then
		required_options = {
			opt_device, opt_baudrate, opt_databits, opt_stopbits, opt_parity, opt_flowcontrol
		}
	end

	for _, opt in ipairs(required_options) do
		opt.require = true
	end
end

return DLMS
