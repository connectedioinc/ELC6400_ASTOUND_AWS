local ConfigService = require("api/ConfigService")

local rms_proxy = ConfigService:new({ create = false, delete = false })

local uci = rms_proxy.uci
if not uci:get_all("rms_mqtt", "rms_proxy") then
	uci:section("rms_mqtt", "rms_proxy", "rms_proxy", {
		enabled = "0"
	})
	uci:commit("rms_mqtt")
end

function rms_proxy:PUT_validate_section_hook()
	if self:get_abs_value(self.config, self.sid, "enabled") ~= "1" then return end

	local username_is_set = self:get_abs_value(self.config, self.sid, "socks5_username")
	local password_is_set = self:get_abs_value(self.config, self.sid, "socks5_password")

	if not username_is_set and password_is_set then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required option: socks5_username", "socks5_password")
	end

	if not password_is_set and username_is_set then
		self:add_error(STD_CODES.INVALID_OPT, "Missing required option: socks5_password", "socks5_username")
	end
end

local s = rms_proxy:section("rms_mqtt", "rms_proxy")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"ip", "socks5_port"} }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local ip = s:option("ip")
		function ip:validate(value)
			return self.dt:host(value)
		end

	local port_socks5 = s:option("socks5_port")
		function port_socks5:validate(value)
			return self.dt:port(value)
		end

	local socks5_username = s:option("socks5_username")
		function socks5_username:validate(value)
			return self.dt:string(value)
		end

	local socks5_password = s:option("socks5_password", { sensitive = true })
		function socks5_password:validate(value)
			return self.dt:string(value)
		end

return rms_proxy