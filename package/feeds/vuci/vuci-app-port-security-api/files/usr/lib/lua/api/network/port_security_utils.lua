local Utils = {}
local board = require("vuci.board")
local fs = require "nixio.fs"
local json = require "luci.jsonc"
local port_security_options = board:get_port_security()
local using_vlans = port_security_options and port_security_options.isolation_method == "vlan"

function Utils.get_used_vlans()
	if not using_vlans then return 0 end
	local uci = require("vuci.uci").cursor()
	local count = 0
	uci:foreach("dot1x", "port", function(s)
		if s["enabled"] ~= "1" or s["role"] ~= "server" then return end
		count = count + 1
	end)
	return count
end

function Utils.get_isolation_vids(self, ignore_isolation)
	local used_vids = {}
	self:table_foreach("network", "switch_vlan", function(s)
		if ignore_isolation and s.isolation == "1" then return end
		used_vids[tostring(s.vlan)] = true
	end)
	local valid_isolation_vlans = {}
	for i = 1950, 2000, 1 do
		if not used_vids[tostring(i)] then
			valid_isolation_vlans[#valid_isolation_vlans+1] = i
		end
	end
	return valid_isolation_vlans
end

function Utils.update_isolation_vlans(self)
	local isolation_vlans = self:table_find_many("network", "switch_vlan", {isolation = "1"})
	local valid_isolation_vlans = Utils.get_isolation_vids(self, true)
	local isolation_id = 1
	for _, vlan in ipairs(isolation_vlans) do
		self:table_set("network", vlan[".name"], "vlan", valid_isolation_vlans[isolation_id])
		isolation_id = isolation_id+1
	end
end

function Utils.validate_vlan_deletion(self)
	local vid = self:table_get(self.main_config, self.sid, "vlan")
	local used_in = {}
	self:table_foreach("dot1x", "port", function(s)
		if s.role ~= "server" then return end
		local used = false
		if s.accept_vlan == vid or s.accept_vlan == self.sid then used = true end
		if s.fallback_vlan == vid or s.fallback_vlan == self.sid then used = true end
		if s.reject_vlan == vid or s.reject_vlan == self.sid then used = true end
		if s.guest_vlan == vid or s.guest_vlan == self.sid then used = true end
		if used then table.insert(used_in, s[".name"]) end
	end)
	if #used_in > 0 then
		self:add_critical_error(STD_CODES.CONF_DEL_DISALLOWED, string.format("Section: %s is used in 802.1X server %s configuration%s", self.sid, table.concat(used_in, ", "), #used_in > 1 and "s" or ""), "UCI")
	end
end

function Utils.get_port_authorized(self, sid)
	local enabled = self:table_get("dot1x", sid, "enabled")
	if enabled ~= "1" then return nil end
	local role = self:table_get("dot1x", sid, "role")
	if role ~= "server" then return nil end
	local iface = self:table_get("dot1x", sid, "iface")
	if not iface then return nil end
	local blocked = false
	for _, path in ipairs({"/tmp/port_security/port_state/"..iface, "/tmp/run/dot1x_server/state/"..iface}) do
		if fs.access(path) then
			if not using_vlans then
				blocked = true
			else
				local state = json.parse(fs.readfile(path))
				if state and state.blocked then
					blocked = true
				end
			end
		end
	end
	return blocked and "UNAUTHORIZED" or "AUTHORIZED"
end

return Utils
