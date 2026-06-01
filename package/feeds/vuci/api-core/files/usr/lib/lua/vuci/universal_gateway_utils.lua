local util = require("vuci.util")
local pac = require("vuci.package_checker")
local uci = require("vuci.uci")

local ERR_CODES = {
	TAG_NOT_FOUND = 1,
}

local TAG_TYPES = {"string", "binary", "bool", "int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float32", "float64"}
local FIXED_TAG_TYPE_BYTES = {
	["bool"] = 0.125,
	["int8"] = 1,
	["uint8"] = 1,
	["int16"] = 2,
	["uint16"] = 2,
	["int32"] = 4,
	["uint32"] = 4,
	["int64"] = 8,
	["uint64"] = 8,
	["float32"] = 4,
	["float64"] = 8
}

local SERVICES = {
	{
		name = "mbus_client",
		needed_opkg_package = "mbus_client",
		source_ubus_object = "mbus_client.rpc"
	},
	{
		name = "modbus_client",
		needed_opkg_package = "modbus_client",
		source_ubus_object = "modbus_client.rpc"
	},
	{
		name = "dnp3_client",
		needed_opkg_package = "dnp3",
		source_ubus_object = "dnp3_client.rpc",
	},
	{
		name = "dnp3_outstation",
		needed_opkg_package = "dnp3",
		list_used_tags = function()
			local tags = {}
			uci:foreach("dnp3_outstation", "tag", function(section)
				local outstation_id = section.outstation_dev_id
				if not outstation_id then
					return true -- continue
				end
				local outstation_type = uci:get("dnp3_outstation", outstation_id)
				if outstation_type ~= "dnp3_outstation" then
					return true -- continue
				end

				if section.enabled == "1" and section.tag_source and section.tag_id then
					table.insert(tags, {
						config_id = section[".name"],
						source = section.tag_source,
						id = section.tag_id
					})
				end
			end)
			return tags
		end
	},
	{
		name = "dnp3_serial_outstation",
		needed_opkg_package = "dnp3",
		list_used_tags = function()
			local tags = {}
			uci:foreach("dnp3_outstation", "tag", function(section)
				local outstation_id = section.outstation_dev_id
				if not outstation_id then
					return true -- continue
				end
				local outstation_type = uci:get("dnp3_outstation", outstation_id)
				if outstation_type ~= "dnp3_serial_outstation" then
					return true -- continue
				end

				if section.enabled == "1" and section.tag_source and section.tag_id then
					table.insert(tags, {
						config_id = section[".name"],
						source = section.tag_source,
						id = section.tag_id
					})
				end
			end)
			return tags
		end
	},
	{
		name = "modbus_server",
		needed_opkg_package = "modbus_server",
		list_used_tags = function()
			local tags = {}
			uci:foreach("modbus_server", "tag", function(section)
				local device_id = section.modbus_dev_config
				if not device_id then
					return true -- continue
				end
				local device_type = uci:get("modbus_server", device_id)
				if device_type ~= "modbus" then
					return true -- continue
				end

				if section.enabled == "1" and section.tag_source and section.tag_id then
					table.insert(tags, {
						config_id = section[".name"],
						source = section.tag_source,
						id = section.tag_id
					})
				end
			end)
			return tags
		end
	},
	{
		name = "modbus_serial_server",
		needed_opkg_package = "modbus_server",
		list_used_tags = function()
			local tags = {}
			uci:foreach("modbus_server", "tag", function(section)
				local device_id = section.modbus_dev_config
				if not device_id then
					return true -- continue
				end
				local device_type = uci:get("modbus_server", device_id)
				if device_type ~= "rtu_device" then
					return true -- continue
				end

				if section.enabled == "1" and section.tag_source and section.tag_id then
					table.insert(tags, {
						config_id = section[".name"],
						source = section.tag_source,
						id = section.tag_id
					})
				end
			end)
			return tags
		end
	},
	{
		name = "snmp",
		needed_opkg_package = "snmp",
		list_used_tags = function()
			local tags = {}
			uci:foreach("snmpd", "tag", function(section)
				if section.enabled == "1" and section.tag_source and section.tag_id then
					table.insert(tags, {
						config_id = section[".name"],
						source = section.tag_source,
						id = section.tag_id
					})
				end
			end)
			return tags
		end
	},
	{
		name = "opcua_server",
		needed_opkg_package = "opcua_server",
		list_used_tags = function()
			local tags = {}
			uci:foreach("opcua_server", "server_node", function(section)
				if section.enabled == "1" and section.source and section.source_value_id then
					table.insert(tags, {
						config_id = section[".name"],
						source = section.source,
						id = section.source_value_id
					})
				end
			end)
			return tags
		end
	}
}

