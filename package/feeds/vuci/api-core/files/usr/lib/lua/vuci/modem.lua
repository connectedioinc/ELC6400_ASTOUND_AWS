local util = require("vuci.util")
local board = require("vuci.board")
local modem_board = board:get_modem_info()
local router_name = board:get_family_name()

local NO_VALUE = "N/A"
local APN_DB_FILE = "/tmp/apn.db"

local Modem = {}
Modem.NO_VALUE = NO_VALUE

-- Meta for Modem.info[usb_id]
Modem.info = setmetatable({}, {
	__index = function (_, k)
		if type(k) == "nil" then k = rawget(Modem, "mdm_id") end
		return k and Modem:get_info(k) or {}
	end
})

-- Meta for Modem.cache[usb_id]
Modem.cache = setmetatable({}, {
	__index = function (_, k)
		if type(k) == "nil" then k = rawget(Modem, "mdm_id") end
		return k and Modem:get_cache(k) or {}
	end
})

-- Checks the value and if its nil returns "N/A" string
---@param value any Value to check
---@return any new_value Unchanged value or "N/A" string if value was nil
local function NA(value) return type(value) == "nil" and NO_VALUE or value end

-- Checks the value and if its nil returns "N/A" string, else converts to string
---@param value any Value to check
---@return string new_value "N/A" string if value was nil, else tostring(value)
local function STR_NA(value) return type(value) == "nil" and NO_VALUE or tostring(value) end

Modem.modem_names = {
	"Primary modem",
	"Secondary modem",
	"External modem",
	"Internal modem",
	"Unknown modem"
}

-- Modem functionality mode
---@enum MODEM_MODE
Modem.modes = {
	FULL_MODE = 0, -- Standard modem functionality
	DATA_ONLY = 1, -- Modem without call functionality
	DYNAMIC_MODE = 2, -- Modem has dynamic mode which depends by network
	LOW_POWER = 3, -- Modem without operator scan functionality
}

-- Modem pin states
---@enum PIN_STATE
Modem.PIN_STATE = {
	UNKNOWN = 0,
	OK = 1,
	NOT_READY = 2,
	REQUIRED_PIN = 4,
	REQUIRED_PUK = 5,
	REQUIRED_PH_NET_PIN = 6,
	REQUIRED_PH_NET_PUK = 7,
	REQUIRED_PH_NETSUB_PIN = 8,
	REQUIRED_PH_NETSUB_PUK = 9,
	NOT_INSERTED = 10,
	SIM_FAILURE  = 13,
	SIM_BUSY     = 14,
	PUK_BLOCKED  = 15,
}

-- Modem pin states
---@enum SIM_STATE
Modem.SIM_STATE = {
	INSERTED = 0,
	NOT_INSERTED = 1
}

-- PIN lock states
---@enum PIN_LOCK
Modem.PIN_LOCK = {
	UNLOCKED = 1,
	LOCKED = 2
}

-- Gets nice formated modem name
---@param modem string | table Modem usb_id
---@return string modem_name Modem name
function Modem:get_name(modem)
	local builtin = self:builtin_modems_count()
	local m
	if type(modem) == "string" then
		for info in self:info_iterator() do
			if info.usb_id == modem then m = info end
		end
	elseif type(modem) == "table" then
		m = modem
	end
	if m then
		if not m.builtin then return self.modem_names[3] end
		if m.primary == true and m.builtin == true and builtin > 1 then
			return self.modem_names[1]
		elseif m.primary == false and m.builtin == true and builtin > 1 then
			return self.modem_names[2]
		elseif m.builtin == true then
			return self.modem_names[4]
		end
	end
	return self.modem_names[5]
end

Modem.gsm_ubus_objects = {}
Modem.sim_name_cache = {}

local function cache_sim_name(self, usb_id, sim, name, index, esim)
	self.sim_name_cache[usb_id] = { [sim] = { name = name, index = index, esim = esim }}
	return name, index, esim
end

local function check_sim_name_cache(self, usb_id, sim)
	if not usb_id or not sim then return false end
	if type(self.sim_name_cache[usb_id]) == "table" and self.sim_name_cache[usb_id][sim] then
		return self.sim_name_cache[usb_id][sim].name, self.sim_name_cache[usb_id][sim].index, self.sim_name_cache[usb_id][sim].esim
	end
	return false
end


--- Iterator to iterate over modem info objects
---@return function iterator Function that iterates over modem info objects
function Modem:info_iterator()
	if not self.modem_info_cache then
		self.modem_info_cache = {}
		local ext_index = 1 -- External modem counter
		local online = {}
		local order = {}
		for _, gsm_id in ipairs(util.ubus() or {}) do
			if gsm_id:match("^gsm%..-") then
				local info = util.ubus(gsm_id, "info")
				if info then
					info.id = gsm_id
					online[info.usb_id] = true
					info.offline = false
					if not info.builtin then
						info.index = ext_index
						ext_index = ext_index + 1
					end
					local override = type(info.cache) == "table" and type(info.cache.mbn_settings_override) == "table" and info.cache.mbn_settings_override or {}
					override.disabled_nr5g_sa_mode = info.disabled_nr5g_sa_mode or override.nr5g_sa_disabled or false
					table.insert(self.modem_info_cache, setmetatable(override, { __index = info }))
				end
			end
		end
		for i, m in ipairs(modem_board) do
			if m.id then order[m.id] = i end
			if m.id and not online[m.id] then
				-- Do not add board.json modem parameters that are identical
				-- this is handled by a metatable
				table.insert(self.modem_info_cache, setmetatable({
					offline = true,
					id = "offline", -- Placeholder
					usb_id = m.id,
					builtin = m.builtin or false,
					primary = m.primary or false,
					name = m.desc,
					cache = { firmware = m.revision }
				}, { __index = m }))
			end
		end

		-- Order modems by board before returning.
		table.sort(self.modem_info_cache, function (a, b)
			if type(a) ~= "table" or type(b) ~= "table" then return false end
			local usb_a, usb_b = a.usb_id, b.usb_id
			if usb_a and usb_b and order[usb_a] and order[usb_b] then
				return order[usb_a] < order[usb_b]
			end
			return false
		end)
	end

	local i = 0
	local m
	return function ()
		i = i + 1
		m = self.modem_info_cache[i]
		return m, m and m.offline == false
	end
end

function Modem:get_modem_id()
	return self.mdm_id
end

function Modem:set_modem_id(modem_id)
	if self.mdm_id == modem_id then return end
	self.mdm_id = modem_id

	if not self.gsm_ubus_objects[modem_id] then
		self.gsm_ubus_objects[modem_id] = "-"
	end
