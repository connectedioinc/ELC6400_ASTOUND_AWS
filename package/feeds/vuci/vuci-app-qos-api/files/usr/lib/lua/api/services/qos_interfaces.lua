local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local QOS = ConfigService:new()

function QOS:POST_after_data_hook()
	local ifname = self:table_get("network", self.sid, "ifname")
	if string.match(ifname or "", "eth1") then
		self:table_set(self.config, self.sid, "device", "eth1")
	end
end

-- Need to execute this earlier since otherwise the already
-- used configuration validation will be skipped due to
-- changed id value
function QOS:POST_init_hook()
	if not self.arguments.data then return end

	local ok = false
	local available = {}
	self.arguments.data.id = util.get_network_map(self)[self.arguments.data.id] or self.arguments.data.id
	self:table_foreach("network", "interface", function (interface)
		local is_mobile = interface.proto == "wwan"
		if interface[".name"] ~= "loopback" and not (interface.device and interface.device:match("^rmnet")) and
			(interface.proto == "dhcp" or interface.proto == "static" or is_mobile)
		then
			table.insert(available, interface[".name"])
			if interface[".name"] == self.arguments.data.id then
				ok = true
				if not is_mobile then return end
				self:table_set(self.config, interface[".name"], "is_mobile", "1")
			end
		end
	end)
	if not ok then
		self:add_critical_error(STD_CODES.INVALID_STRUCT,
			string.format("id must be one of the following values [%s].", table.concat(available, ", ")),
			"Validation"
		)
	end
end

local QOSInterface = QOS:section("qos", "interface")

function QOSInterface:create_defaults()
	return {
		enabled = "0"
	}
end

	local opt_name = QOSInterface:option("name")
		opt_name.readonly = true
		function opt_name:get()
			-- `self.sid` contains the internal network interface name
			return util.network_mapper_get(self, self.sid)
		end

	local opt_enabled = QOSInterface:option("enabled")
		-- Disabled till WebUI front-end stops creating empty configurations.
		-- opt_enabled.cfg_require = true
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_overhead = QOSInterface:option("overhead")
		function opt_overhead:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_download = QOSInterface:option("download")
		function opt_download:validate(value)
			return self.dt:irange(value, 100, 4294967)
		end

	local opt_upload = QOSInterface:option("upload")
		function opt_upload:validate(value)
			return self.dt:irange(value, 100, 4294967)
		end

return QOS