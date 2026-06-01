local ConfigService = require("api/ConfigService")
local universal_gateway_utils = require("vuci.universal_gateway_utils")
local board = require("vuci.board")
local util = require("vuci.util")

local io_types = { "din", "dout", "dio", "relay", "adc" }
local io_fields_by_type = {
	din = { 'high' },
	dout = { 'high' },
	dio = { 'high', 'input' },
	relay = { 'closed' },
	adc = { 'value' }
}

local ServerNodes = ConfigService:new({
	increment_name = true
})

local s = ServerNodes:section("opcua_server", "server_node")

	local opt_enabled = s:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_name = s:option("name")
	opt_name.maxlength = 128
		function opt_name:validate(value)
			return self.dt:string(value)
		end

	local opt_node_id_type = s:option("node_id_type")
		function opt_node_id_type:validate(value)
			return self.dt:check_array(value, { "numeric", "string", "guid", "bytestring" })
		end

	local opt_node_id = s:option("node_id")
		function opt_node_id:validate(value)
			local node_id_type = self:get_abs_value(self.main_config, self.sid, "node_id_type")
			if node_id_type == "numeric" then
				return self.dt:irange(value, 2, 2147483647)
			elseif node_id_type == "string" then
				return self.dt:string()
			elseif node_id_type == "guid" then
				return self.dt:guid(value)
			elseif node_id_type == "bytestring" then
				return self.dt:base64(value)
			else
				return false, "Option 'node_id_type' is missing."
			end
		end

	local opt_source = s:option("source")
		function opt_source:validate(value)
			local supported_sources = universal_gateway_utils.list_source_names()
			table.insert(supported_sources, "opcua_server")
			return self.dt:check_array(value, supported_sources)
		end

	local opt_source_value_id = s:option("source_value_id")
		function opt_source_value_id:validate(value)
			local source = self:get_abs_value(self.config, self.sid, "source")
			if source == "opcua_server" then
				return self.dt:check_array(value, self:list_builtin_value_ids())
			else
				local available_source_ids = universal_gateway_utils.list_tag_ids_by_source(source)
				if #available_source_ids == 0 then
					return false, "Option 'source' is missing or does not have configured values."
				end
				return self.dt:check_array(value, available_source_ids)
			end
		end

	local opt_source_value_type = s:option("source_value_type")
		function opt_source_value_type:validate(value)
			return self.dt:check_array(value, universal_gateway_utils.TAG_TYPES)
		end

	if board:has_ios() then
	local opt_io_name = s:option("io_type")
		function opt_io_name:validate(value)
			return self.dt:check_array(value, self:list_available_io_types())
		end

	local opt_io_field = s:option("io_field")
		function opt_io_field:validate(value)
			local io_type = self:get_abs_value(self.config, self.sid, "io_type")
			if not io_fields_by_type[io_type] then
				return false, "Option 'io_type' is missing or invalid."
			end
			return self.dt:check_array(value, io_fields_by_type[io_type] or {})
		end
	end

function ServerNodes:list_builtin_value_ids()
	local value_ids = {}

	-- Available on all devices
	util.append(value_ids,
		"uptime",
		"serial",
		"device_name",
		"device_code",
		"version",
		"hostname",
		"lan_ip",
		"lan_mask",
		"lan_gateway",
		"lan_dns",
		"lan_mac"
	)

	local platform = board:get_family_name()
	local is_switch_platform = platform == "TSW2" or platform == "SWM2"

	if is_switch_platform then
		util.append(value_ids,
			"port_label",
			"port_mac",
			"port_link",
			"port_rx",
			"port_tx",
			"port_speed",
			"port_full_duplex",
			"port_rstp_state"
		)
	end

	if board:has_gps() then
		util.append(value_ids,
			"gps_fix_status",
			"gps_timestamp",
			"gps_longitude",
			"gps_latitude",
			"gps_altitude",
			"gps_angle",
			"gps_speed",
			"gps_accuracy",
			"gps_satellite_count"
		)
	end

	if board:has_mobile() then
		util.append(value_ids,
			"modem_count",
			"modem_imei",
			"modem_serial",
			"modem_manufacturer",
			"modem_model",
			"modem_firmware",
			"modem_temperature",
			"modem_sim_count",
			"modem_sim",
			"modem_sim_state",
			"modem_sim_iccid",
			"modem_sim_rssi",
			"modem_connection_type",
			"modem_connection_state",
			"modem_network_state",
			"modem_operator"
		)
	end

	if not is_switch_platform then
		util.append(value_ids,
			"wan_ip",
			"wan_type"
		)
	end

	if board:has_ios() then
		util.append(value_ids,
			"io"
		)
	end

	return value_ids
