local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local pac = require("vuci.package_checker")
local all_modems = require("vuci.modem"):get_all_modems()
local msg_type, enabled
local gsm_params, mdcollect_params, all_params

local azure_iothub = ConfigService:new({ increment_name = true })

local Param = util.class()
function Param.__init__(self, legacy_name, value, str, new_name)
	self.name = new_name or legacy_name
	self.value = value
	self.str = str
	self.legacy_name = legacy_name
end

function Param.get_fmt_str(self)
	return '"' .. self.name .. '": ' .. (self.str and '"' or '') .. '%' ..
		self.value .. '%' .. (self.str and '"' or '') .. ', '
end

local ParamList = util.class()
function ParamList.__init__(self, ...)
	self.params = {}
	for _, v in ipairs(arg) do
		self:add(v)
	end
end

function ParamList._from_fmt_str(fmt_str, params)
	local p_list = ParamList()
	if not fmt_str or fmt_str == "" then return p_list end

	for _, p in params:iterator() do
		if fmt_str:find('"' .. p.name .. '"', 1, true) then
			p_list:add(p)
		end
	end
	return p_list
end

function ParamList.from_gsm_fmt_str(fmt_str)
	return ParamList._from_fmt_str(fmt_str, gsm_params)
end

function ParamList.from_mdcollect_fmt_str(fmt_str)
	return ParamList._from_fmt_str(fmt_str, mdcollect_params)
end

function ParamList.iterator(self)
	return ipairs(self.params)
end

function ParamList.add(self, v)
	if not util.instanceof(v, Param) then error("Only 'ParamValue' type objects are accepted") end
	table.insert(self.params, v)
end

