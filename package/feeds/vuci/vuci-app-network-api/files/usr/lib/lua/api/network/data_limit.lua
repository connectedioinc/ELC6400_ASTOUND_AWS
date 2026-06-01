local util = require "vuci.util"
local mdm = require("vuci.modem")
local pkg = require("vuci.package_checker")
local fs = require("nixio.fs")

local ConfigService = require("api/ConfigService")

local has_quota_limit = pkg.is_installed("quota_limit")

if not has_quota_limit then
	return nil
end

local RES_CODES = {
	QUOTA_LIMIT_ERR = 2
}

local quota_limit = ConfigService:new()

	local interfaces = quota_limit:section("quota_limit", "interface")
	interfaces.filter = function(self, options)
		return self:mobile_proto(options[".name"])
	end
	interfaces.create_defaults = function(self)
		return {
			ifname = self.sid,
			sim = self:table_get("network", self.sid, "sim") or "1",
			modem = self:table_get("network", self.sid, "modem") or mdm:get_all_modems()[1].id
		}
	end

	local mob_limit_enabled = interfaces:option("enabled")
	mob_limit_enabled.require = { ["1"] = {"data_limit", "period" } }
		function mob_limit_enabled:validate(value)
			if self:table_get(self.config, self.sid, self.api_key) == value then return true end
			if value == "0" and pkg.is_installed("sim_switch") then
				local limit = self:table_get(self.config, self.sid)
				if limit and limit.modem and limit.ifname then
					local iface = self:table_get("network", limit.ifname)
					if iface and (not iface.disabled or iface.disabled ~= "1") then
						local ok = true
						self:table_foreach("sim_switch", "sim", function (s)
							if s.modem ~= limit.modem then return end
							if s.position ~= limit.sim then return end
							if s.data_limit ~= "1" then return end
							if s.enabled ~= "1" then return end
							if s.esim_profile == iface.esim_profile then
								ok = false
								return false -- break
							end
						end)
						return ok, "Could not disable data limit. SIM Switch configuration is active."
					end
				end
			end
			return self.dt:is_bool(value)
		end
		function mob_limit_enabled:set(value)
			local ifname = self.sid
			self:table_foreach("overview", "overview", function(s)
				if s.id == "mobile_data_limit" and s.section_name == ifname then
					self:table_set("overview", s[".name"], "enabled", value)
				end
			end)
			if value == "1" then
				-- Need to add missing info for default quota_limit sections before turning on
				if not self:table_get(self.config, self.sid, "sim") then
					local sim = self:get_abs_value("network", self.sid, "sim") or "1"
					self:table_set(self.config, self.sid, "sim", sim)
				end
				if not self:table_get(self.config, self.sid, "modem") then
					local modem = self:get_abs_value("network", self.sid, "modem") or mdm:get_all_modems()[1].id
					self:table_set(self.config, self.sid, "modem", modem)
				end
				if not self:table_get(self.config, self.sid, "ifname") then
					self:table_set(self.config, self.sid, "ifname", ifname)
				end
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local data_limit = interfaces:option("data_limit")
		function data_limit:validate(value)
			return self.dt:irange(value, 1, 8796093020000)
		end
		function data_limit:set(value)
			local old_val = self:table_get(self.config, self.sid, self.api_key)
			if old_val ~= value then
				self:table_set(self.config, self.sid, "wrn_time", "0")
				self:table_set(self.config, self.sid, self.api_key, value)
			end
		end

	local due_reset_time = interfaces:option("due_reset_time")
	due_reset_time.readonly = true
		function due_reset_time:get(value, sid)
			if self:table_get(self.config, sid, "enabled") == "1" then
				local mdc = util.ubus("quota_limit."..self.sid, "status")
				return mdc and mdc.reset_time and tostring(mdc.reset_time)
			end
		end

	local period = interfaces:option("period")
	period.require = {
		day = {"reset_hour"},
		week = {"reset_weekday"},
		month = {"reset_day"}
	}
		function period:validate(value)
			return self.dt:check_array(value, {"day", "week", "month"})
		end
		function period:get(value)
			local num = tonumber(value)
			local vals = {"day", "week", "month"}
			return num and vals[num] or nil
		end
		function period:set(value)
			local vals = {day = "1", week = "2", month = "3"}
			local val = vals[value] or ""
			self:table_set(self.config, self.sid, self.api_key, val)
		end

	local reset_day = interfaces:option("reset_day")
		function reset_day:validate(value)
			local month_days = {}
			for i = 1, 31 do
				month_days[#month_days+1] = tostring(i)
			end
			return self.dt:check_array(value, month_days)
		end

	local reset_hour = interfaces:option("reset_hour")
		function reset_hour:validate(value)
			local hours = {}
			for i = 1, 24 do
				hours[#hours+1] = tostring(i-1)
			end
			return self.dt:check_array(value, hours)
		end

	local reset_weekday = interfaces:option("reset_weekday")
		function reset_weekday:validate(value)
			local weekdays = {}
			for i = 1, 7 do
				weekdays[#weekdays+1] = tostring(i-1)
			end
			return self.dt:check_array(value, weekdays)
		end

	local enable_warning = interfaces:option("enable_warning")
	enable_warning.require = { ["1"] = {"warning_limit", "warning_num"} }
		function enable_warning:validate(value)
			return self.dt:is_bool(value)
		end

	local warning_limit = interfaces:option("warning_limit")
		warning_limit.require = { "data_limit" }
		function warning_limit:validate(value)
			local valid, err = self.dt:uinteger(value)
			if not valid then return false, err end
			local limit = tonumber(self:get_abs_value(self.config, self.sid, "data_limit") or "0")
			if not limit then
				return false, "Incorrect format for provided data limit (data_limit). Value must be a number."
			end
			if tonumber(value) > limit then
				return false, "Value can not be higher than mobile data limit (data_limit) value."
			end
			return true
		end
		function warning_limit:set(value)
			local old_val = self:table_get(self.config, self.sid, self.api_key)
			if old_val ~= value then
				self:table_set(self.config, self.sid, "wrn_time", "0")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local warning_num = interfaces:option("warning_num")
		function warning_num:validate(value)
			return self.dt:phonedigit(value)
		end

	-- /sys/quota is only on TRB5
	if not fs.access("/sys/quota") then
		local enable_rate_limit = interfaces:option("enable_rate_limit")
			enable_rate_limit.require = { ["1"] = {"rate_limit_rx", "rate_limit_tx"} }
			function enable_rate_limit:validate(value)
				return self.dt:is_bool(value)
			end

		local BYTES_TO_KBITS = 1000 / 8
		local rate_limit_rx = interfaces:option("rate_limit_rx")
			function rate_limit_rx:validate(value)
				return self.dt:irange(value, 1, 34359738)
			end
			function rate_limit_rx:get(value)
				local num = tonumber(value)
				if not num then return end
				return tostring(num / BYTES_TO_KBITS)
			end
			function rate_limit_rx:set(value)
				local num = tonumber(value)
				if not num then return end
				self:table_set(self.config, self.sid, self.api_key, tostring(num * BYTES_TO_KBITS))
			end

		local rate_limit_tx = interfaces:option("rate_limit_tx")
			function rate_limit_tx:validate(value)
				return self.dt:irange(value, 1, 34359738)
			end
			function rate_limit_tx:get(value)
				local num = tonumber(value)
				if not num then return end
				return tostring(num / BYTES_TO_KBITS)
			end
			function rate_limit_tx:set(value)
				local num = tonumber(value)
				if not num then return end
				self:table_set(self.config, self.sid, self.api_key, tostring(num * BYTES_TO_KBITS))
			end
	end

function quota_limit:_clear_data_limit(interface)
	local log = require("vuci/log")
	local sim = self.uci:get("network", interface, "sim")
	if interface and sim and tonumber(sim) then
		util.ubus("mdcollect", "clean_db", { iface_name = interface, sim = tonumber(sim) })
		self.uci:set("quota_limit", interface, "wrn_time", "0")
		local t = {table = "events", sender = "Web UI", priority = "notice", text = interface.." interface database cleared" }
		log:insert_eventslog(t)
		util.ubus("quota_limit." .. interface, "reload")
		return true
	else
		return false, "Interface was not found or is currently inactive, data limit can be cleared only if the interface is active."
	end
end

function quota_limit:clear_data_limit()
	local ok, err = self:_clear_data_limit(self.arguments.data.interface)
	self:commit("quota_limit")
	if ok then
		return self:ResponseOK()
	else
		return self:add_critical_error(RES_CODES.QUOTA_LIMIT_ERR, err)
	end
end

function quota_limit:before_response_hook()
	-- Sorts response by SIM name
	if #self.response_table <= 1 then return end
	table.sort(self.response_table, function(a, b)
		if not a or not b or not a.id or not b.id then return false end
		local iface_a, iface_b = self:table_get("network", a.id), self:table_get("network", b.id)
		if not iface_a or not iface_b then return false end
		local a_ok, a_pos = mdm:get_sim_name(iface_a.modem, iface_a.sim)
		local b_ok, b_pos = mdm:get_sim_name(iface_b.modem, iface_b.sim)
		if not a_ok or not b_ok then return false end
		return a_pos < b_pos
	end)
end

local limit_action = quota_limit:action("clear", quota_limit.clear_data_limit)

	local interface = limit_action:option("interface")
		interface.require = true
		function interface:validate(value)
			local ifaces = {}
			self.uci:foreach("network", "interface", function(s)
				if s.proto == "wwan" then
					ifaces[#ifaces+1] = s[".name"]
				end
			end)
			return self.dt:check_array(value, ifaces)
		end

function quota_limit:DELETE_before_section_delete_hook()
	self:table_foreach("quota_limit", "interface", function (s)
		if s[".name"] == self.sid then
			local proto = self:table_get("network", self.sid, "proto")
			if proto == "wwan" then
				self:_clear_data_limit(self.sid)
			end
		end
	end)
end

function quota_limit:adjust_requires()
	enable_warning.require = { ["1"] = {"warning_limit", "warning_num"} }
	if self:get_abs_value(self.config, self.sid, mob_limit_enabled.api_key) ~= "1" then
		-- Disable requires if section disabled
		enable_warning.require = nil
	end
end

function quota_limit:PUT_validate_section_hook()
	self:adjust_requires()
end

function quota_limit:POST_validate_section_hook()
	if not self:table_get("network", self.sid) then
		self:add_error(STD_CODES.INVALID_SECTION, "Data limit configuration name must match a network interface configuration id.", "URL")
		return
	end
	local proto = self:table_get("network", self.sid, "proto")
	if proto ~= "wwan" then
		self:add_error(STD_CODES.INVALID_SECTION, "Data limit configuration can only be created for interface with mobile protocol.", "URL")
	end
	self:adjust_requires()
end

function quota_limit:limit_status(sname)
	local section = self.uci:get_all("quota_limit", sname)
	if section and section[".name"] and section["enabled"] == "1" then
		local mdc = util.ubus("quota_limit."..sname, "status")
		local limit, warning, warning_limit
		if section["data_limit"] then
			limit = section["data_limit"]
			limit = tonumber(limit) * 1048576
		end
		if section["enable_warning"] then
			warning = section["enable_warning"]
		end
		if section["warning_limit"] then
			warning_limit = section["warning_limit"]
			warning_limit = tonumber(warning_limit) * 1048576
		end
		return {
			id = sname,
			interface = util.network_mapper_get(self, sname),
			data_used = mdc and mdc.data_used,
			data_limit = limit,
			due_reset_time = mdc and mdc.reset_time,
			data_warning_enabled = warning,
			data_warning_limit = warning_limit,
			enabled = "1"
		}
	else
		return {
			id = sname,
			interface = util.network_mapper_get(self, sname),
			enabled = "0"
		}
	end
end

function quota_limit:mobile_proto(id)
	local intf = self:table_get("network", id)
	return intf and intf["proto"] and intf["proto"] == "wwan"
end

function quota_limit:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function quota_limit:GET_TYPE_status()
	local function valid_id(id)
		return self:table_get("quota_limit", id) and self:mobile_proto(id)
	end

	if self._single then
		if not valid_id(self.sid) then
			return self:ResponseNotFound(string.format("Configuration %s not found", self.sid))
		end
		return self:ResponseOK(self:limit_status(self.sid))
	else
		local statuses = {}
		self:table_foreach("quota_limit", "interface", function(s)
			if valid_id(s[".name"]) then
				local status = self:limit_status(s[".name"])
				if status then
					table.insert(statuses, status)
				end
			end
		end)
		return self:ResponseOK(statuses)
	end
end

return quota_limit
