local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local md = require "vuci.modem"
local fs = require("nixio.fs")
local pac = require("vuci.package_checker")

if md:modem_count() == 0 then
	return nil
end

local sim_cards = ConfigService:new({ create = false, delete = false })
sim_cards.modem_list = md:get_all_modems()

-- Services that band options support
sim_cards.services = {
	gsm = {"2g", "3g_pref", "lte_pref", "nr5g_pref"},
	umts = {"3g", "3g_pref", "lte_pref", "nr5g_pref"},
	lte = {"lte", "lte_pref", "nr5g_pref"},
	nr5g = {"nr5g_pref"}
}
sim_cards.services.lte_nb = sim_cards.services.lte

local function nr5g_supported(self)
	return self.modem_bands["5G_NSA"] or self.modem_bands["5G_SA"]
end

function sim_cards:parent_exists()
	if self.binding then
		for modem in md:info_iterator() do
			if modem.usb_id == self.binding then
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

function sim_cards:get_modem(sid, binding)
	local modem_id = binding or self:table_get("simcard", sid, "modem")
	for _, modem in ipairs(self.modem_list) do
		if modem.id == modem_id then
			return modem
		end
	end
end

function sim_cards:load_bands()
	self.modem = self:get_modem(self.sid, self.binding)
	self.modem_bands = {}
	self.modem_band_count = 0
	if self.modem then
		self.modem_bands, self.modem_band_count = md:get_bands(self.modem.id)
		for _, bands in pairs(self.modem_bands) do
			table.insert(bands, "all")
		end
	end
end

function sim_cards:GET_section_init_hook()
	self:load_bands()
end

function sim_cards:PUT_section_init_hook()
	self:load_bands()
end

function sim_cards:before_response_hook()
	-- Sorts response by SIM name
	if #self.response_table <= 1 then return end
	table.sort(self.response_table, function(a, b)
		if not a or not b then return false end
		local a_ok, a_pos = md:get_sim_name(a.modem, a.position)
		local b_ok, b_pos = md:get_sim_name(b.modem, b.position)
		if not a_ok or not b_ok then return false end
		if a.esim_profile then
			a_pos = (a_pos * 100) + (tonumber(a.esim_profile) or 1)
		end
		if b.esim_profile then
			b_pos = (b_pos * 100) + (tonumber(b.esim_profile) or 1)
		end
		return a_pos < b_pos
	end)
end

function sim_cards:update_sms_limit()
	local enable_sms_limit = self:get_abs_value(self.config, self.sid, "enable_sms_limit")
	if enable_sms_limit == "1" then
		local modem = self:get_abs_value(self.config, self.sid, "modem")
		local sim = self:get_abs_value(self.config, self.sid, "position")
		local esim = self:get_abs_value(self.config, self.sid, "esim_profile")
		if modem and sim then
			self:table_delete(self.config, self.sid, "reset_time")
			md:get_sms_limit_due(modem, sim, esim) -- Triggers SMS limit reset_time update
		end
	end
end

function sim_cards:handle_overrides()
	local opermode = self:get_abs_value(self.config, self.sid, "opermode")
	if opermode and self.current_data_block.operlist ~= "0" then
		self:table_set(self.config, self.sid, "operlist", "1")
		return
	end

	local opernum = self:get_abs_value(self.config, self.sid, "opernum")
	if not opernum then
		self:table_set(self.config, self.sid, "operator", "auto")
		self:table_delete(self.config, self.sid, "opermode")
		self:table_delete(self.config, self.sid, "operlist")
		self:table_delete(self.config, self.sid, "operlist_name")
	end
end

function sim_cards:PUT_after_data_hook()
	self:handle_overrides()
	self:update_sms_limit()
	-- Disable nr5g sa if not supported
	if md:nr5g_sa_disabled(self.modem.id) then
		self:table_delete(self.config, self.sid, "sa_nr5g")
	end
end

