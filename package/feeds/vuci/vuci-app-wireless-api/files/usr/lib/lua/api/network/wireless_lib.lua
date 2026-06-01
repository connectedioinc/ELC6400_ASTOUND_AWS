local util = require("vuci.util")
local pac = require("vuci.package_checker")
local _, firewall_lib = pcall(require, "api.network.firewall.firewall_lib")
local CODES = require("api.network.wireless_codes")

local board = require("vuci.board")
local lan_dev = board:get_default_lan_ifname()
local is_ap = board:is_ap()

local wireless_lib = {}

function wireless_lib:new(wifi_ifaces, wifi_driver)
	self.wifi_ifaces = wifi_ifaces
	self.wifi_driver = wifi_driver
	return self
end

--------------------- HELPER FUNCTIONS ---------------------

function wireless_lib:network_options()
	if self.networks then return self.networks end
	self.networks = {}
	self.wifi_ifaces:table_foreach("network", "interface", function (s)
		if s[".name"] ~= "loopback" then
			self.networks[#self.networks+1] = s.name or s[".name"]
		end
	end)
	return self.networks
end

function wireless_lib:check_device_match(dev1, dev2)
	for _, d in ipairs(util.to_table(dev1)) do
		if util.contains(util.to_table(dev2), d) then
			return true
		end
	end
	return false
end

function wireless_lib:create_vlan(vid)
	local vlan = "vlan"..vid
	local vlan_exists = self.wifi_ifaces:table_get("network", vlan)
	if vlan_exists then return vlan end
	for _, p in pairs(self.wifi_ifaces:table_get("network", "br_lan", "ports") or {}) do
		if p == lan_dev.."."..vid then
			return "lan"
		end
	end
	local other_vlan
	self.wifi_ifaces:table_foreach("network", "interface", function (s)
		if not s.device then return end
		local bridge_device = self.wifi_ifaces:table_get("network", s.device)
		if bridge_device and util.contains(bridge_device.ports or {}, lan_dev.."."..vid) then
			other_vlan = s[".name"]
			return false
		end
	end)
	if other_vlan then return other_vlan end

	self.wifi_ifaces:table_section("network", "device", "br_"..vlan, {
		ports = {lan_dev.."."..vid},
		type = "bridge",
		name = "br-"..vlan
	})
	self.wifi_ifaces:table_section("network", "interface", vlan, {
		device = "br-"..vlan,
		proto = "none"
	})
	return vlan
end

function wireless_lib:remove_unused_interface(interface, vlan_sid)
	local used = false
	self.wifi_ifaces:table_foreach("wireless", "wifi-iface", function (s)
		if s[".name"] ~= self.wifi_ifaces.sid and s.network and s.network == interface then
		-- checks if interface is used in wireless configuration
			used = true
			return
		end
	end)
	self.wifi_ifaces:table_foreach("wireless", "wifi-vlan", function (s)
		if s[".name"] ~= (vlan_sid or self.wifi_ifaces.sid) and s.network and s.network == interface then
			used = true
			return
		end
	end)
	if used or interface == "lan" then return end
	-- do not delete interface if it's LAN when removing wireless
	local interface = self.wifi_ifaces:table_get("network", interface)
	if not interface then return end
	self.wifi_ifaces:table_delete("network", interface[".name"])
	if not interface.device then return end
	local device
	self.wifi_ifaces:table_foreach("network", "device", function (s)
		if s.name == interface.device then
			device = s[".name"]
			return false
		end
	end)
	if device then self.wifi_ifaces:table_delete("network", device) end
end

----------------------- OPTIONS -----------------------

function wireless_lib:add_mode_support(s)
	local mode = s:option("mode")
		mode.require = { ap = {"ssid"}, mesh = {"mesh_id"} }
		function mode:validate(value)
			local sta_exists = false
			if value == "sta" or value == "multi_ap" then
				local device = self:get_abs_value(self.config, self.sid, "device")
				self:table_foreach(self.config, "wifi-iface", function(s)
					if self.sid ~= s[".name"] and wireless_lib:check_device_match(s.device, device) and s.mode == "sta" then
						sta_exists = true
					end
				end)
			end
			if sta_exists then
				return false, "Maximum number of 1 client for one device allowed."
			end
			return self.dt:check_array(value, {"ap", "sta", "mesh", "multi_ap"})
		end
		function mode:get(value)
			local multiple = self:table_get(self.config, self.sid, "multiple")
			return multiple == "1" and "multi_ap" or value
		end
		function mode:set(value)
			if value == "multi_ap" then
				local enabled = self:get_abs_value(self.config, self.sid, "enabled")
				self:table_set(self.config, self.sid, self.api_key, "sta")
				self:table_set(self.config, self.sid, "multiple", "1")
				self:table_set("multi_wifi", "general", "enabled", enabled == "1" and "1" or "0")
				return
			end
			local multiple = self:table_get(self.config, self.sid, "multiple")
			if multiple == "1" then
				self:table_delete(self.config, self.sid, "multiple")
				self:table_set("multi_wifi", "general", "enabled", "0")
				self:table_foreach("multi_wifi", "wifi-iface", function(s)
					self:table_delete("multi_wifi", s[".name"])
				end)
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end
end

function wireless_lib:add_sta_support(s)
	local bssid = s:option("bssid")
		function bssid:validate(value)
			if ((self.current_data_block.bgscan_enabled == "1" or
				(self.current_data_block.bgscan_mode and #self.current_data_block.bgscan_mode > 0)) or
				(self:table_get(self.config, self.sid, "_bgscan_enabled") == "1" or
				(self:table_get(self.config, self.sid, "bgscan") and #self:table_get(self.config, self.sid, "bgscan") > 0))) then
				return false, "Basic Service Set Identifier cannot be set when fast roaming is turned on"
			end
			return self.dt:macaddr(value)
		end
		-- TODO: uncomment this code after 7.6 when `get_abs_value` is fixed
		function bssid:set(value)
			-- local multi_ap = self:get_abs_value("wireless", self.sid, "mode") == "multi_ap"
			-- if multi_ap then return end
			-- self:table_set("wireless", self.sid, "bssid", value)
		end

	local scan_time = s:option("scan_time")
		function scan_time:validate(value)
			if tonumber(value) and tonumber(value) < 30 then
				return false, "Must be 30 or greater."
			end
			return self.dt:uinteger(value)
		end
		function scan_time:get()
			return self:table_get("multi_wifi", "general", "scan_time")
		end
		function scan_time:set(value)
			self:table_set("multi_wifi", "general", "scan_time", value)
		end

		auto_reconnect_changed = false
		local auto_reconnect = s:option("auto_reconnect")
			function auto_reconnect:validate(value) return self.dt:is_bool(value) end
			function auto_reconnect:get(value)
				local mode = self:get_abs_value(self.config, self.sid, "mode")
				if mode ~= "sta" then
					return nil
				end
				return not value and "1" or value
			end

			function auto_reconnect:set(value)
				local mode = self:get_abs_value("wireless", self.sid, "mode")
				if mode ~= "sta" then return end
				auto_reconnect_changed = true
				self:table_set(self.config, self.sid, self.api_key, value)
			end

			function wireless_lib:update_auto_reconnect()
				if not auto_reconnect_changed then return end
				local ifname = self:table_get(self.config, self.sid, "network")
				if not ifname then return end
				local status = util.ubus("network.interface." .. ifname, "status")
				if not status then return end
				local reconnect = self:table_get(self.config, self.sid, "auto_reconnect") or "1"
				util.file_exec("/usr/lib/lua/api/network/supplicant_control.lua", { "STA_AUTOCONNECT " .. reconnect, status.device })

				if reconnect == "1" then
					util.file_exec("/usr/lib/lua/api/network/supplicant_control.lua", { "RECONNECT", status.device })
				end
			end
end

function wireless_lib:add_mesh_support(s)
	local mesh_id = s:option("mesh_id")
		function mesh_id:validate(value)
			local name = self:get_abs_value(self.config, self.sid, ".name")
			local device = self:get_abs_value(self.config, self.sid, "device")
			local existing_mesh = false
			self:table_foreach(self.config, "wifi-iface", function (s)
				if s.mode == "mesh" and s.mesh_id == value and wireless_lib:check_device_match(s.device, device) and s[".name"] ~= name then
					existing_mesh = true
					return false
				end
			end)
			if existing_mesh then
				return false, "mesh_id must be unique within the same wireless device."
			end
			return self.dt:max_bytes(value, 32)
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

	local mesh_rssi_threshold = s:option("mesh_rssi_threshold")
		function mesh_rssi_threshold:validate(value) return self.dt:irange(value, -255, 1) end
end

function wireless_lib:add_mesh_support_tap(s)
	self:add_mesh_support(s)

	local mode = s:option("mode")
		function mode:validate(value)
			return self.dt:check_array(value, {"ap", "mesh"})
		end
end

function wireless_lib:add_travelmate_support(s)
	local trm_enabled = s:option("trm_enabled")
		function trm_enabled:validate(value)
			if not pac.is_installed("travelmate") then
				return false, "'Travelmate' package is not installed"
			end
			local mode = self:getter_wrapped_abs_value("wireless", self.sid, "mode") or "ap"
			if mode ~= "sta" and mode ~= "multi_ap" then
				return false, "Only available in 'sta' or 'multi_ap' mode"
			end
			return self.dt:is_bool(value)
		end
		function trm_enabled:get()
			local mode = self:getter_wrapped_abs_value("wireless", self.sid, "mode") or "ap"
			if pac.is_installed("travelmate") and (mode == "sta" or mode == "multi_ap") then
				return self:table_get("travelmate", "global", self.api_key)
			end
			return nil
		end
		function trm_enabled:set(value)
			self:table_set("travelmate", "global", self.api_key, value == "" and "0" or value)
		end
end

function wireless_lib:add_bgscan_support(s)
	local default_bgscan_options_setter = function (self, value)
		local wifi_mode = self:getter_wrapped_abs_value("wireless", self.sid, "mode") or "ap"
		if wifi_mode == "sta" or wifi_mode == "multi_ap" then
			self:table_set(self.config, self.sid, self.api_key, value)
		end
	end

	local default_bgscan_options_getter = function (self, value)
		local wifi_mode = self:getter_wrapped_abs_value("wireless", self.sid, "mode") or "ap"
		if wifi_mode == "sta" or wifi_mode == "multi_ap" then
			return value
		end
		return nil
	end

	if wireless_lib.wifi_driver ~= CODES.WIFI_DRIVERS.RALINK then
		local bgscan_enabled = s:option("bgscan_enabled")
		bgscan_enabled.require = { ["1"] = {"bgscan_mode"} }
			function bgscan_enabled:validate(value)
				local wifi_mode = self:getter_wrapped_abs_value("wireless", self.sid, "mode") or "ap"
				if (wifi_mode == "ap" or wifi_mode == "mesh") and value == "1" then
					return false, "Fast roaming is only available in 'sta' or 'multi_ap' mode"
				end
				local bssid_val = self:get_abs_value(self.config, self.sid, "bssid") or ""
				if value == "1" and #bssid_val > 0 then
					return false, "Fast roaming cannot be turned on when Basic Service Set Identifier is set"
				end
				return self.dt:is_bool(value)
			end
			function bgscan_enabled:get()
				local wifi_mode = self:getter_wrapped_abs_value("wireless", self.sid, "mode") or "ap"
				if wifi_mode == "sta" or wifi_mode == "multi_ap" then
					return self:table_get(self.config, self.sid, "_bgscan_enabled")
				end
				return nil
			end
			function bgscan_enabled:set(value)
				self:table_set(self.config, self.sid, "_bgscan_enabled", value)
				local mode = self:getter_wrapped_abs_value(self.config, self.sid, "mode") or "ap"
				-- Check needed because option gets deleted otherwise and ignores request value after initial switch to AP mode
				if mode == "sta" or mode == "multi_ap" then
					self:table_set(self.config, self.sid, "ieee80211r", value)
				end
				if not value or value == "0" then
					self:table_delete(self.config, self.sid, "bgscan")
				end
			end

		local bgscan_mode = s:option("bgscan_mode")
		bgscan_mode.require = { ["simple"] = {"short_interval", "long_interval", "signal_thresh"},
						["learn"] = {"short_interval", "long_interval", "signal_thresh"} }
			function bgscan_mode:validate(value)
				local bssid_val = self:getter_wrapped_abs_value(self.config, self.sid, "bssid") or "ap"
				if value == "1" and #bssid_val > 0 then
					return false, "Fast roaming cannot be turned on when Basic Service Set Identifier is set"
				end
				return self.dt:check_array(value, {"simple", "learn"})
			end
			function bgscan_mode:get()
				local wifi_mode = self:getter_wrapped_abs_value("wireless", self.sid, "mode") or "ap"
				if wifi_mode == "sta" or wifi_mode == "multi_ap" then
					return self:table_get(self.config, self.sid, "bgscan")
				end
			end
			function bgscan_mode:set(value)
				self:table_set(self.config, self.sid, "bgscan", value)
				self:table_set(self.config, self.sid, "_bgscan_enabled", #value > 0 and "1" or "0")
			end

		local signal_thresh = s:option("signal_thresh")
			function signal_thresh:validate(value)
				return self.dt:irange(value, -90, -30)
			end
			signal_thresh.set = default_bgscan_options_setter
			signal_thresh.get = default_bgscan_options_getter

		local short_interval = s:option("short_interval")
			function short_interval:validate(value)
				return self.dt:irange(value, 5, 86400)
			end
			short_interval.set = default_bgscan_options_setter
			short_interval.get = default_bgscan_options_getter

		local long_interval = s:option("long_interval")
			function long_interval:validate(value)
				return self.dt:irange(value, 5, 86400)
			end
			long_interval.set = default_bgscan_options_setter
			long_interval.get = default_bgscan_options_getter
	end
end

function wireless_lib:add_network_support_rut(s, mwan)
	local network = s:option("network")
		function network:validate(value)
			if self.dt:check_array(value, wireless_lib:network_options()) then return true end
			self.custom_networks[self.sid] = true
			return self.dt:uciname(value)
		end
		function network:get(value)
			return util.network_mapper_get(self, value)
		end
		function network:set(value)
			PREVIOUS_NETWORK = self:table_get(self.config, self.sid, "network")
			value = util.get_network_map(self)[value] or value
			self:table_set(self.config, self.sid, self.api_key, value)

			--Quit if value is "", because there is nothing more to be done
			if value == "" then return end
			local area_type = self:table_get("network", value, "area_type")
			if not self.custom_networks[self.sid] then
				if area_type == "wan" then return end
				local dev_name = self:table_get("network", value, "device") or ""
				local bridge_vlan = self:table_find("network", "bridge-vlan", { device = dev_name:match("^(.+)%.%d+$") })
				dev_name = bridge_vlan and bridge_vlan.device or dev_name
				local dev_section = self:table_find("network", "device", { name = dev_name })
				if dev_section and dev_section.type == "bridge" then return end

				self:table_section("network", "device", "br_"..value, {
					name = "br-"..value,
					type = "bridge",
				})
				if dev_name and dev_name ~= "" then
					self:table_set("network", "br_"..value, "ports", dev_name)
				end
				return self:table_set("network", value, "device", "br-"..value)
			end

			-- add custom network and dhcp sections, setup firewall
			local wifi_mode = self.current_data_block.mode or self:table_get(self.config, self.sid, "mode")
			local id = util.create_network_interface(self, { condition = wifi_mode == "ap" and area_type ~= "wan", name = value })
			if wifi_mode == "ap" and area_type ~= "wan" then
				firewall_lib:add_net_to_zone(self, "lan", id)
				self:table_set("network", id, "device", "br-"..id)
				self:table_set("network", id, "proto", "static")
				self:table_section("network", "device", "br_"..id, { name = "br-"..id, type = "bridge" })
			else
				firewall_lib:add_net_to_zone(self, "wan", id)
				self:table_set("network", id, "proto", "dhcp")
				mwan = mwan or require "vuci.mwan".init(self.uci)
				mwan:add_mwan(id)
				self.config_set_table.mwan3 = self.config_set_table.mwan3 or {}
			end
			self:table_set(self.config, self.sid, self.api_key, id)
			self:add_message(10, "New network interface '%s' has been created. Please configure it." % value, "interface: "..value)
		end
end

function wireless_lib:add_network_support_tap(s)
	local network = s:option("vlan_id")
		function network:validate(value)
			if value == "lan" then
				return true
			end
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return self.dt:irange(value, 1, 4094)
		end
		function network:set(value)
			local old_value = self:table_get(self.main_config, self.sid, "network")
			if value == "lan" then
				local new_network = "lan"
				local has_eth
				for _, p in pairs(self:table_get("network", "br_lan", "ports") or {}) do
					if p == lan_dev then
						has_eth = true
						break
					end
				end
				if not has_eth then
					if not self:table_get("network", "vlan") then
						self:table_section("network", "device", "br_vlan", {
							ports = {lan_dev},
							type = "bridge",
							name = "br-vlan"
						})
						self:table_section("network", "interface", "vlan", {
							device = "br-vlan",
							proto = "none"
						})
					end
					new_network = "vlan"
				end
				self:table_set(self.main_config, self.sid, "network", new_network)
			else
				local vlan = wireless_lib:create_vlan(value)
				self:table_set(self.main_config, self.sid, "network", vlan)
			end
			if old_value and old_value:match("^vlan") then
				wireless_lib:remove_unused_interface(old_value)
			end
		end
		function network:get()
			local value = self:table_get(self.main_config, self.sid, "network")
			if not value then
				return nil
			end
			local vlan_id = value and value:match("^vlan(%d+)")
			if vlan_id then
				return vlan_id
			end
			local lan_device = self:table_get("network", "br_"..value, "ports")
			return lan_device and #lan_device > 0 and lan_device[1]:match("^"..lan_dev..".(%d+)") or value
		end

		s:option("network")
end

function wireless_lib:add_cert_support(s)
	local use_pkcs = s:option("use_pkcs")
		use_pkcs.require = { ["1"] = { "pkcs_cert" } }
		function use_pkcs:validate(value) return self.dt:is_bool(value) end

	local pkcs_cert = s:option("pkcs_cert", { file = true })

	local pkcs_passwd = s:option("pkcs_passwd", { sensitive = true })
		function pkcs_passwd:validate(value) return self.dt:credentials_validate(value) end

	local eap_type = s:option("eap_type")
		function eap_type:validate(value) return self.dt:check_array(value, {"tls", "ttls", "peap", "fast"}) end

	local device_files = s:option("device_files")
		function device_files:validate(value)
			return self.dt:is_bool(value)
		end

	s:option("ca_cert", { certificate = {
		type = "certificates",
		cert_types = { "root_ca", "ca", "import", "scep" }
	} })
	s:option("client_cert", { certificate = {
		type = "certificates",
		cert_types = { "client", "server", "import", "scep" }
	} })
	s:option("priv_key", { certificate = {
		type = "keys",
		cert_types = { "ca", "client", "server" }
	} })

	local device_files2 = s:option("device_files2")
		function device_files2:validate(value)
			return self.dt:is_bool(value)
		end

	s:option("ca_cert2", { certificate = {
		type = "certificates",
		cert_types = { "root_ca", "ca", "import", "scep" }
	} })
	s:option("client_cert2", { certificate = {
		type = "certificates",
		cert_types = { "client", "server", "import", "scep" }
	} })
	s:option("priv_key2", { certificate = {
		type = "keys",
		cert_types = { "ca", "client", "server" }
	} })

	local priv_key_pwd = s:option("priv_key_pwd", { sensitive = true })
		priv_key_pwd.maxlength = 512
		function priv_key_pwd:validate(value)
			return self.dt:credentials_validate(value)
		end

	local priv_key2_pwd = s:option("priv_key2_pwd", { sensitive = true })
		priv_key2_pwd.maxlength = 512
		function priv_key2_pwd:validate(value)
			return self.dt:credentials_validate(value)
		end

	local auth = s:option("auth")
		function auth:validate(value)
			local eap_type = self.current_data_block.eap_type or self:table_get(self.config, self.sid, "eap_type")
			if eap_type == "ttls" then
				return self.dt:check_array(value, {"PAP", "CHAP", "MSCHAP", "MSCHAPV2", "EAP-GTC", "EAP-MD5", "EAP-MSCHAPV2", "EAP-TLS"})
			else
				return self.dt:check_array(value, {"EAP-GTC", "EAP-MD5", "EAP-MSCHAPV2", "EAP-TLS"})
			end
		end

	s:option("identity")

	s:option("anonymous_identity")

	function self.wifi_ifaces:UPLOAD_after_upload_hook(upload_request)
		local v_table = upload_request.parameters
		local path = upload_request.files[1].location

		local certs = require("vuci.certificates")
		if v_table.option == "ca_cert" or v_table.option == "client_cert" or v_table.option == "priv_key" or v_table.option == "ca_cert2" or
			v_table.option == "client_cert2" or v_table.option == "priv_key2" then
			local valid = certs:validate_cert(path)
			if valid ~= 0 then
				os.remove(path)
			else
				util.set_file_permissions(path, "certificates", 0660)
			end
			if valid == 1 then self:add_critical_error(2, "Incorrect file uploaded.", "Upload") end
			if valid == 2 then self:add_critical_error(4, "File does not exist.", "Upload") end
		end

		if v_table.option == "pkcs_cert" then util.set_file_permissions(path, "certificates", 0660) end
		return { path = path }
	end
end

function wireless_lib:add_extended_fast_bss_support(s)
	local ft_psk_generate_local = s:option("ft_psk_generate_local")
		function ft_psk_generate_local:validate(value) return self.dt:is_bool(value) end
		function ft_psk_generate_local:get(value)
			return not value and "1" or value
		end

	local r0_key_lifetime = s:option("r0_key_lifetime")
		function r0_key_lifetime:validate(value) return self.dt:uinteger(value) end

	local r1_key_holder = s:option("r1_key_holder")
		r1_key_holder.minlength = 12
		r1_key_holder.maxlength = 12
		function r1_key_holder:validate(value)
			return self.dt:hexstring(value)
		end

	local pmk_r1_push = s:option("pmk_r1_push")
		function pmk_r1_push:validate(value) return self.dt:is_bool(value) end

	local r0kh = s:option("r0kh", { list = true })
		r0kh.maxlength = 256
		function r0kh:validate(value) return self.dt:string(value) end

	local r1kh = s:option("r1kh", { list = true })
		r1kh.maxlength = 256
		function r1kh:validate(value) return self.dt:string(value) end
end

function wireless_lib:add_ppsk_support(s)
	local radius_mode_set = {
		mac_auth = function(self)
			self:table_set(self.config, self.sid, "macaddr_acl", "2")
			self:table_set(self.config, self.sid, "wpa_psk_radius", "2")
			self:table_delete(self.config, self.sid, "radius_params_mode")
		end,
		freeradius = function(self)
			self:table_delete(self.config, self.sid, "macaddr_acl")
			self:table_delete(self.config, self.sid, "wpa_psk_radius")
			self:table_delete(self.config, self.sid, "radius_params_mode")
		end,
		teltonika = function(self)
			self:table_set(self.config, self.sid, "radius_params_mode", "1")
			self:table_delete(self.config, self.sid, "macaddr_acl")
			self:table_delete(self.config, self.sid, "wpa_psk_radius")
		end
	}

	local radius_ppsk = s:option("radius_ppsk")
		radius_ppsk.require = { ["1"] = { "radius_ppsk_mode" } }
		function radius_ppsk:validate(value)
			local encryption = self:getter_wrapped_abs_value(self.config, self.sid, "encryption")
			if encryption ~= "ppsk2" then
				return false, "Only available when 'encryption' is set to 'ppsk2'"
			end
			return self.dt:is_bool(value)
		end
		function radius_ppsk:get()
			return self:table_get(self.config, self.sid, "ppsk")
		end
		function radius_ppsk:set(value)
			if value ~= "1" then return end
			radius_mode_set.mac_auth(self)
		end

	local radius_ppsk_mode = s:option("radius_ppsk_mode")
		function radius_ppsk_mode:validate(value)
			local encryption = self:getter_wrapped_abs_value(self.config, self.sid, "encryption")
			local radius_ppsk = self:getter_wrapped_abs_value(self.config, self.sid, "radius_ppsk")
			if encryption ~= "ppsk2"  then
				return false, "Only available when 'encryption' is set to 'ppsk2'"
			end
			if radius_ppsk ~= "1" then
				return false, "Only available when 'radius_ppsk' is enabled"
			end
			return self.dt:check_array(value, {"mac_auth", "freeradius", "teltonika"})
		end
		function radius_ppsk_mode:get()
			local encryption = self:getter_wrapped_abs_value(self.config, self.sid, "encryption")
			local radius_ppsk = self:getter_wrapped_abs_value(self.config, self.sid, "radius_ppsk")
			if encryption ~= "ppsk2" or radius_ppsk ~= "1" then return end

			local macaddr_acl = self:table_get(self.config, self.sid, "macaddr_acl")
			local wpa_psk_radius = self:table_get(self.config, self.sid, "wpa_psk_radius")
			local radius_params_mode = self:table_get(self.config, self.sid, "radius_params_mode")
			if macaddr_acl == "2" and wpa_psk_radius == "2" then
				return "mac_auth"
			elseif radius_params_mode == "1" then
				return "teltonika"
			end
			return "freeradius"
		end
		function radius_ppsk_mode:set(value)
			if radius_mode_set[value] then
				radius_mode_set[value](self)
				return
			end
			radius_mode_set.mac_auth(self)
		end

	local dynamic_vlan = s:option("dynamic_vlan")
		function dynamic_vlan:validate(value)
			local encryption = self:getter_wrapped_abs_value(self.config, self.sid, "encryption")
			local radius_ppsk = self:getter_wrapped_abs_value(self.config, self.sid, "radius_ppsk")
			if encryption ~= "ppsk2" then
				return false, "Only available when 'encryption' is set to 'ppsk2'"
			end
			if radius_ppsk ~= "1" then
				return false, "Only available when 'radius_ppsk' is enabled"
			end
			return self.dt:check_array(value, {"disabled", "optional", "required"})
		end
		function dynamic_vlan:get(value)
			local encryption = self:getter_wrapped_abs_value(self.config, self.sid, "encryption")
			local radius_ppsk = self:getter_wrapped_abs_value(self.config, self.sid, "radius_ppsk")
			if encryption ~= "ppsk2" or radius_ppsk ~= "1" then return end

			local values = {
				["0"] = "disabled",
				["1"] = "optional",
				["2"] = "required"
			}
			return value and value ~= "" and values[value] or nil
		end
		function dynamic_vlan:set(value)
			local values = {
				disabled = "0",
				optional = "1",
				required = "2"
			}
			if values[value] then
				self:table_set(self.config, self.sid, self.api_key, values[value])
				return
			end
			self:table_delete(self.config, self.sid, self.api_key)
		end

	local psk_group = s:option("psk_group")
		function psk_group:validate(value)
			local encryption = self:getter_wrapped_abs_value(self.config, self.sid, "encryption")
			local radius_ppsk = self:getter_wrapped_abs_value(self.config, self.sid, "radius_ppsk")
			if encryption ~= "ppsk2" then
				return false, "Only available when 'encryption' is set to 'ppsk2'"
			end
			if radius_ppsk == "1" then
				return false, "Only available when 'radius_ppsk' is disabled"
			end
			local available_groups = {}
			self:table_foreach(self.config, "psk-group", function (s)
				available_groups[#available_groups+1] = s[".name"]
			end)
			return self.dt:check_array(value, available_groups)
		end

	local devices_status
	local vlan_tagged_interface = s:option("vlan_tagged_interface")
		function vlan_tagged_interface:validate(value)
			local encryption = self:getter_wrapped_abs_value(self.config, self.sid, "encryption")
			local radius_ppsk = self:getter_wrapped_abs_value(self.config, self.sid, "radius_ppsk")
			if encryption ~= "ppsk2" then
				return false, "Only available when 'encryption' is set to 'ppsk2'"
			end
			if radius_ppsk ~= "1" then
				return false, "Only available when 'radius_ppsk' is enabled"
			end
			if not devices_status then
				local devices_status_lib = require("vuci.devices_status_lib"):new(self.uci)
				devices_status = devices_status_lib:get_device_status()
			end
			local available_devices = {}
			for _, dev in pairs(devices_status or {}) do
				if dev.type == "ethernet" or dev.type == 'vxlan' then
					table.insert(available_devices, dev.name)
				end
			end
			return self.dt:check_array(value, available_devices)
		end
		function vlan_tagged_interface:set(value)
			if not value or value == "" then
				self:table_delete(self.config, self.sid, "vlan_naming")
				self:table_delete(self.config, self.sid, "vlan_no_bridge")
				self:table_delete(self.config, self.sid, self.api_key)

				self:remove_ppsk_zone()
				return
			end
			self:table_set(self.config, self.sid, "vlan_naming", "1")
			self:table_set(self.config, self.sid, "vlan_no_bridge", "0")
			self:table_set(self.config, self.sid, self.api_key, value)

			self:add_ppsk_zone(value)
		end


	function self.wifi_ifaces:add_ppsk_zone(value)
		local zone_name = "ppsk_"..self.sid
		local device = "br"..value.."+"
		local current_zone = self:table_find("firewall", "zone", { name = zone_name })
		if current_zone then
			self:table_set("firewall", current_zone[".name"], "device", device)
			return
		end
		self:table_section("firewall", "zone", self:next_id("firewall"), {
			name = zone_name,
			device = device,
			input = "ACCEPT",
			output = "ACCEPT",
			forward = "ACCEPT"
		})
		self:table_section("firewall", "forwarding", self:next_id("firewall"), {
			src = zone_name,
			dest = "wan"
		})
	end

	function self.wifi_ifaces:remove_ppsk_zone()
		local zone_name = "ppsk_"..self.sid
		local zone_section = self:table_find("firewall", "zone", { name = zone_name })
		if not zone_section then return end
		self:table_delete("firewall", zone_section[".name"])
		local forwarding = self:table_find("firewall", "forwarding", { src = zone_name })
		if not forwarding then return end
		self:table_delete("firewall", forwarding[".name"])
	end

	function self.wifi_ifaces:remove_wifi_associates(section_type)
		self:table_foreach("wireless", section_type, function(s)
			if s.iface ~= self.sid then return end
			if s.network and is_ap then wireless_lib:remove_unused_interface(s.network, s[".name"]) end
			self:table_delete("wireless", s[".name"])
		end)
	end

	function self.wifi_ifaces:update_ppsk_vlans()
		local encryption = self:getter_wrapped_abs_value(self.config, self.sid, "encryption")
		local radius_opts = { "vlan_naming", "vlan_no_bridge", "vlan_tagged_interface", "macaddr_acl", "wpa_psk_radius", "radius_params_mode" }

		if encryption == "ppsk2" then
			local radius_ppsk = self:getter_wrapped_abs_value(self.config, self.sid, "radius_ppsk")
			if radius_ppsk == "1" then
				self:table_set(self.config, self.sid, "ppsk", "1")
				self:table_delete(self.config, self.sid, "psk_group")
			else
				for _, opt in pairs({ "auth_server", "auth_secret", "auth_port", unpack(radius_opts) }) do
					self:table_delete(self.config, self.sid, opt)
				end
				self:table_set(self.config, self.sid, "ppsk", "0")
				self:table_set(self.config, self.sid, "dynamic_vlan", "1")
				self:remove_wifi_associates("wifi-vlan")
			end
		else
			for _, opt in pairs({ "ppsk", "dynamic_vlan", "psk_group", unpack(radius_opts) }) do
				self:table_delete(self.config, self.sid, opt)
			end
			self:remove_wifi_associates("wifi-vlan")
			self:remove_ppsk_zone()
		end
	end
	table.insert(self.wifi_ifaces.before_commit_functions, self.wifi_ifaces.update_ppsk_vlans)
end

return wireless_lib