function ParamList.get_legacy_name_list(self)
	local l = {}
	for _, param in self:iterator() do
		l[#l + 1] = param.legacy_name
	end
	return l
end

function ParamList.generate_full_fmt_str(self, legacy_param_names)
	local fmt_str = ""
	for _, p_name in ipairs(legacy_param_names) do
		for _, param in self:iterator() do
			if p_name == param.legacy_name then
				fmt_str = fmt_str .. param:get_fmt_str()
			end
		end
	end

	if fmt_str ~= "" then
		fmt_str = fmt_str:sub(1, #fmt_str - 2)
	end
	return fmt_str
end

-- legacy_name, value, str, new_name
gsm_params = ParamList(
	Param("rsrq", "rsrq"),
	Param("pinstate", "pinstate", true, "pin_state"),
	Param("manuf", "manuf", true, "manufacturer"),
	Param("revision", "revision", true),
	Param("ecio", "ecio"),
	Param("sinr", "sinr"),
	Param("conntype", "conntype", true, "connection_type"),
	Param("model", "model", true),
	Param("imsi", "imsi", true),
	Param("ipaddr", "ip", false, "ip"),
	Param("opernum", "opernum", false, "operator_number"),
	Param("cellid", "cellid", true),
	Param("signal", "rssi", false),
	Param("rsrp", "rsrp"),
	Param("imei", "imei", true),
	Param("serial", "serial", true),
	Param("netstate", "netstate", true, "network_state"),
	Param("rscp", "rscp"),
	Param("pincount", "pincount", false, "pin_count"),
	Param("modem", "modem"),
	Param("iccid", "iccid", true),
	Param("connstate", "connstate", true, "connection_state"),
	Param("temp", "temp", false, "temperature"),
	Param("operator", "operator", true),
	Param("simstate", "simstate", true, "sim_state")
)

local mdc_installed = pac.is_installed("data-sender-mod-mdcollect")
if mdc_installed then
	mdcollect_params = ParamList(
		Param("brecv", "tx", false, "bytes_received"),
		Param("bsent", "rx", false, "bytes_sent")
	)
end

all_params = ParamList(unpack(util.combine(gsm_params.params, (mdcollect_params or {}).params)))

function azure_iothub:_create_collection()
	self:table_section("data_sender", "collection", "collection_" .. self.sid, {
		name = "collection_" .. self.sid,
		format = "custom",
		na_str = "N/A",
		output = self.sid
	})
end

function azure_iothub:_create_output()
	self:table_section("data_sender", "output", self.sid, {
		plugin = "ubus",
		name = self.sid,
		ubus_object = "azure." .. self.sid,
		ubus_method = "message",
		azure_configuration_type = "unique"
	})
end

function azure_iothub:get_output()
	local output = self:table_get("data_sender", self.sid)
	if not output then
		self:_create_output()
	end
	return self:table_get("data_sender", self.sid)
end

function azure_iothub:get_collection()
	local output = self:get_output()
	local collection
	local function _find_col()
		self:table_foreach("data_sender", "collection", function(s)
			if s.output == output[".name"] then
				collection = s
				return false -- break
			end
		end)
	end
	_find_col()
	if not collection then
		self:_create_collection()
	end
	_find_col()
	return collection
end

function azure_iothub:get_inputs()
	local c = self:get_collection()
	local inputs = {}
	for _, input in ipairs((c.input and #c.input > 0) and c.input or {}) do
		-- using table_foreach because table_get is broken in api-core
		self:table_foreach("data_sender", "input", function(s)
			if s[".name"] == input then
				table.insert(inputs, s)
			end
		end)
	end
	return inputs
end

---Returns azure input section
---@param plugin_type "gsm"|"mdcollect"|"mqtt"
---@return table|nil
function azure_iothub:get_input(plugin_type)
	if not util.contains({ "gsm", "mdcollect", "mqtt" }, plugin_type) then
		error('plugin_type must be: "gsm", "mdcollect", "mqtt"')
	end
	local inputs = self:get_inputs()
	for _, inp in ipairs(inputs) do
		if inp.plugin == plugin_type then
			return inp
		end
	end
end

---Creates azure input section if it doesn't exist
---@param plugin_type "gsm"|"mdcollect"|"mqtt"
---@return table|nil created_input
function azure_iothub:create_input(plugin_type, custom_opts)
	if not util.contains({ "gsm", "mdcollect", "mqtt" }, plugin_type) then
		error('plugin_type must be: "gsm", "mdcollect", "mqtt"')
	end
	local inp = self:get_input(plugin_type)
	if not inp then
		local n = plugin_type .. "_in_" .. self.sid
		local opts = {
			plugin = plugin_type,
			name = n,
			format = "custom",
			na_str = "N/A",
			delimiter = ","
		}
		for key, value in pairs(custom_opts or {}) do
			opts[key] = value
		end
		self:table_section("data_sender", "input", n, opts)
		return self:table_get("data_sender", n)
	end
	return inp
end

---Adds input to collection (if it is not already added)
---@param input_type "gsm"|"mdcollect"|"mqtt"
function azure_iothub:collection_add_input(input_type)
	local input_s = self:get_input(input_type)
	if not input_s then
		input_s = self:create_input(input_type)
	end

	local input_s_name = input_s[".name"]
	local c_inputs = self:get_collection()["input"]
	c_inputs = (c_inputs and #c_inputs > 0) and c_inputs or {}
	if not util.contains(c_inputs, input_s_name) then
		self:create_input(input_type)

		c_inputs[#c_inputs + 1] = input_s_name
		self:collection_set("input", c_inputs)
		local format_str = "{"
		for _, c_inp in ipairs(c_inputs) do
			format_str = format_str .. "%" .. c_inp .. "%, "
		end
		format_str = format_str:sub(1, #format_str - 2) .. "}"

		self:collection_set("format_str", format_str)
	end
end

---Removes input from collection (if it is not already removed)
---@param input_type "gsm"|"mdcollect"|"mqtt"
function azure_iothub:collection_remove_input(input_type)
	local input_s = self:get_input(input_type)
	if not input_s then return end

	local input_s_name = input_s[".name"]
	local col = self:get_collection()

	self:delete_input(input_type)

	-- remove all collection references in format_str
	local new_format_str = col.format_str and col.format_str:gsub("%%" .. input_s_name .. "%%,%s*", "")
		:gsub(",%s*%%" .. input_s_name .. "%%", ""):gsub("%s*%%" .. input_s_name .. "%%%s*", "") or ""
	self:collection_set("format_str", new_format_str)

	local inp_arr = util.clone(col.input or {})
	for i, value in ipairs(inp_arr) do
		if value == input_s_name then
			table.remove(inp_arr, i)
			break
		end
	end
	self:collection_set("input", inp_arr)
end

---Deletes azure input section if it exists
---@param plugin_type "gsm"|"mdcollect"|"mqtt"
function azure_iothub:delete_input(plugin_type)
	if not util.contains({ "gsm", "mdcollect", "mqtt" }, plugin_type) then
		error('plugin_type must be: "gsm", "mdcollect", "mqtt"')
	end
	local inp = self:get_input(plugin_type)
	if inp then
		self:table_delete("data_sender", inp[".name"])
	end
end

function azure_iothub:input_set(plugin_type, opt, val)
	local inp = self:get_input(plugin_type)
	if not inp and (not val or val == "") then
		return
	end
	self:table_set("data_sender", inp[".name"], opt, val)
end

function azure_iothub:input_get(plugin_type, opt)
	local inp = self:get_input(plugin_type)
	return inp and self:table_get("data_sender", inp[".name"], opt) or nil
end

function azure_iothub:collection_set(opt, val)
	self:table_set("data_sender", self:get_collection()[".name"], opt, val)
end

function azure_iothub:collection_get(opt)
	return self:table_get("data_sender", self:get_collection()[".name"], opt)
end

function azure_iothub:PUT_validate_section_hook()
	local enb = self:get_abs_value(self.config, self.sid, "enabled")
	if enb == "1" then
		msg_type.require = {
			mqtt = { "mqtt_ip", "mqtt_port", "mqtt_topic" },
			gsmctl = { "message_interval", "interface", "gsm" }
		}
	end
end

local s = azure_iothub:section("azure_iothub", "azure_iothub")
s.filter = function(_, options)
	return (options[".name"] == "device_1" or (options["old"] and options["old"] == "1")) and
		(not options.hidden or options.hidden == "0")
end

function s:create_defaults(_)
	return { old = "1" }
end

function azure_iothub:POST_validate_hook()
	local interfaces = 0
	self:table_foreach("azure_iothub", "azure_iothub", function(s)
		if s[".name"] == "device_1" or (s["old"] and s["old"] == "1") then
			interfaces = interfaces + 1
		end
	end)
	if interfaces >= 1 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 1 instance is allowed.")
	end
end

function azure_iothub:DELETE_before_commit_hook()
	self:table_foreach("data_sender", "collection", function(s)
		if s.output then
			local ds_output = self:table_get("data_sender", s.output)
			if ds_output.ubus_object and ds_output.ubus_object == ("azure." .. self.sid) then
				for _, input in ipairs(s.input or {}) do
					self:table_delete("data_sender", input)
				end
				self:table_delete("data_sender", s.output)
				self:table_delete("data_sender", s[".name"])
			end
		end
	end)
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

function azure_iothub:PUT_init_hook()
	local opt_connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
	if not opt_connection_type or opt_connection_type == "" then
		self.current_data_block["connection_type"] = "iothub"
	end
end

function azure_iothub:POST_init_hook()
	local opt_connection_type = self:get_abs_value(self.config, self.sid, "connection_type")
	if not opt_connection_type or opt_connection_type == "" then
		self.current_data_block["connection_type"] = "iothub"
	end
end

enabled = s:option("enabled")
enabled.require = { ["1"] = { "msg_type", "connection_string" } }
function enabled:validate(value)
	return self.dt:is_bool(value)
end

enabled.original_set = enabled.set
function enabled:set(value)
	self:original_set(value)
	self:collection_set(self.api_key, value)
	self:table_set(self.config, self.sid, "connection_type", "iothub")
end
function enabled:get()
	return self:collection_get(self.api_key)
end

local connection_string = s:option("connection_string")
connection_string.maxlength = 4096
function connection_string:validate(value)
	return self.dt:string(value)
end

msg_type = s:option("msg_type")
function msg_type:validate(value)
	local arr = { "mqtt" }
	if #all_modems > 0 then
		arr[#arr + 1] = "gsmctl"
	end
	return self.dt:check_array(value, arr)
end

function msg_type:set(value)
	if value == "gsmctl" then
		-- inputs are created on demand, in "gsm" option setter
		self:collection_remove_input("mqtt")
	elseif value == "mqtt" then
		self:create_input("mqtt", { 
			format_str = '"value": "%data%"',
			na_str = "N/A",
			delimiter = ",",
			mqtt_in_qos = "0",
			mqtt_in_keepalive = "60"
		})
		self:collection_add_input("mqtt")

		self:collection_remove_input("gsm")
		self:collection_remove_input("mdcollect")
	end
end

function msg_type:get()
	if self:get_input("mqtt") then
		return "mqtt"
	elseif #all_modems > 0 then
		return "gsmctl"
	end
end

local mqtt_ip = s:option("mqtt_ip")
function mqtt_ip:validate(value)
	return self.dt:host(value)
end

function mqtt_ip:get()
	return self:input_get("mqtt", "mqtt_in_host")
end

function mqtt_ip:set(value)
	self:input_set("mqtt", "mqtt_in_host", value)
end

local mqtt_port = s:option("mqtt_port")
function mqtt_port:validate(value)
	return self.dt:port(value)
end

function mqtt_port:get()
	return self:input_get("mqtt", "mqtt_in_port")
end

function mqtt_port:set(value)
	self:input_set("mqtt", "mqtt_in_port", value)
end

local mqtt_topic = s:option("mqtt_topic")
mqtt_topic.maxlength = 65535
function mqtt_topic:validate(value)
	return self.dt:string(value)
end

function mqtt_topic:get()
	return self:input_get("mqtt", "mqtt_in_topic")
end

function mqtt_topic:set(value)
	self:input_set("mqtt", "mqtt_in_topic", value)
end

local mqtt_username = s:option("mqtt_username")
mqtt_username.maxlength = 512
function mqtt_username:validate(value)
	return self.dt:credentials_validate(value)
end

function mqtt_username:get()
	return self:input_get("mqtt", "mqtt_in_username")
end

function mqtt_username:set(value)
	self:input_set("mqtt", "mqtt_in_username", value)
end

local mqtt_password = s:option("mqtt_password", { sensitive = true })
mqtt_password.maxlength = 512
function mqtt_password:validate(value)
	return self.dt:credentials_validate(value)
end

function mqtt_password:get()
	if self:get_input("mqtt") then
		return self:input_get("mqtt", "mqtt_in_password")
	end
end

function mqtt_password:set(value)
	self:input_set("mqtt", "mqtt_in_password", value)
end

local message_interval = s:option("message_interval")
function message_interval:validate(value)
	return self.dt:range(value, 10, 99999)
end

function message_interval:get()
	local opt_value = self:get_collection()["period"]
	if opt_value and opt_value ~= "" then
		return opt_value
	end
end

function message_interval:set(value)
	self:collection_set("period", value)
end

if #all_modems > 0 then
	local interface = s:option("interface")
	function interface:validate(value)
		local iface_options = {}
		self:table_foreach("network", "interface", function(sec)
			if sec.modem then table.insert(iface_options, sec.name or sec[".name"]) end
		end)
		return self.dt:check_array(value, iface_options)
	end

	function interface:get(value) return util.network_mapper_get(self, value) end

	function interface:set(value)
		if value == "" then
			self:table_delete(self.config, self.sid, self.api_key)
		else
			value = util.get_network_map(self)[value] or value
			self:table_set(self.config, self.sid, self.api_key, value)
			local modem_id = self:table_get("network", value, "modem")
			local sim_number = self:table_get("network", value, "sim")
			if self:get_input("gsm") then
				self:input_set("gsm", "gsm_modem_id", modem_id)
			end
			if self:get_input("mdcollect") then
				self:input_set("mdcollect", "mdc_modem_id", modem_id)
				self:input_set("mdcollect", "mdc_sim", sim_number)
			end
		end
	end

	local gsm = s:option("gsm", { list = true })
	function gsm:validate(value)
		return self.dt:check_array(value, all_params:get_legacy_name_list())
	end

	function gsm:set(list_value)
		if #list_value == 0 then
			self:collection_remove_input("gsm")
			self:collection_remove_input("mdcollect")
			return
		end

		local gsm_format_str = gsm_params:generate_full_fmt_str(list_value)
		local mdcollect_format_str = mdc_installed and mdcollect_params:generate_full_fmt_str(list_value) or ""

		local modem_id, sim_number

		if gsm_format_str or mdcollect_format_str then
			local opt_interface = self:get_abs_value(self.config, self.sid, "interface")
			modem_id = self:table_get("network", opt_interface, "modem")
			sim_number = self:table_get("network", opt_interface, "sim")
		end

		if gsm_format_str == "" then
			self:collection_remove_input("gsm")
		else
			self:collection_add_input("gsm")
			self:input_set("gsm", "format_str", gsm_format_str)
			self:input_set("gsm", "na_str", "N/A")
			self:input_set("gsm", "delimiter", ",")
			if modem_id then
				self:input_set("gsm", "gsm_modem_id", modem_id)
			end
		end

		if mdcollect_format_str == "" then
			self:collection_remove_input("mdcollect")
		else
			self:collection_add_input("mdcollect")
			self:input_set("mdcollect", "format_str", mdcollect_format_str)
			self:input_set("mdcollect", "mdc_period", "day")
			if modem_id then
				self:input_set("mdcollect", "mdc_modem_id", modem_id)
			end
			if sim_number then
				self:input_set("mdcollect", "mdc_sim", sim_number)
			end
		end
	end

	function gsm:get()
		local gsm_format_str = self:input_get("gsm", "format_str")
		local mdcollect_format_str = self:input_get("mdcollect", "format_str")

		local gsm_p_list = ParamList.from_gsm_fmt_str(gsm_format_str)
		local mdcollect_p_list = ParamList.from_mdcollect_fmt_str(mdcollect_format_str)

		local param_names = util.combine(gsm_p_list:get_legacy_name_list(), mdcollect_p_list:get_legacy_name_list())
		return #param_names > 0 and param_names or nil
	end

end
-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return azure_iothub