end

function Modem:modem_count()
	if self.count then return self.count end
	local total = 0

	--Add available ubus modems
	for _ in self:info_iterator() do
		total = total + 1
	end

	self.count = total
	return self.count
end

function Modem:builtin_modems_count()
	if self.builtin_count then return self.builtin_count end
	local total = 0

	-- Count builtin modems
	for info in self:info_iterator() do
		if info.builtin == true then
			total = total + 1
		end
	end

	self.builtin_count = total
	return self.builtin_count
end

function Modem:get_ubus_modem_object(modem_id)
	if not modem_id and not self.mdm_id then
		return nil
	elseif not modem_id and self.mdm_id then
		modem_id = self.mdm_id
	end

	if self.gsm_ubus_objects[modem_id] and self.gsm_ubus_objects[modem_id] ~= "-" then
		return self.gsm_ubus_objects[modem_id]
	end

	for info, online in self:info_iterator() do
		if info.usb_id == modem_id and online then
			self.gsm_ubus_objects[modem_id] = info.id
			return info.id
		end
	end
	return nil
end

function Modem:call_ubus_object(mdm_id, obj, args, timeout)
	local mdm_ubus = self:get_ubus_modem_object(mdm_id)
	if not mdm_ubus then
		return NO_VALUE
	end
	return util.ubus(mdm_ubus, obj, args and args, timeout)
end

function Modem:get_all_modems()
	local primary_exists = false
	local modems = {}
	local index = 1
	local builtin_count = self:builtin_modems_count()
	for mdm_info in self:info_iterator() do
		if mdm_info.primary == true and mdm_info.builtin == true and builtin_count > 1 then
			table.insert(modems,
				{
					id = mdm_info.usb_id,
					name = self.modem_names[1],
					sim_count = mdm_info.simcount,
					version = mdm_info.cache and mdm_info.cache.firmware,
					builtin = 1,
					primary = 1
				}
			)

			self:set_modem_id(mdm_info.usb_id)
			primary_exists = true
		elseif mdm_info.primary == false and mdm_info.builtin == true and builtin_count > 1 then
			table.insert(modems,
				{
					id = mdm_info.usb_id,
					name = self.modem_names[2],
					sim_count = mdm_info.simcount,
					version = mdm_info.cache and mdm_info.cache.firmware,
					builtin = 1,
					primary = 0
				}
			)

			if not primary_exists then
				self:set_modem_id(mdm_info.usb_id)
			end
		elseif mdm_info.builtin == true and builtin_count == 1 then
			table.insert(modems,
				{
					id = mdm_info.usb_id,
					name = self.modem_names[4],
					sim_count = mdm_info.simcount,
					version = mdm_info.cache and mdm_info.cache.firmware,
					builtin = 1,
					primary = 1
				}
			)

			if not primary_exists then
				self:set_modem_id(mdm_info.usb_id)
			end
		elseif mdm_info.primary == false and mdm_info.builtin == false then
			table.insert(modems,
				{
					id = mdm_info.usb_id,
					name = self.modem_names[3],
					index = index,
					sim_count = mdm_info.simcount,
					version = mdm_info.cache and mdm_info.cache.firmware,
					builtin = 0,
					primary = 0
				}
			)
			index = index + 1

			if not self:get_modem_id() then
				self:set_modem_id(mdm_info.usb_id)
			end
		else
			table.insert(modems,
				{
					id = mdm_info.usb_id,
					name = self.modem_names[5],
					sim_count = mdm_info.simcount,
					version = mdm_info.cache and mdm_info.cache.firmware,
					builtin = 0,
					primary = 0
				}
			)

			if not self:get_modem_id() then
				self:set_modem_id(mdm_info.usb_id)
			end
		end
	end
	return modems
end

---Gets modem sms limit due timestamp
---@param mdm_id string Modem usb id
---@param sim number | string Modem sim card position
---@param esim number | string | nil eSIM profile index
---@return string | boolean due_time Sms limit due time in timestamp format or false if it failed to get one
function Modem:get_sms_limit_due(mdm_id, sim, esim)
	if not mdm_id then return false end
	local data = util.ubus("sms_limit", "update", {
		esim_profile = tonumber(esim),
		sim = tonumber(sim),
		modem = mdm_id
	})
	if data and data.timestamp then
		return tostring(data.timestamp)
	end
	return false
end

---Gets modem message limit, returns false if it fails
---@param mdm_id string Modem usb id
---@param sim number | string Modem sim card position
---@param esim number | string | nil eSIM profile index
---@return number | boolean max, number | nil current Max messages that can be sent and already sent messages count
function Modem:get_sms_limit_count(mdm_id, sim, esim)
	if not mdm_id then return false end
	local data = util.ubus("sms_limit", "check", {
		esim_profile = tonumber(esim),
		sim = tonumber(sim),
		modem = mdm_id
	})
	if data and data.max and data.current then
		return data.max, data.current
	end
	return false
end

function Modem:get_info(mdm_id)
	mdm_id = mdm_id or self.mdm_id
	for modem in self:info_iterator() do
		if modem.usb_id == mdm_id then return modem end
	end
	return false
end

function Modem:get_cache(mdm_id)
	return self.info[mdm_id].cache or false
end

-- Returns cell info from cache
---@param mdm_id? string Modem usb id
---@return table cell_info
function Modem:get_cell_info(mdm_id)
	local cache = self:get_cache(mdm_id)
	if not cache or type(cache.cell_info) ~= "table" then return {} end

	local ca_data = {}
	for _, cell in ipairs(cache.ca_info or {}) do
		if cell.frequency then ca_data[cell.frequency] = cell end
	end

	local cell_info = {}
	for _, v in ipairs(cache.cell_info) do
		local arfcn = v["nr-arfcn"] or v.earfcn or v.uarfcn or v.arfcn
		local ca = arfcn and ca_data[arfcn] or {}

		table.insert(cell_info, {
			mcc = STR_NA(v.mcc),
			mnc = STR_NA(v.mnc),
			cellid = STR_NA(v.cellid),
			ue_state = NA(v.ue_state),
			lac = STR_NA(v.lac),
			tac = STR_NA(v.tac),
			pcid = NA(v.pcid or ca.pcid),
			arfcn = NA(v.arfcn),
			uarfcn = NA(v.uarfcn),
			earfcn = NA(v.earfcn),
			["nr-arfcn"] = NA(v["nr-arfcn"]),
			rsrp = NA(v.rsrp),
			rsrq = NA(v.rsrq),
			sinr = NA(v.sinr or ca.sinr or ca.rssnr),
			bandwidth = STR_NA(v.bandwidth)
		})
	end
	return cell_info
