local FunctionService = require("api/FunctionService")
local util = require "vuci.util"

local Samba = FunctionService:new()

function Samba:ubus_samba_status()
	local running = util.ubus("service", "list", {name="samba"})
	if not running then return false end
	if not running.samba then return false end
	if not running.samba.instances then return false end
	if not running.samba.instances.instance1 then return false end
	if not running.samba.instances.instance2 then return false end
	if not running.samba.instances.instance1.running then return false end
	if not running.samba.instances.instance2.running then return false end
	return true
end

function Samba:samba_status()
	local status = self:ubus_samba_status()

	local sessions = util.exec("netstat -tn | grep -E ':445|:139'")
	local hosts = {}
	local host = {}
	if sessions then
		for line in sessions:gmatch("[^\r\n]+") do
			for h in line:gmatch("%S+") do
				table.insert(host, h)
			end
			table.insert(hosts, host[5])
			host = {}
		end
	end

	return {
		running = status,
		sessions = hosts
	}
end

function Samba:GET_TYPE_status()
	local status = self:samba_status()
	local f = io.open("/etc/samba/smb.conf", "r")
	if not f then
		self:add_critical_error(1, "Failed to read samba config file.")
	end
	local output = {}

	for line in f:lines() do
		if line == "" then break end
		table.insert(output, line)
	end
	f:close()
	return self:ResponseOK({config_file = output, running = status.running, active_sessions = status.sessions})
end

return Samba