local module = {}
module.TAG_TYPES = TAG_TYPES

local sourced_tag
local tag_id
local tag_type

function module.list_sources()
	local sources = {}

	-- TODO: Update ubus objects names so that `ubus list universal_gateway.*` could be used.
	-- With this knowing which services can be a source won't be needed.

	for _, service in ipairs(SERVICES) do
		local has_needed_package = true
		if service.needed_opkg_package then
			has_needed_package = pac.is_installed(service.needed_opkg_package)
		end

		if service.source_ubus_object and has_needed_package then
			table.insert(sources, {
				name = service.name,
				ubus_object = service.source_ubus_object
			})
		end
	end

	return sources
end

function module.list_source_names()
	local names = {}

	for _, source in ipairs(module.list_sources()) do
		table.insert(names, source.name)
	end

	return names
end

local function list_tags_from_source(source)
	assert(source ~= nil)
	assert(source.ubus_object ~= nil)

	local tags = {}

	local result = util.ubus(source.ubus_object, "get_tags")
	for _, tag in ipairs(result and result.tags or {}) do
		assert(tag.source == source.name)

		table.insert(tags, {
			-- Explicitly copy all expected options to reduce risk of breaking API
			id = tag.id,
			pretty_name = tag.pretty_name,
			source = tag.source,
			type = tag.type,
			permissions = tag.permissions,
			value_count = tag.value_count
		})
	end

	return tags
end

function module.list_tags()
	local tags = {}

	for _, source in ipairs(module.list_sources()) do
		for _, tag in ipairs(list_tags_from_source(source)) do
			table.insert(tags, tag)
		end
	end

	return tags
end

local function find_source_by_name(source_name)
	for _, source in ipairs(module.list_sources()) do
		if source.name == source_name then
			return source
		end
	end
end

function module.list_tag_ids_by_source(source_name)
	local source = find_source_by_name(source_name)
	if not source then
		return {}
	end

	local result = {}
	for _, tag in ipairs(list_tags_from_source(source)) do
		table.insert(result, tag.id)
	end
	return result
end

function module.list_used_tags()
	local tags = {}

	for _, service in ipairs(SERVICES) do
		local has_needed_package = true
		if service.needed_opkg_package then
			has_needed_package = pac.is_installed(service.needed_opkg_package)
		end

		if service.list_used_tags and has_needed_package then
			for _, tag in ipairs(service.list_used_tags()) do
				tag.service = service.name
				table.insert(tags, tag)
			end
		end
	end


	-- TODO: Using `list_tags` check if the results from `list_used_tags` are correct.

	return tags
end

---Setups requires, finds sourced tag and sets tag_permissions option.
---@param service table service instance
function module.setup_tags(service, remove_tag_size)
	local opt_enabled = service:get_abs_value(service.config, service.sid, "enabled")
	if opt_enabled == "1" then
		tag_id.require = { "tag_source", "tag_type" }
		if not remove_tag_size then
			tag_type.require = { ["string"] = { "tag_size" }, ["binary"] = { "tag_size" } }
		end
	else
		tag_id.require = nil
		tag_type.require = nil
	end

	local opt_tag_source = service:get_abs_value(service.config, service.sid, "tag_source")
	local opt_tag_id = service:get_abs_value(service.config, service.sid, "tag_id")
	local opt_tag_type = service:get_abs_value(service.config, service.sid, "tag_type")
	for _, t in ipairs(module.list_tags()) do
		if t.source == opt_tag_source and t.id == opt_tag_id and (t.type == "unknown" or t.type == opt_tag_type) then
			sourced_tag = t
			service:table_set(service.config, service.sid, "tag_permissions", t.permissions)
			break
		end
	end
end