end

function Modem:get_desc(mdm_id)
	return self.info[mdm_id].name or NO_VALUE
end

function Modem:get_sim_count(mdm_id)
	return self.info[mdm_id].simcount or NO_VALUE
end

function Modem:get_band(mdm_id)
	local cache = self:get_cache(mdm_id)
	if cache then
		if cache.band == 0 then return NO_VALUE end
		return cache.band_str or NO_VALUE
	end
	return NO_VALUE
end

function Modem:get_bands(mdm_id)
	local info = self:get_info(mdm_id)
	local bands = {}
	local type_count = 0
	for _, band in ipairs(info and info.band_list or {}) do
		band = band:lower()
		for band_name, pattern in pairs({
			["2G"] = "gsm",
			["3G"] = "wcdma",
			["4G"] = "lte_b",
			["NB"] = "lte_nb",
			["5G_NSA"] = "^nsa_5g_n",
			["5G_SA"] = "^5g_n",
		}) do
			if band:match(pattern) then
				bands[band_name] = bands[band_name] or {}
				table.insert(bands[band_name], band)
				type_count = type_count + 1
				break
			end
		end
	end
	return bands, type_count
end

--- #### Blocking (slow)
function Modem:get_msg_storage(mdm_id)
	local msg_storage = self:call_ubus_object(mdm_id, "get_msg_storage", {full = true})
	return {
		used 			= msg_storage and msg_storage.mem1 and msg_storage.mem1.used or NO_VALUE,
		total 			= msg_storage and msg_storage.mem1 and msg_storage.mem1.total or NO_VALUE,
		storage_id 		= msg_storage and msg_storage.mem1 and msg_storage.mem1.storage_id or NO_VALUE,
		alt_used 		= msg_storage and msg_storage.alt_mem1 and msg_storage.alt_mem1.used or NO_VALUE,
		alt_total 		= msg_storage and msg_storage.alt_mem1 and msg_storage.alt_mem1.total or NO_VALUE,
		alt_storage_id 	= msg_storage and msg_storage.alt_mem1 and msg_storage.alt_mem1.storage_id or NO_VALUE
	}
end

--- #### Blocking (slow)
function Modem:reboot(mdm_id)
	local _, err = util.ubus("mctl", "reboot", { id = mdm_id })
	if err then
		return false, ("Failed to reboot '%s' modem."):format(mdm_id), err
	end
	return true
end

function Modem:exec_at(mdm_id, command)
	local data = self:call_ubus_object(mdm_id, "exec", {command = command, timeout = 180}, 180)
	if data and data ~= NO_VALUE and type(data.response) == "string" then
		return data.response:match("^%s*(.-)%s*$")
	end
	return false
end

function Modem:get_ca_info(mdm_id)
	local _, simstate_id = self:get_simstate(mdm_id)
	if simstate_id ~= self.SIM_STATE.INSERTED then return nil end -- No sim, No CA
	return self.cache[mdm_id].ca_info
end

function Modem:get_pinleft(mdm_id)
	local cache = self:get_cache(mdm_id)
	return cache and cache.sim_pin1, cache and cache.sim_puk1
end

function Modem:get_conntype(mdm_id)
	return self.cache[mdm_id].net_mode_str or NO_VALUE
end

-- Returns current modem mode
---@param mdm_id? string Modem usb_id
---@return MODEM_MODE mode Modem mode
function Modem:get_mode(mdm_id)
	return self.info[mdm_id].modem_func_id
end

-- Helper to check if device has a modem with specific mode
---@param modem_mode MODEM_MODE Modem mode
---@param every boolean? Should every modem have this mode.
---@return boolean has_mode True if device has a modem with such mode
function Modem:has_mode(modem_mode, every)
	for modem in self:info_iterator() do
		if every then
			if modem.modem_func_id ~= modem_mode then return false end
		else
			if modem.modem_func_id == modem_mode then return true end
		end
	end
	return not not every
end

---Returns modem tx and rx data from mdcollect get_raw_total
---@param mdm_id string Modem id
---@return number tx Modem tx data
---@return number rx Modem rx data
function Modem:get_tx_rx(mdm_id)
	local data = util.ubus("mdcollect", "get_raw_total", {modem = mdm_id})
	return (data and data.tx or 0), (data and data.rx or 0)
end

function Modem:get_simstate(mdm_id)
	local state = self.cache[mdm_id].pin_state or self.PIN_STATE.UNKNOWN
	for _, not_inserted in ipairs({
		self.PIN_STATE.UNKNOWN,
		self.PIN_STATE.NOT_READY,
		self.PIN_STATE.NOT_INSERTED,
	}) do
		if state == not_inserted then return "Not inserted", self.SIM_STATE.NOT_INSERTED end
	end
	return "Inserted", self.SIM_STATE.INSERTED
end

--- #### Hybrid (slow/fast)
---Gets current active modem sim from the cache or slow ubus call
---@param mdm_id string Modem usb_id
---@return false | number active_sim Current active sim or false if it fails to get
function Modem:get_active_sim(mdm_id)
	local simcount = tonumber(self:get_sim_count(mdm_id))
	if not simcount then return false end
	if simcount > 1 then
		local cache = self:get_cache(mdm_id)
		if cache and cache.sim then
			return cache.sim
		end

		-- Fallback to slow ubus call if cache has no value
		local sim_get = self:call_ubus_object(mdm_id, "get_sim_slot")
		if not sim_get or not sim_get.index then return false end
		return sim_get.index
	end
	return 1
end

function Modem:get_pinstate(mdm_id)
	local cache = self:get_cache(mdm_id)

	local state = cache and cache.pin_state_str or "Not inserted"
	local pinstate = cache and cache.pin_state or self.PIN_STATE.NOT_INSERTED

	if pinstate == self.PIN_STATE.PUK_BLOCKED then
		return "Required PUK. 0 attempts left.", pinstate
	end

	local sim_pin, sim_puk = self:get_pinleft(mdm_id)
	if not sim_pin then
		return state == "OK" and "Inserted" or state, pinstate
	end

	local attempts = pinstate == self.PIN_STATE.REQUIRED_PIN and sim_pin or pinstate == self.PIN_STATE.REQUIRED_PUK and sim_puk
	if attempts then
		local attempts_str = attempts == 1 and "1 attempt left." or attempts .. " attempts left."
		state = state .. ". " .. attempts_str
	end
	return state == "OK" and "Inserted" or state, pinstate
end

