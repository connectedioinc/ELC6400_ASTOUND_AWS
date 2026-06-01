local ConfigService = require("api/ConfigService")
local siteman_utils = require("api/services/site_manager/siteman_utils")

local PortsSettings = ConfigService:new({
	create = false,
	delete = false
})

local s = PortsSettings:section("siteman_ports", "port")

function s:create_defaults()
	return {
		_platform = "tsw",
		dm_device_id = self.arguments.data.dm_device_id,
	}
end
	local dm_device_id = s:option("dm_device_id")
	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end
	local autoneg = s:option("autoneg")
		function autoneg:validate(value)
			return self.dt:check_array(value, {"on", "off"})
		end
	local advert = s:option("advert")
	advert.list = true
		function advert:validate(value)
			return self.dt:check_array(value, {"10mh", "10mf", "100mh", "100mf", "1000mh", "1000mf", "2500mf"})
		end
	local speed = s:option("speed")
		function speed:validate(value)
			return self.dt:check_array(value, {"10", "100"})
		end
	local duplex = s:option("duplex")
		function duplex:validate(value)
			return self.dt:check_array(value, { "full", "half" })
		end
	local opt_description = s:option("description")
		function opt_description:validate(value)
			local duplicate
			self:table_foreach(self.config, "port", function(s)
				if self.sid ~= s[".name"] and s["description"] == value then
					duplicate = s
					return false
				end
			end)
			if duplicate then return false, string.format("Provided description is already used for '%s' configuration", duplicate[".name"]) end
			return self.dt:string(value)
		end
	local opt_id = s:option("_id")
		function opt_id:get()
			return self:table_get(self.config, self.sid, "id")
		end
		function opt_id:set(value)
		end
	local poe_enable = s:option("poe_enable")
	poe_enable.cfg_require = true
		function poe_enable:validate(value)
			local util = require "vuci.util"
    	local poe = self:table_get(self.config, self.sid, "poe_enable")
			if not poe and value then
				return false, "Poe for this port is not supported"
			end
			return self.dt:is_bool(value)
		end
	local opt_eee_enable = s:option("eee_enable")
		function opt_eee_enable:validate(value)
			return self.dt:is_bool(value)
		end
	local isolated = s:option("isolated")
		function isolated:validate(value)
			return self.dt:is_bool(value)
		end
siteman_utils:wrap_endpoint_sync_logic(PortsSettings)
return PortsSettings
