local fs = require("nixio.fs")
local pac = require("vuci.package_checker")
local all_modems = require("vuci.modem"):get_all_modems()
local board = require("vuci.board")
local util = require("vuci.util")

local EventType = {}

function EventType:get_config_events()
	-- enough to only check if these configs exist
	local basic_cfgs = {"system", "widget", "ntpserver", "overview", "network"}

	local events = {}

	-- separate check for mobile, gps, wireless and bluetooth pkgs (due to RUTX08 :( )
	local mobile_cfgs = {"simcard", "sim_switch", "sms_gateway", "sms_utils", "call_utils", "email_to_sms", "operctl"}
	local gps_cfgs = {"avl", "gps"}
	local bluetooth_cfgs = {"blesem", "ble_devices"}
	local wireless_cfgs_pkgs = {"wifi_scanner", "multi_wifi", "relayd", "chilli"}
	local rs_cfgs = {"rs_console", "rs_modbus", "rs_overip"}

	-- cfgs to exclude from opkg .conffiles checks (they are never edited or need custom checks)
	local exclude = {"hwinfo", "kmod_man", "mdcollectd", "mwan3", "vuci", "quota_limit", "fstab", "ioman"}

	for _, tbl in ipairs({mobile_cfgs, gps_cfgs, bluetooth_cfgs, basic_cfgs, wireless_cfgs_pkgs, rs_cfgs}) do
		for _, cfg in ipairs(tbl) do
			table.insert(exclude, cfg)
		end
	end

	local opkg_conffiles = {}
	for info in fs.glob("/usr/lib/opkg/info/*.conffiles") do
		for line in io.lines(info) do
			if line:match("^/etc/config/") then
				opkg_conffiles[line] = true
			end
		end
	end

	for cfg_path in fs.glob("/etc/config/*") do
		local cfg_name = cfg_path:match("^.*/(.*)$")
		if not util.contains(exclude, cfg_name) then
			if opkg_conffiles[cfg_path] then
				table.insert(events, cfg_name)
			end
		end
	end

	-- check basic configs
	for _, cfg in ipairs(basic_cfgs) do
		if fs.access("/etc/config/" .. cfg) then
			table.insert(events, cfg)
		end
	end
	if all_modems and #all_modems > 0 then
		for _, cfg in ipairs(mobile_cfgs) do
			if fs.access("/etc/config/" .. cfg) then
				table.insert(events, cfg)
			end
		end
		if board:has_gps() then
			for _, cfg in ipairs(gps_cfgs) do
				if fs.access("/etc/config/" .. cfg) then
					table.insert(events, cfg)
				end
			end
		end

		if pac.is_installed("quota_limit") then
			table.insert(events, "quota_limit")
		end
	end

	if board:has_bluetooth() then
		for _, cfg in ipairs(bluetooth_cfgs) do
			if fs.access("/etc/config/" .. cfg) then
				table.insert(events, cfg)
			end
		end
	end

	-- custom checks
	if board:has_serial() then
		for _, cfg in ipairs(rs_cfgs) do
			if fs.access("/etc/config/" .. cfg) and opkg_conffiles["/etc/config/" .. cfg] then
				table.insert(events, cfg)
			end
		end
	end

	if board:has_wifi() then
		if fs.access("/etc/config/wireless") then
			table.insert(events, "wireless")
		end
		for _, cfg in ipairs(wireless_cfgs_pkgs) do
			if fs.access("/etc/config/" .. cfg) and opkg_conffiles["/etc/config/" .. cfg] then
				table.insert(events, cfg)
			end
		end
	end

	if board:has_wifi() or (all_modems and #all_modems > 0) then
		if fs.access("/etc/config/mwan3") then
			table.insert(events, "mwan3")
		end
	end

	if board:has_usb() then
		if fs.access("/etc/config/fstab") then
			table.insert(events, "fstab")
		end
	end

	-- ioman is no longer present in .conffiles, so it needs a custom check
	if board:has_ios() and fs.access("/etc/config/ioman") then
		table.insert(events, "ioman")
	end

	table.sort(events, function(a, b) return a < b end)
	return events
end

function EventType:get_all_events(service)
	if self.all_events then return self.all_events end
	local events = {
		DHCP = {
			"lan"
		},
		Reboot = {
			"web ui",
			"ping reboot",
			"reboot scheduler",
			"from button",
			"wget reboot",
			util.contains({"events_reporting", "snmp_trap_rules"}, service) and board:has_ios() and "input/output" or nil,
		},
		Startup = service == "events_reporting" and {
			"Device startup completed",
			"unexpected shutdown"
		} or nil,
		SSH = {"succeeded", "bad"},
		["Web UI"] = util.contains({ "events_reporting", "snmp_trap_rules" }, service) and { "Password auth succeeded", "Bad password attempt" } or 
		{ "successfully authenticated on HTTP", "Invalid password attempt for" },
		Fota = {"is now available"}
	}

	if pac.is_installed("mwan3") then
		events["Failover"] = {
			"Switched to main", "Switched to backup"
		}
	end

	if all_modems and #all_modems > 0 then
		events["Mobile Data"] = {
			"data connected", "data disconnected"
		}
		events.SMS = {
			"received from"
		}
		if util.contains({ "events_reporting", "snmp_trap_rules" }, service) then
			events["Signal strength"] = {
				"Signal strength dropped below -113 dBm",
				"Signal strength dropped below -98 dBm",
				"Signal strength dropped below -93 dBm",
				"Signal strength dropped below -75 dBm",
				"Signal strength dropped below -60 dBm",
				"Signal strength dropped below -50 dBm"
			}
		end

		table.insert(events.Reboot, "sms reboot")

		for _, v in pairs(all_modems) do
			if v.sim_count > 1 then
				for i = 1, v.sim_count do
					events["SIM switch"] = events["SIM switch"] or {}
					table.insert(events["SIM switch"], "to SIM"..i)
				end
				break
			end
		end
	end

	if board:has_ethernet() then
		events["Switch Events"] = {
			"Port link state",
			"Port speed for",
			"changed to DOWN",
			"changed to UP"
		}
		local res = util.ubus("port_events", "show", { })
		if res and res.ports then
			for _, value in ipairs(res.ports) do
				if value and value.name and (value.name:match("LAN$") or value.name:match("WAN")) then
					table.insert(events["Switch Events"], value.name .. (value.name:match("WAN") and "" or value.position))
				end
			end
		end
		events["Switch Topology"] = {
			"Changes in topology"
		}
	end

	if board:has_gps() then
		events.GPS = {
			"left geofence",
			"entered geofence"
		}
	end

	if board:has_wifi() then
		events.WiFi = {"client connected", "client disconnected"}
		table.insert(events.DHCP, "wifi")
	end

	events.Config = self:get_config_events()

	for k, v in pairs(events) do
		if #v > 1 then
			table.insert(events[k], 1, "all")
		end
	end
	self.all_events = events
	return self.all_events
end

return EventType
