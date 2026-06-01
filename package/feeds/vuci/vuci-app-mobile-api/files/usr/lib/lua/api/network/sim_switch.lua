
local ConfigService = require("api/ConfigService")
local mdm = require("vuci.modem")

if mdm:modem_count() == 0 then
	return nil
end

local function adjust_esim_index(value)
	return tonumber(value) and tostring(tonumber(value) + 1) or nil
end

local sim_switch = ConfigService:new({ create = false, delete = false })

function sim_switch:parent_exists()
	if self.binding then
		local all_modems = mdm:get_all_modems()
		for _, modem in ipairs(all_modems) do
			if modem.id == self.binding then
				return true
			end
		end
		return self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Modem %s does not exist", self.binding),
			"modem",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

function sim_switch:validate_low_power()
	local m = self:table_get(self.config, self.sid, "modem")
	if m and mdm:get_mode(m) == mdm.modes.LOW_POWER then
		return false, "Option is not supported on low power modems"
	end
	return true
end

function sim_switch:initialize_hook()
	local pac = require("vuci.package_checker")
	if not pac.is_installed("sim_switch") then
		return sim_switch:add_critical_error(STD_CODES.INCORRECT_REQUEST, "Service does not exist in device" , "Request", 404)
	end
end

local s = sim_switch:section("sim_switch", "sim")
function s:filter(s)
	if not self.binding then return true end
	return s.modem == self.binding
end

	local modem = s:option("modem")
	modem.readonly = true

	local position = s:option("position")
	position.readonly = true

	local esim_profile = s:option("esim_profile")
		esim_profile.readonly = true
		function esim_profile:get(value)
			local sim_card = self:table_get(self.config, self.sid)
			if not value and mdm:is_card_esim(sim_card.modem, sim_card.position) then
				return "1"
			end
			return adjust_esim_index(value)
		end

	local order = s:option("order")
		function order:validate(value) return self.dt:uinteger(value) end

	local enabled = s:option("enabled")
		function enabled:validate(value) return self.dt:is_bool(value) end

	local interval = s:option("interval")
		function interval:validate(value) return self.dt:irange(value, 3, 3600) end

	local retry_count = s:option("retry_count")
		function retry_count:validate(value) return self.dt:irange(value, 1, 10) end

	local on_signal = s:option("on_signal")
		function on_signal:validate(value) return self.dt:is_bool(value) end

	local weak_signal = s:option("weak_signal")
		function weak_signal:validate(value) return self.dt:irange(value, -120, -50) end

	local data_limit = s:option("data_limit")
		function data_limit:validate(value) return self.dt:is_bool(value) end

	local sms_limit = s:option("sms_limit")
		function sms_limit:validate(value) return self.dt:is_bool(value) end

	local roaming = s:option("roaming")
		function roaming:validate(value) return self.dt:is_bool(value) end

	local no_network = s:option("no_network")
		function no_network:validate(value) return self.dt:is_bool(value) end

	local denied = s:option("denied")
		function denied:validate(value) return self.dt:is_bool(value) end

	local fail_flag = s:option("fail_flag")
		function fail_flag:validate(value) return self.dt:is_bool(value) end

	local data_fail = s:option("data_fail")
		function data_fail:validate(value) return self.dt:check_array(value, {"1", "2"}) end

	local data_fail_host = s:option("data_fail_host")
		function data_fail_host:validate(value) return self.dt:host(value) end

	local data_fail_timeout = s:option("data_fail_timeout")
		function data_fail_timeout:validate(value) return self.dt:uinteger(value) end

	local sim_not_ready = s:option("sim_not_ready")
		function sim_not_ready:validate(value) return self.dt:is_bool(value) end

	local opcode_enabled = s:option("opcode_enabled")
		function opcode_enabled:validate(value)
			local ok, err = self:validate_low_power()
			if not ok then return ok, err end
			return self.dt:is_bool(value)
		end
		function opcode_enabled:set(value)
			self:table_set(self.config, self.sid, "opcode_filter", value or "0")
		end
		function opcode_enabled:get()
			local value = self:table_get(self.config, self.sid, "opcode_filter") or "0"
			return value == "2" and "1" or value
		end

	local opcode_filter = s:option("opcode_filter")
		function opcode_filter:validate(value)
			local ok, err = self:validate_low_power()
			if not ok then return ok, err end
			return self.dt:check_array(value, {"1", "2"})
		end
		function opcode_filter:set(value)
			if self.current_data_block[opcode_enabled.api_key] == "1" then
				self:table_set(self.config, self.sid, "opcode_filter", value)
			end
		end
		function opcode_filter:get()
			local value = self:table_get(self.config, self.sid, "opcode_filter") or nil
			if value == "0" then return nil end
			return value
		end

	local opcode_list = s:option("opcode_list")
		function opcode_list:validate(value)
			local ok, err = self:validate_low_power()
			if not ok then return ok, err end
			ok = false
			self:table_foreach("operctl", "operlist", function(s)
				if s.name == value then
					ok = true
					return false -- break
				end
			end)
			return ok, "Operator list with this name doesn't exist."
		end

	local enable_back = s:option("enable_back")
		function enable_back:validate(value)
			return self.dt:is_bool(value)
		end

	local switch_back = s:option("switch_back")
		function switch_back:validate(value)
			local ok, err = self.dt:min(value, 1)
			if not ok then return ok, err end
			return self.dt:uinteger(value)
		end

