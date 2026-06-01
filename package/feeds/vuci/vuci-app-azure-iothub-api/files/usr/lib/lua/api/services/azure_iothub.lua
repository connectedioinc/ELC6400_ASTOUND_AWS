local util = require("vuci.util")
local fs = require("nixio.fs")
local ConfigService = require("api/ConfigService")

local azure_iothub = ConfigService:new({ increment_name = true })

local s = azure_iothub:section("azure_iothub", "azure_iothub")

local azure_utils = require("api.services.azure_utils")(azure_iothub)

s.filter = function(_, options)
	return not (options.hidden == "1" or options.old == "1")
end

function s:create_defaults()
	return {
		name = require("vuci.util_tlt").get_next_name(self, self.config, "azure_iothub", "name", "azure_iothub")
	}
end

-------------------------------------------------------------------- STATUS ---------------------------------------------------------------------------

function azure_iothub:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function azure_iothub:get_azure_section_status(id, name)
	local function check_if_exist_status(status)
		return status and string.lower(status) or "n/a"
	end

	local status = util.ubus("azure." .. id, "get_connection_status", {})
	if not status then
		return {
			id                       = id,
			name                     = name,
			connection_status        = "disabled",
			connection_status_reason = "n/a"
		}
	end
	return {
		id                       = id,
		name                     = name,
		connection_status        = check_if_exist_status(status["IOTHUB_CLIENT_CONNECTION_STATUS"]),
		connection_status_reason = check_if_exist_status(status["IOTHUB_CLIENT_CONNECTION_STATUS_REASON"])
	}
end

function azure_iothub:print_single_section(found_single_section)
    if not found_single_section then
        self:add_critical_error(
            STD_CODES.INVALID_SECTION,
            string.format("Section: %s for service does not exist", self.sid),
            "Azure",
            HTTP_STATUS_CODES.NOT_FOUND
        )
    end
    local opt_name = self:get_abs_value(self.config, self.sid, "name")
    return self:get_azure_section_status(self.sid, opt_name)
end

function azure_iothub:GET_TYPE_status()
    local response = {}
    local all_status = not self.sid
    local found_single_section = false
    self:table_foreach("azure_iothub", "azure_iothub", function(s)
		if s.old == "1" or s.hidden == "1" then return end
		-- if all azure section statuses
		if all_status and s[".name"] and s["name"] then
			local status = self:get_azure_section_status(s[".name"], s["name"])
			if status then
				table.insert(response, status)
			end
		end
		-- if single azure section status
		if not all_status and s["name"] and s[".name"] == self.sid then
			found_single_section = true
			return false --break
		end
    end)
    if not all_status then
        response = self:print_single_section(found_single_section)
    end
    self:ResponseOK(response)
end

-------------------------------------------------------------------- STATUS ---------------------------------------------------------------------------


-------------------------------------------------------------- REQUIRE VALIDATION ---------------------------------------------------------------------

local enabled

azure_iothub.PUT_validate_section_hook = function()
	enabled.require = { ["1"] = azure_utils:require_validation() }
end
azure_iothub.POST_validate_section_hook = function()
	enabled.require = { ["1"] = azure_utils:require_validation() }
end

-------------------------------------------------------------- REQUIRE VALIDATION ---------------------------------------------------------------------


---------------------------------------------------------------- DELETE SECTION -----------------------------------------------------------------------

function azure_iothub:DELETE_before_section_delete_hook()
	self:table_foreach("data_sender", "collection", function(s)
		if not s.output then return end
		local ds_output = self:table_get("data_sender", s.output)
		if ds_output.ubus_object == ("azure." .. self.sid) then
			self:table_set("data_sender", s['.name'], "enabled", "0")
			local fields_to_delete = {"plugin", "ubus_object", "ubus_method", "azure_configuration_type"}
			for _, field in ipairs(fields_to_delete) do
				self:table_delete("data_sender", s.output, field)
			end
		end
	end)
end

---------------------------------------------------------------- DELETE SECTION -----------------------------------------------------------------------


------------------------------------------------------------- VALIDATION FUNCTIONS --------------------------------------------------------------------

