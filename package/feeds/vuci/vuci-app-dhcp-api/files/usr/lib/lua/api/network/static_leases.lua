
local ConfigService = require("api/ConfigService")
local nixio = require "nixio"
local fs = require("nixio.fs")
local util = require "vuci.util"
local board = require("vuci.board")

local is_switch = board:is_switch()

local function perform_bit_operation(ipaddr, mask, operator)
	local bit = nixio.bit
	local a = {0,0,0,0}
	local ipArr = util.split(ipaddr, ".")
	local maskArr = util.split(mask, ".")
	for i = 1, 4 do
		a[i] = bit[operator](tonumber(ipArr[i]), tonumber(maskArr[i]))
	end
	return table.concat(a, ".")
end

local function wildcard_mask(mask)
	local a = {0,0,0,0}
	local maskArr = util.split(mask, ".")
	for i = 1, 4 do
		a[i] = 255 - maskArr[i]
	end
	return table.concat(a, ".")
end

local static_leases = ConfigService:new({ anonymous = true })

function static_leases:check_network_and_broadcast(value)
	local network_used, broadcast_used = false, false
	self:table_foreach("network", "interface", function (s)
		if (is_switch or s.area_type == "lan") and s.proto == "static" and self:table_get("dhcp", s[".name"]) then
			local network_ip = perform_bit_operation(s.ipaddr, s.netmask, "band")
			local broadcast_ip = perform_bit_operation(network_ip, wildcard_mask(s.netmask), "bor")
			network_used = network_used or value == network_ip
			broadcast_used = broadcast_used or value == broadcast_ip
		end
	end)
	if (network_used) then return false, "A network address cannot be specified as a lease IP address." end
	if (broadcast_used) then return false, "A broadcast address cannot be specified as a lease IP address." end
	return true
end

local s = static_leases:section("dhcp", "host")

	s.filter = function(self, options)
		if options["_ipv6"] ~= "1" and not options.duid and not options.hostid then
			return true
		end
		
		return false
	end

	local name = s:option("name")
		function name:validate(value)
			return self.dt:hostname(value)
		end

	local mac = s:option("mac")
		function mac:validate(value)
			local ok, err = true, ""
			self:table_foreach("dhcp", "host", function(s)
				local current_mac = self:get_abs_value(self.config, s[".name"], "mac")
				current_mac = current_mac and string.lower(current_mac) or nil
				if s[".name"] ~= self.sid and current_mac == string.lower(value) then
					ok, err = false, "MAC already in use"
					return false -- break
				end
			end)
			if not ok then return false, err end
			return self.dt:macaddr(value:gsub("*", "00"))
		end

	local ip = s:option("ip")
		function ip:validate(value)
			local valid_ip, msg_ip = self.dt:ip4addr(value)
			if not valid_ip then return false, msg_ip end
			local valid_addr, msg_addr = self:check_network_and_broadcast(value)
			if not valid_addr then return false, msg_addr end

			local ok, err = true, ""
			self:table_foreach("dhcp", "host", function(s)
				local current_ip = self:get_abs_value(self.config, s[".name"], "ip")
				if s[".name"] ~= self.sid and current_ip == value then
					ok, err = false, "IP already in use"
					return false -- break
				end
			end)
			local file_pattern = "/var/run/*_braddr"
			for file in fs.glob(file_pattern) do
				local braddr = fs.readfile(file):match("%d+.%d+.%d+.%d+")
				if braddr == value then
					return false, "IP address conflicts with mobile bridge address"
				end

			end

			return ok, err
		end

return static_leases
