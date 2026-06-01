local fs = require("nixio.fs")
local util = require "vuci.util"
local board = require("vuci.board")

local pac = {}

-- supports multiple flags: '/' means OR, '-' means AND
local excluded_packages = {
	ios                         = {
		"iomand", "iojuggler", "vuci-app-io-api", "vuci-app-io-ui", "post-get"
	},
	wifi                        = {
		"wireless-regdb", "wireless-tools", "vuci-app-wireless-api", "vuci-app-wireless-ui", "vuci-app-wifi-scanner-api",
		"vuci-app-wifi-scanner-ui", "wifi_scanner", "ipq-wifi-teltonika_rutx"
	},
	gps                         = {
		"gpsctl", "gpsd", "ntp_gps", "vuci-app-gps-ui", "vuci-app-gps-api", "libgps", "snmp-mod-gps"
	},
	usb                         = {
		"kmod-usb-storage", "vuci-app-memory-expansion-ui", "vuci-app-memory-expansion-api", "vuci-app-usb-tools-ui",
		"vuci-app-usb-tools-api", "libusb-1.0-0", "fmt-usb-msd", "kmod-phy-ath79-usb", "kmod-usb-acm", "kmod-usb-core",
		"kmod-usb-ehci", "kmod-usb-net-qmi-wwan", "kmod-usb-net", "kmod-usb-printer", "kmod-usb-serial-ark3116",
		"kmod-usb-serial-belkin", "kmod-usb-serial-ch341", "kmod-usb-serial-cp210x", "kmod-usb-serial-cypress-m8",
		"kmod-usb-serial-ftdi", "kmod-usb-serial-option", "kmod-usb-serial-pl2303", "kmod-usb-serial-wwan",
		"kmod-usb-serial", "kmod-usb-wdm", "kmod-usb2"
	},
	["rs232/rs485/usb/console"] = {
		"sodog-tlt", "modbusgwd", "ntrip_client_v2", "vuci-app-overip-ui", "vuci-app-overip-api",
		"vuci-app-modbus-serial-gateway-ui", "vuci-app-modbus-serial-gateway-api", "vuci-app-sodog-ui",
		"vuci-app-sodog-api", "vuci-app-getty-ui", "vuci-app-getty-api", "vuci-app-ntrip-ui", "vuci-app-ntrip-api",
		"vuci-app-modbus-serial-api", "vuci-app-modbus-serial-ui", "vuci-app-modem-control-api"
	},
	mobile                      = {
		"mobifd", "mobutils-call_utilities", "mobutils-sms_utilities", "mobutils", "vuci-app-mobile-api",
		"vuci-app-mobile-ui", "vuci-app-mobile-usage-api", "vuci-app-mobile-usage-ui", "vuci-app-mobile-utilities-api",
		"vuci-app-mobile-utilities-ui", "vuci-app-call-utilities-api", "vuci-app-call-utilities-ui", "post-get-mobile",
		"sim_switch", "vuci-app-modem-control-api"
	},
	bluetooth                   = {
		"kmod-bluetooth", "vuci-app-bluetooth-api", "vuci-app-bluetooth-ui"
	},
	port_link = {
		"vuci-app-ports-settings-api", "vuci-app-ports-settings-ui"
	}
}

local function remove_from_array(array, value)
	for i, v in ipairs(array) do
		if v == value then
			table.remove(array, i)
			break
		end
	end
end

pac.is_installed = function(name)
    local location = "/usr/lib/opkg/info/%s.control"
    local local_location = "/usr/local/usr/lib/opkg/info/%s.control"

    local control_path = string.format(location, name)
    local local_control_path = string.format(local_location, name)

    return fs.access(control_path) or fs.access(local_control_path)
end

pac.list_control_files = function()
	local files = {}
	for file in fs.glob("/usr/lib/opkg/info/*.control") do
		table.insert(files, file)
	end
	for file in fs.glob("/usr/local/usr/lib/opkg/info/*.control") do
		table.insert(files, file)
	end
	for board_flag, packages in pairs(excluded_packages) do
		local split_board_flag = {}
		local has_flag
		if board_flag:find("/") then
			split_board_flag = util.split(board_flag, "/")
			for _, single_flag in ipairs(split_board_flag) do
				has_flag = board["has_" .. single_flag](board)
				if has_flag then break end
			end
		elseif board_flag:find("-") then
			split_board_flag = util.split(board_flag, "-")
			for _, single_flag in ipairs(split_board_flag) do
				has_flag = board["has_" .. single_flag](board)
				if not has_flag then break end
			end
		else
			has_flag = board["has_" .. board_flag](board)
		end

		if not has_flag then
			for _, pkg in ipairs(packages) do
				remove_from_array(files, ("/usr/lib/opkg/info/%s.control"):format(pkg))
				remove_from_array(files, ("/usr/local/usr/lib/opkg/info/%s.control"):format(pkg))
			end
		end
	end
	return files
end

return pac
