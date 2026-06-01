
local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local fs = require "nixio.fs"
local pac = require("vuci.package_checker")
local _, firewall_lib = pcall(require, "api.network.firewall.firewall_lib")
local CODES = require("api.network.wireless_codes")
local wdev_common = require("api/network/wireless_devices_common")
local ntm, mwan

local wifi_ifaces = ConfigService:new({ increment_name = true })
local board = require("vuci.board")

local wifi_driver

if not board:has_wifi()then
	return nil
end

PREVIOUS_NETWORK = nil

local is_access_point = board:is_ap()
local has_mwan = fs.access("/etc/config/mwan3")

local separator = "-"

wifi_ifaces.device_count = 0
wifi_ifaces.uci:foreach("wireless", "wifi-device", function(s)
	wifi_ifaces.device_count = wifi_ifaces.device_count + 1
	if s.type then
		wifi_driver = s.type
	end
end)

if wifi_driver == CODES.WIFI_DRIVERS.QCAWIFI then
	separator= ""
end

wifi_ifaces.before_commit_functions = {}
wifi_ifaces.after_commit_functions = {}

local wireless_lib = require("api.network.wireless_lib"):new(wifi_ifaces, wifi_driver)

wifi_ifaces.default_dev = wifi_ifaces.device_count == 1 and wifi_ifaces.uci:get_all("wireless", "@wifi-device[0]")[".name"]
local enabled_depends = { ["1"] = {"encryption"} }
if wifi_ifaces.device_count > 1 then
	table.insert(enabled_depends["1"], "device")
end
if not is_access_point and wifi_driver ~= CODES.WIFI_DRIVERS.QCAWIFI then
	enabled_depends = { ["1"] = {"mode"} }
end

function wifi_ifaces:initialize_hook()
	self.wifi_interfaces = {}
	self.custom_networks = {}
end

function wifi_ifaces:check_travelmate()
	if not pac.is_installed("travelmate") then
		return
	end

	local sta_count = 0
	self:table_foreach(self.config, "wifi-iface", function (s)
		if s.mode == "sta" then
			sta_count = sta_count + 1
		end
	end)
	--TODO API-CORE remove this after API POST restructurization, currently table_foreach is not returning all sections
	if sta_count == 0 and self:table_get(self.config, self.sid, "mode") ~= "sta" then
		self:table_set("travelmate", "global", "trm_enabled", "0")
	end
end

function wifi_ifaces:find_id(id_list, prefix)
	local id
	for i = 1, 99 do
		id = prefix .. i
		if not id_list[id] then
			return id
		end
	end

	return nil
end

function wifi_ifaces:find_wifi_id()
	local wifi_ids = {}
	self:table_foreach("wireless", "wifi-iface",function(s)
		if s.wifi_id then
			wifi_ids[s.wifi_id] = true
		end
	end)

	return self:find_id(wifi_ids, "wifi")
end


function wifi_ifaces:get_interface_options(sname, mode)
	if self.wifi_interfaces[sname] then return end
	local dev = {}
	local base_enc_types = {
		ap = { "psk", "psk2", "psk-mixed", "ppsk2" },
		sta = { "psk", "psk2", "psk-mixed" }
	}
	local enc_types = {
		ap = {
			ap_sae = { "sae", "sae-mixed" },
			ap_eap = { "wpa", "wpa2" },
			ap_eap192 = { "wpa3", "wpa3-mixed" },
			ap_owe = { "owe" }
		},
		sta = {
			sta_sae = { "sae", "sae-mixed" },
			sta_eap = { "wpa", "wpa2" },
			sta_eap192 = { "wpa3", "wpa3-mixed" },
			sta_owe = { "owe" }
		},
		mesh = {
			sta_sae = { "sae" }
		}
	}

	local enc_feats = wdev_common:device_features(nil, self, wifi_driver)
	local enc = { "none", unpack(base_enc_types[mode] or {})}
	for key, encs in pairs(enc_types[mode] or {}) do
		if enc_feats.encryption[key] then
			for _, e in pairs(encs) do
				table.insert(enc, e)
			end
		end
	end

	dev.encryption_options = enc
	self.wifi_interfaces[sname] = dev
end

local function check_key_pass_required(cert_data, key_path, device_files)
	if device_files ~= "1" then return false end
	local key_name = string.match(key_path or "", ".*/(.*)$")
	for _, cert in pairs(cert_data) do
		if cert.fullname == key_name then
			return cert.pass_required
		end
	end
	return false
end

