local ConfigService = require("api/ConfigService")
local fw = require("vuci.firewall").init()

local Tr069 = ConfigService:new{
	create = false,
	delete = false
}

local enabled

function Tr069:validate_section_hook()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if opt_enabled == "1" then
		local required_options = {"password", "username", "url"}
		local opt_periodic = self:get_abs_value(self.config, self.sid, "periodic_enable")
		if opt_periodic == "1" then
			table.insert(required_options, "periodic_interval")
		end
		enabled.require = {["1"] = required_options}
	end
end

Tr069.PUT_validate_section_hook = Tr069.validate_section_hook

function Tr069:PUT_before_commit_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local allow_ra = self:get_abs_value(self.config, self.sid, "allow_ra")
	local rule_enable = enabled == "1" and allow_ra == "1" and "1" or "0"
	local rule = self:table_find("firewall", "rule", { name = "Allow_TR069_server_request" })
	if rule and rule_enable ~= rule.enabled then
		self:table_set("firewall", rule[".name"], "enabled", rule_enable)
	end
	if not rule then
		local _wan_zone = fw:get_zone("wan")
		if _wan_zone then
			local tr069_rule_options = {
				target = 'ACCEPT',
				proto = 'tcp',
				dest_port = '7547',
				name = 'Allow_TR069_server_request',
				enabled = rule_enable
			}
			_wan_zone:add_rule(tr069_rule_options)
			self:commit("firewall")
		else
			self:add_error(STD_CODES.UCI_CREATE_ERROR, "Could not add firewall rule.", self.api_key)
		end
	end
end

local s = Tr069:section("easycwmp", "acs")

	enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local periodic_enable = s:option("periodic_enable")
		function periodic_enable:validate(value)
			return self.dt:is_bool(value)
		end

	local periodic_interval = s:option("periodic_interval")
		function periodic_interval:validate(value)
			return self.dt:irange(value, 60, 9999999)
		end

	local username = s:option("username")
		username.maxlength = 64
		function username:validate(value)
			local error_message = "Allowed characters are: a-zA-Z0-9!@#$%&*+/=?^_`{|}~. -"
				if value then
					local res = value:match("^[a-zA-Z0-9!@#$%&*+/=?^_`{|}~. -]+$") ~= nil
					return res, error_message
				end
			return false, error_message
		end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 64
		function password:validate(value)
			return self.dt:credentials_validate(value)
		end

	local url = s:option("url")
		url.maxlength = 128
		function url:validate(value)
			return self.dt:protourl(value)
		end

	local allow_ra = s:option("allow_ra")
		function allow_ra:validate(value)
			return self.dt:is_bool(value)
		end

	s:option("device_files").validate = function(self, value) return self.dt:is_bool(value) end

	local ssl_verify = s:option("ssl_verify")
	function ssl_verify:validate(value) return self.dt:is_bool(value) end

	ssl_verify.require = { ["1"] = { "ssl_cacert" } }

	s:option("ssl_cacert", {
		certificate = {
			instance = "tr069",
			type = "certificates",
			cert_types = { "ca", "import", "root_ca", "scep" },
		}
	})

	s:option("ssl_cert", {
		certificate = {
			instance = "tr069",
			type = "certificates",
			cert_types = { "client", "import", "scep" },
		}
	})

	s:option("ssl_key", {
		certificate = {
			instance = "tr069",
			type = "keys",
			cert_types = { "client", "import", "scep" }
		}
	})
return Tr069