function Modem:get_operator(mdm_id)
	return self.cache[mdm_id].operator or NO_VALUE
end

function Modem:get_provider(mdm_id)
	return self.cache[mdm_id].provider_name or NO_VALUE
end

function Modem:get_operator_state(mdm_id)
	local _, simstate_id = self:get_simstate(mdm_id)
	if simstate_id ~= self.SIM_STATE.INSERTED then return "Searching", 0 end -- No sim then searching

	local cache = self:get_cache(mdm_id)
	return cache and cache.reg_stat_str or NO_VALUE, cache and cache.reg_stat or 0
end

function Modem:get_state(mdm_id)
	local info = self:get_info(mdm_id)
	return info and info.is_busy, info and info.state, info and info.state_id
end

function Modem:get_lac(mdm_id)
	local cache = self:get_cache(mdm_id)
	if not cache then return NO_VALUE end
	if cache.reg_lac then return cache.reg_lac end
	local cell_info = self:get_cell_info(mdm_id)
	return #cell_info > 0 and cell_info[1].lac or NO_VALUE
end

function Modem:get_tac(mdm_id)
	local cache = self:get_cache(mdm_id)
	if not cache then return NO_VALUE end
	if cache.reg_tac then return cache.reg_tac end
	local cell_info = self:get_cell_info(mdm_id)
	return #cell_info > 0 and cell_info[1].tac or NO_VALUE
end

function Modem:get_imsi(mdm_id)
	return self.cache[mdm_id].imsi or NO_VALUE
end

function Modem:get_imei(mdm_id)
	return self.cache[mdm_id].imei or NO_VALUE
end

function Modem:multi_apn_supported(mdm_id)
	-- No support for TRB1/TRB5 devices even if modem supports it
	if board:is_gateway() and not (board:has_rs232() and board:has_rs485()) then
		return false
	end
	return self.info[mdm_id].multi_apn or false
end

function Modem:dhcp_filter_supported(mdm_id)
	return self.info[mdm_id].dhcp_filter or false
end

function Modem:csd_supported(mdm_id)
	return self.info[mdm_id].csd or false
end

function Modem:auto_5g_mode(mdm_id)
	return self.info[mdm_id].auto_5g_mode or false
end

function Modem:framed_routing_supported(mdm_id)
	return self.info[mdm_id].framed_routing or false
end

function Modem:low_signal_reconnect_supported(mdm_id)
	return self.info[mdm_id].low_signal_reconnect or false
end

function Modem:operators_scan_supported(mdm_id)
	if self:get_mode(mdm_id) == self.modes.LOW_POWER then return false end -- No support for scan on LOW_POWER
	return self.info[mdm_id].operator_scan or false
end

function Modem:call_functionality_supported(mdm_id)
	local mode = self:get_mode(mdm_id)
	if mode == self.modes.DATA_ONLY or mode == self.modes.LOW_POWER then
		return false
	end
	return true
end

function Modem:ipv6_supported(mdm_id)
	return self.info[mdm_id].ipv6 or false
end

function Modem:no_ussd(mdm_id)
	return self.info[mdm_id].no_ussd or false
end

---@param mdm_id? string Modem usb_id
---@return boolean mobile_dfota_only True if modem supports dfota over mobile only
function Modem:mobile_dfota_only(mdm_id)
	return self.info[mdm_id].mobile_dfota or false
end

function Modem:has_dynamic_mtu(mdm_id)
	return self.info[mdm_id].dynamic_mtu or false
end

function Modem:get_fw_version(mdm_id)
	if self.info[mdm_id].manuf == "Quectel" or self.info[mdm_id].manuf == "Telit" then
		local fw = (self.cache[mdm_id].firmware or "")
		return fw:gsub("_.*$", "") or NO_VALUE, fw:match("_(.*)$")
	end
	return self.cache[mdm_id].firmware or NO_VALUE
end

function Modem:get_serial_number(mdm_id)
	return self.cache[mdm_id].serial_num or NO_VALUE
end

function Modem:get_manufacturer(mdm_id)
	return self.info[mdm_id].manuf or NO_VALUE
end

function Modem:get_model(mdm_id)
	return self.info[mdm_id].model or NO_VALUE
end

function Modem:get_iccid(mdm_id)
	return self.cache[mdm_id].iccid or NO_VALUE
end

function Modem:get_cellid(mdm_id)
	local cache = self:get_cache(mdm_id)
	if not cache then return NO_VALUE end
	if cache.reg_ci then return cache.reg_ci end
	local cell_info = self:get_cell_info(mdm_id)
	return #cell_info > 0 and cell_info[1].cellid or NO_VALUE
end

function Modem:get_rscp(mdm_id)
	return self.cache[mdm_id].rscp_value
end

function Modem:get_ecio(mdm_id)
	return self.cache[mdm_id].ecio_value
end

function Modem:get_rsrp(mdm_id)
	return self.cache[mdm_id].rsrp_value
end

function Modem:get_rsrq(mdm_id)
	return self.cache[mdm_id].rsrq_value
end

function Modem:get_sinr(mdm_id)
	local cache = self.cache[mdm_id]
	return (cache.sinr_value or cache.rssnr_value)
end

function Modem:get_rssi(mdm_id)
	return self.cache[mdm_id].rssi_value
end

function Modem:get_wwan_gnss_conflict(mdm_id)
	return self.info[mdm_id].wwan_gnss_conflict or false
end

function Modem:get_auto_2g_bands(mdm_id)
	return self.info[mdm_id].auto_2g_bands or false
end

function Modem:get_auto_3g_bands(mdm_id)
	return self.info[mdm_id].auto_3g_bands or false
end

function Modem:get_scan_cache(mdm_id)
	return self.cache[mdm_id].operator_scan or false
end

function Modem:volte_supported(mdm_id)
	if self:get_mode(mdm_id) == self.modes.DATA_ONLY then return false end -- No volte for DATA_ONLY
	return self.info[mdm_id].volte or false
end

function Modem:get_gnss_state(mdm_id)
	return self.cache[mdm_id].gnss_state
end

function Modem:nr5g_sa_disabled(mdm_id)
	return self.info[mdm_id].disabled_nr5g_sa_mode or false
end

-- Gets volte status, does get_ims_state if no value in cache found
---@param mdm_id? string Modem usb_id
---@param only_cache? boolean Should only cache be shown
function Modem:get_volte(mdm_id, only_cache)
	if not self:volte_supported(mdm_id) then return false end
	local cache = self:get_cache(mdm_id)
	if cache and cache.volte_ready ~= nil then
		return cache.volte_ready
	end
	if only_cache then return false end
	local volte = self:call_ubus_object(mdm_id, "get_volte_ready")
	return volte and volte.volte_ready or false
