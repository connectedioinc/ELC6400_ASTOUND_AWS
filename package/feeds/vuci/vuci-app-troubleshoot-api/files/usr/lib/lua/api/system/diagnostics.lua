local util = require "vuci.util"
local FunctionService = require("api/FunctionService")

local diagnostics = FunctionService:new()

function diagnostics:ping()
	if self.arguments.data.proto == "ipv4" then
		return self:ResponseOK(util.exec("ping -4 -c 5 -W 1 %s 2>&1" % { self.arguments.data.host }))
	elseif self.arguments.data.proto == "ipv6" then
		return self:ResponseOK(util.exec("ping -6 -c 5 -W 1 %s 2>&1" % { self.arguments.data.host }))
	end
end

function diagnostics:traceroute()
	if self.arguments.data.proto == "ipv4" then
		return self:ResponseOK(util.exec("traceroute -4 -q 1 -w 1 -n %s 2>&1" % { self.arguments.data.host }))
	elseif self.arguments.data.proto == "ipv6" then
		return self:ResponseOK(util.exec("traceroute -6 -q 1 -w 2 -n %s 2>&1" % { self.arguments.data.host }))
	end
end

function diagnostics:nslookup()
	return self:ResponseOK(util.exec("nslookup %s 2>&1" % { self.arguments.data.host }))
end

local function add_opts(option)
	local proto = option:option("proto")
	proto.require = true
		function proto:validate(value)
			return self.dt:check_array(value, { "ipv4", "ipv6" })
		end

	local host = option:option("host")
	host.require = true
		function host:validate(value)
			if self.arguments.data.proto == "ipv4" then
				return self.dt:ipv4host(value)
			elseif self.arguments.data.proto == "ipv6" then
				return self.dt:ipv6host(value)
			end
			return self.dt:host(value)
		end
end

add_opts(diagnostics:action("ping", diagnostics.ping))
add_opts(diagnostics:action("traceroute", diagnostics.traceroute))

local nslookup = diagnostics:action("nslookup", diagnostics.nslookup)

	local nslookup_host = nslookup:option("host")
	nslookup_host.require = true
		function nslookup_host:validate(value)
			return self.dt:host(value)
		end

return diagnostics
