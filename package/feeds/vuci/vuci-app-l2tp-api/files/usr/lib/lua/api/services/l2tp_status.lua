local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local fs = require("nixio.fs")
local json = require("luci.jsonc")
local uci = require "vuci.uci".cursor()
local util_tlt = require("vuci.util_tlt")

local L2TP = FunctionService:new()


function L2TP:get_instance_uptime(time)
	if not time then return nil end
	local time_now = os.time(os.date("*t"))
	local uptime = util_tlt.seconds_to_days_hours_minutes_seconds(tonumber(time_now - time))
	return uptime
end

function L2TP:get_instance_status_code(sid, type)
	local STATUS = {
		DISCONNECTED = "0",
		CONNECTED = "1",
		RUNNING = "2",
		STOPPED = "3",
		DISABLED = "4"
	}

	if type == "client" then
		local disabled = uci:get("network", sid, "disabled")
		if disabled == "1" then return STATUS.DISABLED end
		local status_file = "/tmp/state/l2tp/" .. sid .. ".status"
		if fs.access(status_file) then
			return STATUS.CONNECTED
		else
			return STATUS.DISCONNECTED
		end
	elseif type == "server" then
		local enabled = uci:get("xl2tpd", sid, "enabled") or "0"
		if enabled ~= "1" then return STATUS.DISABLED end
		local instances = util.ubus("service", "list").xl2tpd
		if instances and instances.instances and instances.instances.instance1 and instances.instances.instance1.running then
			return STATUS.RUNNING
		else
			return STATUS.STOPPED
		end
	end
end

function L2TP:status_file_info(status_file)
	local local_ip, remote_ip, uptime
	local rx, tx = 0, 0
	local data = fs.readfile(status_file)
	if data then
		local info = json.parse(data) or {}
		local_ip = info.local_ip
		remote_ip = info.remote_ip
		uptime = self:get_instance_uptime(info.conndate)
		if info.interface then
			local link_data = util.file_exec("/sbin/ip", {"-j", "-s", "link", "show", info.interface}).stdout or ""
			if link_data ~= "" then
				local link_status = json.parse(link_data)
				if link_status and link_status[1] and link_status[1].stats64 then
					rx = tonumber(link_status[1].stats64.rx.bytes) or 0
					tx = tonumber(link_status[1].stats64.tx.bytes) or 0
				end
			end
		end
	end
	return local_ip, remote_ip, uptime, rx, tx
end

function L2TP:instances_status(sid, type)
	local status = self:get_instance_status_code(sid, type)
	local local_ip, remote_ip, uptime
	if type == "client" then
		logs = util.exec(string.format("logread | grep \" \\(xl2tpd\\|pppd\\)(%s)\\|Interface '%s' \\|netifd: %s\"", sid, sid, sid))
	else
		logs = util.exec(string.format("logread | grep \" \\(xl2tpd\\|pppd\\)(%s)\"", sid))
	end

	if type == "client" then
		local status_file = "/tmp/state/l2tp/" .. sid .. ".status"
		local server = uci:get("network", sid, "server")
		local username = uci:get("network", sid, "username")

		if fs.access(status_file) then
			local_ip, remote_ip, uptime, rx, tx = self:status_file_info(status_file)
		end
		return {
			status = status,
			server = server,
			username = username,
			local_ip = local_ip,
			remote_ip = remote_ip,
			uptime = uptime,
			rx = rx,
			tx = tx,
			logs = logs,
			device = "l2tp-" .. sid
		}

	elseif type == "server" then
		local peers = {}
		local rx_all = 0
		local tx_all = 0
		clients_all = 0
		connected_clients = 0
		local remote_ip, uptime
		local local_ip = uci:get("xl2tpd", sid, "localip")
		local start_ip = uci:get("xl2tpd", sid, "start")
		local end_ip = uci:get("xl2tpd", sid, "limit")
		local uptime_file = "/tmp/state/l2tp/uptime"
		if fs.access(uptime_file) then
			local time = fs.readfile("/tmp/state/l2tp/uptime")
			local uptime = self:get_instance_uptime(time)
		end

		uci:foreach("xl2tpd", "login", function(c)
			clients_all = clients_all + 1
			local username = c.username
			local device = c.device_name
			if not username or username == "" then return end
			local status_file = "/tmp/state/l2tp/" .. username .. ".status"
			if fs.access(status_file) then
				connected_clients = connected_clients + 1
				local_ip, remote_ip, uptime, rx, tx = self:status_file_info(status_file)
				rx_all = rx_all + rx
				tx_all = tx_all + tx
			else return end

				table.insert(peers, {
					username = username,
					local_ip = local_ip,
					remote_ip = remote_ip,
					uptime = uptime,
					rx = rx,
					tx = tx,
					device = device
				})
		end)
		return {
			status = status,
			uptime = uptime,
			peers = peers,
			local_ip = local_ip,
			start_ip = start_ip,
			end_ip = end_ip,
			clients_all = clients_all,
			clients_connected = connected_clients,
			rx = tostring(rx_all),
			tx = tostring(tx_all),
			logs = logs
		}
	end
end

function L2TP:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function L2TP:GET_TYPE_status()
	if self._single then
		local type
		uci:foreach("network", "interface", function(c)
			if c.proto and c.proto == "l2tp" then
				if c[".name"] == self.sid then type = "client" end
			end
		end)
		if not type then
			uci:foreach("xl2tpd", "service", function(c)
				if c[".name"] == self.sid then type = "server" end
			end)
		end
		if type then
			local status = self:instances_status(self.sid, type)
			if status then
				return self:ResponseOK(status)
			end
		end
		return self:ResponseNotFound("Section not found")
	else
		local statuses = {}
		uci:foreach("network", "interface", function(c)
			if c.proto and c.proto == "l2tp" then
				local sid = c[".name"]
				statuses[sid] = self:instances_status(sid, "client")
			end
		end)
		uci:foreach("xl2tpd", "service", function(c)
			local sid = c[".name"]
			statuses[sid] = self:instances_status(sid, "server")
		end)
		return self:ResponseOK(statuses)
	end
end

return L2TP
