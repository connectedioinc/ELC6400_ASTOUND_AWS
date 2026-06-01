local param = {}

param._params_used_by_all = {"ts", "rn", "sn", "mi", "ss", "fc", "wi", "ws", "wm", "pc", "it", "er", "gs", "li", "lm", "ms", "on", "ct", "cs", "fs",
	"ns", "im", "ie", "md", "is", "ps", "st", "cp", "ec", "ic", "ci", "sv", "ts", "ut", "nl", "su", "rp", "sr", "rq", "nb", "ni", "g[0-9]+"}

function param:_pack_params(...)
	local params = {}
	for _, p in ipairs(self._params_used_by_all) do
		params[#params+1] = p
	end
	for _, p in ipairs(arg) do
		params[#params+1] = p
	end
	return params
end

param.services = {
	sms_rules = param:_pack_params(),
	jg_action = param:_pack_params("ex", "in", "si"),
	events_reporting = param:_pack_params("et", "ex")
}
param.services.call_rules = param.services.sms_rules

---Returns available params (or param list, listed in id_list)
---@param id_list table|nil list of param ids (can contain regex e.g. to get all I/O params use "g[0-9]+")
---@return table
function param:get_params(id_list)
	local util = require("vuci.util")
	local ntm = require "vuci.network".init()
	local board = require("vuci.board")
	local md = require("vuci.modem")
	local all_modems = md:get_all_modems()

	local TYPES = {
		EVENT = "event",
		OTHER = "other",
		DEVICE = "device",
		NETWORK = "network",
		MOBILE = "mobile",
		IO = "io"
	}
	local params = {}
	local function add_param(id, desc, tp, extra_vals)
		if id_list then
			local found
			for _, id_l in ipairs(id_list) do
				if id:match(id_l) then
					found = true
					break
				end
			end
			if not found then
				return
			end
		end

		local param = { id = id, description = desc, type = tp }
		for key, value in pairs(extra_vals or {}) do
			param[key] = value
		end
		params[#params+1] = param
	end
	add_param("et", "Event type", TYPES.EVENT)
	add_param("ex", "Event text", TYPES.EVENT)


	add_param("ts", "Local time", TYPES.OTHER)
	add_param("ut", "Unix time", TYPES.OTHER)
	add_param("nl", "New line", TYPES.OTHER)
	add_param("ms", "Monitoring status", TYPES.OTHER)
	add_param("fs", "Firmare on server", TYPES.OTHER)
	add_param("er", "RMS error message", TYPES.OTHER)
	add_param("it", "UTC time in ISO", TYPES.OTHER)

	add_param("rn", "Router name", TYPES.DEVICE)
	add_param("sn", "Serial number", TYPES.DEVICE)
	add_param("fc", "Current FW version", TYPES.DEVICE)
	add_param("pc", "Device name", TYPES.DEVICE)

	add_param("li", "LAN IP address", TYPES.NETWORK)
	add_param("wi", "WAN IPv4 address", TYPES.NETWORK)
	add_param("ws", "WAN IPv6 address", TYPES.NETWORK)
	if board:get_default_wan_ifname() then
		add_param("wm", "WAN MAC address", TYPES.NETWORK)
	end
	if board:has_ethernet() then
		local default_lan_ifname = board:get_default_lan_ifname()
		local lan_ifnames
		if type(default_lan_ifname) == "table" then
			lan_ifnames = default_lan_ifname
		else
			lan_ifnames = default_lan_ifname and util.split(default_lan_ifname, "%s+", nil, true) or {}
		end
		local devices = ntm:get_devices()
		for _, dev in pairs(devices) do
			if util.contains(lan_ifnames, dev.name) then
				add_param("lm", "LAN MAC address", TYPES.NETWORK)
				break
			end
		end
	end


	if board:has_gps() then
		add_param("gs", "GPS info", "gps")
	end

	if #all_modems > 0 then
		add_param("mi", "Mobile IP addresses", TYPES.MOBILE)
		add_param("ss", "Signal strength", TYPES.MOBILE)
		add_param("on", "Operator name", TYPES.MOBILE)
		add_param("ct", "Network type", TYPES.MOBILE)
		add_param("cs", "Data connection state", TYPES.MOBILE)
		add_param("ns", "Network state", TYPES.MOBILE)
		add_param("im", "IMSI", TYPES.MOBILE)
		add_param("ie", "IMEI", TYPES.MOBILE)
		add_param("md", "Modem model", TYPES.MOBILE)
		add_param("is", "Modem serial number", TYPES.MOBILE)
		add_param("ps", "SIM pin state", TYPES.MOBILE)
		add_param("st", "SIM state", TYPES.MOBILE)

		for modem in md:info_iterator() do
			local bands = md:get_bands(modem.usb_id)
			if bands["3G"] then
				add_param("cp", "RSCP", TYPES.MOBILE)
				add_param("ec", "ECIO", TYPES.MOBILE)
				break
			end
		end

		add_param("ic", "ICCID", TYPES.MOBILE)
		add_param("ci", "CELLID", TYPES.MOBILE)
		add_param("sv", "Network serving", TYPES.MOBILE)

		if all_modems[1].sim_count > 1 then
			add_param("su", "SIM slot in use", TYPES.MOBILE)
		end

		local modem_UC20
		for _, m in ipairs(all_modems) do
			if m.version and m.version:match("UC20") then
				modem_UC20 = true
				break
			end
		end
		if not modem_UC20 then
			add_param("rp", "RSRP", TYPES.MOBILE)
			add_param("sr", "SINR", TYPES.MOBILE)
			add_param("rq", "RSRQ", TYPES.MOBILE)
			add_param("nb", "Neighbour cells", TYPES.MOBILE)
			add_param("ni", "Network info", TYPES.MOBILE)
		end


	end

	if board:has_ios() then
		local io = require("vuci.io")
		local io_pins = io:ioman_info()
		if io_pins then
			add_param("in", "Input name", TYPES.EVENT)
			add_param("si", "Input state", TYPES.EVENT)

			local allowed_pin_types = {"gpio", "dwi", "relay", "adc", "acl"}
			for _, pin in ipairs(io_pins) do
				if util.contains(allowed_pin_types, pin.type) and pin.io_name and pin.io_param then
					local display_name = ("%s (%s)"):format(pin.io_name, table.concat(pin.block_pins, ","))
					add_param(pin.io_param, display_name, TYPES.IO, {
						block_pins = pin.block_pins,
						io_name = pin.io_name
					})
				end
			end
		end
	end

	return params
end


---Returns available params for the selected service
---@param service "events_reporting"|"sms_rules"|"call_rules"|"jg_action"
---@return table
function param:get_params_by_service(service)
	if not self.services[service] then
		return {}
	end
	return self:get_params(self.services[service])
end

---Returns available params ids for the selected service
---@param service "events_reporting"|"sms_rules"|"call_rules"|"jg_action"
---@return table
function param:get_params_id_by_service(service)
	local params_ids = {}
	for _, value in pairs(self:get_params_by_service(service)) do
		if value.id then
			table.insert(params_ids, value.id)
		end
	end
	return params_ids
end

return param