local function only_enable_back(self)
	if self:get_abs_value(self.config, self.sid, enable_back.api_key) ~= "1" then
		return false
	end
	for _, o in pairs({
		on_signal.api_key, data_limit.api_key,
		sms_limit.api_key, roaming.api_key,
		no_network.api_key, denied.api_key,
		fail_flag.api_key, sim_not_ready.api_key
	}) do
		if self:get_abs_value(self.config, self.sid, o) == "1" then
			return false
		end
	end
	if self:get_abs_value(self.config, self.sid, opcode_filter.api_key) ~= "0" then
		return false
	end
	return true
end

local function only_limits_enabled(self)
	local data_enabled = self:get_abs_value(self.config, self.sid, data_limit.api_key) == "1"
	local sms_enabled = self:get_abs_value(self.config, self.sid, sms_limit.api_key) == "1"

	if not (data_enabled or sms_enabled) then
		return false
	end

	for _, o in pairs({
		on_signal.api_key, roaming.api_key,
		no_network.api_key, denied.api_key,
		fail_flag.api_key, sim_not_ready.api_key
	}) do
		if self:get_abs_value(self.config, self.sid, o) == "1" then
			return false
		end
	end
	return true
end

function sim_switch:PUT_validate_section_hook()
	on_signal.require = { ["1"] = {"weak_signal"} }
	fail_flag.require = { ["1"] = {"data_fail"} }
	data_fail.require = { ["2"] = {"data_fail_host", "data_fail_timeout"} }
	enable_back.require = { ["1"] = {"switch_back"} }
	opcode_enabled.require = { ["1"] = {"opcode_list", "opcode_filter"} }
	enabled.require = nil

	-- Skip enabled require if only enable_back is set
	if not only_enable_back(self) then
		if only_limits_enabled(self) then
			enabled.require = { ["1"] = {"interval"} }
		else
			enabled.require = { ["1"] = {"interval", "retry_count"} }
		end
	end

	if self:get_abs_value(self.config, self.sid, enabled.api_key) ~= "1" then
		-- Disable requires if section disabled
		on_signal.require = nil
		fail_flag.require = nil
		data_fail.require = nil
		enable_back.require = nil
		opcode_enabled.require = nil
	end
end

function sim_switch:PUT_before_commit_hook()
	local sim_data = {}
	for info in mdm:info_iterator() do
		sim_data[info.usb_id] = {
			need_reorder = false,
			max_order = 0,
			enabled_count = 0
		}
	end

	self:table_foreach(self.config, "sim", function (s)
		if not sim_data[s.modem] then return end
		local data = sim_data[s.modem]

		if self:get_abs_value(self.config, s[".name"], "enabled") == "1" then
			local current_order = self:get_abs_value(self.config, s[".name"], "order")
			if current_order then
				data.max_order = math.max(data.max_order, tonumber(current_order) or 1)
			else
				data.need_reorder = true
			end
			data.enabled_count = data.enabled_count + 1
		else
			self:table_delete(self.config, s[".name"], "order")
		end
	end)

	for modem_id, data in pairs(sim_data) do
		if data.enabled_count == 1 then
			self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				("SIM switch configuration cannot be saved for modem '%s', at least 2 configurations must be enabled"):format(modem_id),
				"Validation"
			)
		end
		if data.need_reorder then
			self:table_foreach(self.config, "sim", function (s)
				if modem_id ~= s.modem then return end
				if not self:get_abs_value(self.config, s[".name"], "order") and
					self:get_abs_value(self.config, s[".name"], "enabled") == "1" then
					data.max_order = data.max_order + 1
					self:table_set(self.config, s[".name"], "order", tostring(data.max_order))
				end
			end)
		end
	end
end

return sim_switch