local encryption, cipher, enabled
function wifi_ifaces:validate_section_hook()
	local mode = self:get_abs_value(self.config, self.sid, "mode")
	local devices = self:get_abs_value(self.config, self.sid, "device")
	if type(devices) ~= "table" then devices = {devices} end

	self:get_interface_options(self.sid, mode)

	-- custom option require logic
	local enb = self.current_data_block.enabled or enabled:get()
	local enc = self.current_data_block.encryption or encryption:get(self:table_get(self.config, self.sid, "encryption"))
	local eap_type = self.current_data_block.eap_type or self:table_get(self.config, self.sid, "eap_type")
	local radius_ppsk = self:getter_wrapped_abs_value(self.config, self.sid, "radius_ppsk")
	local isolate = self:get_abs_value(self.config, self.sid, "isolate")
	if enc == "ppsk2" and isolate == "1" then
		self:add_error(STD_CODES.INVALID_OPT, "Client isolation is not supported with 'ppsk2' encryption", "Validation")
	end
	if enb == "1" then
		if mode == "ap" and (enc == "wpa" or enc == "wpa2" or enc == "wpa3" or enc == "wpa3-mixed" or (enc == "ppsk2" and radius_ppsk == "1")) then
			local auth_server = self.current_data_block.auth_server or self:table_get(self.config, self.sid, "auth_server")
			if not auth_server or auth_server == "" then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: auth_server", "mode,encryption")
			end
			local auth_secret = self.current_data_block.auth_secret or self:table_get(self.config, self.sid, "auth_secret")
			if not auth_secret or auth_secret == "" then
				self:add_error(STD_CODES.INVALID_OPT, "Missing required option: auth_secret", "mode,encryption")
			end
		end

		if not is_access_point then
			if mode == "sta" and (enc == "wpa" or enc == "wpa2" or enc == "wpa3" or enc == "wpa3-mixed") then
				if not eap_type or eap_type == "" then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: eap_type", "mode,encryption")
				end
			end

			if mode == "sta" and (eap_type == "peap" or eap_type == "ttls" or eap_type == "fast")
			and (enc == "wpa" or enc == "wpa2" or enc == "wpa3" or enc == "wpa3-mixed") then
				local auth = self.current_data_block.auth or self:table_get(self.config, self.sid, "auth")
				local password = self.current_data_block.password or self:table_get(self.config, self.sid, "password")
				if not auth or auth == "" then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: auth", "mode,encryption,eap_type")
				end
				if not password or password == "" then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: password", "mode,encryption,eap_type")
				end
			end

			local device_files = self:getter_wrapped_abs_value(self.config, self.sid, "device_files")
			local device_files2 = self:getter_wrapped_abs_value(self.config, self.sid, "device_files2")
			local cert_data = {}
			if device_files == "1" or device_files2 == "1" then
				local certs = require("vuci.certificates")
				cert_data = certs:get_certificates("keys")
			end
			if mode == "sta" and eap_type == "tls" and (enc == "wpa" or enc == "wpa2" or enc == "wpa3" or enc == "wpa3-mixed") then
				local use_pkcs = self:get_abs_value(self.config, self.sid, "use_pkcs")
				if use_pkcs == "1" then
					local pkcs_cert = self:get_abs_value(self.config, self.sid, "pkcs_cert")
					if not pkcs_cert or pkcs_cert == "" then
						self:add_error(STD_CODES.INVALID_OPT, "Missing required option: pkcs_cert", "mode,encryption,eap_type")
					end
				else
					local client_cert = self.current_data_block.client_cert or self:table_get(self.config, self.sid, "client_cert")
					local priv_key = self.current_data_block.priv_key or self:table_get(self.config, self.sid, "priv_key")
					local priv_key_pwd = self.current_data_block.priv_key_pwd or self:table_get(self.config, self.sid, "priv_key_pwd")
					if not client_cert or client_cert == "" then
						self:add_error(STD_CODES.INVALID_OPT, "Missing required option: client_cert", "mode,encryption,eap_type")
					end
					if not priv_key or priv_key == "" then
						self:add_error(STD_CODES.INVALID_OPT, "Missing required option: priv_key", "mode,encryption,eap_type")
					end
					if check_key_pass_required(cert_data, priv_key, device_files) and (not priv_key_pwd or priv_key_pwd == "") then
						self:add_error(STD_CODES.INVALID_OPT, "Missing required option: priv_key_pwd", "mode,encryption,eap_type")
					end
				end
			end

			local auth = self.current_data_block.auth or self:table_get(self.config, self.sid, "auth")
			if mode == "sta" and auth == "EAP-TLS" and (enc == "wpa" or enc == "wpa2" or enc == "wpa3" or enc == "wpa3-mixed") then
				local client_cert2 = self.current_data_block.client_cert2 or self:table_get(self.config, self.sid, "client_cert2")
				local priv_key2 = self.current_data_block.priv_key2 or self:table_get(self.config, self.sid, "priv_key2")
				local priv_key2_pwd = self.current_data_block.priv_key2_pwd or self:table_get(self.config, self.sid, "priv_key2_pwd")
				if not client_cert2 or client_cert2 == "" then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: client_cert2", "mode,encryption,auth")
				end
				if not priv_key2 or priv_key2 == "" then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: priv_key2", "mode,encryption,auth")
				end
				if check_key_pass_required(cert_data, priv_key2, device_files2) and (not priv_key2_pwd or priv_key2_pwd == "") then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: priv_key2_pwd", "mode,encryption,auth")
				end
			end

			if mode == "sta" and (eap_type == "peap" or eap_type == "ttls" or eap_type == "fast" or eap_type == "tls")
			and (enc == "wpa" or enc == "wpa2" or enc == "wpa3" or enc == "wpa3-mixed") then
				local identity = self.current_data_block.identity or self:table_get(self.config, self.sid, "identity")
				if not identity or identity == "" then
					self:add_error(STD_CODES.INVALID_OPT, "Missing required option: identity", "mode,encryption,eap_type")
				end
			end
		end

		if is_access_point and mode == "mesh" and #devices > 1 then
			self:add_error(STD_CODES.INVALID_OPT, "Only a single device can be assigned to the interface in 'mesh' mode", "mode,device")
		end
	end

	local pmf = self.current_data_block.ieee80211w
	if  mode == "ap" and pmf and pmf ~= "" and util.contains({ "wpa3", "wpa3-mixed", "sae", "sae-mixed", "owe", "none" }, enc) then
		self:add_error(STD_CODES.INVALID_OPT, "Option 'ieee80211w' cannot be manually set when using WPA3 or no encryption")
	end