function azure_iothub:disable_opt_validation()
	local ubus_obj_name = "azure." .. self.sid
	local output_id
	local ds_enabled_collection_ids = {}
	local ds_disabled_collection_ids = {}

	self:table_foreach("data_sender", "output", function(s)
        if s.plugin ~= "ubus" or s.ubus_object ~= ubus_obj_name then return end

        output_id = s['.name']
        self:table_foreach("data_sender", "collection", function(coll_s)
            if coll_s.output ~= output_id then return end

            if coll_s.enabled == "1" then
                table.insert(ds_enabled_collection_ids, coll_s[".name"])
            else
                table.insert(ds_disabled_collection_ids, coll_s[".name"])
            end
        end)
    end)

	for _, value in ipairs(ds_enabled_collection_ids) do
		self:add_error(
			STD_CODES.INVALID_OPT,
			string.format(
				"Instance can't be turned off, because Data To Server collection (id = %s) output is using.",
				value
			),
			"enabled"
		)
	end

	self:return_if_error()

	local fields_to_delete = {"plugin", "ubus_object", "ubus_method", "azure_configuration_type"}
    for _, value in ipairs(ds_disabled_collection_ids) do
        local ds_collection_section = self:get_abs_value("data_sender", value)
        if ds_collection_section.output then
            for _, field in ipairs(fields_to_delete) do
                self:table_delete("data_sender", ds_collection_section.output, field)
            end
        end
    end
end

------------------------------------------------------------- VALIDATION FUNCTIONS --------------------------------------------------------------------



---------------------------------------------------------------- START OF OPTIONS -----------------------------------------------------------------

local name = s:option("name")
	name.maxlength = 256
	name.cfg_require = true
	function name:validate(value)
		self:table_foreach(self.config, self.section_type, function (s)
			if s.name ~= value or s[".name"] == self.sid then return end
			self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Name already used for a configuration")
		end)
		return self.dt:uciname(value)
	end

enabled = s:option("enabled")
	function enabled:validate(value)
		local old_value = self:table_get(self.config, self.sid, self.api_key)
		if old_value == "1" and value == "0" then
			self:disable_opt_validation()
		end
		return self.dt:is_bool(value)
	end

local connection_type = s:option("connection_type")
	function connection_type:validate(value)
		return self.dt:check_array(value, { "iothub", "provisioning" })
	end

local attestation_mechanism = s:option("attestation_mechanism")
	function attestation_mechanism:validate(value)
		return self.dt:check_array(value, { "x509_certificate", "symmetric_key" })
	end

local connection_string = s:option("connection_string")
	connection_string.maxlength = 4096
	function connection_string:validate(value)
		return self.dt:string(value)
	end

local global_prov_uri = s:option("global_prov_uri")
	function global_prov_uri:validate(value)
		return self.dt:string(value)
	end

local id_scope = s:option("id_scope")
	id_scope.maxlength = 100
	function id_scope:validate(value)
		return self.dt:string(value)
	end

local registration_id = s:option("registration_id")
	registration_id.maxlength = 128
	function registration_id:validate(value)
		return self.dt:string(value)
	end

local x509certificate = s:option("x509certificate", { file = true })

local x509privatekey = s:option("x509privatekey", { file = true })

local symmetric_key = s:option("symmetric_key")
	symmetric_key.maxlength = 128
	function symmetric_key:validate(value)
		return self.dt:string(value)
	end

local direct_methods_enabled = s:option("direct_methods_enabled")
	function direct_methods_enabled:validate(value)
		return self.dt:is_bool(value)
	end

local model_id = s:option("model_id")
	model_id.maxlength = 256
	function model_id:validate(value)
		return self.dt:string(value)
	end

local old = s:option("old")
	old.readonly = true

---------------------------------------------------------------- END OF OPTIONS -----------------------------------------------------------------

----------------------------------------------------------------- MERGE ACTION ------------------------------------------------------------------

