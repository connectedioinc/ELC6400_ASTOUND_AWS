local md = require("vuci.modem")
if md:modem_count() == 0 then return nil end
local uci = require("vuci.uci")
local uci_lib = require("uci").cursor()
local util = require("vuci.util")
local ubus = util.ubus
local board = require("vuci.board")
local nixio = require "nixio"

local CFG = {
	FAKE_CFG = "esim_profiles",
	FAKE_SECTION = "profile"
}

---@enum MAIN_OPTIONS
local MAIN_OPTIONS = {
	MODEM = "modem",
	PROVIDER = "provider",
	ENABLED = "enabled",
	PROFILE_SET = "profile_set",
	NAME = "name",
	SIM = "sim",
	BOOTSTRAP = "bootstrap"
}

---@enum LPAC_ERROR
local LPAC_ERROR = {
	NO_CONNECTION = 11
}

local ESIM = (function ()
	local data = {}
	for _, esim_id in ipairs(util.ubus() or {}) do
		if esim_id:match("^esim%..-") then
			local status = ubus(esim_id, "status")
			if type(status) == "table" and status.usb_id then
				data[status.usb_id] = status
				data[status.usb_id].ubus_id = esim_id
				data[status.usb_id].active_sim = status.active_sim or 1
				data[status.usb_id].temporarily_switched = true

				-- Checks if modem has SIM card temporarily switched
				uci_lib:foreach("simcard", "sim", function (s)
					if s.modem ~= status.usb_id then return end
					if s.position ~= tostring(status.active_sim) then return end
					if s.primary == "1" then
						data[status.usb_id].temporarily_switched = false
						return false -- break
					end
				end)
			end
		end
	end
	return data
end)()
local DELETED_SIMCARDS = {}

-- Helper to get simcard cfg id
---@param modem_id string Modem usb_id
---@param position string SIM card position
---@param index number eSIM profile index
---@return string cfg Section id
local function get_cfg_for_id(modem_id, position, index)
	local i = 0
	local cfg
	position = tostring(position)
	uci_lib:foreach("simcard", "sim", function(s)
		if s.modem ~= modem_id then return end
		if s.position ~= position then return end
		if DELETED_SIMCARDS[s[".name"]] then return end
		i = i + 1
		if i == index then
			cfg = s
			return false -- break
		end
	end)
	return cfg
end

-- Gets profile information for all modems
---@return table profiles Profile data
local function get_all_profiles()
	local profiles = {}
	if not board:has_esim() then return profiles end
	for usb_id, data in pairs(ESIM) do
		for i, profile in ipairs(data.profiles) do
			local cfg = get_cfg_for_id(usb_id, data.active_sim, i)
			table.insert(profiles, {
				id = profile.iccid,
				usb_id = usb_id,
				esim_ubus = data.ubus_id,
				enabled = cfg and cfg.primary == "1" and "1" or "0",
				profile_set = profile.enabled and "1" or "0",
				provider = profile.provider,
				name = profile.name,
				simcard_id = cfg and cfg[".name"],
				sim = tostring(profile.sim_slot),
				bootstrap = profile.bootstrap and "1" or "0",
				read_only = profile.sim_slot ~= data.active_sim and "1" or "0"
			})
		end
	end
	return profiles
end

-- Gets all modem status
---@return table status Status for all modems
local function get_all_statuses()
	local status = {}
	if not board:has_esim() then return status end
	for usb_id, data in pairs(ESIM) do
		table.insert(status, {
			id = usb_id,
			eid = data.eid,
			pending_notifications = data.notifications,
			pending_jobs = data.pending_jobs,
			errors = data.errors
		})
	end
	return status
end

-- Removes profile from modem cache
---@param profile table Profile to remove
local function remove_cached_profile(profile)
	if type(profile) ~= "table" then return end
	if not profile.simcard_id or not profile.usb_id then return end
	local modem = ESIM[profile.usb_id]
	if type(modem) ~= "table" then return end
	for i, p in ipairs(modem.profiles) do
		if p.iccid == profile.id then
			DELETED_SIMCARDS[profile.simcard_id] = true
			table.remove(modem.profiles, i)
			return
		end
	end
end

local ConfigService = require("api.ConfigService")
local eSIMService = ConfigService:new({
	create = false
})