end

function wifi_ifaces:check_iface_limits()
	local iface_count, sta_count, iface_max, checked = {}, {}, {}, false

	local mode = is_access_point and "ap" or self:get_abs_value(self.config, self.sid, "mode")
	local dev = self:get_abs_value(self.config, self.sid, "device") or self.default_dev or self.current_data_block.device or {}
	if not dev or dev == "" or dev == {} then
		return self:add_error(STD_CODES.INVALID_OPT, "'device' option is required", "device")
	end

	self:table_foreach("wireless", "wifi-device", function(s)
		iface_count[s[".name"]] = 0
		sta_count[s[".name"]] = 0
	end)

	self:table_foreach("wireless", "wifi-iface", function(s)
		for _, r in pairs(util.to_table(s.device)) do
			iface_count[r] = iface_count[r] + 1
			if s.mode == "sta" then
				sta_count[r] = sta_count[r] + 1
			end
		end
	end)

	for radio in pairs(iface_count) do
		iface_max[radio] = board:get_wlan_bssid_limit(radio)
	end

	for _, d in pairs(util.to_table(dev)) do
		if not iface_count[d] or not sta_count[d] then
			self:add_critical_error(STD_CODES.INVALID_OPT, "Incorrect 'device' option's value provided", "device")
		end

		iface_count[d] = iface_count[d] + 1
		if mode == "sta" then
			sta_count[d] = sta_count[d] + 1
		end

		if iface_count[d] > iface_max[d] then
			self:add_error(CODES.CODES.MAX_WIFI_IFACES, "Maximum number of " .. tostring(iface_max[d]) .. " interfaces for '" .. d .. "' device are allowed", "POST")
		elseif sta_count[d] > 1 then
			return self:add_error(CODES.CODES.MAX_STA_COUNT, "Maximum number of 1 client for one device allowed", "POST")
		end

		checked = true
	end

	if not checked then
		local errors, available = {}, false
		for radio in pairs(iface_count) do
			if iface_count[radio] >= iface_max[radio] or sta_count[radio] > 1 then
				errors[radio] = true
			else
				available = true
			end
		end

		if not available then
			for d in pairs(errors) do
				self:add_error(CODES.CODES.MAX_WIFI_IFACES, "Maximum number of " .. tostring(iface_max[d]) .. " interfaces for '" .. d .. "' device are allowed", "POST")
			end
		end
	end
end

function wifi_ifaces:check_fast_roaming()
	-- Clean fast roaming options in ap mode
	if self:get_abs_value(self.config, self.sid, "mode") == "ap" then
		self:table_delete(self.config, self.sid, "_bgscan_enabled")
		self:table_delete(self.config, self.sid, "bgscan")
		self:table_delete(self.config, self.sid, "signal_thresh")
		self:table_delete(self.config, self.sid, "long_interval")
		self:table_delete(self.config, self.sid, "short_interval")
	end

	self:check_travelmate()
end

