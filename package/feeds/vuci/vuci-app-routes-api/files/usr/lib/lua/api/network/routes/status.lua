local FunctionService = require("api/FunctionService")
local ip = require("luci.ip")
local util = require("vuci.util")
local uci = require("vuci.uci").cursor()
local sys = require("vuci.sys")
local board = require("vuci.board")

local route_status = FunctionService:new()

local function get_ip_addrs()
	local nw = require "vuci.network".init(uci)
	local ips = {}
	for _, v in ipairs(nw:get_interfaces()) do
		for _, a in ipairs(v:ipaddrs()) do
			ips[#ips + 1] = {
				a:host():string(),
				v:shortname()
			}
		end
	end
	return ips
end

local function get_routes_tables()
	local fs = require("nixio.fs")
	local rtn = {
		['255'] = "local",
		['254'] = "main",
		['253'] = "default",
		['0'] = "unspec"
	}
	if fs.access("/etc/iproute2/rt_tables") then
		for ln in io.lines("/etc/iproute2/rt_tables") do
			local i, n = ln:match("^(%d+)%s+(%S+)")
			if i and n then
				rtn[i] = n
			end
		end
	end
	return rtn
end

local function duid_hints()
	local ipv6leases = util.ubus("dhcp", "ipv6leases")
	local hints = {}

	if not ipv6leases then return hints end
	for device, v in pairs(ipv6leases.device) do
		for _, lease in pairs(v.leases) do
			if lease["duid"] and lease["hostname"] then
				local duplicate = false
				for _, hint in pairs(hints) do
					if hint[1] == lease["duid"] then duplicate = true end
				end
				if not duplicate then
					local hint = {}
					hint[1] = lease["duid"]
					hint[2] = lease["hostname"]
					table.insert(hints, hint)
				end
			end
		end
	end

	return hints
end

function route_status:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function route_status:GET_TYPE_status()
	local section = self.sid
	if section and (section == "ipv6_hints" or section == "duid_hints") and board:is_switch() then
		return self:ResponseError("Not found")
	elseif section and section == "mac_hints" then
		return self:ResponseOK(sys.net.mac_hints())
	elseif section and section == "ipv4_hints" then
		return self:ResponseOK(sys.net.ipv4_hints())
	elseif section and section == "ipv6_hints" then
		return self:ResponseOK(sys.net.ipv6_hints())
	elseif section and section == "duid_hints" then
		return self:ResponseOK(duid_hints())
	elseif section and section == "ip_addresses" then
		return self:ResponseOK(get_ip_addrs())
	elseif section and section == "routes_tables" then
		return self:ResponseOK(get_routes_tables())
	elseif not section then
		local routes_status = {}
		routes_status["mac_hints"] = sys.net.mac_hints()
		routes_status["ipv4_hints"] = sys.net.ipv4_hints()
		if not board:is_switch() then routes_status["ipv6_hints"] = sys.net.ipv6_hints() end
		routes_status["ip_addresses"] = get_ip_addrs()
		routes_status["routes_tables"] = get_routes_tables()
		
		return self:ResponseOK(routes_status)
	end
	return self:ResponseError("Not found")
end

return route_status
