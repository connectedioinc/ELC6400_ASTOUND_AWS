local ConfigService = require("api/ConfigService")

local HTTPS_DNS_PROXY = ConfigService:new({
	increment_name = true
})
HTTPS_DNS_PROXY.order_by = "priority"

function HTTPS_DNS_PROXY:get_proxy_priority(name)
	local priority = 1
	self:table_foreach(self.config, "https-dns-proxy", function (s)
		if s[".name"] ~= name then
			priority = priority + 1
		else
			return false
		end
	end)
	return tostring(priority)
end

function HTTPS_DNS_PROXY:check_duplicates(option, value, sid)
	local duplicated, section = false, nil

	self:table_foreach(self.config, "https-dns-proxy", function (s)
		if s[".name"] ~= sid and s[option] == value then
			duplicated = true
			section = s[".name"]
			return false
		end
	end)

	return duplicated, section
end

local PROXY = HTTPS_DNS_PROXY:section("https-dns-proxy", "https-dns-proxy")
	function PROXY:create_defaults()
		local port
		for p = 5053, 65535 do
			local p_str = tostring(p)
			local duplicated = self:check_duplicates("listen_port", p_str)
			if not duplicated then
				port = p_str
				break
			end
		end
		return {
			listen_port = port
		}
	end

	local priority = PROXY:option("priority")
		function priority:validate(value)
			return self.dt:uinteger(value)
		end
		function priority:set(_) end
		function priority:get()
			return self:get_proxy_priority(self.sid)
		end

	local bootstrap_dns = PROXY:option("bootstrap_dns", { list = true })
		function bootstrap_dns:validate(value)
			return self.dt:ip4addr(value)
		end

	local resolver_url = PROXY:option("resolver_url")
		function resolver_url:validate(value)
			local duplicated, id = self:check_duplicates("resolver_url", value, self.sid)
			if duplicated then
				return false, string.format("URL is already used in %s configuration, no duplicates are allowed", id)
			end
			if not value:match("^https://") or not self.dt:protourl(value) then
				return false, "A full URL is accepted. E.g. https://www.example.com/example or https://192.168.1.1/example or https://[::8a2e:370:7334]/example ."
			end
			return true
		end

	local listen_port = PROXY:option("listen_port")
	listen_port.cfg_require = true
		function listen_port:validate(value)
			local duplicated, id = self:check_duplicates("listen_port", value, self.sid)
			if duplicated then
				return false, string.format("Port is already used in %s configuration, no duplicates are allowed", id)
			end
			return self.dt:port(value)
		end

return HTTPS_DNS_PROXY