local link_action = azure_iothub:action("merge", function(self, data)
	if not self.binding then return self:add_critical_error(STD_CODES.NAME_NOT_PROVIDED, "Configuration ID must be provided.", "URL") end
	local function get_file_size(section, key)
		if not section[key] then return end
		local fs = require "nixio.fs"
		local stat = fs.stat(section[key]) or {}
		if stat.size then
			section[key .. ":file_size"] = stat.size
		end
	end
	local function move_file(old_section, section, opt_name)
		local old_path = old_section[opt_name]
		local new_path = section[opt_name]

		if old_path and not new_path then
			local parsed_path = util.split(old_path, ".", 3)
			local filename = string.gsub(parsed_path[4], "azure_", "")
			new_path = parsed_path[1] .. ".azure_iothub." .. self.binding .. "." .. filename
			fs.move(old_path, new_path)
			section[opt_name] = new_path
		end
	end
	local function move_cfg(from_section, to_section)
		local section = data
		local new_section = self:table_get("azure_iothub", to_section)
		local old_section = self:table_get("azure_iothub", from_section)
		old_section.name = new_section.name

		-- Remove unnecessary data
		for _, key in ipairs({".index", ".anonymous", ".name", ".type", "hidden"}) do
			old_section[key] = nil
		end

		-- Move files from old section to new if not set before
		for _, file in ipairs({"x509privatekey", "x509certificate"}) do
			move_file(old_section, section, file)
		end

		-- Merge config options
		for key, value in pairs(old_section) do
			if value and (not section[key] or section[key] == "") then
				section[key] = value
			end
		end

		-- Enable section
		section["enabled"] = "1"

		-- Set value to cofnig
		for key, value in pairs(section) do
			self.uci:set("azure_iothub", to_section, key, value)
		end
	end
	-- Check if setted required values
	local require_list = {
		["iothub"]       = { "connection_string" },
		["provisioning"] = { "global_prov_uri", "id_scope", "registration_id" }
	}
	for _, option in ipairs(require_list[data.connection_type]) do
		if not data[option] or data[option] == "" then
			self:add_error(STD_CODES.INVALID_OPT, "Missing required option: " .. option, "connection_type")
		end
	end

	self:return_if_error()

	local parsed_conn_str
	if data.connection_type == "iothub" then
		parsed_conn_str = azure_utils:parse_connection_string(data.connection_string)
		if not parsed_conn_str.hostname or not parsed_conn_str.deviceid then
			return self:ResponseError("Can't find 'HostName' or 'DeviceId' in 'connection_string' option.")
		end
	end
	local count = 0
	local section_to_change = {}
	self:table_foreach("azure_iothub", "azure_iothub", function(s)
		if s.hidden == "1" and s.connection_type == data.connection_type then
			local conditions_met = false

			if data.connection_type == "iothub" then
				local parsed_val = azure_utils:parse_connection_string(s.connection_string)
				conditions_met = parsed_val.hostname == parsed_conn_str.hostname and parsed_val.deviceid == parsed_conn_str.deviceid
			elseif data.connection_type == "provisioning" then
				conditions_met = data.global_prov_uri == s.global_prov_uri and data.id_scope == s.id_scope and data.registration_id == s.registration_id
			end

			if conditions_met then
				if count == 0 then
					move_cfg(s[".name"], self.binding)
					count = count + 1
				end
				table.insert(section_to_change, "azure." .. s[".name"])
				self.uci:delete("azure_iothub", s[".name"])
			end
		end
	end)
	self:table_foreach("data_sender", "output", function(s)
		if s.plugin == "ubus" and util.contains(section_to_change, s.ubus_object) then
			self.uci:set("data_sender", s[".name"], "ubus_object", "azure." .. self.binding)
			self.uci:set("data_sender", s[".name"], "azure_configuration_type", "existing")
		end
	end)
	if #section_to_change > 0 then
		self:commit("azure_iothub")
		self:commit("data_sender")
		local messages = {}
		local msg = {
			code = 1,
			message = "Merge successfully",
			source = "merge"
		}
		table.insert(messages, msg)

		local section = self.uci:get_all("azure_iothub", self.binding)
		section["id"] = section[".name"]

		for _, key in ipairs({".index", ".anonymous", ".name", ".type"}) do
			section[key] = nil
		end

		for _, file in ipairs({"x509certificate", "x509privatekey"}) do
			get_file_size(section, file)
		end

		return self:ResponseOK(section, messages)
	end
	return self:ResponseError("Can't find any section to merge.")
end)

local options_to_copy = { "connection_type", "attestation_mechanism", "connection_string", "global_prov_uri", "id_scope",
	"registration_id", "symmetric_key", "direct_methods_enabled", "model_id", "name" }
for _, sec in ipairs(azure_iothub.sections) do
	for _, opt_wrapper in ipairs(sec.options) do
		local _, opt = next(opt_wrapper)
		if opt.api_key and util.contains(options_to_copy, opt.api_key) then
			local merge_opt = link_action:option(opt.api_key)
			merge_opt.maxlength = opt.maxlength or nil
			merge_opt.validate = opt.validate
			if opt.api_key == "connection_type" then
				merge_opt.require = true
			end
		end
	end
end

local merge_x509certificate = link_action:option("x509certificate")
function merge_x509certificate:validate(value)
	return self.dt:file_validation(value, { "/etc/vuci-uploads/", "/etc/certificates/", "/etc/ssl/certs/" })
end

local merge_x509privatekey = link_action:option("x509privatekey")
function merge_x509privatekey:validate(value)
	return self.dt:file_validation(value, { "/etc/vuci-uploads/", "/etc/certificates/", "/etc/ssl/certs/" })
end

----------------------------------------------------------------- MERGE ACTION ------------------------------------------------------------------

function azure_iothub:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "azure")
	return { path = path }
end

return azure_iothub