end

--- #### Hybrid (slow/fast)
-- Gets modem temperature from the cache or slow ubus call
---@param mdm_id? string Modem usb_id
---@return boolean | number temperature Temperature or false if it fails
function Modem:get_temperature(mdm_id)
	local cache = self:get_cache(mdm_id)
	if cache and type(cache.temperature) == "number" then
		return cache.temperature / 10
	end

	-- Fallback to slow ubus call if cache has no value
	local temperature = self:call_ubus_object(mdm_id, "get_temperature")
	if type(temperature) ~= "table" or not temperature.temperature_value then
		return false
	end
	return temperature.temperature_value / 10
end

--- #### Blocking (slow)
function Modem:send_ussd(mdm_id, msg)
	local status = self:call_ubus_object(mdm_id, "set_ussd", { mode = "enable", request = msg, coding_scheme = 15 })
	return status and status.status_id
end

function Modem:get_data_conn_state(mdm_id)
	if not mdm_id then
		mdm_id = self:get_modem_id()
	end

	if not mdm_id then
		return "Unknown", 0
	end

	local int_info = util.ubus("network.interface", "dump")
	if not int_info or not int_info.interface then
		return "Disconnected", 2
	end

	local function check_addr(addr)
		for _, v in pairs(addr) do
			if v.address and #v.address > 0 then
				return true
			end
		end
		return false
	end

	for _, v in pairs(int_info.interface) do
		if v.up and v.data and v.modem and v.modem == mdm_id then
			if v.data.method and (v.data.method == "bridge" or v.data.method == "passthrough") and
				v.data.bridge_ipaddr and #v.data.bridge_ipaddr > 0 then
				return "Connected", 1
			end
		end

		if v.up and v.data and v.data.modem and v.data.modem == mdm_id then
			if check_addr(v["ipv4-address"]) then
				return "Connected", 1
			end
			if check_addr(v["ipv6-address"]) then
				return "Connected", 1
			end
		end
	end
	return "Disconnected", 2
end

---Gets parsed connection type
---@param mdm_id string Modem usb id
---@return string conntype Parsed connection type
function Modem:connection_type(mdm_id)
	local c = self:get_conntype(mdm_id)
	local volte = (self:get_volte(mdm_id) and "; VoLTE" or "")

	if c:match("^WCDMA") or c:match("^HSDPA") or c:match("^HSUPA") or c:match("^HSPA") or c:match("^HSPA+") then
		return ("3G (%s)"):format(c)
	elseif c:match("LTE") then
		local ca = self:get_ca_info(mdm_id)
		if ca and #ca > 1 then
			return ("4G+ (%s-A)"):format(c) .. volte
		end
		return ("4G (%s)"):format(c) .. volte
	elseif c:match("^5G%-SA") then
		return "5G (SA)" .. volte
	elseif c:match("^5G%-NSA") then
		return "5G (NSA)" .. volte
	elseif c:match("^CDMA") or c:match("^EDGE") or c:match("^GPRS") or c:match("^GSM") then
		return ("2G (%s)"):format(c)
	end
	return c
end

-- Function to hide parameters when SIM is non operational
---@param pinstate_id PIN_STATE Modem pin state id
---@return string|nil value returns "N/A" if it should hide or nil
local function hide_parameters(pinstate_id)
	for _, state in ipairs({
		Modem.PIN_STATE.UNKNOWN,
		Modem.PIN_STATE.NOT_READY,
		Modem.PIN_STATE.NOT_INSERTED,
		Modem.PIN_STATE.SIM_FAILURE,
		Modem.PIN_STATE.SIM_BUSY
	}) do
		if pinstate_id == state then return NO_VALUE end
	end
end

---Function to get information about specific modem
---@param mdm_id string Modem id, eg. "3-1"
---@param full? boolean Default: true. Should method return full data. When full it might take some time as it waits for ubus.
function Modem:get_all(mdm_id)
	self:set_modem_id(mdm_id)
	local info = self:get_info(mdm_id)
	local pinstate, pinstate_id = self:get_pinstate()
	local simstate, simstate_id = self:get_simstate()
	local sim_check = hide_parameters(pinstate_id)
	local connection, connection_id = self:get_data_conn_state()
	local tx, rx = self:get_tx_rx(mdm_id)
	local pin, puk = self:get_pinleft()
	local operator_state, operator_state_id = self:get_operator_state()
	local is_busy, busy_state, busy_state_id = self:get_state()
	local version, cfg_version = self:get_fw_version()

	-- [!] Only NON blocking ubus calls and functions can be here and above, others must be below
	local data = {
		simstate = simstate,
		simstate_id = simstate_id,
		pinstate = pinstate,
		pinstate_id = pinstate_id,
		data_conn_state = connection,
		data_conn_state_id = connection_id,
		imei = self:get_imei(),
		version = version,
		cfg_version = cfg_version,
		serial = self:get_serial_number(),
		manufacturer = self:get_manufacturer(),
		model = self:get_model(),
		txbytes = tx,
		rxbytes = rx,
		baudrate = info and info.baudrate,
		index = info and info.index,
		is_busy = is_busy,
		busy_state = busy_state,
		busy_state_id = busy_state_id,
		sc_band_av = "Inactive",
		ca_signal = {},
		operator_state = operator_state,
		operator_state_id = operator_state_id,
		operator = sim_check or self:get_operator(),
		provider = sim_check or self:get_provider(),
		ntype = self:get_conntype(),
		mode = self:get_mode(),
		band = sim_check or self:get_band(),
		iccid = sim_check or self:get_iccid(),
		cellid = sim_check or self:get_cellid(),
		cell_info = {},
		lac = sim_check or self:get_lac(),
		tac = sim_check or self:get_tac(),
		imsi = sim_check or self:get_imsi(),
		ipv6 = self:ipv6_supported(mdm_id),
		wwan_gnss_conflict = self:get_wwan_gnss_conflict(mdm_id),
		auto_2g_bands = self:get_auto_2g_bands(mdm_id),
		auto_3g_bands = self:get_auto_3g_bands(mdm_id),
		auto_5g_mode = self:auto_5g_mode(mdm_id),
		dynamic_mtu = self:has_dynamic_mtu(mdm_id),
		multi_apn = self:multi_apn_supported(mdm_id),
		volte_supported = self:volte_supported(mdm_id),
		operators_scan = self:operators_scan_supported(mdm_id),
		no_ussd = self:no_ussd(mdm_id),
		csd = self:csd_supported(mdm_id),
		framed_routing = self:framed_routing_supported(mdm_id),
		low_signal_reconnect = self:low_signal_reconnect_supported(mdm_id),
		mobile_dfota = self:mobile_dfota_only(mdm_id),
		mobile_stage = self:get_mobile_stage(mdm_id),
		gnss_state = self:get_gnss_state(mdm_id),
		nr5g_sa_disabled = self:nr5g_sa_disabled(mdm_id),
		esim_bootstrap = self:has_bootstrap_profile(mdm_id),
	}

	-- Adds additional parameters if SIM is operational
	if not sim_check then
		data.cell_info = self:get_cell_info()
		data.pinleft = pin
		data.pukleft = puk
		data.volte = self:get_volte()
		data.rssi = self:get_rssi()
		data.rscp = self:get_rscp()
		data.ecio = self:get_ecio()
		data.rsrp = self:get_rsrp()
		data.rsrq = self:get_rsrq()
		data.sinr = self:get_sinr()
	end

	for ca_count, v in ipairs(self:get_ca_info() or {}) do
		if ca_count > 1 then
			data.sc_band_av = "Active"
		end
		table.insert(data.ca_signal, {
			band = NA(v.band),
			bandwidth = NA(v.bandwidth),
			rsrp = v.rsrp,
			rsrq = v.rsrq,
			-- sinr and rssnr are the same thing, but depending on the modem it might return one or the other
			sinr = (v.sinr or v.rssnr),
			frequency = NA(v.frequency),
			pcid = v.pcid,
			primary = v.primary or false,
		})
	end

	-- Renamed in 7.7, remove once it reaches EOL
	------------------------------------------
	data.oper = data.operator
	data.signal = data.rssi
	data.netstate_id = data.operator_state_id
	data.netstate = data.operator_state
	data.state = data.data_conn_state
	data.state_id = data.data_conn_state_id
	------------------------------------------

	return data
