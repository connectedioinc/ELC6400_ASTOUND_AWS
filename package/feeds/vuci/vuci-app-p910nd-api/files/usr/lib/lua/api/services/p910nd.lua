local ConfigService = require("api/ConfigService")
local ntm   = require "vuci.network".init()
local fw = require "vuci.firewall".init()
local _lan_net = ntm:get_network("lan")
local _wanZone = fw:get_zone("wan")
local board = require("vuci.board")
local usb_tools = require "vuci.usb_tools"

if not board:has_usb()then
	return nil
end

local flags = {
	delete = false,
	create = false,
	general_section = function (self)
		return self.uci:get_all("p910nd", "@p910nd[0]")[".name"]
	end
}

local p910nd = ConfigService:new(flags)

local function commit_info(enabled, port)
	port = 9100 + port
	local found_redirect = 0
	if enabled == "1" then
		p910nd:table_foreach("firewall", "redirect", function(s)
			if "Printer_server" == s.name then
				found_redirect = 1
				p910nd:table_set("firewall",s[".name"],"src_dport", port)
				p910nd:table_set("firewall",s[".name"],"dest_port", port)
			end
		end)
	else
		p910nd:table_foreach("firewall", "redirect", function(s)
			if "Printer_server" == s.name then
				p910nd:table_delete("firewall", s[".name"])
			end
		end)
	end
	if enabled == "1" and found_redirect == 0 then
		local options = {
			target = "DNAT",
			src = "wan",
			dest = "lan",
			proto = "tcp",
			src_dport = port,
			dest_ip = _lan_net:ipaddr(),
			dest_port = port,
			name = "Printer_server",
			enabled = "1"
		}
		_wanZone:add_redirect(options)
	end
end

local s = p910nd:section("p910nd", "p910nd")

	local enabled = s:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local device = s:option("device")
		function device:validate(value)
			if not string.match(value, "^/dev/usb/") then
				return false, "Provided file must reside in '/dev/usb/' folder"
			end
			if value:match("%.%./") then return false, "File path can not contain ../" end
			return true
		end

	local port = s:option("port")
	port.cfg_require = true
		function port:validate(value)
			return self.dt:check_array(value, {"9100", "9101", "9102", "9103", "9104", "9105", "9106", "9107", "9108", "9109"})
		end
		function port:set(value)
			self:table_set(self.config, self.sid, "port", value:sub(4, 4))
		end
		function port:get(value)
			return "910" .. value
		end

	local bidirectional = s:option("bidirectional")
		function bidirectional:validate(value)
			return self.dt:is_bool(value)
		end

	function p910nd:PUT_before_commit_hook()
		local enabled = self:get_abs_value("p910nd", self.sid, "enabled")
		local port = self:get_abs_value("p910nd", self.sid, "port")
		if port and enabled then
			commit_info(enabled, port)
		end
	end


function p910nd:GET_TYPE_options()
	return self:ResponseOK(usb_tools:get_usb_devices())
end

return p910nd