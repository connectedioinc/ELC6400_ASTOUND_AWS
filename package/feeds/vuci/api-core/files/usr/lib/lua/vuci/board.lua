-- TODO: comment functions to explain what they mean
local json = require "luci.jsonc"
local nixio = require "nixio"
local fs = require "nixio.fs"
local util = require "vuci.util"
local board_filename = "/etc/board.json"
local lock_filename = "/var/run/board_modem.lock"

local base_hwinfo_options = {
	dual_sim = false,
	esim = false,
	dual_modem = false,
	mbus = false,
	usb = false,
	sd_card = false,
	bluetooth = false,
	wifi = false,
	dual_band_ssid = false,
	wps = false, -- Cannot be removed as it exists in API docs
	mobile = false,
	gps = false,
	ethernet = false,
	sfp_port = false,
	ios = false,
	at_sim = false,
	rs232 = false,
	rs485 = false,
	console = false,
	poe = false,
	hw_nat = false,
	nat_offloading = false,
	gigabit_port = false,
	["2_5_gigabit_port"] = false,
	dsa = false,
	port_link = false,
	micro_usb = false,
	baseband = false,
	pppmobile = false,
	bpoffload = false,
	qrtrpipes = false,
	verified_boot = false,
	rootfs_part = false,
	boot_part = false,
	testing_kernel = false,
	downstream_kernel = false,
	hnat = false,
	serial = false,
	modbus = false,
	io = false,
	dot1x_client = false,
	power_ios = false,
	single_port = false,
	guest_wifi = false,
	bt = false,
	tpm = false,
	rndis = false,
	ncm = false,
	port_mirror = false,
	usb_port = false,
	smp = false,
	soft_port_mirror = false,
	high_watchdog_priority = false,
	vendor_wifi = false,
	mt7981_wifi = false,
	basic_router = false,
	serial_reset_quirk = false,
	bacnet = false,
	ntrip = false,
	multi_device = false,
	gateway = false,
	access_point = false,
	["64mb_ram"] = false,
	["128mb_ram"] = false,
	ledman_lite = false,
	sw_offload = false,
	hw_offload = false,
	tlt_failsafe_boot = false,
	modem_reset_quirk = false,
	hi_storage = false,
	["xfrm-offload"] = false,
	industrial_access_point = false,
	reset_button = false,
	consumer_access_point = false,
	stm_can = false,
	user_led = false
}

local function file_exists(path)
	local f = io.open(path, "r")
	if f then f:close() end
	return f ~= nil
end

local function unlock(path)
	os.execute("lock -u " .. path)
end

local function lock(path)
	if not file_exists(path) then return end
	local max_wait_time = 10
	local start_time = os.time()
	while true do
		local exit_code = os.execute("lock -n " .. path .. " 2>/dev/null")
		if exit_code == 0 then break end
		if os.time() - start_time >= max_wait_time then
			unlock(path)
			os.execute("lock " .. path)
			break
		end
		nixio.nanosleep(0, 100 * 1000 * 1000) -- 100ms
	end
end

---Refreshes board.json data
---@return table board_data Data from board.json file
local function refresh_board()
	-- need to lock board.json because there's a small chance that it will be read when it is being edited.
	lock(lock_filename)
	if fs.access(board_filename) then
		local data = json.parse(fs.readfile(board_filename) or "")
		if type(data) == "table" and type(data.hwinfo) == "table" then
			for k, v in pairs(base_hwinfo_options) do
				data.hwinfo[k] = data.hwinfo[k] or v
			end
			unlock(lock_filename)
			return data
		end
	end
	unlock(lock_filename)
	return {}
end

local board = refresh_board()

local Board = {}

function Board:get_family_name()
	if board.model then
		return board.model.platform or ""
	end
	return ""
end

function Board:_supports_hardware(type)
	if board.hwinfo then
		return board.hwinfo[type] or false
	end
	return false
end

function Board:has_dual_sim()
	return self:_supports_hardware("dual_sim")
end

function Board:has_esim()
	return self:_supports_hardware("esim")
end

function Board:has_dual_modem()
	return self:_supports_hardware("dual_modem")
end

function Board:has_soft_port_mirror()
	return self:_supports_hardware("soft_port_mirror")
end

function Board:has_single_port()
	return self:_supports_hardware("single_port")
end

function Board:has_can()
	return self:_supports_hardware("stm_can")
end

function Board:has_mbus()
	local mbus = false
	local serial_data = self:get_serial_info()
	if serial_data then
		for k, v in pairs(serial_data) do
			if v.devices[1] == "mbus" then
				mbus = true
				break
			end
		end
	end
	return mbus
end

function Board:has_usb()
	return self:_supports_hardware("usb")
end

function Board:has_sd()
	return self:_supports_hardware("sd_card")
end

function Board:has_bluetooth()
	return self:_supports_hardware("bluetooth")
end

function Board:has_wifi()
	return self:_supports_hardware("wifi")
end

function Board:has_dual_band_ssid()
	return self:_supports_hardware("dual_band_ssid")
end

function Board:has_mobile()
	return self:_supports_hardware("mobile")
end

function Board:has_gps()
	return self:_supports_hardware("gps")
end

function Board:has_ethernet()
	return self:_supports_hardware("ethernet")
end

function Board:has_sfp_port()
	return self:_supports_hardware("sfp_port")
end

function Board:has_ios()
	return self:_supports_hardware("ios")
end

function Board:has_power_ios()
	return self:_supports_hardware("power_ios")
end

