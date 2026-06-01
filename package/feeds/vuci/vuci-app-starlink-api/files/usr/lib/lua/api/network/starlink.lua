local FunctionService = require("api/FunctionService")
local json = require("luci.jsonc")
local util = require("vuci.util")

local starlink = FunctionService:new()

local STARLINK_IP = "192.168.100.1"
local STARLINK_PORT = 9200
local STARLINK_API = "grpcurl -plaintext -d '%s' %s:%d SpaceX.API.Device.Device/Handle"
local CMDS = {
	STATUS = "{\"get_status\":{}}",
	STOW = "{\"dish_stow\":{}}",
	UNSTOW = "{\"dish_stow\":{\"unstow\":true}}",
	REBOOT = "{\"reboot\":{}}"
}
local CLASSES = {
	STATIONARY = "stationary",
	NOMADIC = "nomadic",
	MOBILE = "mobile"
}

local function send_command(cmd)
	return json.parse(util.exec(string.format(STARLINK_API, cmd, STARLINK_IP, STARLINK_PORT)))
end

function starlink:GET_TYPE_status()
	local status = send_command(CMDS.STATUS)
	if not status then
		return self:ResponseError("Failed to retrieve Starlink status")
	end
	local status_data = status.dishGetStatus or {}
	local formatted_data = {
		id = status_data.deviceInfo and status_data.deviceInfo.id,
		software_version = status_data.deviceInfo and status_data.deviceInfo.softwareVersion,
		hardware_version = status_data.deviceInfo and status_data.deviceInfo.hardwareVersion,
		uplink_throughput = status_data.uplinkThroughputBps,
		downlink_throughput = status_data.downlinkThroughputBps,
		pop_ping_drop_rate = status_data.popPingDropRate,
		pop_ping_latency = status_data.popPingLatencyMs,
		fraction_obstructed = status_data.obstructionStats and status_data.obstructionStats.fractionObstructed,
		currently_obstructed = status_data.obstructionStats and status_data.obstructionStats.currentlyObstructed,
		boresight_azimuth_deg = status_data.boresightAzimuthDeg,
		boresight_elevation_deg = status_data.boresightElevationDeg,
		mobility_class = CLASSES[status_data.mobilityClass],
		alerts = status_data.alerts
	}
	self:ResponseOK(formatted_data)
end

local actions = {
	{
		name = "stow",
		payload = CMDS.STOW,
	},
	{
		name = "unstow",
		payload = CMDS.UNSTOW,
	},
	{
		name = "reboot",
		payload = CMDS.REBOOT,
	}
}
for _, action in pairs(actions) do
	local name = action.name
	local payload = action.payload
	starlink[name] = function(self)
		local data = send_command(payload)
		if not data then
			return self:ResponseError("Failed to execute action: " .. name)
		end
		self:ResponseOK()
	end

	starlink:action(name, starlink[name])
end

return starlink
