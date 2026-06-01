local ConfigService = require("api/ConfigService")
local fs = require("nixio.fs")
local util = require("vuci.util")
local pac = require("vuci.package_checker")

local dns = ConfigService:new({ create = false, delete = false, general_section =
	function(self)
		local sid
		self:table_foreach("dhcp", "dnsmasq",
			function(s)
				sid = s[".name"]
			end
		)
		return sid
	end
})

function dns:validate_server_forwarding(value)
	local hint = "Domain names or IP addresses are accepted. E.g. /example.com or 192.168.1.1. Wildcard symbol (*) at the start can also be used for domain. E.g. *.example.com."

	--While techincally this does nothing, it was valid with old validations
	if value == "/#/#" then
		return true
	end

	if #value > 1 and value:match("^/") then
		local matches = util.split(value, "/")
		if #matches ~= 3 then return false, hint end
		local server = matches[2] or ""
		local address = matches[3] or ""
		if #server ~= 1 and server:match("^%*?[^%*]*$") then
			server = server:gsub("%*", "wildcard") -- bypass default hostname validation to allow wildcard symbol
		end
		local is_hostname = self.dt:hostname(server)
		if is_hostname and (address == "" or address == "#" or self.dt:ipaddr(address))  then
			return true
		end
	elseif self.dt:ipaddr(value) then return true end

	return false, hint
end

function dns:validate_address_forwarding(value)
	local hint = "Domain names or IP addresses are accepted. E.g. /example.com or 192.168.1.1."
	if value == "#" then
		return true
	end

	if #value > 1 and value:match("^/") then
		local is_hostname, is_ip
		local matches = util.split(value, "/")

		if #matches ~= 3 then return false, hint end

		if (matches[2] == "#" or self.dt:hostname(matches[2])) and (matches[3] == "#" or self.dt:ipaddr(matches[3])) then
			return true
		end
		for _, val in ipairs(matches) do
			is_hostname = self.dt:hostname(val)
			is_ip = self.dt:ipaddr(val)
			if not is_hostname and not is_ip then
				return false, hint
			end
		end
		if is_hostname and not value:match("/$") then
			return false, hint
		end
	elseif self.dt:ipaddr(value) then return true end

	return false, hint
end

-- Handles forwarding value retrieval.
-- Also parses accepted values from current validation
-- into according values that can be entered in the page
function dns:get_forwardings(value, ip_prefix)
	local formatted_values = {}
	for _, val in ipairs(value or {}) do
		if val == '#' or val == '/#/' then
			table.insert(formatted_values, "/#/#")
		elseif self.dt:ipaddr(val) then
			table.insert(formatted_values, (ip_prefix and "/#/" or "") .. val)
		-- If the value ends with a slash, we assume it's a server option without an address.
		elseif not ip_prefix and val:sub(-1) == "/" then
			table.insert(formatted_values, val)
		else
			local split_values = util.split(val, "/")
			local values_length = #split_values
			local address = split_values[values_length]
			if not address or address == "" then
				address = split_values[values_length-1]
				values_length = values_length - 1
			end
			-- Need to make sure that an IP address was retrieved
			-- due to older validation also supporting domains only
			local is_address = address == '#' or self.dt:ipaddr(address)
			address = is_address and address or '#'
			for i = 2, is_address and values_length-1 or values_length do
				if split_values[i] and split_values[i] ~= "" then
					table.insert(formatted_values, "/"..split_values[i].."/"..address)
				end
			end
		end
	end
	return formatted_values
end

function dns:https_dns_proxy_enabled()
	return pac.is_installed("https-dns-proxy") and self:table_get("https-dns-proxy", "config", "enabled") == "1"
end

local s = dns:section("dhcp", "dnsmasq")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local log_queries = s:option("logqueries")
		function log_queries:validate(value)
			return self.dt:is_bool(value)
		end

	local server = s:option("server", { list = true })
		function server:validate(value)
			if self:https_dns_proxy_enabled() then
				return false, "'server' option cannot be edited while HTTPS DNS Proxy is enabled"
			end
			return self:validate_server_forwarding(value)
		end
		function server:get(value)
			if self:https_dns_proxy_enabled() then
				value = self:table_get(self.config, self.sid, "doh_backup_server")
			end
			return self:get_forwardings(value)
		end

	local address = s:option("address", { list = true })
		function address:validate(value)
			return self:validate_address_forwarding(value)
		end
		function address:get(value)
			return self:get_forwardings(value, true)
		end

	local rebind_protection = s:option("rebind_protection")
		function rebind_protection:validate(value)
			return self.dt:is_bool(value)
		end

	local local_service = s:option("localservice")
		function local_service:validate(value)
			return self.dt:is_bool(value)
		end

dns.interface_options = nil
function dns:up_interfaces()
	if self.interface_options then return self.interface_options end
	local ntm = require("vuci.network").init()
	local network_pretty = util.get_network_map(self, true)
	self.interface_options = {}
	self:table_foreach("network", "interface", function(s)
		if s[".name"] and s[".name"] ~= "loopback" and s["proto"] ~= "relay" then
			local interface_name = s[".name"]
			local net = ntm:get_network(interface_name)
			local device = net and net:get_interface()
			local up = net and net:is_up() and device:is_up()
			if up then
				table.insert(self.interface_options, network_pretty[interface_name] or interface_name)
			end
		end
	end)
	return self.interface_options
end

local function get_interface(self, value)
	local value_table = {}
	local network_pretty = util.get_network_map(self, true)
	if value and type(value) == "string" then
		value:gsub("[^%s]+", function(s) table.insert(value_table, network_pretty[s] or s) end)
	else
		for key, val in pairs(value or {}) do
			value[key] = network_pretty[val] or val
		end
	end
	return #value_table > 0 and value_table or value
end

local function set_interface(self, value)
	local network_internal = util.get_network_map(self)
	for key, val in pairs(value) do
		value[key] = network_internal[val] or val
	end
	self:table_set(self.config, self.sid, self.api_key, table.concat(value, " "))
end

	local interface = s:option("interface", { list = true })
		function interface:validate(value)
			return self.dt:check_array(value, self:up_interfaces())
		end
		function interface:get(value)
			return get_interface(self, value)
		end
		function interface:set(value)
			set_interface(self, value)
		end

	local notinterface = s:option("notinterface", { list = true })
		function notinterface:validate(value)
			return self.dt:check_array(value, self:up_interfaces())
		end
		function notinterface:get(value)
			return get_interface(self, value)
		end
		function notinterface:set(value)
			set_interface(self, value)
		end


	local bogus_priv = s:option("boguspriv")
		function bogus_priv:validate(value)
			return self.dt:is_bool(value)
		end

	local localise_queries = s:option("localise_queries")
		function localise_queries:validate(value)
			return self.dt:is_bool(value)
		end

	local servers_file = s:option("serversfile", { file = true })
		function servers_file:validate(value)
			return self.dt:file_validation(value, {"/etc/vuci-uploads/"})
		end

	local cache_size = s:option("cachesize")
		function cache_size:validate(value)
			return self.dt:irange(value, 0, 10000)
		end

	local strict_order = s:option("strictorder")
	function strict_order:validate(value)
		return self.dt:is_bool(value)
	end

	function strict_order:get(value)
		return value or "0"
	end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function dns:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "dnsmasq", 0644)
	return { path = path }
end

return dns