function wifi_ifaces:handle_network_delete()
	if not PREVIOUS_NETWORK then return end
	local network_used = false
	local area_type = self:table_get("network", PREVIOUS_NETWORK, "area_type")
	-- Checks if network is used depending if the existing `device` contains any `ports`
	if area_type == "wan" then
		local device_name = self:table_get("network", PREVIOUS_NETWORK, "device")
		if device_name then
			local net_device
			self:table_foreach("network", "device", function (s)
				if s.name == device_name then
					net_device = s[".name"]
					return false
				end
			end)
			local net_ports = self:table_get("network", net_device, "ports")
			local net_proto = self:table_get("network", PREVIOUS_NETWORK, "proto")
			if net_ports or (net_proto == "dhcp" and device_name) then
				network_used = true
			end
		end
	else
		network_used = true
	end
	-- Checks if network is being used by any WiFi interface
	self:table_foreach(self.config, "wifi-iface", function (s)
		if s[".name"] ~= self.sid and s.network == PREVIOUS_NETWORK then
			network_used = true
			return false
		end
	end)
	if network_used then return end
	ntm = ntm or require "vuci.network".init(self.uci)
	firewall_lib:del_net_from_zones(self, PREVIOUS_NETWORK)
	ntm:del_network(PREVIOUS_NETWORK)
	if self:table_get("dhcp", PREVIOUS_NETWORK) then
		self:table_delete("dhcp", PREVIOUS_NETWORK)
	end
	if self:table_get("network", "br_"..PREVIOUS_NETWORK) then
		self:table_delete("network", "br_"..PREVIOUS_NETWORK)
	end
	if not self.config_set_table["firewall"] then
		self.config_set_table["firewall"] = {}
	end
	if not self.config_set_table["network"] then
		self.config_set_table["network"] = {}
	end
	if has_mwan then
		mwan = mwan or require "vuci.mwan".init(self.uci)
		mwan:del_interface(PREVIOUS_NETWORK)
		if not self.config_set_table["mwan3"] then
			self.config_set_table["mwan3"] = {}
		end
	end
end

-- TODO: remove this function after 7.6 when `get_abs_value` is fixed
-- This hook only applies to RUT devices, ignored for TAP
function wifi_ifaces:after_data_hook()
	self:check_fast_roaming()

	-- In case if no sections are created
	if not self.sid then return end
	local enabled = self:get_abs_value(self.config, self.sid, "enabled") == "1"
	local ssid = self:get_abs_value(self.config, self.sid, "ssid") or ""
	local bssid = self:get_abs_value(self.config, self.sid, "bssid") or ""
	local multiple = self:table_get(self.config, self.sid, "multiple") == "1"
	if multiple then
		self:table_set("multi_wifi", "general", "enabled", enabled and "1" or "0")
	else
		self:table_set(self.config, self.sid, "ssid", ssid)
		self:table_set(self.config, self.sid, "bssid", bssid)
	end
	if not multiple then
		self:set_encr_cipher()
	end
	self:handle_network_delete()
end

function wifi_ifaces:POST_after_data_hook()
	local dev = self.current_data_block.device
	if dev then
		self:table_set(self.config, self.sid, "device", dev)
	end
	self:table_set(self.config, self.sid, "wifi_id", self:find_wifi_id() or "")

	if is_access_point then return end
	self:after_data_hook()
end

-- TODO: remove this function after 7.6 when `get_abs_value` is fixed
function wifi_ifaces:after_validate_section_hook()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled") == "1"
	local encryption = self:get_abs_value(self.config, self.sid, "encryption")
	local mode = self:get_abs_value(self.config, self.sid, "mode")
	local ssid = self:get_abs_value(self.config, self.sid, "ssid")
	local multiple = self:table_get(self.config, self.sid, "multiple") == "1"
	local device = self:table_get(self.config, self.sid, "device")
	if enabled and not ssid and not multiple and (mode == "ap" or mode == "sta") then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Missing required option: ssid", "Validation")
	end
	if enabled and not multiple and not encryption then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Encryption is required when not in client mode", "Validation")
	end
	if mode == "multi_ap" and #util.to_table(device) > 1 then
		return self:add_critical_error(CODES.CODES.ONLY_SINGLE_MULTI_AP_ALLOWED, "Multi AP interface can only exist on one device", "POST")
	end
end

function wifi_ifaces:after_commit_hook()
	for _, func in pairs(self.after_commit_functions) do
		func(self)
	end
end

