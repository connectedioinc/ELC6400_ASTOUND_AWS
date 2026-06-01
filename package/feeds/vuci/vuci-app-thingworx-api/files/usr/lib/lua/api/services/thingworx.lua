local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local flags = {
	create = false,
	delete = false
}

local thingworx = ConfigService:new(flags)

local enabled

function thingworx:require_validation()
	local opt_enabled = self:get_abs_value(self.config, self.sid, "enabled")
	if opt_enabled and opt_enabled == "1" then
		local required_options = {"server", "port", "thing", "appkey"}
		local mobile_interface_count = 0
		self:table_foreach("network", "interface", function(sec)
			if sec.modem then
				mobile_interface_count = mobile_interface_count + 1;
			end
		end)
		if mobile_interface_count > 0 then
			table.insert(required_options, "iface")
		end
		enabled.require = {["1"] = required_options}
	end
end

thingworx.PUT_validate_section_hook = thingworx.require_validation

local s = thingworx:section("iottw", "iottw")

	enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local server = s:option("server")
		function server:validate(value)
			return self.dt:host(value)
		end

	local port = s:option("port")
		function port:validate(value)
			return self.dt:port(value)
		end

	local thing = s:option("thing")
	thing.maxlength = 32
		function thing:validate(value)
			return self.dt:uciname(value)
		end

	local appkey = s:option("appkey", { sensitive = true })
	appkey.maxlength = 128
		function appkey:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9_-]+$")
		end

	local iface = s:option("iface")
		function iface:validate(value)
			local iface_options = {}
			self:table_foreach("network", "interface", function(sec)
				if sec.modem then table.insert(iface_options, sec.name or sec[".name"]) end
			end)
			return self.dt:check_array(value, iface_options)
		end
		function iface:get(value) return util.network_mapper_get(self, value) end
		function iface:set(value)
			value = util.get_network_map(self)[value] or value
			local modem = self:table_get("network", value, "modem")
			self:table_set(self.config, self.sid, self.api_key, value)
			if modem then
				self:table_set(self.config, self.sid, "modem", modem)
			end
		end

return thingworx