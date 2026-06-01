local FunctionService = require("api/FunctionService")
local md = require("vuci.modem")
local modem_count = md:modem_count()
local uci = require("vuci.uci").cursor()
local util = require("vuci.util")
local pac = require("vuci.package_checker")

if modem_count == 0 then
	return nil
end

local modems = FunctionService:new()

local ERR_CODES = {
	NOT_FOUND = 1,
	REBOOT_FAILED = 2,
	AT_EXEC_FAILED = 3
}

---Checks if mobile data was turned off with mobileoff sms
---@param modem_id string Modem usb id eg. 3-1, 1-1.2....
local function mobile_data_off(modem_id)
	local data_off = false
	uci:foreach("network", "interface", function(s)
		if s.modem == modem_id and s.bringup == "0" then
			data_off = true
			return false -- break
		end
	end)
	return data_off
end

local function adjust_esim_index(value)
	return tonumber(value) and tostring(tonumber(value) + 1) or nil
end

local function get_active_esim(modem_id)
	local modem_num = (md:get_ubus_modem_object(modem_id) or ""):match("gsm.(modem.*)")
	local active_sim = md:get_active_sim(modem_id) or 1

	if modem_num then
		local ok = util.ubus("esim."..modem_num, "status")
		if ok and type(ok.profiles) == "table" and ok.eid ~= "N/A" then
			local id = 1
			for _, v in ipairs(ok.profiles) do
				if v.enabled then return tostring(id) end
				if v.sim_slot == active_sim then id = id + 1 end
			end
			-- Default to first profile if no active profile found
			return "1"
		end
	end

	-- Fallback in case we can not get live profiles
	local id
	uci:foreach("simcard", "sim", function(s)
		if s.primary == "1" and s.modem == modem_id then
			if not s.esim_profile and md:is_card_esim(s.modem, s.position) then
				s.esim_profile = "0"
			end
			if s.esim_profile and tonumber(s.position) == active_sim then
				id = adjust_esim_index(s.esim_profile)
			end
			return false -- break
		end
	end)
	return id
end

---Check if sim switch is active for active sim
---@param modem_id string Modem usb id eg. 3-1, 1-1.2....
---@return boolean active True if sim switch is active
local function check_sim_switch_enabled(modem_id, esim)
	local active = false
	if not pac.is_installed("sim_switch") then return active end

	local active_sim = tostring(md:get_active_sim(modem_id) or 1)
	if esim then
		esim = tostring(tonumber(esim) - 1) -- adjust to 0 based index
		if esim == "0" then esim = nil end -- 0 is hidden in config
	end

	uci:foreach("sim_switch", "sim", function(s)
		if s.modem ~= modem_id then return end
		if s.position ~= active_sim then return end
		if s.enabled ~= "1" then return end
		if s.esim_profile ~= esim then return end

		active = true
		return false -- break
	end)
	return active
end

---Offline modem body generator
---@param modem table Modem data from info_iterator
---@return table offline_body Generated offline modem body
local function offline_body(modem)
	local mctl_modem = ("modem%s"):format(modem.num == "1" and "" or modem.num)
	local esim = get_active_esim(modem.usb_id)
	return {
		id = modem.usb_id,
		name = md:get_name(modem),
		offline = "1",
		blocked = md:is_blocked(modem.usb_id) and "1" or "0",
		disabled = uci:get("system", mctl_modem, "disable") == "1" and "1" or "0",
		builtin = modem.builtin,
		primary = modem.primary,
		sim_count = modem.simcount,
		csd = modem.csd,
		mode = md:get_mode(modem.usb_id),
		multi_apn = md:multi_apn_supported(modem.usb_id),
		operators_scan = md:operators_scan_supported(modem.usb_id),
		dynamic_mtu = md:has_dynamic_mtu(modem.usb_id),
		ipv6 = md:ipv6_supported(modem.usb_id),
		volte = md:volte_supported(modem.usb_id),
		esim_profile = esim,
		sim_switch_enabled = check_sim_switch_enabled(modem.usb_id, esim),
		modem_state_id = md:get_modem_state(modem.usb_id)
	}
end

---Online modem body generator
---@param modem table Modem data from info_iterator
---@return table online_body Generated online modem body
local function online_body(modem)
	local all = md:get_all(modem.usb_id)
	local modem_id = modem.usb_id
	all.id = modem_id
	all.primary = modem.primary
	all.builtin = modem.builtin
	all.name = md:get_name(modem)
	all.sim_count = modem.simcount
	all.conntype = md:connection_type(modem_id)
	all.service_modes = md:get_bands(modem_id)
	all.active_sim = md:get_active_sim(modem_id) or 1
	all.temperature = md:get_temperature(modem_id) or nil
	all.data_off = mobile_data_off(modem_id)
	all.esim_profile = get_active_esim(modem_id)
	all.sim_switch_enabled = check_sim_switch_enabled(modem_id, all.esim_profile)
	all.modem_state_id = md:get_modem_state(modem_id)
	return all
end

function modems:GET()
	if modem_count == 0 then
		self:add_critical_error(ERR_CODES.NOT_FOUND, "Modem(s) does not exist.", "URL", HTTP_STATUS_CODES.NOT_FOUND)
	end

	local modem_id = self.sid
	local response
	if modem_id then
		for modem, online in md:info_iterator() do
			if modem.usb_id == modem_id then
				if online then
					response = online_body(modem)
				else
					response = offline_body(modem)
				end
				break
			end
		end
		if not response then
			self:add_critical_error(ERR_CODES.NOT_FOUND, "Modem does not exist.", "URL", HTTP_STATUS_CODES.NOT_FOUND)
		end
	else
		response = {}
		for modem, online in md:info_iterator() do
			if online then
				table.insert(response, online_body(modem))
			else
				table.insert(response, offline_body(modem))
			end
		end
	end
	return self:ResponseOK(response)
end

return modems