local function add_uci_params(t, id, index)
	t[".name"] = id
	t[".index"] = index or 0
	t[".type"] = CFG.FAKE_SECTION
	t[".anonymous"] = false
end

local uci_mod = {}
uci_mod.get = function(self, config, id, option)
	if config ~= CFG.FAKE_CFG then return uci:get(config, id, option) end
	if not config or not id then return end
	for i, profile in ipairs(get_all_profiles()) do
		if profile.id == id then
			add_uci_params(profile, profile.id, i)
			if option then return profile[option] end
			return profile
		end
	end
end
uci_mod.get_all = function (self, config)
	if config ~= CFG.FAKE_CFG then return uci:get_all(config) end
	if not config then return end
	local return_data = {}
	for i, profile in ipairs(get_all_profiles()) do
		add_uci_params(profile, profile.id, i)
		return_data[profile.id] = profile
	end
	return return_data
end
uci_mod.tset = function (self, config, id, values)
	if config ~= CFG.FAKE_CFG then return uci:tset(config, id, values) end
	for opt, value in pairs(values) do
		if opt == MAIN_OPTIONS.NAME then
			local usb_id = eSIMService:table_get(CFG.FAKE_CFG, id, "usb_id")
			if not usb_id then return false, "Failed to get modem id." end
			local ok = ubus(ESIM[usb_id].ubus_id, "rename", { iccid = id, name = value })
			if not ok then
				return false, ("Failed to update configuration for %s profile."):format(id)
			end
		elseif opt == MAIN_OPTIONS.ENABLED then
			local simcard_id = eSIMService:table_get(CFG.FAKE_CFG, id, "simcard_id")
			if not simcard_id then return false, "Failed to get SIM card id." end

			local modem = eSIMService:table_get(CFG.FAKE_CFG, id, "usb_id")
			if not modem then return false, "Failed to get modem." end

			if value == "1" then
				uci_lib:set("simcard", simcard_id, "primary", "1")
				uci_lib:foreach("simcard", "sim", function (s)
					if s[".name"] == simcard_id then return end
					if s.modem ~= modem then return end
					uci_lib:delete("simcard", s[".name"], "primary")
				end)
			else
				uci_lib:delete("simcard", simcard_id, "primary")
			end
			uci_lib:commit("simcard")
			eSIMService.PENDING_SIMCARD_EVENT = true
		end
	end
	return true
end
uci_mod.commit = function (self, config)
	if config ~= CFG.FAKE_CFG then return uci:commit(config) end
end
uci_mod.delete = function (self, config, id)
	if config ~= CFG.FAKE_CFG then return uci:delete(config, id) end
	for _, profile in ipairs(get_all_profiles()) do
		if profile.id == id and profile.esim_ubus then
			remove_cached_profile(profile)
			local ok = ubus(profile.esim_ubus, "delete", { iccid = id }, 300)
			if ok and ok.status == 0 then
				eSIMService:handle_next_primary(profile.usb_id, profile.sim)
				return true
			end
			return false
		end
	end
	return false
end

eSIMService.t_func.uci = setmetatable(uci_mod, { __index = uci })
eSIMService.uci = eSIMService.t_func.uci

function eSIMService:STATUS_sid_exists() return true end
function eSIMService:GET_TYPE_status()
	local status = get_all_statuses()
	if not self.sid then return self:ResponseOK(status) end
	for _, p in ipairs(status) do
		if p.id == self.sid then
			return self:ResponseOK(p)
		end
	end
	return self:add_critical_error(
		STD_CODES.INVALID_SECTION,
		("Section: %s for service does not exist"):format(self.sid),
		"UCI",
		HTTP_STATUS_CODES.NOT_FOUND
	)
end

function eSIMService:GET_commit()
	-- Override so it wont commit on GET.
end

local function change_primary_sim(self, modem, name)
	uci_lib:foreach("simcard", "sim", function (s)
		if s.modem ~= modem then return end
		if s[".name"] == name then
			uci_lib:set("simcard", s[".name"], "primary", "1")
		else
			uci_lib:delete("simcard", s[".name"], "primary")
		end
	end)
	uci_lib:commit("simcard")
	self.PENDING_SIMCARD_EVENT = true
end

