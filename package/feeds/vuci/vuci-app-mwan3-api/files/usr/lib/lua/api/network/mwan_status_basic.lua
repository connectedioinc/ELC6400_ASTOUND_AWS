local FunctionService = require("api/FunctionService")
local fs = require "nixio.fs"
local network_lib = require("vuci.network_lib")
local util = require("vuci.util")

local mwan_status = FunctionService:new()

local MWAN3_STATUS_DIR = "/var/run/mwan3"
local MWAN3TRACK_STATUS_DIR = "/var/run/mwan3track"
local MWAN3_ACTIVE_WAN = "/var/run/mwan3/active_wan"


local function get_status(s, active_wan, member_lookup)
	local statuses = {}
	local function get_iface_status(sname)
		if statuses[sname] then
			return statuses[sname]
		end
		local status_file = MWAN3TRACK_STATUS_DIR .. "/" .. sname .. "/STATUS"
		statuses[sname] = fs.access(status_file) and fs.readfile(status_file):match("[^\n]*") or "notracking"
		return statuses[sname]
	end

	local function any_same_lowest_metric(interface)
		local min_metric = math.huge
		for iface, data in pairs(member_lookup) do
			if get_iface_status(iface) == "online" then
				min_metric = math.min(min_metric, data.metric)
			end
		end

		for iface, data in pairs(member_lookup) do
			if iface ~= interface and data.metric == min_metric and data.metric == member_lookup[interface].metric then
				return true
			end
		end
		return false
	end


	local status
	local enabled = s["enabled"] or "0"
	if fs.access(MWAN3_STATUS_DIR) then
		status = get_iface_status(s[".name"])
		if status == "online" and active_wan ~= s[".name"] and not any_same_lowest_metric(s[".name"]) then
			status = "standby"
		end
	else
		if enabled == "0" then
			status = "notracking"
		else
			status = "starting"
		end
	end
	return status
end

local function get_uptime(s, iface_status)
	for _, iface in ipairs(iface_status.interface or {}) do
		if iface.interface == s[".name"] then return iface.uptime or 0 end
	end
	return 0
end

local function get_track_ip(s)
	local track_ips = {}
	for file in fs.glob(MWAN3TRACK_STATUS_DIR .. "/" .. s[".name"] .. "/TRACK*") do
		local status = fs.readfile(file):match("[^\n]*")
		table.insert(track_ips, { ip = file:match("TRACK_(.*)$"), status = status })
	end
	return track_ips
end

function mwan_status:GET()
	local uci = require("vuci.uci").cursor()

	local active_wan, stats = nil, {}

	if fs.access(MWAN3_ACTIVE_WAN) then
		active_wan = fs.readfile(MWAN3_ACTIVE_WAN):match("[^\n]*")
	end

	local main_rule = {}
	uci:foreach("mwan3", "rule", function(s)
		main_rule = s
		return false
	end)

	local static_policies = {
		unreachable = true,
		blackhole = true,
		default = true
	}
	local mode_lookup = {
		mwan = "mwan_default",
		balance = "balance_default"
	}
	local default_policy = uci:get("mwan3", "default_rule", "use_policy") or main_rule.use_policy or ""
	if static_policies[default_policy] then
		local mode = uci:get("mwan3", "globals", "mode")
		default_policy = mode_lookup[mode] or mode
	end
	local policy_members = {}
	uci:foreach("mwan3", "policy", function(s)
		if not policy_members[s[".name"]] then
			policy_members[s[".name"]] = {}
		end
		for _, m in pairs(s.use_member or {}) do
			local member = uci:get_all("mwan3", m)
			member.weight = tonumber(member.weight or 1)
			member.metric = tonumber(member.metric or 1)
			if member.interface then
				policy_members[s[".name"]][member.interface] = member
			end
		end
	end)

	local total_weight = 0
	local member_lookup = policy_members[default_policy] or {}
	uci:foreach("mwan3", "interface", function(s)
		if not member_lookup[s[".name"]] then return end
		local status = get_status(s, active_wan, member_lookup)
		member_lookup[s[".name"]].status = status
		if status == "online" then
			total_weight = total_weight + member_lookup[s[".name"]].weight
		end
	end)

	local interface_status = util.ubus("network.interface", "dump") or {}
	uci:foreach("mwan3", "interface", function(s)
		if not member_lookup[s[".name"]] then return end
		local status = member_lookup[s[".name"]].status
		stats[s[".name"]] = {
			status = status,
			type = network_lib:get_network_type(s[".name"], uci),
			interval = tonumber(s["interval"] or 0),
			uptime = get_uptime(s, interface_status),
			track_ip = get_track_ip(s),
			load_balance = status == "online" and (tonumber(string.format("%.f", member_lookup[s[".name"]].weight / total_weight * 100))) or 0
		}
	end)

	self:ResponseOK(stats)
end

return mwan_status