---@param section table section instance which might also have custom validation functions used in tag options
---@param enabled_requires table list of option names
---@param extended_name_rule fun(section: table): boolean
---@alias Service 'mbus_client'|'dnp3_client'|'modbus_client'
---Workaroundish params for services which doesn't fully support tags yet
---@param excluded_services? Service[] list of excluded source services
---@param remove_tag_size? boolean
function module.append_tag_options(section, enabled_requires, extended_name_rule, excluded_services, remove_tag_size)

	local all_enabled_requires = { ["1"] = {"tag_name", "tag_id"} }
	if enabled_requires then
		assert(type(enabled_requires) == "table")
		for value, required_opts in pairs(enabled_requires) do
			all_enabled_requires[value] = util.combine(all_enabled_requires[value], required_opts)
		end
	end

	-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = section:option("enabled")
	enabled.require = all_enabled_requires
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local tag_name = section:option("tag_name")
	tag_name.maxlength = 128
		function tag_name:validate(value)
			local name_exists = false
			self:table_foreach(self.config, self.section_type, function (s)
				if self.sid ~= s[".name"] and s.tag_name == value and (extended_name_rule and extended_name_rule(s)) then
					name_exists = true
					return false
				end
			end)
			if name_exists then
				return false, "Configuration with name '" .. value .. "' already exists"
			end
			return self.dt:uciname(value)
		end

	local tag_source = section:option("tag_source")
		function tag_source:validate(value)
			local supported_sources = {}
			if excluded_services then
				for _, source in ipairs(module.list_source_names()) do
					if not util.contains(excluded_services, source) then
						table.insert(supported_sources, source)
					end
				end
			else
				supported_sources = module.list_source_names()
			end
			return self.dt:check_array(value, supported_sources)
		end

	tag_id = section:option("tag_id")
		function tag_id:validate()
			return self.dt:string()
		end

	tag_type = section:option("tag_type")
		function tag_type:validate(value)
			return self.dt:check_array(value, TAG_TYPES)
		end

	if not remove_tag_size then
		function tag_type:set(value)
			if FIXED_TAG_TYPE_BYTES[value] then
				section:table_set(section.config, section.sid, "tag_size", "")
			end
			section:table_set(section.config, section.sid, "tag_type", value)
		end

	local tag_size = section:option("tag_size")
		function tag_size:set(value)
			local opt_tag_type = section:get_abs_value(section.config, section.sid, "tag_type")
			if FIXED_TAG_TYPE_BYTES[opt_tag_type] then
				value = ""
			end
			section:table_set(section.config, section.sid, "tag_size", value)
		end
	end

	local tag_permissions = section:option("tag_permissions")
	tag_permissions.readonly = true

	local tag_start = section:option("tag_start")
		function tag_start:validate(value)
			return self.dt:irange(value, 0, 65535)
		end

	local tag_count = section:option("tag_count")
		function tag_count:validate(value)
			return self.dt:irange(value, 1, 65536)
		end
	-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------
end

---Validates if provided options matches sourced tag gathered from other services.
---@param service table service instance
function module.validate_tag_existence(service)
	local opt_enabled = service:get_abs_value(service.config, service.sid, "enabled")
	if opt_enabled ~= "1" then return end

	if sourced_tag then
		local opt_tag_start = tonumber(service:get_abs_value(service.config, service.sid, "tag_start"))
		local opt_tag_count = tonumber(service:get_abs_value(service.config, service.sid, "tag_count"))
		if opt_tag_start and opt_tag_count and (opt_tag_start + opt_tag_count > sourced_tag.value_count) then
			service:add_error(ERR_CODES.TAG_NOT_FOUND, string.format("The specified tag_count, starting from the given tag_start value, exceeds the maximum allowed count of %s for this tag_id", sourced_tag.value_count), "Validation")
		end
	else
		service:add_error(ERR_CODES.TAG_NOT_FOUND, "Data source not found with the provided tag_source, tag_id, tag_type options", "Validation")
	end
end

function module.is_tag_size_fixed(tag_size)
	return tag_size ~= "string" and tag_size ~= "binary"
end

---@param self table section instance
---@param sid? string section id. Provide to get size from specific section in config
---@param config? string config name. Provide together with sid. (default: self.config)
---@param remove_tag_size? boolean true if tag_size not supported yet
---@return number? size tag size in bytes
function module.get_tag_bytes(self, sid, config, remove_tag_size)
	local _tag_type, _tag_size, _tag_count
	if sid then
		local cfg = config or self.config
		_tag_type = self:table_get(cfg, sid, "tag_type")
		_tag_size = self:table_get(cfg, sid, "tag_size")
		_tag_count = self:table_get(cfg, sid, "tag_count")
	else
		_tag_type = self:get_abs_value(self.config, self.sid, "tag_type")
		_tag_size = self:get_abs_value(self.config, self.sid, "tag_size")
		_tag_count = self:get_abs_value(self.config, self.sid, "tag_count")
	end
	if remove_tag_size and (_tag_type == "string" or _tag_type == "binary") then
		_tag_size = 1
	end
	local single_tag_bytes = FIXED_TAG_TYPE_BYTES[_tag_type] or tonumber(_tag_size)
	if single_tag_bytes then
		return single_tag_bytes * (tonumber(_tag_count) or 1)
	end
	return nil
end

return module