function Board:has_urc_control()
	return self:_supports_hardware("urc_control")
end

function Board:has_at_sim()
	return self:_supports_hardware("at_sim")
end

function Board:has_rs232()
	return self:_supports_hardware("rs232")
end

function Board:has_rs485()
	return self:_supports_hardware("rs485")
end

function Board:has_console()
	return self:_supports_hardware("console")
end

function Board:has_poe()
	return self:_supports_hardware("poe")
end

function Board:has_serial()
	return self:has_usb() or self:has_rs232() or self:has_rs485() or self:has_console() or self:has_mbus()
end

function Board:has_serial_without_mbus()
	return self:has_usb() or self:has_rs232() or self:has_rs485() or self:has_console()
end

function Board:has_hw_nat()
	return self:_supports_hardware("hw_nat")
end

function Board:has_sw_nat()
	return self:_supports_hardware("nat_offloading")
end

function Board:has_gigabit_port()
	return self:_supports_hardware("gigabit_port")
end

function Board:has_2_5_gigabit_port()
	return self:_supports_hardware("2_5_gigabit_port")
end

function Board:has_rs232_control()
	return self:_supports_hardware("rs232_control")
end

function Board:has_reset_button()
	return self:_supports_hardware("reset_button")
end

function Board:has_128mb_ram()
	return self:_supports_hardware("128mb_ram")
end

function Board:get_all()
	board = refresh_board()
	-- return shallow copy to prevent external modifications (e.g. '/api/system/device/status')
	return util.clone(board) or {}
end

function Board:get_default_lan_ifname()
	return board.network and board.network.lan and (board.network.lan.device or board.network.lan.ports)
end

function Board:get_default_lan_ip()
	return board.network and board.network.lan and board.network.lan.default_ip
end

function Board:get_default_wan_ifname()
	return board.network and board.network.wan and board.network.wan.device
end

function Board:get_all_physical_ifnames()
	local ifnames = {}
	local lan_ifname = self:get_default_lan_ifname()
	local wan_ifname = self:get_default_wan_ifname()
	ifnames = type(lan_ifname) == "table" and lan_ifname or {lan_ifname}
	if wan_ifname then
		table.insert(ifnames, wan_ifname)
	end
	return ifnames
end

function Board:get_max_vlans()
	return board.network_options.vlans
end

function Board:get_switch_roles()
	return board.switch and board.switch.switch0 and board.switch.switch0.roles or {}
end

function Board:get_wlan_bssid_limit(dev)
	if dev == "radio0" then
		return board.wlan and board.wlan.wlan0 and board.wlan.wlan0.bssid_limit
	elseif dev == "radio1" then
		return board.wlan and board.wlan.wlan1 and board.wlan.wlan1.bssid_limit
	end
	return nil
end

---Gets modem list from board.json file
---Useful when we need to check if device should have a modem.
---@return table modems Modem list from board.json file.
function Board:get_modem_info()
	return (function ()
		--- Refreshes board cache to prevent old data.
		--- Because modems can connect after uhttpd service init and old board is not valid anymore.
		board = refresh_board()
		return board.modems or {}
	end)()
end

function Board:get_serial_info()
	return board.serial or {}
end

function Board:network()
	return board.network
end

function Board:poe()
	return board.poe
end

function Board:has_dsa()
	return self:_supports_hardware("dsa")
end

function Board:has_port_link()
	return self:_supports_hardware("port_link")
end

function Board:get_switch_ports()
	return board.switch and board.switch.switch0 and board.switch.switch0.ports or {}
end

function Board:get_readonly_vlans()
	return board.network_options and board.network_options.readonly_vlans or 0
end

function Board:get_multi_tag_support()
	return board.hwinfo.multi_tag
end

function Board:get_custom_proto()
	return board.custom_proto or nil
end

function Board:get_custom_ifname()
	return board.custom_ifname or nil
end

function Board:get_micro_usb_support()
	return board.hwinfo.micro_usb
end

function Board:get_max_mtu()
	return board.network_options and board.network_options.max_mtu
end

function Board:get_switch()
	return board.switch or {}
end

function Board:has_switch()
	return board.switch and true or false
end

function Board:has_tpm()
	return self:_supports_hardware("tpm")
end

function Board:is_switch()
	return board.hwinfo.switch
end

function Board:is_gateway()
	return board.hwinfo.gateway
end

function Board:is_ap()
	return board.hwinfo.access_point
end

function Board:is_industrial_ap()
	return board.hwinfo.industrial_access_point
end

function Board:is_X86()
	return self:get_family_name() == "X86_64"
end

function Board:is_cap()
	return board.hwinfo.consumer_access_point
end

function Board:get_tsw_ports()
	local ports = {}
	for _, port in ipairs(board and board.network and board.network.static and board.network.static.ports or {}) do
		table.insert(ports, port.name)
	end
	return ports
end

function Board:get_vlan0()
	return board.network_options and board.network_options.vlan0
end

function Board:get_port_security()
	return board.port_security or false
end

function Board:has_xfrm_offload()
	return self:_supports_hardware("xfrm-offload")
end

-- TODO: Update with real flag in next releases
function Board:has_static_mobile_ifaces()
	local mnf = util.ubus("mnfinfo", "get")
	if type(mnf) == "table" and type(mnf.mnfinfo) == "table" then
		return (mnf.mnfinfo.name or ""):match("^RUT361") ~= nil
	end
end

function Board:has_user_led()
	return self:_supports_hardware("user_led")
end
return Board