end

--- #### Blocking (slow)
function Modem:restart_connection(mdm_id)
	if mdm_id then self:set_modem_id(mdm_id) end
	mdm_id = self:get_modem_id()
	local mdm_state = self:get_state(mdm_id)
	if mdm_state and mdm_state == 1 then
		return false, "Modem is not ready", 4
	end
	local info = util.ubus() or {}
	for i = 1, #info do
		local obj = info[i] or ""
		if obj:find("mobifd.modem") then
			local status = util.ubus(obj, "status", nil, 180)
			if status and status.modem_id and status.modem_id == mdm_id then
				util.ubus(obj, "reload", nil, 180)
				return true, 0
			end
		end
	end
	return false, "Modem not found", 2
end

---Switch to next SIM
---@param mdm_id string Modem usb id
---@return boolean True if SIM switched successfully.
function Modem:switch_sim(mdm_id)
	local simcount = tonumber(self:get_sim_count(mdm_id))
	if not simcount or simcount < 2 then
		return false, "Switch to next SIM is not supported", 1
	end
	local ok = self:call_ubus_object(mdm_id, "change_sim_slot")
	if ok and ok.status == "OK" then
		return true
	end
	return false, "Modem not found", 2
end

--- #### Blocking (sometimes slow, mostly on mobifd init)
--- Gets current modem connection stage from mobifd. Defaults to first modem if no usb_id provided.
--- @param usb_id string Modem usb id ex. 3-1, 1-1.2
--- @return integer mobifd_state Current modem stage from mobifd
function Modem:get_mobile_stage(usb_id)
	for _, obj in ipairs(util.ubus()) do
		if obj:find("mobifd.modem") then
			local status = util.ubus(obj, "status", nil, 1)
			if status and status.modem_id == usb_id then
				return status.state or 0
			end
		end
	end
	return 0
end

-- Returns if the modem is blocked. Usually this can happen if the modem is in full control mode.
---@param usb_id string Modem usb id ex. 3-1, 1-1.2
---@return boolean blocked True if modem is blocked.
function Modem:is_blocked(usb_id)
	if not self.blocked_modems then
		self.blocked_modems = {}
		local info = util.ubus("gsm", "info")
		if info and info.mdm_stats then
			for _, modem_usb_id in pairs(info.mdm_stats.blocked_modems or {}) do
				self.blocked_modems[modem_usb_id] = true
			end
		end
	end
	return self.blocked_modems[usb_id] or false
end

---Gets all apns for specified modem
---@param mdm_id string Modem id
---@param info? table Not required info object if already have one to speed up.
function Modem:get_apn_list(mdm_id, info)
	local ERR_CODE = {
		NO_IMSI = 1,
		FAIL_MCC_MNC_PARSE = 2,
		FAIL_DB_CONNECT = 3,
		SIM_ERROR = 4
	}

	local simstate, simstate_id = self:get_simstate(mdm_id)
	if simstate_id ~= self.SIM_STATE.INSERTED then
		return false, ("Failed to get APNS. SIM card is %s."):format(simstate:lower()), ERR_CODE.SIM_ERROR
	end -- No sim, No APNS

	info = info or self:get_info(mdm_id)

	if not info or info == NO_VALUE or not info.cache or not info.cache.imsi then
		return false, "Failed to get imsi data for specified modem.", ERR_CODE.NO_IMSI
	end

	local mcc, mnc = info.cache.imsi:match("^(%d%d%d)(%d%d%d)")
	if not mcc or not mnc then
		return false, "Failed to get mcc and mnc for specified modem.", ERR_CODE.FAIL_MCC_MNC_PARSE
	end

	local sqlite = require("vuci.sqlite").init()
	local db = sqlite.database({ path = APN_DB_FILE })
	if not db:get_db() then
		return false, "Failed to connect to apn database.", ERR_CODE.FAIL_DB_CONNECT
	end

	local data = db:select("SELECT id, carrier, apn, user, password, authtype, pdptype FROM apn WHERE mcc = :mcc AND (mnc = :mnc3 OR mnc = :mnc2)", {
		mcc = mcc,
		mnc3 = mnc,
		mnc2 = mnc:sub(1, 2),
	})

	local apns = {}

	for _, values in ipairs(data) do
		if values.carrier and values.apn and values.id then
			local value = {
				id = values.id,
				carrier = values.carrier,
				apn = values.apn,
				user = values.user,
				password = values.password,
				pdptype = tostring(values.pdptype),
				auth = "none"
			}
			if values.authtype == 1 then
				value.auth = "pap"
			elseif values.authtype == 2 or values.authtype == 3 then
				value.auth = "chap"
			end
			table.insert(apns, value)
		end
	end
	return apns
end