end

function ServerNodes:adjust_requires()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local source = self:get_abs_value(self.config, self.sid, "source")
	local source_value_id = self:get_abs_value(self.config, self.sid, "source_value_id")
	opt_enabled.require = { ["1"] = { "node_id", "node_id_type", "source", "source_value_id" } } -- set/reset requires before each section
	if enabled == "1" and source == "opcua_server" and source_value_id == "io" then
		util.append(opt_enabled.require["1"], "io_type", "io_field")
	end
end
function ServerNodes:UPDATE_validate_section_hook()
	self:adjust_requires()
end
ServerNodes.PUT_validate_section_hook = ServerNodes.UPDATE_validate_section_hook
ServerNodes.POST_validate_section_hook = ServerNodes.UPDATE_validate_section_hook

function ServerNodes:validate_source_existence()
	local source = self:get_abs_value(self.config, self.sid, "source")
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if enabled ~= "1" or source == "opcua_server" then return end

	local source_value_id = self:get_abs_value(self.config, self.sid, "source_value_id")
	local ok, _ = self.dt:check_array(source_value_id, universal_gateway_utils.list_tag_ids_by_source(source))
	if not ok then
		self:add_error(
			STD_CODES.INVALID_OPT,
			"No data source was found with the provided 'source' and 'source_value_id' options",
			"Validation"
		)
	end
end

function ServerNodes:UPDATE_after_validate_section_hook()
	self:validate_source_existence()
end
ServerNodes.PUT_after_validate_section_hook = ServerNodes.UPDATE_after_validate_section_hook
ServerNodes.POST_after_validate_section_hook = ServerNodes.UPDATE_after_validate_section_hook

function ServerNodes:validate_no_node_id_overlap()
	local server_nodes_by_node_id = {}

	self:table_foreach(self.config, "server_node", function (server_node)
		local node_id_type = self:get_abs_value(self.config, server_node[".name"], "node_id_type")
		local node_id = self:get_abs_value(self.config, server_node[".name"], "node_id")
		if not node_id_type or not node_id then
			return true -- continue
		end

		local key = ("%s;%s"):format(node_id_type, node_id)
		if not server_nodes_by_node_id[key] then
			server_nodes_by_node_id[key] = {
				node_id = node_id,
				node_id_type = node_id_type,
				ids = {},
			}
		end

		table.insert(server_nodes_by_node_id[key].ids, server_node[".name"])
	end)

	for _, entry in pairs(server_nodes_by_node_id) do
		if #entry.ids > 1 then
			self:add_error(
				STD_CODES.INVALID_OPT,
				("Duplicate node id '%s' (type '%s'), can't be used by multiple nodes"):format(entry.node_id, entry.node_id_type),
				"Validation"
			)
		end
	end

	self:return_if_error()
end

function ServerNodes:list_available_io_types()
	if not board:has_ios() then
		return {}
	end

	local io = require("vuci.io")
	local io_info_list = io:ioman_info()
	if not io_info_list then
		return {}
	end

	local result = {}

	for _, io_type in ipairs(io_types) do
		for _, io_info in ipairs(io_info_list) do
			if io_info.name:find(io_type) == 1 then
				table.insert(result, io_type)
				break
			end
		end
	end

	return result
end

function ServerNodes:validate_string_id_type()
	local default_nodes_enabled = self:get_abs_value("opcua_server", "opcua_server", "default_nodes_enabled")
	if default_nodes_enabled == nil then
		default_nodes_enabled = "1"
	end

	local node_id_type = self:get_abs_value(self.config, self.sid, "node_id_type")
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if enabled == "1" and default_nodes_enabled == "1" and node_id_type == "string" then
		self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Default server nodes must be disabled if string ID type is used",
			"Validation"
		)
	end
end

function ServerNodes:UPDATE_before_commit_hook()
	self:validate_no_node_id_overlap()
	self:validate_string_id_type()
end
ServerNodes.PUT_before_commit_hook = ServerNodes.UPDATE_before_commit_hook
ServerNodes.POST_before_commit_hook = ServerNodes.UPDATE_before_commit_hook

return ServerNodes
