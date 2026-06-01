local pac = require("vuci.package_checker")

local wg_utils = {}

wg_utils.has_mwan3 = pac.is_installed("mwan3")

function wg_utils:resolve_ip(url)
	local nixio = require "nixio"
	local info = nixio.getaddrinfo(url, "inet")
	local addr = {}
	if info then
		for _, v in pairs(info) do
			if v.address then
				if v.family == "inet" then addr[#addr+1] = v.address .. "/32" end
				if v.family == "inet6" then addr[#addr+1] = v.address .. "/128" end
			end
		end
	end
	return addr
end

function wg_utils:update_mwan_rules(service, instance_sid)
	local disabled = service:table_get(service.config, instance_sid, "disabled") or "1"
	service:table_foreach(service.config, "wireguard_" .. instance_sid, function(s)
		local allowed_ips = service:table_get(service.config, s[".name"], "allowed_ips") or {}
		local endpoint_host = service:table_get(service.config, s[".name"], "endpoint_host")
		local defaultroute = false

		for _, allowed_ip in pairs(allowed_ips) do
			if allowed_ip == "0.0.0.0/0" or allowed_ip == "::/0" then
				defaultroute = true
				break
			end
		end

		if disabled == "1" or defaultroute == false then
			if service.uci:get("mwan3", "wg_" .. instance_sid .. "_d") then
				self:remove_mwan_rules(service, instance_sid)
			end
			return
		end

		local mwan = require "vuci.mwan".init(service.uci)
		local mwan_enabled = false

		service:table_foreach("mwan3", "interface", function(s)
			if s.enabled == "1" then
				mwan_enabled = true
			end
		end)

		local int_opt = {
			enabled = (mwan_enabled == true) and 1 or 0,
			family = 'ipv4',
			interval = 3,
			service = "wireguard"
		}
		mwan:add_mwan(instance_sid, int_opt)
		local interface = mwan:get_interface(instance_sid)
		local member = interface:get_member(instance_sid .. "_member_mwan")
		local sid_max_len = string.sub(instance_sid, 1, 5)
		local vpn_policy = member:add_policy("mwan_wg_" .. sid_max_len)
		service:table_set("mwan3", "mwan_wg_" .. sid_max_len, "last_resort", "unreachable")
		if vpn_policy then
			local opt = {
				sticky = "0",
				dest_ip = { "0.0.0.0/0" },
				proto = "all",
				family = "ipv4"
			}
			vpn_policy:add_rule("wg_" .. instance_sid .. "_d", opt)
		end

		local def_policy = mwan:get_policy("mwan_default")
		local server_ip = self:resolve_ip(endpoint_host)
		if def_policy then
			local opt = {
				sticky = "0",
				dest_ip = server_ip,
				proto = "all",
				family = "ipv4"
			}
			if service.uci:get("mwan3", "wg_" .. instance_sid .. "_s") then def_policy:del_rule("wg_" .. instance_sid .. "_s") end
			def_policy:add_rule("wg_" .. instance_sid .. "_s", opt)
		end
		if service.uci:get("mwan3", "wg_" .. instance_sid .. "_s") and service.uci:get("mwan3", "wg_" .. instance_sid .. "_d") then
			service.uci:reorder("mwan3", {"wg_" .. instance_sid .. "_s",  "wg_" .. instance_sid .. "_d"})
		end
	end)
end

function wg_utils:remove_mwan_rules(service, instance_sid)
	local mwan = require "vuci.mwan".init(service.uci)
	local sid_max_len = string.sub(instance_sid, 1, 5)
	local vpn_policy = mwan:get_policy("mwan_wg_" .. sid_max_len)
	if vpn_policy then
		vpn_policy:del_rule("wg_" .. instance_sid .. "_d")
	end
	local def_policy = mwan:get_policy("mwan_default")
	if def_policy then
		def_policy:del_rule("wg_" .. instance_sid .. "_s")
	end
	mwan:del_policy("mwan_wg_" .. sid_max_len)
	mwan:del_interface(instance_sid)
end

return wg_utils
