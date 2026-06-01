local ConfigService = require("api/ConfigService")
local fs = require("nixio.fs")
local util = require("vuci.util")
local ulog_utils = require("api.services.ulog_utils")

local UlogGeneral = ConfigService:new({
	create = false,
	delete = false
})

-- Gets log data for ulog
---@return table log Ulog log data
function UlogGeneral:log()
	local data = {
		traffic_log = "",
		enabled = self:table_get("ulogd", "global", "enabled") or "0",
		ftp_enabled = self:table_get("ulogd", "ftp", "enabled") or "1"
	}
	local log_file = self:table_get("ulogd", "emu1", "file")
	if log_file and fs.access(log_file) then
		data.traffic_log = fs.readfile(log_file)
	end
	return data
end

function UlogGeneral:GET_TYPE_status()
	self:ResponseOK(self:log())
end

local Ulog = UlogGeneral:section("ulogd", "ulogd")
function Ulog:filter(s)
	return s[".name"] == "global"
end

local opt_enabled = Ulog:option("enabled")
function opt_enabled:validate(value)
	return self.dt:is_bool(value)
end

local opt_network = Ulog:option("network", { list = true })
function opt_network:validate(value)
	return self.dt:check_array(value, ulog_utils:networks())
end

function opt_network:get()
	local network_pretty = util.get_network_map(self, true)
	local networks = {}
	local cfg_network = self:table_get("ulogd", "global", "network")
	local available_networks = ulog_utils:networks()
	if cfg_network and available_networks then
		for _, network in ipairs(cfg_network) do
			network = network_pretty[network] or network
			if util.contains(available_networks, network) then
				table.insert(networks, network)
			end
		end
	end
	return networks
end

function opt_network:set(value) util.network_mapper_set(self, value) end

return UlogGeneral
