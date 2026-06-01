
local FunctionService = require("api/FunctionService")
local info = FunctionService:new()
local fs = require "nixio.fs"
local util = require "vuci.util"
local json = require "luci.jsonc"
local boardinfo = require("vuci.board")

function info:GET_TYPE_status()
	local uci = require "vuci.uci".cursor()
	local data = {}
	data.board = boardinfo:get_all()


	local res = util.ubus("mnfinfo", "get")
	local mnfinfo = res and res.mnfinfo or {}
	data.mnfinfo = {}
	data.mnfinfo.name = mnfinfo.name
	data.mnfinfo.serial = mnfinfo.serial
	data.mnfinfo.mac = mnfinfo.mac
	data.mnfinfo.macEth = mnfinfo.macEth
	data.mnfinfo.batch = mnfinfo.batch
	data.mnfinfo.hwver = mnfinfo.hwver
	data.mnfinfo.blver = mnfinfo.blver
	data.mnfinfo.branch = mnfinfo.branch ~= "" and mnfinfo.branch or nil

	if not boardinfo:is_switch() then
		local port_name = {
			lan = true,
			wan = true,
			eth = true
		}
		local ports = util.ubus("port_events", "show") or {}
		if ports.ports then
			data.ports = {}
			for _, port in ipairs(ports.ports) do
				if port.mac and port.name and port_name[string.lower(port.name)] then
					table.insert(data.ports, {
						name = port.name,
						num = port.num,
						position = port.position,
						mac = port.mac,
					})
				end
			end
		end
	end

	if boardinfo:has_esim() then
		data.mnfinfo.sim1_boot_iccid = mnfinfo.sim1_boot_iccid
		data.mnfinfo.sim2_boot_iccid = mnfinfo.sim2_boot_iccid
		data.mnfinfo.sim3_boot_iccid = mnfinfo.sim3_boot_iccid
		data.mnfinfo.sim4_boot_iccid = mnfinfo.sim4_boot_iccid
	end


	local system_cfg = uci:get_all("system", "system") or uci:get_all("system", "@system[0]")
	local static = util.ubus("system", "board") or {}
	static.hostname = system_cfg.hostname
	static.device_name = system_cfg.devicename
	static.fw_version = util.trim(fs.readfile("/etc/version"))
	local fw_date = fs.readfile("/etc/firmware-date")
	if fw_date then
		local date_num = tonumber(fw_date)
		if date_num then
			static.fw_build_date = os.date("%Y-%m-%d %H:%M:%S", date_num)
		end
	end
	static.cpu_count = 0
	for _ in fs.readfile("/proc/cpuinfo"):gmatch("processor%s*:%s*%d+") do
		static.cpu_count = static.cpu_count + 1
	end
	data.static = static


	local features = {}
	features.ipv6 = not not fs.access("/proc/net/ipv6_route")
	data.features = features


	local esd_info = util.ubus("serial", "usb_adapters")
	if esd_info then
		local external_serial_devices = {}
		for device, externals in pairs(esd_info) do
			if #externals > 0 then
				for _, external in ipairs(externals) do
					table.insert(external_serial_devices, device .. "_" .. external)
				end
			end
		end

		data.board.serial = data.board.serial or {}
		table.insert(data.board.serial, { external_devices = external_serial_devices })
	end

	return self:ResponseOK(data)
end

return info
