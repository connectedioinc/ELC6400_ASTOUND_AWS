local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local bfd_peer = ConfigService:new({ increment_name = true })

function bfd_peer:handle_bfd_general_enable()
	local any_peer_enabled = self:table_find(self.config, "peer", { enabled = "1" })
	self:table_set(self.config, "bfd", "enabled", any_peer_enabled and "1" or "0")
end

bfd_peer.POST_before_commit_hook = bfd_peer.handle_bfd_general_enable
bfd_peer.PUT_before_commit_hook = bfd_peer.handle_bfd_general_enable
bfd_peer.DELETE_before_commit_hook = bfd_peer.handle_bfd_general_enable

local s = bfd_peer:section("bfd", "peer")

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local ip = s:option("ip")
		function ip:validate(value)
			local exists = false
			self:table_foreach(self.config, "peer", function (s)
				if s[".name"] ~= self.sid and s.ip == value then
					exists = true
					return false
				end
			end)
			if exists then
				return false, "Peer with this IP already exists"
			end
			return self.dt:ipaddr(value)
		end

	local detect_multiplier = s:option("detect_multiplier")
		function detect_multiplier:validate(value)
			return self.dt:irange(value, 1, 255)
		end

	local receive_interval = s:option("receive_interval")
		function receive_interval:validate(value)
			return self.dt:irange(value, 10, 4294967)
		end

	local transmit_interval = s:option("transmit_interval")
		function transmit_interval:validate(value)
			return self.dt:irange(value, 10, 4294967)
		end

	local profile = s:option("profile")
		function profile:validate(value)
			local profiles = {}
			self:table_foreach(self.config, "profile", function(s)
				table.insert(profiles, s[".name"])
			end)
			return self.dt:check_array(value, profiles)
		end

	local passive_mode = s:option("passive_mode")
		function passive_mode:validate(value)
			return self.dt:is_bool(value)
		end

	local multihop_ip = s:option("multihop_ip")
		function multihop_ip:validate(value)
			return self.dt:ipaddr(value)
		end
		function multihop_ip:get()
			return self:table_get(self.config, self.sid, "multihop")
		end
		function multihop_ip:set(value)
			self:table_set(self.config, self.sid, "multihop", value)
		end

function bfd_peer:GET_TYPE_status()
	local socket = require("socket")
	local c = socket.tcp()
	local password = "admin01" -- default password for vty
	local peers_cmd = "show bfd peers json"
	local counters_cmd = "show bfd peers counters json"

	c:settimeout(5)
	c:connect("127.0.0.1", 2617)
	c:send(password.."\n")
	c:send("enable\n")
	c:send(password.."\n")
	c:send(peers_cmd.."\n")
	c:send(counters_cmd.."\n")
	c:send("exit\n")
	local response = c:receive("*a")
	c:close()

	local peers = util.parse_vtysh_json(response, peers_cmd, "[]")
	local peers_counters = util.parse_vtysh_json(response, counters_cmd, "[]")

	local counters_lookup = {}
	for _, k in pairs(peers_counters) do
		counters_lookup[k.peer] = k
	end

	local data = {}
	for _, v in pairs(peers) do
		local k = counters_lookup[v.peer] or {}
		table.insert(data, {
			peer = v.peer,
			status = v.status,
			diagnostic = v.diagnostic,
			uptime = v.uptime,
			downtime = v.downtime,
			detect_multiplier = v["detect-multiplier"],
			remote_receive_interval = v["remote-receive-interval"],
			remote_transmit_interval = v["remote-transmit-interval"],
			session_up = k["session-up"],
			session_down = k["session-down"]
		})
	end

	self:ResponseOK(data)
end

return bfd_peer