function wifi_ifaces:DELETE_before_section_delete_hook()
	ntm = ntm or require "vuci.network".init(self.uci)
	local wnet = ntm.wifinet(self.sid)

	local nets = wnet:get_networks()
	if not is_access_point then
		local netid = wnet:id()
		ntm:del_wifinet(netid)

		local multi_wireless = self:table_get("wireless", self.sid, "multiple")
		if multi_wireless and multi_wireless == "1" then
			self:table_set("multi_wifi", "general", "enabled", "0")
			self:table_foreach("multi_wifi", "wifi-iface", function(s)
				self:table_delete("multi_wifi", s[".name"])
			end)
		end
	end

	self:remove_wifi_associates("wifi-vlan")

	self:remove_ppsk_zone()

	-- FIXME service dependency checking should be adjusted with https://git.teltonika.lt/teltonika/rutx_open/-/issues/14417
	if pac.is_installed("coova-chilli") then
		local wifi_id = self:table_get(self.config, self.sid, "wifi_id")
		local hotspot_network
		self:table_foreach("chilli", "chilli", function (s)
			if s.network == wifi_id or (s.moreif and util.contains(s.moreif, wifi_id)) then
				hotspot_network = true
				return false
			end
		end)
		if hotspot_network then
			return self:add_critical_error(
				STD_CODES.NO_DELETE,
				string.format(
					"SSID \"%s\" is associated with the Hotspot instance. Please delete hotspot instance before removing this SSID.",
					self:table_get(self.config, self.sid, "ssid") or self.sid
				),
				self.sid
			)
		end
	end

	for _, net in ipairs(nets) do
		local net_used = false
		self:table_foreach(self.config, "wifi-iface", function (s)
			if s[".name"] ~= self.sid and s.network == net:name() then
				net_used = true
				return false
			end
		end)
		if self:table_get("network", net:name(), "area_type") ~= "wan" and not is_access_point then
			net_used = true
		end
		if net:is_empty() and not net_used then
			if not is_access_point then
				firewall_lib:del_net_from_zones(self, net:name())
				if self:table_get("dhcp", net:name()) then
					self:table_delete("dhcp", net:name())
				end
				if self:table_get("network", "br_"..net:name()) then
					self:table_delete("network", "br_"..net:name())
				end
				if has_mwan then
					mwan = mwan or require "vuci.mwan".init(self.uci)
					mwan:del_interface(net:name())
					self.config_set_table.mwan3 = self.config_set_table.mwan3 or {}
				end
			end
			ntm:del_network(net:name())
		end
	end

	self.config_set_table.network = self.config_set_table.network or {} -- TODO: commit chaining?
	self.config_set_table.firewall = self.config_set_table.firewall or {}

	local radios = util.to_table(self:table_get(self.config, self.sid, "device"))
	local device_id = self:table_get(self.config, self.sid, "_device_id")

	if #radios > 0 and device_id then
		for _, radio in ipairs(radios) do
			local ifname_prefix = self:table_get(self.config, radio, "ifname_prefix") or ""
			if ifname_prefix ~= "" then
				util.ubus("mdcollect", "clean_db", { device = ifname_prefix .. separator .. device_id })
			end
		end
	end
end

-- Handles matching SSID encryption and password options
-- by setting values to the same ones for both interfaces.
-- Relevant for devices with multiple radios
if wifi_ifaces.device_count > 1 then
	function wifi_ifaces:normalize_encryptions()
		local ssid = self:get_abs_value(self.config, self.sid, "ssid")
		local mode = self:get_abs_value(self.config, self.sid, "mode")
		if not ssid then return end
		local existing_section
		self:table_foreach(self.config, "wifi-iface", function(s)
			if s.ssid == ssid and s.mode == mode and s[".name"] ~= self.sid then
				existing_section = s[".name"]
				return false
			end
		end)
		if not existing_section then return end
		local key = self:get_abs_value(self.config, self.sid, "key")
		local encryption = self:get_abs_value(self.config, self.sid, "encryption")
		self:table_set(self.config, existing_section, "encryption", encryption or "none")
		self:table_set(self.config, existing_section, "key", key or "")
		self:set_encr_cipher(existing_section)
	end
	table.insert(wifi_ifaces.before_commit_functions, wifi_ifaces.normalize_encryptions)
end

function wifi_ifaces:before_commit_hook()
	for _, func in pairs(self.before_commit_functions) do
		func(self)
	end
end

wifi_ifaces.PUT_before_commit_hook = wifi_ifaces.before_commit_hook
wifi_ifaces.POST_before_commit_hook = wifi_ifaces.before_commit_hook

-- Each of the generated ifnames are recalculated after deleting one of the interfaces.
-- These interface ifnames are used in pages, such as SQM. To cope with this problem
-- static ones are assigned on interface creation.
function wifi_ifaces:generate_device_id()
	local used_ids = {}
	self:table_foreach("wireless", "wifi-iface", function (s)
		local device_id = tonumber(s._device_id)
		if not device_id then return end
		table.insert(used_ids, device_id)
	end)
	return util.find_first_missing(used_ids)
end

local s = wifi_ifaces:section("wireless", "wifi-iface")
s.optional = true -- for custom delete to work correctly
function s:create_defaults()
	local defaults = {
		disabled = "1",
		-- Only on devices with a single WiFi radio
		device = self.default_dev or nil,
		_device_id = self:generate_device_id()
	}
	if is_access_point or CODES.WIFI_DRIVERS.QCAWIFI == wifi_driver then
		defaults.mode = "ap"
	end

	self:table_foreach(self.config, "wifi-device", function(sec)
		if sec.ifname_prefix then
			util.ubus("mdcollect", "clean_db", { device = sec.ifname_prefix .. separator .. defaults._device_id })
		end
	end)
	return defaults
