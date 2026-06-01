
local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local wg_utils = require("api.services.wireguard_utils")

local function key_validator(self, value)
	if #value ~= 44 then
		return false, "Value must be of length 44."
	end
	return self.dt:base64(value)
end

local wireguard_peer = ConfigService:new()

local s = wireguard_peer:section("network", function(self) return "wireguard_" .. self.binding end)

	local public_key = s:option("public_key")
		function public_key:validate(value)
			local key_res, key_msg = key_validator(self, value)
			if not key_res then return key_res, key_msg end
			local dup_res, dup_msg = true, "Public key cannot be the same between peers"
			self:table_foreach("network", "wireguard_" .. self.binding, function(s)
				if s.public_key == value and s[".name"] ~= self.sid then
					dup_res = false
				end
			end)
			if not dup_res then return false, dup_msg end
			return true
		end

	local allowed_ips = s:option("allowed_ips", { list = true })
	allowed_ips.list_length = 4294967295
		function allowed_ips:validate(value)
			return self.dt:ipmask(value)
		end

	local description = s:option("description")
		function description:validate(value)
			return self.dt:string(value)
		end

	local preshared_key = s:option("preshared_key", { sensitive = true })
	preshared_key.maxlength = 44
		function preshared_key:validate(value)
			return self.dt:base64(value)
		end

	local route_allowed_ips = s:option("route_allowed_ips")
		function route_allowed_ips:validate(value)
			return self.dt:is_bool(value)
		end

	local endpoint_host = s:option("endpoint_host")
		function endpoint_host:validate(value)
			return self.dt:host(value)
		end

	local endpoint_port = s:option("endpoint_port")
		function endpoint_port:validate(value)
			return self.dt:port(value)
		end

	local persistent_keepalive = s:option("persistent_keepalive")
		function persistent_keepalive:validate(value)
			return self.dt:range(value, 0, 65535)
		end

	local _table = s:option("table")
		function _table:validate(value)
			return self.dt:string(value)
		end

	local tunlink = s:option("tunlink")
	tunlink.maxlength = 16
		function tunlink:validate(value)
			if value ~= "any" then tunlink.require = { "endpoint_host" } end
			return self.dt:uciname(value)
		end
		function tunlink:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			if not value or value == "any" then self:table_set(self.config, self.sid, "force_tunlink", "0") end
		end

	local force_tunlink = s:option("force_tunlink")
		function force_tunlink:validate(value)
			local tunlink_val = self:get_abs_value(self.config, self.sid, "tunlink")
			if value == "1" and (not tunlink_val or tunlink_val == "any") then
				return false, "force_tunlink can only be turned on if tunlink interface is selected"
			end
			return self.dt:is_bool(value)
		end

local function wireguard_commit(self)
	util.ubus("file", "exec", { command="/sbin/ifup", params={ self.binding, "&", ">", "/dev/null" }})
end

function wireguard_peer:PUT_before_commit_hook()
	if wg_utils.has_mwan3 and self.binding then wg_utils:update_mwan_rules(self, self.binding) end
end

function wireguard_peer:POST_before_commit_hook()
	if wg_utils.has_mwan3 and self.binding then wg_utils:update_mwan_rules(self, self.binding) end
end

function wireguard_peer:PUT_after_commit_hook()
	wireguard_commit(self)
end

function wireguard_peer:POST_after_commit_hook()
	wireguard_commit(self)
end

return wireguard_peer