---Gets all apns for specified modem
---@param apn_id number APN id to get the name for
---@return string | nil apn_name APN name or nil if failed
function Modem:get_apn_name(apn_id)
	local sqlite = require("vuci.sqlite").init()
	local db = sqlite.database({ path = APN_DB_FILE })
	if not db:get_db() then return end

	local name
	local data = db:select("SELECT apn FROM apn WHERE id = :id", {id = apn_id})
	if type(data) == "table" and #data > 0 then name = data[1].apn end

	return name
end

---Gets all country names and mccs from apn database
---@return { mcc: string, country: string }[] | boolean data APN mccs and country names
---@return nil | string err Error message if it fails to get the data
function Modem:get_apn_countries()
	local sqlite = require("vuci.sqlite").init()
	local db = sqlite.database({ path = APN_DB_FILE })
	if not db:get_db() then
		return false, "Failed to connect to apn database."
	end
	local data = db:select("SELECT mcc, country FROM countries")
	return data
end

---Sets new PIN using PUK for active SIM and reloads modem via mobifd.modem* reload
---@param mdm_id string Modem usb id
---@param puk string PUK for active SIM
---@param new_pin string new PIN code to be set
function Modem:reset_pin(mdm_id, puk, new_pin)
	local cache = self:get_cache(mdm_id)
	-- Check if SIM requires PUK to be entered
	if not cache or cache.pin_state ~= self.PIN_STATE.REQUIRED_PUK then
		return false, 1, "Failed to set new PIN, PUK is not required in this sim state."
	end

	local _, puk_left = self:get_pinleft(mdm_id)
	if type(puk_left) == "number" and puk_left < 6 then
		return false, 3, ("Failed to set new PIN. PUK can only be entered if there is more than 5 attempts left. %d PUK attempts left."):format(puk_left)
	end

	local ok = self:call_ubus_object(mdm_id, "set_puk_code", {puk = puk, pin = new_pin})
	if ok and ok.status == "OK" then
		-- Reloading modem that had a PIN change
		local modem_id = (self:get_ubus_modem_object(mdm_id) or ""):match(".-%.(.*)")
		if modem_id then
			--os.execute used as util.ubus sometimes resets network connection making requests fail.
			os.execute(("ubus -t 180 call mobifd.%s reload > /dev/null 2>&1 &"):format(modem_id))
		end
		return true
	end
	local puk_count = self:call_ubus_object(mdm_id, "get_pin_count") -- Triggers cache refresh
	return false, 2, ("Failed to set new PIN with provided PUK. PUK code might be wrong. %s PUK attempts left."):format(puk_count and puk_count.sim_puk1 or NO_VALUE)
end

---Unlocks SIM with provided pin
---@param mdm_id string Modem usb id
---@param pin string PIN to unlock the SIM with
---@return boolean success, number|nil err_code, string|nil err_msg
function Modem:set_pin(mdm_id, pin)
	local cache = self:get_cache(mdm_id)
	if not cache or cache.pin_state ~= self.PIN_STATE.REQUIRED_PIN then
		return false, 1, "Failed to set PIN, PIN is not required at this time."
	end

	local ok = self:call_ubus_object(mdm_id, "set_pin_code", {code = pin})
	if ok and ok.status == "OK" then
		return true
	end
	local pin_count = (self:call_ubus_object(mdm_id, "get_pin_count") or {}).sim_pin1
	return false, pin_count == 0 and 3 or 2, ("Failed to set PIN code. PIN code might be wrong. %s PIN attempts left."):format(pin_count or NO_VALUE)
end

---Returns SIM PIN lock status
---@param mdm_id string Modem usb id
---@return boolean success, string|nil err_msg
function Modem:get_pin_lock(mdm_id)
	local cache = self:get_cache(mdm_id)
	if not cache or cache.pin_state ~= self.PIN_STATE.OK then
		return false, "Failed to get PIN lock state, SIM card is not ready."
	end

	local ok = self:call_ubus_object(mdm_id, "get_fac_lock", {
		facility = "SC"
	})
	if ok and ok.state_id then
		return ok.state_id
	end
	return false, "Failed to get PIN lock state."
end

---Enables or disables SIM PIN lock
---@param mdm_id string Modem usb id
---@param lock PIN_LOCK Lock or unlock
---@param pin string Current PIN code
---@return boolean success, number|nil err_code, string|nil err_msg
function Modem:set_pin_lock(mdm_id, lock, pin)
	local locked, err = self:get_pin_lock(mdm_id)
	if locked == lock or err then
		return false, 1, err or ("Failed to set PIN lock, SIM PIN is already %s."):format(
			locked == self.PIN_LOCK.LOCKED and "locked" or "unlocked"
		)
	end

	local ok = self:call_ubus_object(mdm_id, "set_fac_lock", {
		facility = "SC",
		state = lock == self.PIN_LOCK.LOCKED and "locked" or "unlocked",
		pass = pin
	})
	if ok and ok.status == "OK" then
		return true
	end
	local pin_count = self:call_ubus_object(mdm_id, "get_pin_count") or {}
	return false, 2, ("Failed to set PIN lock. PIN code might be wrong. %s PIN attempts left."):format(
		NA(pin_count.sim_pin1)
	)
end

---Changes SIM PIN
---@param mdm_id string Modem usb id
---@param current_pin string Current SIM PIN
---@param new_pin string New PIN to set to SIM
---@return boolean success, number|nil err_code, string|nil err_msg
function Modem:change_pin(mdm_id, current_pin, new_pin)
	local locked, err = self:get_pin_lock(mdm_id)
	if locked ~= self.PIN_LOCK.LOCKED or err then
		return false, 1, err or "Failed to set new PIN, SIM PIN is not enabled."
	end

	local ok = self:call_ubus_object(mdm_id, "set_new_pass", {
		facility = "SC",
		old_pass = current_pin,
		new_pass = new_pin
	})
	if ok and ok.status == "OK" then
		return true
	end
	local pin_count = self:call_ubus_object(mdm_id, "get_pin_count") or {}
	return false, 2, ("Failed to change SIM PIN code. Current PIN code might be wrong. %s PIN attempts left."):format(
		NA(pin_count.sim_pin1)
	)
end

---Returns `true` if modem has DPO support
---@param mdm_id string Modem usb id
function Modem:has_dpo_mode_support(mdm_id)
	local _, err = self:call_ubus_object(mdm_id, "get_dpo_mode")
	return not err
end

