local utils = {}

local ip = require("luci.ip")
local util = require("vuci.util")

local function iface_get_network(uci, iface)
	local link = ip.link(tostring(iface))
	if link.master then
		iface = link.master
	end

	local dump = util.ubus("network.interface", "dump", { })
	if dump then
		for _, net in ipairs(dump.interface) do
			if net.l3_device == iface or net.device == iface then
				-- Trims mobile type interfaces containing _4 or _6 at the end
				local trimmed_net = string.match(net.interface or "", "^(.*)_%d$") or net.interface
				local proto = uci:get("network", trimmed_net, "proto")
				if proto then
					return uci:get("network", trimmed_net, "name") or trimmed_net, proto
				end
			end
		end
	end
end

local function parse_switch_routes(self, family)
	local dump = util.ubus("network.interface", "dump", { })
	local routes = {}

	if not dump then return end
	for _, net in ipairs(dump.interface) do
		local proto = (family == 6 and net["ipv6-address"]) or net["ipv4-address"]
		local version = (family == 6 and ip.routes({family = 6, type = 1})) or ip.routes({family = 4, type = 1})
		if proto then
			for _, route in ipairs(proto) do
				for _, v in pairs(version) do
					if tostring(net.device) == tostring(v.dev) and tostring(route.address) == tostring(family == 6 and v.from or v.src) then
						local r = {}
						r["dev"] = tostring(net.interface)
						r["table"] = v.table and tostring(v.table) or "254"
						r["gateway"] = v.gw and tostring(v.gw)
						r["dest"] = tostring(v.dest)
						r["metric"] = v.metric and tostring(v.metric)
						table.insert(routes, r)
					end
				end
			end
		end

		if net["route"] then
			for _, route in ipairs(net["route"]) do
				local r = {}
				r["dev"] = tostring(net.interface)
				r["gateway"] = tostring(route.nexthop)
				r["dest"] = tostring(route.target) .. "/" .. tostring(route.mask)
				r["metric"] = route.metric and tostring(route.metric)
				r["table"] = route.table and tostring(route.table) or "254"
				local ip_check
				if family == 6 then ip_check = ip.checkip6(route.source) else ip_check = ip.checkip4(route.source) end
				if ip_check then table.insert(routes, r) end
			end
		end
	end

	-- Clean up mess that might come from different routing tables
	for i, r1 in pairs(routes) do
		for j, r2 in pairs(routes) do
			if i ~= j and tostring(r1.gw) == tostring(r2.gw) and tostring(r1.dest) == tostring(r2.dest) and r1.dev == r2.dev then
				table.remove(routes, j)
			end
		end
	end

	return routes
end

local function parse_default_routes(self, family)
	local uci = self.uci or require("vuci.uci").cursor()

	local routes = {}
	for _, v in ipairs(ip.routes({ family = family, type = 1 })) do
		local route = {}
		for k1, v1 in pairs(v) do
			if k1 == "dev" then
				v1 = iface_get_network(uci, v.dev) or ("(" .. v.dev .. ")")
			elseif k1 == "gw" then
				k1 = "gateway"
			end
			route[tostring(k1)] = tostring(v1)
		end
		local exists = false
		for _, r in pairs(routes) do
			if util.deep_compare(r, route) then
				exists = true
				break
			end
		end
		if not exists then
			table.insert(routes, route)
		end
	end
	return routes
end

function utils.parse_text_routes(decoded, string, capture, size)
	local _, _,all   = string.find(decoded, string)
	local array = {}
	if not all then
		return array
	end
	local i  = 0
	local add = 0
	local line_i = 0
	if capture == "%S*" then
		add = 1
	else
		add = 2
	end
	while all:find("%s*(%S*)%s") do
		i = i + 1
		line_i = line_i + 1
		local _, _, str = all:find("%s*("..capture..")")
		array[i] = str
		--checks for premature endline without last argument in rip case
		if size and all:find("\n") then
			local poz = all:find("\n")
			if poz - #str == 1 then
				if line_i < size then
					i = i + 1
					array[i] = "0"
				end
				line_i = 0
			end
		end
		all = all:sub(#str+add,#all)
		all = all:match("^%s*(.-)%s*$")
	end
	i = i + 1
	local _, _, str = all:find("(%S*)")
	array[i] = str
	return array
end

function utils.array_to_json(list, array, dec_string, dec)
	local group_length = #list
	local j = 1
	local k;
	--loop lines
	for i = 1,#array/group_length do
		dec_string = dec_string .."\""..dec.. i .. "\":{"
		--loop line variables
		for j = 1,group_length do
			k=j+(group_length*(i-1))
			dec_string = dec_string .."\""..list[j].."\":\"".. array[k].."\""
			if j ~= group_length then
				dec_string = dec_string.. ","
			end
		end
		if i == #array/group_length then
			dec_string = dec_string .. "}"
		else
			dec_string = dec_string .. "},"
		end
	end
	dec_string = dec_string .. "}"
	return dec_string
end

function utils.get_routes(self, family)
	local board = require("vuci.board")
	return board:is_switch() and parse_switch_routes(self, family) or parse_default_routes(self, family)
end

function utils.get_arp(self)
	local uci = self.uci or require("vuci.uci").cursor()

	local arps = {}
	for k, v in ipairs(ip.neighbors({ family = 4, type = 1 })) do
		local arp = {}
		local net_iface, proto
		for k1, v1 in pairs(v) do
			if k1 == "dev" then
				net_iface, proto = iface_get_network(uci, v.dev)
				v1 = net_iface or ("(" .. v.dev .. ")")
			end
			arp[tostring(k1)] = tostring(v1)
		end
		local exists = false
		for _, r in pairs(arps) do
			if util.deep_compare(r, arp) then
				exists = true
				break
			end
		end
		if not exists and proto ~= "wwan" then
			table.insert(arps, arp)
		end
	end
	return arps
end

function utils.get_routes6_neighbors(self)
	local uci = self.uci or require("vuci.uci").cursor()

	local routes6_neighbors = {}
	for _, v in ipairs(ip.neighbors({ family = 6 })) do
		if v.dest and not v.dest:is6linklocal() and v.mac then
			local route6_neighbors = {}
			for k1, v1 in pairs(v) do
				if k1 == "dev" then
					v1 = iface_get_network(uci, v.dev) or ("(" .. v.dev .. ")")
				end
				route6_neighbors[tostring(k1)] = tostring(v1)
			end
			local exists = false
			for _, r in pairs(routes6_neighbors) do
				if util.deep_compare(r, route6_neighbors) then
					exists = true
					break
				end
			end
			if not exists then
				table.insert(routes6_neighbors, route6_neighbors)
			end
		end
	end
	return routes6_neighbors
end

---Returns a list of interfaces that can be used to configure static routes
---@param self table ConfigService
---@return table interfaces Table of valid interface names
function utils.get_valid_interfaces(self)
	local interfaces = {}
	local vrf_map = {}

	self:table_foreach("network", "device", function(s)
		if s.type == "vrf" then vrf_map[s.name] = true end
	end)

	self:table_foreach("network", "interface", function(i)
		if vrf_map[i.device] then return true end

		if i[".name"] ~= "loopback" then
			table.insert(interfaces, i.name or i[".name"])
		end
	end)
	return interfaces
end


return utils
