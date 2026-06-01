
local ConfigService = require("api/ConfigService")
local siteman_utils = require("api/services/site_manager/siteman_utils")

local wifi_ifaces = ConfigService:new({ increment_name = true })

local enabled_depends = { ["1"] = {"encryption", "device"} }

local encryption, cipher, enabled
function wifi_ifaces:validate_section_hook()

	-- custom option require logic
	local enb = self.current_data_block.enabled or enabled:get()
	local enc = self.current_data_block.encryption or encryption:get(self:table_get(self.config, self.sid, "encryption"))
	local opt_enc = self:get_abs_value(self.config, self.sid, "encryption")
	local opt_key = self:get_abs_value(self.main_config, self.sid, "key")
	local dev = self:get_abs_value(self.config, self.sid, "device") or self.default_dev or {}

	if enb == "1" then
		if not dev or dev == "" or dev == {} then
			self:add_error(STD_CODES.INVALID_OPT, "'device' option is required", "device")
		end

		if (opt_key == "" or not opt_key) and opt_enc and self.dt:check_array(opt_enc, {"psk", "psk2", "psk+psk2", "psk+mixed", "sae", "sae+mixed"}) then
			self:add_error(STD_CODES.INVALID_OPT, "Missing required option: key", "encryption")
		end

		if enc == "wpa" or enc == "wpa2" or enc == "wpa3" or enc == "wpa3-mixed" then
			local auth_server = self.current_data_block.auth_server or self:table_get(self.config, self.sid, "auth_server")
			if not auth_server or auth_server == "" then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: auth_server", "encryption")
			end
			local auth_secret = self.current_data_block.auth_secret or self:table_get(self.config, self.sid, "auth_secret")
			if not auth_secret or auth_secret == "" then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: auth_secret", "encryption")
			end
			local acct_secret = self.current_data_block.acct_secret or self:table_get(self.config, self.sid, "acct_secret")
			if not acct_secret or acct_secret == "" then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: acct_secret", "encryption")
			end
		end
	end
end

wifi_ifaces.PUT_validate_section_hook = wifi_ifaces.validate_section_hook
wifi_ifaces.POST_validate_section_hook = wifi_ifaces.validate_section_hook