-- on all disable -> switch to other sim
-- on one disable -> switch to esim profile if available or to other sim
function eSIMService:handle_next_primary(modem, position)
	if not modem then return end
	-- Skip if SIM is temporarily switched
	if self.request_method == "DELETE" and ESIM[modem] and ESIM[modem].temporarily_switched then return end

	self:populate_configs()
	position = tostring(position)

	local all_disabled = true
	local next_profile
	self:table_foreach(CFG.FAKE_CFG, CFG.FAKE_SECTION, function (s)
		if s.usb_id ~= modem then return end
		if s.sim ~= position then return end
		if s.read_only == "1" then return end
		if self:get_abs_value(CFG.FAKE_CFG, s[".name"], MAIN_OPTIONS.ENABLED) == "1" then
			all_disabled = false
			return false -- break
		end
		next_profile = next_profile or s
	end)

	if all_disabled then
		if next_profile then
			uci_mod:tset(CFG.FAKE_CFG, next_profile[".name"], { [MAIN_OPTIONS.ENABLED] = "1" })
			return
		end

		local params = self.query_parameters
		if self.request_method ~= "DELETE" or (params and params.skip_switch == "1") then
			return -- Skip SIM switch for non DELETE operations or if requested
		end

		local next_sim
		uci_lib:foreach("simcard", "sim", function (s)
			if s.modem ~= modem then return end
			if s.position == position then return end
			next_sim = s
			return false -- break
		end)
		-- Set next SIM as primary
		if next_sim then
			change_primary_sim(self, modem, next_sim[".name"])
		end
	end
end

local function handle_primary_before_commit(self)
	for info in md:info_iterator() do
		self:handle_next_primary(info.usb_id, info.cache.sim)
	end
end

local function send_config_event(self)
	if self.PENDING_SIMCARD_EVENT then
		util.ubus("service", "event", { type = "config.change", data = { package = "simcard" }})
	end
end

function eSIMService:DELETE_validate_section_hook()
	if self:table_get(CFG.FAKE_CFG, self.sid, MAIN_OPTIONS.BOOTSTRAP) == "1" then
		return self:add_critical_error(
			STD_CODES.NO_DELETE,
			"Bootstrap profiles cannot be deleted."
		)
	end
end

eSIMService.PUT_before_commit_hook = handle_primary_before_commit
eSIMService.PUT_after_commit_hook = send_config_event
eSIMService.DELETE_after_commit_hook = send_config_event

local eSIM = eSIMService:section(CFG.FAKE_CFG, CFG.FAKE_SECTION)
	local opt_modem = eSIM:option(MAIN_OPTIONS.MODEM)
		opt_modem.readonly = true
		function opt_modem:get()
			return self:table_get(self.config, self.sid, "usb_id")
		end

	local opt_provider = eSIM:option(MAIN_OPTIONS.PROVIDER)
		opt_provider.readonly = true

	local opt_profile_set = eSIM:option(MAIN_OPTIONS.PROFILE_SET)
		opt_profile_set.readonly = true

	local opt_enabled = eSIM:option(MAIN_OPTIONS.ENABLED)
		function opt_enabled:validate(value)
			if self:table_get(self.config, self.sid, "read_only") == "1" then
				return false, "Only active SIM profiles can be enabled."
			end
			return self.dt:is_bool(value)
		end

	local opt_name = eSIM:option(MAIN_OPTIONS.NAME)
		opt_name.maxlength = 64
		function opt_name:validate(value)
			if self:table_get(self.config, self.sid, "read_only") == "1" then
				return false, "Only active SIM profiles can be renamed."
			end
			return self.dt:string(value)
		end

	local opt_sim = eSIM:option(MAIN_OPTIONS.SIM)
		opt_sim.readonly = true

	local opt_bootstrap = eSIM:option(MAIN_OPTIONS.BOOTSTRAP)
		opt_bootstrap.readonly = true

----------------------------------------------------------------------------------------------------