end

	wireless_lib:add_ppsk_support(s)
	if is_access_point then
		-- Option handling
		wireless_lib:add_network_support_tap(s)
		wireless_lib:add_extended_fast_bss_support(s)
		if wifi_driver == CODES.WIFI_DRIVERS.MAC80211 then
			wireless_lib:add_mesh_support_tap(s)
		end
	else
		-- Option handling
		wireless_lib:add_network_support_rut(s, mwan)
		if wifi_driver ~= CODES.WIFI_DRIVERS.QCAWIFI then
			wireless_lib:add_mode_support(s)
			wireless_lib:add_sta_support(s)
			wireless_lib:add_mesh_support(s)
			wireless_lib:add_travelmate_support(s)
			wireless_lib:add_bgscan_support(s)
			wireless_lib:add_cert_support(s)


			-- Hook handling
			table.insert(wifi_ifaces.after_commit_functions, wireless_lib.update_auto_reconnect)
		end

		wifi_ifaces.PUT_after_commit_hook = wifi_ifaces.after_commit_hook
		wifi_ifaces.POST_after_commit_hook = wifi_ifaces.after_commit_hook
		wifi_ifaces.PUT_after_data_hook = wifi_ifaces.after_data_hook
		wifi_ifaces.DELETE_after_data_hook = wifi_ifaces.check_travelmate
	end

	wifi_ifaces.PUT_after_validate_section_hook = function(self)
		wifi_ifaces.validate_section_hook(self)
		if not is_access_point then
			wifi_ifaces.after_validate_section_hook(self)
		end
	end
	wifi_ifaces.POST_after_validate_section_hook = function(self)
		wifi_ifaces.validate_section_hook(self)
		wifi_ifaces.check_iface_limits(self)
		if not is_access_point then
			wifi_ifaces.after_validate_section_hook(self)
		end
	end

	enabled = s:option("enabled")
		enabled.require = enabled_depends
		function enabled:validate(value)
			-- TODO: uncomment this code after 7.6 when `get_abs_value` is fixed
			-- local multiple = self:get_abs_value("wireless", self.sid, "mode") == "multi_ap"
			-- if not multiple and not self:get_abs_value("wireless", self.sid, "encryption") then
			-- 	return false, "encryption is required when not in client mode"
			-- end
			return self.dt:is_bool(value)
		end
		function enabled:get(value)
			local disabled = self:table_get(self.config, self.sid, "disabled")
			return disabled == "1" and "0" or "1"
		end
		function enabled:set(value)
			self:table_set(self.config, self.sid, "disabled", value == "1" and "" or "1")
			-- TODO: uncomment this code after 7.6 when `get_abs_value` is fixed
			-- local multiple = self:get_abs_value(self.config, self.sid, "mode") == "multi_ap"
			-- if multiple then
			-- 	self:table_set("multi_wifi", "general", "enabled", value)
			-- end
		end

		local wifi_id = s:option("wifi_id")
			wifi_id.readonly = true

		if wifi_ifaces.device_count > 1 then
			local device = s:option("device", { list = true })
				device.cfg_require = true
				function device:validate(value)
					local ok, iface_count = false, 0
					self:table_foreach("wireless", "wifi-device", function(s)
						if s[".name"] == value then
							ok = true
						end
					end)
					if not ok then
						return ok, "Device doesn't exist."
					end

					self:table_foreach("wireless", "wifi-iface", function(s)
						for _, r in pairs(util.to_table(s.device)) do
							if self.sid ~= s[".name"] and r == value then
								iface_count = iface_count + 1
							end
						end
					end)

					local iface_max = board:get_wlan_bssid_limit(value)
					if iface_count >= iface_max then
						return false, "Maximum number of " .. tostring(iface_max) .. " interfaces for '" .. value .. "' device are allowed"
					end

					return true
				end
				function device:get(value)
					return util.to_table(value)
				end
		end

	local ssid = s:option("ssid")
		function ssid:validate(value)
			local mode = self:get_abs_value(self.config, self.sid, "mode")
			local name = self:get_abs_value(self.config, self.sid, ".name")
			local device = self:get_abs_value(self.config, self.sid, "device")
			if mode == "ap" or is_access_point then
				local existing_ssid = false
				self:table_foreach(self.config, "wifi-iface", function (s)
					if (s.mode == "ap" or is_access_point) and s.ssid == value and wireless_lib:check_device_match(s.device, device) and s[".name"] ~= name then
						existing_ssid = true
						return false
					end
				end)
				if existing_ssid then
					return false, "There can only be one interface with the same ssid on wireless device."
				end
			end
			return self.dt:max_bytes(value, 32)
		end
		-- TODO: uncomment this code after 7.6 when `get_abs_value` is fixed
		-- function ssid:set(value)
			-- local multi_ap = self:get_abs_value("wireless", self.sid, "mode") == "multi_ap"
			-- if multi_ap then return end
			-- self:table_set("wireless", self.sid, "ssid", value)
		-- end

if wifi_driver ~= CODES.WIFI_DRIVERS.QCAWIFI then
	local hidden = s:option("hidden")
		function hidden:validate(value) return self.dt:is_bool(value) end

	local wmm = s:option("wmm")
		function wmm:validate(value) return self.dt:is_bool(value) end
		function wmm:get(value)
			return not value and "1" or value
		end
		function wmm:set(value)
			self:table_set(self.config, self.sid, self.api_key, (value == "0" or value == "") and "0" or "")
		end