local s = wifi_ifaces:section("siteman_wireless", "wifi-iface")

	enabled = s:option("enabled")
		enabled.require = enabled_depends
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

		local device = s:option("device", { list = true })
			function device:validate(value)
				-- TODO: dynamic check by group devices?
				return self.dt:check_array(value, {"radio0", "radio1"})
			end

	local ssid = s:option("ssid")
		function ssid:validate(value)
			return self.dt:max_bytes(value, 32) 
		end

	local vlan_id = s:option("vlan_id")
		function vlan_id:validate(value)
			if value == "lan" then
				return true
			end
			return self.dt:irange(value, 1, 4094)
		end

	local hidden = s:option("hidden")
		function hidden:validate(value) return self.dt:is_bool(value) end

	local mesh_rssi_threshold = s:option("mesh_rssi_threshold")
		function mesh_rssi_threshold:validate(value) return self.dt:irange(value, -255, 1) end

	local wmm = s:option("wmm")
		function wmm:validate(value) return self.dt:is_bool(value) end

	encryption = s:option("encryption")
		function encryption:validate(value)
			return self.dt:check_array(value, {"none", "psk", "psk2", "psk-mixed", "sae", "sae-mixed",
				"wpa", "wpa2", "owe", "wpa3-mixed", "wpa3"})
		end

	local mesh_id = s:option("mesh_id")
		function mesh_id:validate(value)
			return self.dt:max_bytes(value, 32)
		end
	
	local mode = s:option("mode")
		mode.require = { ap = {"ssid"}, mesh = {"mesh_id"} }
		function mode:validate(value)
			return self.dt:check_array(value, {"ap", "mesh"})
		end

	local bss_transition = s:option("bss_transition")
		function bss_transition:validate(value)
			local mode = self:get_abs_value("wireless", self.sid, "mode")
			if mode ~= "ap" then
				return false, "Only available in 'ap' mode"
			end
			return self.dt:is_bool(value)
		end

	local mesh_fwding = s:option("mesh_fwding")
		function mesh_fwding:validate(value) return self.dt:is_bool(value) end
		function mesh_fwding:set(value)
			if value == "1" then
				self:table_set(self.config, self.sid, self.api_key, value)
			else
				self:table_set(self.config, self.sid, self.api_key, "0")
			end
		end

	local wds = s:option("wds")
		function wds:validate(value)
			return self.dt:is_bool(value)
		end

	local ieee80211k = s:option("ieee80211k")
		function ieee80211k:validate(value)
			local mode = self:get_abs_value("wireless", self.sid, "mode")
			if mode ~= "ap" then
				return false, "Only available in 'ap' mode"
			end
			return self.dt:is_bool(value)
		end

	cipher = s:option("cipher")
		function cipher:validate(value) return self.dt:check_array(value, {"auto", "ccmp", "tkip", "tkip+ccmp"}) end

	local key = s:option("key")
		key.minlength = 8
		key.maxlength = 64
		function key:validate() return true end

	local auth_server = s:option("auth_server")
		function auth_server:validate(value) return self.dt:ipaddr(value) end

	local auth_port = s:option("auth_port")
		function auth_port:validate(value) return self.dt:port(value) end

	local auth_secret = s:option("auth_secret")
		function auth_secret:validate(value) return self.dt:credentials_validate(value, 256) end

	local acct_server = s:option("acct_server")
		function acct_server:validate(value) return self.dt:ipaddr(value) end

	local acct_port = s:option("acct_port")
		function acct_port:validate(value) return self.dt:port(value) end

	local acct_secret = s:option("acct_secret")
		function acct_secret:validate(value) return self.dt:credentials_validate(value, 256) end

	local ieee80211r = s:option("ieee80211r")
		ieee80211r.require = { ["1"] = {"ft_over_ds"} }
		function ieee80211r:validate(value) return self.dt:is_bool(value) end

	local nasid = s:option("nasid")
		function nasid:validate(value) return self.dt:string(value) end

	local mobility_domain = s:option("mobility_domain")
		mobility_domain.minlength = 4
		mobility_domain.maxlength = 4
		function mobility_domain:validate(value)
			return self.dt:hexstring(value)
		end

	local reassociation_deadline = s:option("reassociation_deadline")
		function reassociation_deadline:validate(value) return self.dt:range(value, 1000, 65535) end

	local ft_over_ds = s:option("ft_over_ds")
		function ft_over_ds:validate(value) return self.dt:is_bool(value) end

	local password = s:option("password")
		function password:validate(value) return self.dt:credentials_validate(value) end

	local macfilter = s:option("macfilter")
		function macfilter:validate(value) return self.dt:check_array(value, {"", "allow", "deny"}) end

	local maclist = s:option("maclist", { list = true })
		function maclist:validate(value) return self.dt:macaddr(value) end

	local isolate = s:option("isolate")
		function isolate:validate(value) return self.dt:is_bool(value) end

	local short_preamble = s:option("short_preamble")
		function short_preamble:validate(value) return self.dt:is_bool(value) end

	local dtim_period = s:option("dtim_period")
		function dtim_period:validate(value) return self.dt:range(value, 1, 255) end

	local wpa_group_rekey = s:option("wpa_group_rekey")
		function wpa_group_rekey:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return self.dt:range(value, 0, 65535)
		end

	local skip_inactivity_poll = s:option("skip_inactivity_poll")
		function skip_inactivity_poll:validate(value) return self.dt:is_bool(value) end

	local max_inactivity = s:option("max_inactivity")
		function max_inactivity:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return self.dt:range(value, 0, 65535)
		end

	local max_listen_interval = s:option("max_listen_interval")
		function max_listen_interval:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return self.dt:range(value, 0, 65535)
		end

	local disassoc_low_ack = s:option("disassoc_low_ack")
		function disassoc_low_ack:validate(value) return self.dt:is_bool(value) end

wifi_ifaces = siteman_utils:wrap_endpoint(wifi_ifaces)

return wifi_ifaces