local eSIMDownload = eSIMService:action("download", function (self, data)
	local esim_data = ESIM[data.modem]
	local esim_ubus = esim_data and esim_data.ubus_id
	if not esim_ubus then
		return self:add_critical_error(
			STD_CODES.CONF_ERROR,
			("Failed to select modem with id: %s"):format(data.modem)
		)
	end
	if data.activation_code:match("%$1$") and not data.confirmation_code then
		return self:add_critical_error(
			STD_CODES.INVALID_OPT,
			"Confirmation code is required for this activation code."
		)
	end

	-- Switch to eSIM if requested and currently inactive
	local params = self.query_parameters
	if params and params.switch_sim == "1" and esim_data["eid"] == "N/A" then
		-- Find eSIM config name
		local cfg_name
		uci_lib:foreach("simcard", "sim", function(s)
			if s.modem ~= data.modem then return end
			local esim = s.esim_profile or md:is_card_esim(s.modem, s.position)
			if esim then
				cfg_name = s[".name"]
				return false -- break
			end
		end)

		-- Make eSIM as primary
		if cfg_name then
			change_primary_sim(self, data.modem, cfg_name)
			send_config_event(self)
		end

		-- Check if eSIM is active
		local timeout = os.time() + 20 -- Timeout set to 20 seconds
		while os.time() < timeout do
			local status = ubus(esim_ubus, "status")
			if status then
				esim_data = status
			end
			if esim_data and esim_data.eid and esim_data.eid ~= "N/A" then
				break
			end
			nixio.nanosleep(1)
		end
	end

	local ok, err = ubus(esim_ubus, "download", {
		code = data.activation_code,
		confirmation = data.confirmation_code,
		name = data.name,
		async = true
	})
	if not ok then
		return self:add_critical_error(
			err or STD_CODES.CODE_ERROR,
			("Failed to start profile download.")
		)
	end
	return self:ResponseOK({id = tostring(ok.id or 0)})
end)

	local opt1_modem = eSIMDownload:option("modem")
		opt1_modem.require = true
		function opt1_modem:validate(value)
			return self.dt:check_modem(value)
		end

	local opt1_activation_code = eSIMDownload:option("activation_code")
		opt1_activation_code.require = true
		function opt1_activation_code:validate(value)
			return self.dt:fieldvalidation(value:gsub("^LPA:%s*", ""), "^%d$[^$]+$.*$")
		end

	local opt1_confirmation_code = eSIMDownload:option("confirmation_code")
		function opt1_confirmation_code:validate(value)
			return self.dt:string(value)
		end

	local opt1_name = eSIMDownload:option("name")
		opt1_name.maxlength = 64
		function opt1_name:validate(value)
			return self.dt:string(value)
		end

----------------------------------------------------------------------------------------------------

local eSIMNotif = eSIMService:action("process_notifications", function (self, data)
	local esim_ubus = ESIM[data.modem] and ESIM[data.modem].ubus_id
	if not esim_ubus then
		return self:add_critical_error(STD_CODES.CONF_ERROR,
			("Failed to select modem with id: %s"):format(data.modem))
	end
	local ok, err = ubus(esim_ubus, "process_notifications")
	if type(ok) ~= "table" or not ok.status then
		return self:add_critical_error(err or STD_CODES.CODE_ERROR,
			"Failed to process notifications.")
	end
	if ok.status == 0 then return self:ResponseOK() end
	if ok.status == 6 and type(ok.response) == "table" and ok.response.result == LPAC_ERROR.NO_CONNECTION then
		return self:add_critical_error(LPAC_ERROR.NO_CONNECTION, "Connection failed.")
	end
	return self:add_critical_error(ok.status, "Failed to process notifications.")
end)

	local opt2_modem = eSIMNotif:option("modem")
		opt2_modem.require = true
		function opt2_modem:validate(value)
			return self.dt:check_modem(value)
		end

----------------------------------------------------------------------------------------------------

local eSIMClearErrors = eSIMService:action("clear_errors", function (self, data)
	local esim_ubus = ESIM[data.modem] and ESIM[data.modem].ubus_id
	if not esim_ubus then
		return self:add_critical_error(STD_CODES.CONF_ERROR,
			("Failed to select modem with id: %s"):format(data.modem))
	end
	local _, err = ubus(esim_ubus, "clear_errors", {id = tonumber(data.id)})
	if err then
		return self:add_critical_error(err or STD_CODES.CODE_ERROR,
			"Failed to clear errors.")
	end
	return self:ResponseOK()
end)

	local opt3_modem = eSIMClearErrors:option("modem")
		opt3_modem.require = true
		function opt3_modem:validate(value)
			return self.dt:check_modem(value)
		end

	local opt3_id = eSIMClearErrors:option("id")
		function opt3_id:validate(value)
			return self.dt:irange(value, 1, 4294967295)
		end

----------------------------------------------------------------------------------------------------

return eSIMService