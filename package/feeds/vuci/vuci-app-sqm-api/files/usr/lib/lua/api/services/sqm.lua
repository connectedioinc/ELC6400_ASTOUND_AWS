local ConfigService = require("api/ConfigService")
local fs = require "nixio.fs"
local run_path = "/tmp/run/sqm/available_qdiscs"
local util = require("vuci.util")
local board = require("vuci.board")

local sqm = ConfigService:new()
sqm.queue_setup_scripts = {
	cake = {
		"layer_cake.qos",
		"piece_of_cake.qos",
	},
	fq_codel = {
		"simple.qos",
		"simplest.qos",
		"simplest_tbf.qos"
	}
}

-- Gets SQM queue setup scripts
---@return table data SQM queue setup scripts
function sqm:get_queue_setup_scripts()
	local data = {}
	if fs.stat(run_path) then
		for file in fs.dir(run_path) do
			if self.queue_setup_scripts[file] then
				data[file] = self.queue_setup_scripts[file]
			end
		end
	end
	return data
end

function sqm:GET_TYPE_options()
	self:ResponseOK(self:get_queue_setup_scripts())
end

local s = sqm:section("sqm", "queue")
s:make_primary()
local opt_cfgname = s.default_options.id
opt_cfgname.maxlength = 16
function opt_cfgname:validate(value)
	return self.dt:default_validation(value)
end

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "download", "upload" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local interface = s:option("interface")
		function interface:validate(value)
			local devices_status = require("vuci.devices_status_lib"):new(self.uci)
			local default_physical_devices = board:get_all_physical_ifnames()
			local has_dsa = board:has_dsa()
			local available_interfaces, used_devices = {}, {}

			local devices = devices_status:get_device_status()
			for _, device in ipairs(devices) do
				if device.type == "bridge" then
					for _, member in ipairs(device["bridge-members"] or {}) do
						if util.contains(default_physical_devices, member) then
							used_devices[member] = true
						end
					end
				elseif device.type == "VLAN" then
					local bridge = device.name:match("^(.+)%.%d+$")
					if bridge then used_devices[bridge] = true end
				elseif has_dsa and device.type == "DSA CPU" then
					used_devices[device.name] = true
				end
			end
			for _, device in ipairs(devices) do
				if device.name and device.name ~= "lo" and not device.name:match("^wwan")
					and not device.name:match("^rmnet") and device.type ~= "vrf" and not used_devices[device.name] then
					table.insert(available_interfaces, device.name)
				end
			end
			return self.dt:check_array(value, available_interfaces)
		end

	local download = s:option("download")
		function download:validate(value)
			return self.dt:irange(value, 0, 2147483647)
		end

	local upload = s:option("upload")
		function upload:validate(value)
			return self.dt:irange(value, 0, 2147483647)
		end

	local qdisc = s:option("qdisc")
		function qdisc:validate(value)
			local disciplines = {}
			for k, _ in pairs(self:get_queue_setup_scripts()) do
				table.insert(disciplines, k)
			end
			return self.dt:check_array(value, disciplines)
		end

	local script = s:option("script")
		function script:validate(value)
			local qdisc_value = self:get_abs_value(self.main_config, self.sid, "qdisc")
			local scripts = self:get_queue_setup_scripts()
			if not scripts[qdisc_value] then
				return false, string.format("Invalid 'qdisc' value. Available values [%s].", table.concat(util.keys(scripts), ", "))
			end
			return self.dt:check_array(value, scripts[qdisc_value])
		end

return sqm