end

	function wifi_ifaces:set_encr_cipher(sid)
		sid = sid or self.sid
		local encr = self.current_data_block.encryption or encryption:get(self:table_get(self.config, self.sid, "encryption"))
		local cipher = self.current_data_block.cipher or cipher:get(self:table_get(self.config, self.sid, "cipher"))

		if encr == "ppsk2" then
			encr = "psk2"
		end
		if encr == "wpa" or encr == "wpa2" then
			self:table_delete("wireless", sid, "key")
		end

		if encr and (encr ~= "wpa3-mixed" and encr ~= "owe" and encr ~= "sae-mixed" and encr ~= "sae" and encr ~= "none")
		and (cipher == "tkip" or cipher == "ccmp" or cipher == "tkip+ccmp") then
			encr = encr .. "+" .. cipher
		end
		if encr then
			self:table_set("wireless", sid, "encryption", encr)
		end
	end

	encryption = s:option("encryption")
		encryption.require = {
			psk = {"key"},
			psk2 = {"key"},
			["psk+psk2"] = {"key"},
			["psk+mixed"] = {"key"},
			sae = {"key"},
			["sae-mixed"] = {"key"},
		}
		function encryption:validate(value)
			self:get_interface_options(self.sid, self:get_abs_value(self.config, self.sid, "mode"))
			return self.dt:check_array(value, self.wifi_interfaces[self.sid].encryption_options)
		end
		function encryption:get(value)
			if not value then return nil end
			local radius_ppsk = self:getter_wrapped_abs_value("wireless", self.sid, "radius_ppsk")
			if value == "wep" then
				return "wep-open"
			elseif value == "psk2" and radius_ppsk then
				return "ppsk2"
			elseif value:match("%+") then
				return util.split(value, "+")[1]
			end
			return value
		end

		function encryption:set(value)
			local multi_ap = self:getter_wrapped_abs_value("wireless", self.sid, "mode") == "multi_ap"
			if multi_ap then return end
			if  util.contains({ "wpa3", "wpa3-mixed", "sae", "sae-mixed", "owe", "none" }, value) then
				self:table_delete(self.config, self.sid, "ieee80211w")
			end
			self:set_encr_cipher()
		end

	cipher = s:option("cipher")
		function cipher:validate(value) return self.dt:check_array(value, {"auto", "ccmp", "tkip", "tkip+ccmp"}) end
		function cipher:get(value)
			local encr = self:table_get(self.config, self.sid, "encryption")
			if encr and encr:match("%+") then
				local arr = util.split(encr, "+")
				table.remove(arr, 1)
				local cipher = table.concat(arr, "+")
				if cipher == "aes" then return "ccmp"
				elseif cipher == "tkip+aes" then return "tkip+ccmp"
				elseif cipher == "aes+tkip" then return "tkip+ccmp"
				elseif cipher == "ccmp+tkip" then return "tkip+ccmp"
				else return cipher end
			end
			local encr_cipher_map = {
				["wpa3-mixed"] = "ccmp",
				owe = "ccmp",
				["sae-mixed"] = "ccmp",
				sae = "ccmp"
			}
			if encr and encr ~= "none" then return encr_cipher_map[encr] or "auto" end
		end
		function cipher:set(value)
			self:set_encr_cipher()
		end

	local key = s:option("key", { sensitive = true })
		function key:validate(value)
			return self.dt:wpakey(value)
		end
		function key:set(value)
			self:table_set("wireless", self.sid, "key", value)
			local encryption = self:get_abs_value("wireless", self.sid, "encryption")
			if value and value ~= "" then
				if not encryption or encryption == "" or encryption == "none" then
					self:table_set("wireless", self.sid, "encryption", "sae-mixed")
				end
			end
		end

	local auth_server = s:option("auth_server")
		function auth_server:validate(value) return self.dt:ipaddr(value) end

	local auth_port = s:option("auth_port")
		function auth_port:validate(value) return self.dt:port(value) end

	local auth_secret = s:option("auth_secret", { sensitive = true })
		auth_secret.maxlength = 256
		function auth_secret:validate(value) return self.dt:credentials_validate(value) end

	local acct_server = s:option("acct_server")
			acct_server.require = { "acct_secret" }
			function acct_server:validate(value) return self.dt:ipaddr(value) end

	local acct_port = s:option("acct_port")
		acct_port.require = { "acct_server", "acct_secret" }
		function acct_port:validate(value) return self.dt:port(value) end

	local acct_secret = s:option("acct_secret", { sensitive = true })
		acct_secret.require = { "acct_server" }
		acct_secret.maxlength = 256
		function acct_secret:validate(value) return self.dt:credentials_validate(value) end

	local nasid = s:option("nasid")
		function nasid:validate(value) return self.dt:string(value) end

	if wifi_driver ~= CODES.WIFI_DRIVERS.RALINK and wifi_driver ~= CODES.WIFI_DRIVERS.QCAWIFI then
		local reassociation_deadline = s:option("reassociation_deadline")
			function reassociation_deadline:validate(value) return self.dt:irange(value, 1000, 65535) end
	end