function sim_cards:PUT_validate_section_hook()
	-- custom option require logic
	local service = self:get_abs_value("simcard", self.sid, "service")
	service = (not service or service == "") and "auto" or service
	local band = self:get_abs_value("simcard", self.sid, "band")
	band = (not band or band == "") and "auto" or band

	local modem = self:table_get(self.config, self.sid, "modem")
	local modem_low_power = md:get_mode(modem) == md.modes.LOW_POWER

	local cat_lte
	if modem_low_power then
		local cat = self:get_abs_value("simcard", self.sid, "category_lte")
		cat_lte = (not cat or cat == "") and "m1_nb" or cat
	end

	local band_data = {
		gsm = self:get_abs_value("simcard", self.sid, "gsm"),
		umts = self:get_abs_value("simcard", self.sid, "umts"),
		lte = self:get_abs_value("simcard", self.sid, "lte"),
		lte_nb = self:get_abs_value("simcard", self.sid, "lte_nb"),
		nr5g = self.current_data_block["nr5g"] or self:table_get("simcard", self.sid, "nsa_nr5g"),
		nr5g_sa = self.current_data_block["nr5g_sa"] or self:table_get("simcard", self.sid, "sa_nr5g"),
	}

	local function arr_is_empty(arr)
		if type(arr) ~= "table" then return true end
		for _, v in ipairs(arr) do
			if v ~= "" then return false end
		end
		return true
	end

	local function has_all_band(bands)
		if type(bands) ~= "table" then return false end
		for _, b in ipairs(bands) do
			if b == "all" then return true end
		end
		return false
	end

	local function add_required_err(api_key)
		self:add_error(
			STD_CODES.INVALID_OPT,
			("%s option is required when band is manual and service is any of [%s]"):format(api_key, table.concat(self.services[api_key], ", ")),
			api_key
		)
	end

	if self.modem_band_count == 0 then
		return
	end

	for b, data in pairs(band_data) do
		if has_all_band(data) and #data > 1 then
			self:add_error(STD_CODES.INVALID_OPT, "Can not set other band values with 'all'", b)
		end
	end

	if band == "manual" then
		for b, api_key in pairs({
			["2G"] = "gsm",
			["3G"] = "umts",
			["4G"] = "lte",
			["5G_NSA"] = "nr5g",
			["5G_SA"] = "nr5g_sa",
		}) do
			if self.modem_bands[b] and (service == "auto" or util.contains(self.services[api_key], service)) then
				if modem_low_power and b == "4G" then
					if cat_lte ~= "nb" and arr_is_empty(band_data[api_key]) then
						add_required_err(api_key)
					end
					if cat_lte ~= "m1" and arr_is_empty(band_data.lte_nb) then
						add_required_err("lte_nb")
					end
				elseif b == "2G" and arr_is_empty(band_data[api_key]) then
					if not md:get_auto_2g_bands(modem) then
						add_required_err(api_key)
					end
				elseif b == "3G" and arr_is_empty(band_data[api_key]) then
					if not md:get_auto_3g_bands(modem) then
						add_required_err(api_key)
					end
				else
					if arr_is_empty(band_data[api_key]) then
						add_required_err(api_key)
					end
				end
			end
		end
	end
end

function sim_cards:validate_low_power()
	local m = self:table_get(self.config, self.sid, "modem")
	if m and md:get_mode(m) == md.modes.LOW_POWER then
		return false, "Option is not supported on low power modems"
	end
	return true
end

--- Returns available service modes
---@return table services Table with supported service modes
function sim_cards:available_services()
	local services = {}
	for _, m in ipairs({
		{"2G", "2g"},
		{"3G", "3g"},
		{"4G", "lte"}
	}) do
		local band, mapped_band = unpack(m)
		if self.modem_bands[band] then
			table.insert(services, mapped_band)
			if #services > 1 then
				table.insert(services, mapped_band .. "_pref")
			end
		end
	end
	if nr5g_supported(self) then
		table.insert(services, "nr5g_pref")
	end
	return services
end

---Helper to override default return value if nothing in the config is set
---@param options table Table with options as keys and default values
local function add_default_returns(self, options)
	for o, v in pairs(options) do
		o.get = function(opt, value, sid)
			if value then return value end
			if type(v) == "function" then return v(self) end
			return v
		end
	end
end

local function adjust_esim_index(value)
	return tonumber(value) and tostring(tonumber(value) + 1) or nil
end

local s = sim_cards:section("simcard", "sim")
function s:filter(s)
	if not self.modem_id then return true end
	return s.modem == self.modem_id