-- Returns modem num from board.json
---@param usb_id string Modem usb id
local function get_modem_num(usb_id)
	if not usb_id then return false end
	for _, modem in ipairs(modem_board) do
		local modem_num = tonumber(modem.num)
		if modem.id == usb_id and modem_num then
			return modem_num
		end
	end
	return false
end

-- Gets SIM card configs from mnf
---@param modem_num_filter number|nil Modem number to filter sim_cfgs
---@return table sim_cfgs SIM card cfgs from mnf
local function get_sim_mnf(modem_num_filter)
	local sim_cfgs = {}
	local mnf = util.ubus("mnfinfo", "get")
	if type(mnf) ~= "table" or type(mnf.mnfinfo) ~= "table" then return sim_cfgs end
	for k, v in pairs(mnf.mnfinfo) do
		local index = tonumber(k:match("sim(%d+)_cfg"))
		if index and type(v) == "string" and not v:match("^00") and v:match("^%d"..(modem_num_filter or "")) then
			local num, is_esim = v:match("^%d(%d)(%d)")
			if num and is_esim then
				local boot_iccid = mnf.mnfinfo["sim"..index.."_boot_iccid"]
				table.insert(sim_cfgs, {
					modem_num = tonumber(num),
					index = index,
					esim = is_esim == "2",
					has_bootstrap = boot_iccid ~= nil and boot_iccid ~= NO_VALUE
				})
			end
		end
	end
	return sim_cfgs
end

---Gets modem num from board, gets mnfinfo and checks if specific SIM is an eSIM
---@param mdm_id string Modem usb id
---@param sim string|number|nil Modem SIM card index to check
---@return boolean is_esim True if the card is marked an eSIM in mnfinfo
function Modem:is_card_esim(mdm_id, sim)
	local modem_num = get_modem_num(mdm_id)
	sim = tonumber(sim)
	if not modem_num or not sim then return false end
	local sim_cfgs = get_sim_mnf(modem_num)
	table.sort(sim_cfgs, function (a, b) return a.index < b.index end)
	return sim_cfgs[sim] and sim_cfgs[sim].esim or false
end

function Modem:get_sim_name(usb_id, sim)
	if not usb_id or not sim then return false end
	local name, index, esim = check_sim_name_cache(self, usb_id, sim)
	if name then return name, index, esim end

	local modem_num = get_modem_num(usb_id)
	sim = tonumber(sim)
	if not modem_num or not sim then return false end
	local sim_cfgs = get_sim_mnf()

	-- eSIMs to back physical SIMS to front + modem order
	table.sort(sim_cfgs, function(a, b)
		if not a or not b then return false end
		if a.esim and not b.esim then return false end
		if not a.esim and b.esim then return true end
		if a.modem_num ~= b.modem_num then return a.modem_num < b.modem_num end
		return a.index < b.index
	end)

	local pos = 0
	for i, v in ipairs(sim_cfgs) do
		if modem_num == v.modem_num then pos = pos + 1 end
		if pos == sim then
			return cache_sim_name(self, usb_id, sim, ("SIM%d"):format(i), i, v.esim)
		end
	end
	return false
end

---Checks if the modem has any eSIM bootstrap profile
---@param usb_id string Modem usb id
---@return boolean has_bootstrap if the modem has any eSIM bootstrap profile
function Modem:has_bootstrap_profile(usb_id)
	if not usb_id then return false end
	local modem_num = get_modem_num(usb_id)
	if not modem_num then return false end
	local sim_cfgs = get_sim_mnf(modem_num)
	for _, v in ipairs(sim_cfgs) do
		if v.has_bootstrap then return true end
	end
	return false
end

function Modem:set_mnf_pin(usb_id, sim, pin)
	if not usb_id or not sim then return false end
	if not pin or pin == "" then pin = "erase" end
	local modem_num = get_modem_num(usb_id)
	sim = tonumber(sim)
	if not modem_num or not sim then return false end
	local sim_cfgs = get_sim_mnf(modem_num)
	table.sort(sim_cfgs, function (a, b) return a.index < b.index end)
	return os.execute(("mnf_info -P %d -p %s"):format(sim_cfgs[sim].index, util.shellquote(pin))) == 0
end

function Modem:get_modem_state(usb_id)
	usb_id = usb_id or self.mdm_id
	if not usb_id then return false end
	local ok = util.ubus("mctl", "modem_state", {id = usb_id})
	if type(ok) ~= "table" then return false end
	return ok.state, ok.state_str
end

function Modem:get_signal_db(usb_id)
	local signal_db = self:call_ubus_object(usb_id, "read_signal_db", { range = "hour" })
	return type(signal_db) == "table" and signal_db.signal_data or false
end

function Modem:format_operators(operators)
	if not operators then return {} end
	table.sort(operators, function(a, b)
		local priority = {Current = 1, Available = 2, Other = 3}
		local state_a = priority[a.state] or priority.Other
		local state_b = priority[b.state] or priority.Other
		if state_a ~= state_b then
			return state_a < state_b
		elseif a.oper_num ~= b.oper_num then
			return a.oper_num < b.oper_num
		end
		return (a.oper_name or "") < (b.oper_name or "")
	end)

	local NET_ACC_TYPES = {"", "2G", "2G", "3G", "2G", "3G", "3G", "3G", "4G", "", "5G", "5G", "5G", "5G"}

	local data_map, data = {}, {}
	local countries = self:get_apn_countries()
	local country_lookup
	if type(countries) == "table" and #countries > 0 then
		country_lookup = {}
		for _, info in ipairs(countries) do
			if info.mcc and info.country then
				country_lookup[tostring(info.mcc)] = info.country
			end
		end
	end
	for i, op in ipairs(operators) do
		local num_name = tostring(op.oper_num)
		local new_op = data_map[num_name]
		if not new_op then
			local mcc = string.sub(num_name, 1, 3)
			local country = "Other"
			if country_lookup then
				country = country_lookup[mcc] or country
			end
			data_map[num_name] = {
				_index = i,
				status = op.state,
				status_code = tostring(op.state_id),
				op_name = op.oper_name or NO_VALUE,
				short_name = op.short_name or NO_VALUE,
				num_name = num_name,
				country = country,
				net_access_type = {NET_ACC_TYPES[op.act_id + 1]}
			}
		else
			table.insert(new_op.net_access_type, NET_ACC_TYPES[op.act_id + 1])
		end
	end
	for _, op in pairs(data_map) do
		table.sort(op.net_access_type)
		op.net_access_type = table.concat(op.net_access_type, "/")
		table.insert(data, op)
	end
	table.sort(data, function(a, b) return a._index < b._index end)
	for _, v in ipairs(data) do v._index = nil end
	return data
end

return Modem