if wifi_driver ~= CODES.WIFI_DRIVERS.QCAWIFI then
	local ieee80211r = s:option("ieee80211r")
		ieee80211r.require = is_access_point and { ["1"] = {"ft_over_ds"} } or {}
		function ieee80211r:validate(value) return self.dt:is_bool(value) end

	local nasid = s:option("nasid")
		function nasid:validate(value) return self.dt:string(value) end

	local mobility_domain = s:option("mobility_domain")
		mobility_domain.minlength = 4
		mobility_domain.maxlength = 4
		function mobility_domain:validate(value)
			return self.dt:hexstring(value)
		end

	local ft_over_ds = s:option("ft_over_ds")
		function ft_over_ds:validate(value) return self.dt:is_bool(value) end

	local password = s:option("password", { sensitive = true })
		password.maxlength = 512
		function password:validate(value) return self.dt:credentials_validate(value) end

	local macfilter = s:option("macfilter")
		function macfilter:validate(value) return self.dt:check_array(value, {"", "allow", "deny"}) end

	local maclist = s:option("maclist", { list = true })
		function maclist:validate(value)
			return self.dt:macaddr_range(value)
		end
		function maclist:set(value)
			for key, _ in ipairs(value) do
				value[key] = string.upper(value[key])
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local delete_from_whitelist = s:option("delete_from_whitelist")
		function delete_from_whitelist:validate(value)
			return self.dt:is_bool(value)
		end

	local isolate = s:option("isolate")
		function isolate:validate(value) return self.dt:is_bool(value) end

	local short_preamble = s:option("short_preamble")
		function short_preamble:validate(value) return self.dt:is_bool(value) end
		function short_preamble:get(value)
			return not value and "1" or value
		end

	local dtim_period = s:option("dtim_period")
		function dtim_period:validate(value) return self.dt:irange(value, 1, 255) end

	local wpa_group_rekey = s:option("wpa_group_rekey")
		function wpa_group_rekey:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return self.dt:irange(value, 0, 65535)
		end

	local skip_inactivity_poll = s:option("skip_inactivity_poll")
		function skip_inactivity_poll:validate(value) return self.dt:is_bool(value) end

	local max_inactivity = s:option("max_inactivity")
		function max_inactivity:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return self.dt:irange(value, 0, 65535)
		end

	local max_listen_interval = s:option("max_listen_interval")
		function max_listen_interval:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return self.dt:irange(value, 0, 65535)
		end

	local wds = s:option("wds")
		function wds:validate(value)
			return self.dt:is_bool(value)
		end

	local disassoc_low_ack = s:option("disassoc_low_ack")
		function disassoc_low_ack:validate(value) return self.dt:is_bool(value) end
		function disassoc_low_ack:get(value)
			return not value and "1" or value
		end

	local ieee80211k = s:option("ieee80211k")
		function ieee80211k:validate(value)
			local mode = self:get_abs_value("wireless", self.sid, "mode")
			if mode ~= "ap" then
				return false, "Only available in 'ap' mode"
			end
			return self.dt:is_bool(value)
		end

	local bss_transition = s:option("bss_transition")
		function bss_transition:validate(value)
			local mode = self:get_abs_value("wireless", self.sid, "mode")
			if mode ~= "ap" then
				return false, "Only available in 'ap' mode"
			end
			return self.dt:is_bool(value)
		end

	local ieee80211w = s:option("ieee80211w")
		function ieee80211w:validate(value)
			local mode = self:get_abs_value("wireless", self.sid, "mode")
			if mode ~= "ap" then
				return false, "Only available in 'ap' mode"
			end

			return self.dt:irange(value, 0, 2)
		end
		function ieee80211w:set(value)
			if value == "0" then
				self:table_delete(self.config, self.sid, self.api_key)
			else
				self:table_set(self.config, self.sid, self.api_key, value)
			end
		end
end

function wifi_ifaces:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function wifi_ifaces:GET_TYPE_status()
	local wireless = require "vuci.wireless"
	if self.sid then
		if self.uci:get("wireless", self.sid) ~= "wifi-iface" then
			return self:add_critical_error(STD_CODES.INVALID_SECTION, "Interface doesn't exist.", "URL", "404")
		end

		return self:ResponseOK(wireless:interface_status(self.sid, self.uci))
	end
	local res = {}
	self.uci:foreach("wireless", "wifi-iface", function(s)
		res[#res+1] = wireless:interface_status(s[".name"], self.uci)
	end)

	return self:ResponseOK(res)
end

return wifi_ifaces