end

	local modem = s:option("modem")
	modem.readonly = true

	local position = s:option("position")
	position.readonly = true

	local esim_profile = s:option("esim_profile")
	esim_profile.readonly = true
	function esim_profile:get(value)
		local sim_card = self:table_get(self.config, self.sid)
		if not value and md:is_card_esim(sim_card.modem, sim_card.position) then
			return "1"
		end
		return adjust_esim_index(value)
	end

	local primary = s:option("primary")
		function primary:validate(value) return self.dt:is_bool(value) end
		local function enable_next_sim(self)
			local modem_id = self:get_abs_value(self.config, self.sid, "modem")
			local next_sim, first_sim
			local passed_self = false

			-- Find next sim after self
			self:table_foreach(self.config, "sim", function(s)
				if s.modem ~= modem_id then return end
				first_sim = first_sim or s
				if passed_self then
					next_sim = s
					return false -- break
				end
				if s[".name"] == self.sid then passed_self = true end
			end)

			next_sim = next_sim or first_sim -- If no next sim, set first sim as next

			if next_sim then
				self:table_set(self.config, next_sim[".name"], "primary", "1")
			end
		end
		function primary:set(value)
			self:table_set("simcard", self.sid, "primary", value)
			if value == "1" then
				self:table_foreach("simcard", "sim", function(s)
					if s.modem == self.modem.id and s[".name"] ~= self.sid then
						self:table_delete("simcard", s[".name"], "primary")
					end
				end)
			else
				enable_next_sim(self)
			end
		end

	local deny_roaming = s:option("deny_roaming")
		function deny_roaming:validate(value) return self.dt:is_bool(value) end

	local volte = s:option("volte")
		function volte:validate(value)
			local modem_id = self:table_get(self.config, self.sid, modem.api_key)
			if not md:volte_supported(modem_id) then
				return false, "VoLTE is not supported for this modem."
			end
			if not self.modem_bands["4G"] and not nr5g_supported(self) then
				return false, "Only 4G or 5G modems support this option."
			end
			return self.dt:check_array(value, {"auto", "on", "off"})
		end
		function volte:get(value)
			local modem_id = self:table_get(self.config, self.sid, modem.api_key)
			return md:volte_supported(modem_id) and value or nil
		end

	local service = s:option("service")
		function service:validate(value)
			if self.modem_band_count == 0 then return false, "This modem does not support service mode selection." end
			return self.dt:check_array(value, self:available_services())
		end

	local category_lte = s:option("category_lte")
		function category_lte:validate(value)
			if md:get_mode(self.modem.id) ~= md.modes.LOW_POWER then
				return false, "This option is unavailable for this type of modem"
			end
			return self.dt:check_array(value, {"m1", "nb", "m1_nb"})
		end

	local nr5g_mode = s:option("nr5g_mode")
		function nr5g_mode:validate(value)
			if not nr5g_supported(self) or md:auto_5g_mode(self.modem.id) then
				return false, "This modem does not support nr5g mode selection."
			end
			local modes = {}
			if self.modem_bands["5G_NSA"] then table.insert(modes, "nsa") end
			if self.modem_bands["5G_SA"] and not md:nr5g_sa_disabled(self.modem.id) then table.insert(modes, "sa") end
			if #modes > 1 then table.insert(modes, "auto") end
			return self.dt:check_array(value, modes)
		end

	local pincode = s:option("pincode", { sensitive = true })
		function pincode:validate(value) return self.dt:pincode(value) end
		function pincode:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			local sim = self:table_get(self.config, self.sid, position.api_key)
			if sim then md:set_mnf_pin(self.modem.id, sim, value) end
		end

	local pukcode = s:option("pukcode")
		function pukcode:validate(value)
			local pin = self:get_abs_value(self.config, self.sid, "pincode")
			if not pin then
				return false, "PIN is required when setting a PUK"
			end
			return self.dt:pukcode(value)
		end

	local band = s:option("band")
		function band:validate(value)
			if self.modem_band_count == 0 then return false, "This modem does not support service mode selection." end
			return self.dt:check_array(value, {"auto", "manual"})
		end

	local validate_service_band = function (self, validate_table)
		local svc = self:get_abs_value(self.config, self.sid, "service")
		svc = (not svc or svc == "") and "auto" or svc
		if svc == "auto" then return true end
		if util.contains(validate_table, svc) then return true end
		return false, ("Service needs to be set to any of [%s] to use %s bands."):format(table.concat(validate_table, ", "), self.api_key)
	end

	local gsm = s:option("gsm", { list = true })
		function gsm:validate(value)
			if self.modem_band_count == 0 then return false, "This modem does not support service mode selection." end
			if not self.modem_bands["2G"] or md:get_auto_2g_bands(self.modem.id) then
				return false, "This modem does not support gsm band selection."
			end
			local ok, err = validate_service_band(self, self.services.gsm)
			if not ok then return ok, err end
			return self.dt:check_array(value, self.modem_bands["2G"])
		end

	local umts = s:option("umts", { list = true })
		function umts:validate(value)
			if self.modem_band_count == 0 then return false, "This modem does not support service mode selection." end
			if not self.modem_bands["3G"] or md:get_auto_3g_bands(self.modem.id) then
				return false, "This modem does not support umts band selection."
			end
			local ok, err = validate_service_band(self, self.services.umts)
			if not ok then return ok, err end
			return self.dt:check_array(value, self.modem_bands["3G"])
		end

	local lte = s:option("lte", { list = true })
		function lte:validate(value)
			if self.modem_band_count == 0 then return false, "This modem does not support service mode selection." end
			if not self.modem_bands["4G"] then
				return false, "This modem does not support lte band selection."
			end
			local ok, err = validate_service_band(self, self.services.lte)
			if not ok then return ok, err end
			return self.dt:check_array(value, self.modem_bands["4G"])
		end

	local lte_nb = s:option("lte_nb", { list = true })
		function lte_nb:validate(value)
			if self.modem_band_count == 0 then return false, "This modem does not support service mode selection." end
			if not self.modem_bands["NB"] then
				return false, "This modem does not support lte narrowband selection."
			end
			local ok, err = validate_service_band(self, self.services.lte_nb)
			if not ok then return ok, err end
			return self.dt:check_array(value, self.modem_bands["NB"])
		end

	local nr5g = s:option("nr5g", { list = true })
		function nr5g:validate(value)
			if self.modem_band_count == 0 then return false, "This modem does not support service mode selection." end
			if not self.modem_bands["5G_NSA"] then
				return false, "This modem does not support 5G NSA band selection."
			end
			local ok, err = validate_service_band(self, self.services.nr5g)
			if not ok then return ok, err end

			local values = {"all"} -- To plain array
			for _, v in pairs(self.modem_bands["5G_NSA"]) do
				table.insert(values, v:match("^nsa_5g_n(%d+)$"))
			end
			return self.dt:check_array(value, values)
		end
		function nr5g:set(value)
			local nsa_nr5g = {}
			for _, v in pairs(value) do
				if v == "all" then
					nsa_nr5g = {"all"}
					break
				end
				table.insert(nsa_nr5g, "nsa_5g_n"..v)
			end
			self:table_set(self.config, self.sid, "nsa_nr5g", nsa_nr5g)
		end
		function nr5g:get()
			local value = self:table_get(self.config, self.sid, "nsa_nr5g")
			local formated = {}
			if type(value) == "table" then
				for _, v in ipairs(value) do
					if v == "all" then return {"all"} end
					table.insert(formated, v:match("^nsa_5g_n(%d+)$"))
				end
			end
			return #formated > 0 and formated or nil
		end

	local nr5g_sa = s:option("nr5g_sa", { list = true })
		function nr5g_sa:validate(value)
			if self.modem_band_count == 0 then return false, "This modem does not support service mode selection." end
			if not self.modem_bands["5G_SA"] then
				return false, "This modem does not support 5G SA band selection."
			end
			local ok, err = validate_service_band(self, self.services.nr5g)
			if not ok then return ok, err end

			local values = {"all"} -- To plain array
			for _, v in pairs(self.modem_bands["5G_SA"]) do
				table.insert(values, v:match("^5g_n(%d+)$"))
			end
			return self.dt:check_array(value, values)
		end
		function nr5g_sa:set(value)
			local sa_nr5g = {}
			for _, v in pairs(value) do
				if v == "all" then
					sa_nr5g = {"all"}
					break
				end
				table.insert(sa_nr5g, "5g_n"..v)
			end
			self:table_set(self.config, self.sid, "sa_nr5g", sa_nr5g)
		end
		function nr5g_sa:get()
			local value = self:table_get(self.config, self.sid, "sa_nr5g")
			local formated = {}
			if type(value) == "table" then
				for _, v in ipairs(value) do
					if v == "all" then return {"all"} end
					table.insert(formated, v:match("^5g_n(%d+)$"))
				end
			end
			return #formated > 0 and formated or nil
		end

	local signal_reset_enabled = s:option("signal_reset_enabled")
		signal_reset_enabled.require = { ["1"] = {"signal_reset_threshold", "signal_reset_timeout"} }
		function signal_reset_enabled:validate(value)
			local modem_id = self:table_get(self.config, self.sid, modem.api_key)
			if not md:low_signal_reconnect_supported(modem_id) then
				return false, "This modem does not support low signal reconnect."
			end
			return self.dt:is_bool(value)
		end

	local signal_reset_threshold = s:option("signal_reset_threshold")
		function signal_reset_threshold:validate(value)
			local modem_id = self:table_get(self.config, self.sid, modem.api_key)
			if not md:low_signal_reconnect_supported(modem_id) then
				return false, "This modem does not support low signal reconnect."
			end
			local ok, err = self.dt:integer(value)
			if not ok then return ok, err end
			return self.dt:range(value, -120, -50)
		end

	local signal_reset_timeout = s:option("signal_reset_timeout")
		function signal_reset_timeout:validate(value)
			local modem_id = self:table_get(self.config, self.sid, modem.api_key)
			if not md:low_signal_reconnect_supported(modem_id) then
				return false, "This modem does not support low signal reconnect."
			end
			local ok, err = self.dt:integer(value)
			if not ok then return ok, err end
			return self.dt:range(value, 15, 65535)
		end

	local operlist = s:option("operlist")
		function operlist:validate(value)
			local ok, err = self:validate_low_power()
			if not ok then return ok, err end
			return self.dt:is_bool(value)
		end

	local operlist_name = s:option("operlist_name")
		function operlist_name:validate(value)
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

	local opermode = s:option("opermode")
		opermode.require = { "operlist_name" }
		function opermode:validate(value)
			local ok, err = self:validate_low_power()
			if not ok then return ok, err end
			return self.dt:check_array(value, {"whitelist", "blacklist"})
		end

	local enable_sms_limit = s:option("enable_sms_limit")
		enable_sms_limit.require = { ["1"] = {"sms_limit_num", "sms_limit", "period"} }
		function enable_sms_limit:validate(value)
			-- Skip on same value
			if value == (self:table_get(self.config, self.sid, self.api_key) or "0") then return true end

			if value == "0" and pac.is_installed("sim_switch") then
				local limit = self:table_get(self.config, self.sid)
				if limit and limit.modem then
					local ok = true
					self:table_foreach("sim_switch", "sim", function (s)
						if s.modem ~= limit.modem then return end
						if s.position ~= (limit.position or "1") then return end
						if s.sms_limit ~= "1" then return end
						if s.enabled ~= "1" then return end
						if s.esim_profile == limit.esim_profile then
							ok = false
							return false -- break
						end
					end)
					return ok, "Could not disable SMS limit. SIM Switch configuration is active."
				end
			end
			return self.dt:is_bool(value)
		end
		function enable_sms_limit:set(value)
			self:table_foreach("overview", "overview", function(s)
				if s.section_name == self.sid then
					self:table_set("overview", s[".name"], "enabled", value)
					return false -- break
				end
			end)
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local sms_limit_num = s:option("sms_limit_num")
		function sms_limit_num:validate(value) return self.dt:irange(value, 1, 2147483647) end

	local sms_limit = s:option("sms_limit")
		function sms_limit:validate(value) return self.dt:check_array(value, {"day", "week", "month"}) end

	local period = s:option("period")
		function period:validate(value)
			local sms_limit = self:get_abs_value("simcard", self.sid, "sms_limit")
			local values = {}
			if sms_limit == "day" then
				for i = 1, 24 do
					values[#values+1] = tostring(i-1)
				end
			elseif sms_limit == "week" then
				for i = 1, 7 do
					values[#values+1] = tostring(i-1)
				end
			elseif sms_limit == "month" then
				for i = 1, 31 do
					values[#values+1] = tostring(i)
				end
			end
			return self.dt:check_array(value, values)
		end

	local operator = s:option("operator")
		function operator:validate(value)
			return self.dt:check_array(value, {"auto", "manual", "manual-auto"})
		end

	local opernum = s:option("opernum")
		opernum.minlength = 5
		opernum.maxlength = 6
		function opernum:validate(value)
			return self.dt:fieldvalidation(value, "^[0-9]+$")
		end

function sim_cards:get_sim_status(sname)
	local section = self.uci:get_all("simcard", sname) or {}
	if not section.modem or not section.position then return end

	local base_profile = section.esim_profile
	if not section.esim_profile and md:is_card_esim(section.modem, section.position) then
		section.esim_profile = "1"
	else
		section.esim_profile = adjust_esim_index(section.esim_profile)
	end

	local data = {
		section_name = section[".name"],
		deny_roaming = section.deny_roaming,
		sim = section.position,
		modem = section.modem,
		esim_profile = section.esim_profile,
		primary = section.primary,
		sms_limit_enabled = "0",
		sms_limit_period = section.sms_limit,
		pin_lock_enabled = md:get_pin_lock(section.modem) == md.PIN_LOCK.LOCKED and "1" or "0"
	}

	if section.enable_sms_limit == "1" then
		local sms_limit_max, sms_limit_current = md:get_sms_limit_count(section.modem, section.position, base_profile)
		if not sms_limit_max then return data end
		data.sms_limit_enabled = "1"
		data.sms_sent = tostring(sms_limit_current)
		data.sms_limit = tostring(sms_limit_max)
		data.sms_due_reset_time = md:get_sms_limit_due(section.modem, section.position, base_profile) or nil
	end
	return data
end

function sim_cards:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function sim_cards:GET_TYPE_status()
	if self.sid then
		local data = self:get_sim_status(self.sid)
		if not data then return self:add_critical_error(STD_CODES.INVALID_SECTION, "SIM card section not found.", "URL", "404") end
		return self:ResponseOK(data)
	else
		local data = {}
		self.uci:foreach("simcard", "sim", function(s)
			data[#data+1] = self:get_sim_status(s[".name"])
		end)
		if #data > 1 then
			table.sort(data, function(a, b)
				if not a or not b then return false end
				local a_ok, a_pos = md:get_sim_name(a.modem, a.position)
				local b_ok, b_pos = md:get_sim_name(b.modem, b.position)
				if not a_ok or not b_ok then return false end
				return a_pos < b_pos
			end)
		end
		return self:ResponseOK(data)
	end
end

function sim_cards:PUT_validate_section_hook()
	if not self:validate_low_power() then return end
	local op_num = self.current_data_block[opernum.api_key]
	if op_num and op_num ~= "" then
		self.current_data_block[opermode.api_key] = ""
	end

	local op_mode = self:get_abs_value(self.config, self.sid, opermode.api_key)
	if op_mode then
		self.current_data_block[opernum.api_key] = ""
	else
		-- Need operator number on single mode
		if (self:get_abs_value(self.config, self.sid, operator.api_key) or "auto") ~= "auto" and
			not self:get_abs_value(self.config, self.sid, opernum.api_key)
		then
			self:add_error(STD_CODES.INVALID_OPT,
				("Missing required option: %s"):format(opernum.api_key), opernum.api_key)
		end
	end
end

add_default_returns(sim_cards, {
	[band] = function (self)
		if self.modem_band_count > 0 then
			return "auto"
		end
	end,
	[nr5g_mode] = function (self)
		if nr5g_supported(self) and not md:auto_5g_mode(self.modem.id) then
			return "auto"
		end
	end,
	[service] = function (self)
		local svc = self:available_services()
		return svc[#svc]
	end,
	[deny_roaming] = "0",
	[signal_reset_enabled] = function (self)
		local modem_id = self:table_get(self.config, self.sid, modem.api_key)
		if md:low_signal_reconnect_supported(modem_id) then return "0" end
	end,
	[enable_sms_limit] = "0",
	[operlist] = function (self)
		if self:validate_low_power() then return "0" end
	end,
	[primary] = function (self)
		if #self.modem_list > 0 then return "0" end
	end
})

return sim_cards
