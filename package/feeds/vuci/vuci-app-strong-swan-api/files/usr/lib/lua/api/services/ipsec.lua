local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local util = require("vuci.util")
local certs = require("vuci.certificates")
local bit = require ("nixio").bit
local fs = require ("nixio.fs")
local json = require("luci.jsonc")
local cert_dir = "/etc/certificates/"
local has_tpm = require("vuci.board"):has_tpm()
local state_dir = "/var/run/ipsec/state"

local ipsec = ConfigService:new()
ipsec.encryption_algorithm_options = {
	"3des", "des", "aes128", "aes192", "aes256", "aes128gcm8", "aes192gcm8",
	"aes256gcm8", "aes128gcm12", "aes192gcm12", "aes256gcm12", "aes128gcm16",
	"aes192gcm16", "aes256gcm16", "chacha20poly1305"
}

ipsec.authentication_options = { "md5", "sha1", "sha256", "sha384", "sha512" }

ipsec.dh_group_options_ph1 = {
	"modp768", "modp1024", "modp1536", "modp2048", "modp3072", "modp4096",
	"ecp192", "ecp224", "ecp256", "ecp384", "ecp521"
}

ipsec.dh_group_options_ph2 = {
	"modp768", "modp1024", "modp1536", "modp2048", "modp3072", "modp4096",
	"ecp192", "ecp224", "ecp256", "ecp384", "ecp521", "no_pfs"
}

function ipsec:DELETE_section_init_hook()
	if self:table_get("ipsec", self.sid, "service") == "dmvpn" then
		self:add_critical_error(
				STD_CODES.NO_DELETE,
				string.format("'%s' is used in dmvpn configuration and can not be deleted.", self.sid),
				self.sid
		)
	end
end

local remote = ipsec:section("ipsec", "remote")
remote:make_primary()
remote.default_options.id.maxlength = 512

function remote:create_defaults(sid)
	if not self.current_data_block.crypto_proposal1 and self.request_method == "POST" then
		self:table_section("ipsec", "proposal",  sid .. "_ph1_1", {
			encryption_algorithm = "aes128",
			hash_algorithm       = "sha1",
			dh_group             = "modp1536"
		})
	end
	return {
		crypto_proposal = { sid .. "_ph1_1" },
		transport       = { sid .. "_c" }
	}
end

local function fromhex(str)
	return (str:gsub('..', function(cc)
		if cc == "0x" then
			return string.gsub(cc, "0x", "")
		else
			return string.char(tonumber(cc, 16))
		end
	end))
end

local function fill_ipv6(ip)
	local count = 0
	local full_ipv6 = { }
	ip = util.split(ip, ":")
	for i = 1, #ip do
		if ip[i] ~= "" then
			count = count + 1
		end
	end

	for i = 1, (8 - count) do
		table.insert(full_ipv6, "0000")
	end

	for i = 1, #ip do
		if ip[i] ~= "" then
			table.insert(full_ipv6, ip[i])
		end
	end

	return full_ipv6
end

local function validate_ip_range_from_to(from, to)
	if from:find("%.") and to:find("%.") then
		from = util.split(from, ".")
		to = util.split(to, ".")
	elseif from:find(":") and to:find(":") then
		if from:find("::") then
			from = fill_ipv6(from)
		else
			from = util.split(from, ":")
		end

		if to:find("::") then
			to = fill_ipv6(to)
		else
			to = util.split(to, ":")
		end
	end

	if #from ~= #to then
		return false
	end

	for i = 1, #to do
		if not from[i]:find("%D") and not to[i]:find("%D") then
			from[i] = tonumber(from[i])
			to[i] = tonumber(to[i])
		end

		if to[i] > from[i] then
			return true
		end

		if from[i] > to[i] then
			return false
		end
	end
	return true
end


-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = remote:option("enabled")
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local gateway = remote:option("gateway")
		local function domain_validate(self, value)
			local DOMAIN_REGEX = "([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9_\\-]{0,61}[a-zA-Z0-9])(\\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9_\\-]{0,61}[a-zA-Z0-9]))*"
			local DOMAIN_LEN = 253
			-- Custom validation because hostname does not allow "_" but it is perfectly valid for a domain name
			if not value then return false end
			-- hostname regex allows all number domains, that's why we need to check it here separately
			if value:match("^[0-9.]+$") then return false end
			local ok = self.dt.regex.new("^"..DOMAIN_REGEX.."$"):exec(value)
			ok = ok and #value <= DOMAIN_LEN
			return not not ok
		end
		function gateway:validate(value)
			local result = domain_validate(self, value) or self.dt:ipaddr(value) or self.dt:ipmask(value) or string.match(value, "^%%any[46]?$")
			return result, "Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted. E.g. 192.168.1.1 or example.com."
		end
		function gateway:set(value)
			if self:table_get(self.config, self.sid, "service") == "dmvpn" then
				self:table_set(self.config, self.sid, "dmvpn_user_mod", "1")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local authentication_method = remote:option("authentication_method")
		function authentication_method:validate(value)
			local method_options = { "psk", "x509", "eap-mschapv2", "pkcs12" }
			return self.dt:check_array(value, method_options)
		end

	local pre_shared_key = remote:option("pre_shared_key", { sensitive = true })
	pre_shared_key.minlength = 5
	pre_shared_key.maxlength = 512
		function pre_shared_key:validate(value)
			return self.dt:credentials_validate(value, true)
		end
		function pre_shared_key:get(value)
			if value ~= "" and value ~= nil then
				return fromhex(value)
			else
				return value
			end
		end
		function pre_shared_key:set(value)
			if value == "" then
				self:table_delete(self.config, self.sid, self.api_key)
			else
				self:table_set(self.config, self.sid, self.api_key, "0x" .. util.tohex(value))
			end
		end

	local use_tpm = remote:option("use_tpm")
		function use_tpm:validate(value)
			if ( self:get_abs_value(self.config, self.sid, "keyexchange") ~= "ikev2" and self:table_get(self.config, self.sid .. "_c", "keyexchange")  ~= "ikev2" ) and value == "1" then
				return false, "TPM can be used only with IKEv2 key exchange."
			end
			if not has_tpm and value == "1" then
				return false, "TPM2 module is not available on this device."
			end
			return self.dt:is_bool(value)
		end
		function use_tpm:get()
			if not has_tpm then return "0" end
			if self:table_get(self.config, self.sid, "no_tpm") then return "0" end
			return "1"
		end
		function use_tpm:set(value)
			if value == "1" then
				self:table_delete(self.config, self.sid, "no_tpm")
			else
				self:table_set(self.config, self.sid, "no_tpm", "1")
			end
		end

	local key = remote:option("key", { certificate = {
		type = "keys",
		cert_types = { "client", "server" },
		failsafe = true,
		tpm2 = function(self)
			if self:get_abs_value(self.config, self.sid, "no_tpm") then return false end
			local kex = self:get_abs_value(self.config, self.sid, "keyexchange") or self:get_abs_value(self.config, self.sid.."_c", "keyexchange")
			return kex == "ikev2"
		end
	}})

	local key_decrypt = remote:option("key_decrypt", { sensitive = true })
	key_decrypt.minlength = 5
	key_decrypt.maxlength = 512
		function key_decrypt:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local pkcs12_path = remote:option("pkcs12_path", { file = true })

	local pkcs12_decrypt = remote:option("pkcs12_decrypt", { sensitive = true })
	pkcs12_decrypt.minlength = 5
	pkcs12_decrypt.maxlength = 512
		function pkcs12_decrypt:validate(value)
			return self.dt:credentials_validate(value, true)
		end

	local local_cert = remote:option("leftcert", { certificate = {
		type = "certificates",
		cert_types = { "client", "server" },
		length_warnings = true,
		failsafe = true,
	}})

	local ca_cert = remote:option("cacert", { certificate = {
		type = "certificates",
		cert_types = { "ca", "scep" },
		length_warnings = true,
		failsafe = true,
	}})

	local local_identifier = remote:option("local_identifier")
	local_identifier.maxlength = 255
		function local_identifier:validate(value)
			return self.dt:fieldvalidation(value, "^[^\"\\]*$")
		end

	local remote_identifier = remote:option("remote_identifier")
	remote_identifier.maxlength = 255
		function remote_identifier:validate(value)
			return self.dt:fieldvalidation(value, "^[^\"\\]*$")
		end
		function remote_identifier:set(value)
			if self:table_get(self.config, self.sid, "service") == "dmvpn" then
				self:table_set(self.config, self.sid, "dmvpn_user_mod", "1")
			end
			self:table_set(self.config, self.sid, self.api_key, value)
		end

	local multiple_secrets = remote:option("multiple_secrets")
		function multiple_secrets:validate(value)
			return self.dt:is_bool(value)
		end

	local remote_cert = remote:option("rightcert", { certificate = {
		upload_only = true,
		failsafe = true,
	} })

	local force_crypto_proposal = remote:option("force_crypto_proposal")
		function force_crypto_proposal:validate(value)
			return self.dt:is_bool(value)
		end

	local crypto_proposal1 = remote:option("crypto_proposal1", { list = true })
	crypto_proposal1.allow_duplicates = true
		function crypto_proposal1:validate(value)
			local values = util.split(value, ",")
			if not values or not values[1] or not values[2] or not values[3] then
				return false, "Incorrect option format, accepted format: 'encryption_algorithm,hash_algorithm,dh_group'"
			end

			local res, msg = self.dt:check_array(values[1], self.encryption_algorithm_options)
			if not res then
				return false, msg
			end
			res, msg = self.dt:check_array(values[2], self.authentication_options)
			if not res then
				return false, msg
			end
			res, msg = self.dt:check_array(values[3], self.dh_group_options_ph1)
			if not res then
				return false, msg
			end
			return true
		end
		function crypto_proposal1:set(value)
			if #value == 0 or value == "" then
				self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", self.api_key)
			else
				-- Delete old ones
				local old_values = self:table_get("ipsec", self.sid, "crypto_proposal")
				if old_values then
					for _, v in ipairs(old_values) do
						self:table_delete("ipsec", v)
					end
				end

				-- Set new ones
				local last_id = 0
				self:table_foreach("ipsec", "proposal", function(p)
					local id = p[".name"]:match(self.sid .. "_ph1_(%d+)$")
					if id then
						last_id = math.max(last_id, tonumber(id))
					end
				end)

				local new_proposals = {}
				for _, v in ipairs(value) do
					local new_proposal = self.sid .. "_ph1_" .. last_id + 1
					local values = util.split(v, ",")
					self:table_section("ipsec", "proposal", new_proposal, {
						encryption_algorithm = values[1],
						hash_algorithm       = values[2],
						dh_group             = values[3]
					})
					table.insert(new_proposals, new_proposal)
					last_id = last_id + 1
				end
				self:table_set("ipsec", self.sid, "crypto_proposal", new_proposals)
			end
		end
		function crypto_proposal1:get(_)
			local proposals = {}
			local proposal_sections = self:table_get("ipsec", self.sid, "crypto_proposal")
			for _, v in ipairs(proposal_sections or {}) do
				local encryption_algorithm = self:table_get("ipsec", v, "encryption_algorithm")
				local hash_algorithm = self:table_get("ipsec", v, "hash_algorithm")
				local dh_group = self:table_get("ipsec", v, "dh_group")
				if encryption_algorithm and hash_algorithm and dh_group then
					table.insert(proposals, encryption_algorithm .. "," .. hash_algorithm .. "," .. dh_group)
				end
			end

			return proposals
		end

	local service = remote:option("service")
	service.readonly = true


-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

local connection = ipsec:section("ipsec", "connection", function(self) return self.sid .. "_c"  end)
function connection:create_defaults(sid)
	if not self.current_data_block.crypto_proposal2 and self.request_method == "POST" then
		self:table_section("ipsec", "proposal",  sid .. "_ph2_1", {
			encryption_algorithm = "aes128",
			hash_algorithm       = "sha1",
			dh_group             = "modp1536"
		})
	end
	return {
		crypto_proposal = { sid .. "_ph2_1" },
		local_firewall  = "1",
		dpd             = "1",
		dpdaction       = "restart",
		dpddelay        = "30"
	}
end
function connection:filter(s)
	return not s[".name"]:find("_dmvpn")
end

local function validate_lifetime(self, value)
	local number, scalar = string.match(value, "^([1-9][0-9]*)([smhd])$")
	if not number or not scalar then
		return false, "A number with an indicator s, m, h or d is accepted, example: 3h"
	end
	number = tonumber(number)

	local msg = "Max lifetime is 5793 days"
	if scalar == "d" then
		if number > 5793 then
			return false, msg
		end
	elseif scalar == "h" then
		if number > 139032 then
			return false, msg
		end
	elseif scalar == "m" then
		if number > 8341920 then
			return false, msg
		end
	else
		if number > 500515200 then
			return false, msg
		end
		if number < 30 then return false, "Smallest allowed lifetime is 30 seconds" end
	end
	return true
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local mode = connection:option("mode")
		function mode:validate(value)
			local mode_options = { "start", "add", "route" }
			return self.dt:check_array(value, mode_options)
		end

	local opt_type = connection:option("type")
		function opt_type:validate(value)
			local type_options = { "tunnel", "transport" }
			return self.dt:check_array(value, type_options)
		end

	local default_route = connection:option("defaultroute")
		function default_route:validate(value)
			return self.dt:is_bool(value)
		end

	local local_subnet = connection:option("local_subnet", { list = true })
		function local_subnet:validate(value)
			if self:get_abs_value(self.config, self.sid, "type") == "transport" then
				return false, "Local subnet can be specified only when type is tunnel"
			end
			if self.dt:cidr4(value) or self.dt:cidr6(value) then return true end
			return false, "IPv4 or IPv6 address/subnet is accepted."
		end

	local remote_subnet = connection:option("remote_subnet", { list = true })
		function remote_subnet:validate(value)
			if self:get_abs_value(self.config, self.sid, "type") == "transport" then
				return false, "Remote subnet can be specified only when type is tunnel"
			end
			if self.dt:cidr4(value) or self.dt:cidr6(value) then return true end
			return false, "IPv4 or IPv6 address/subnet is accepted."
		end

	local bind_to = connection:option("bind_to")
		function bind_to:validate(value)
			local bind_to_options = {}
			self:table_foreach("network", "interface", function(s)
				if s.proto and (s.proto == "gre" or s.proto == "l2tp") then
					table.insert(bind_to_options, s[".name"])
				end
			end)
			self:table_foreach("xl2tpd", "service", function(d)
				table.insert(bind_to_options, d[".name"])
			end)
			return self.dt:check_array(value, bind_to_options)
		end
		function bind_to:set(value)
			self:table_set(self.config, self.sid .. "_c", self.api_key, value)
			local selected_section = self:table_get("network", value) or nil
			if selected_section and selected_section.proto == "gre" then
				self:table_set(self.config, self.sid .. "_c", "leftprotoport" , "gre")
				self:table_set(self.config, self.sid .. "_c", "rightprotoport" , "gre")
				self:table_set("network", value, "auto", "0")
				local service_list = util.to_table(selected_section.services) or {}
				if not util.contains(service_list, "ipsec") then
					table.insert(service_list, "ipsec")
				end
				self:table_set("network", value, "services", service_list)
			end
		end

	local key_exchange = connection:option("keyexchange")
		function key_exchange:validate(value)
			local key_exchange_options = { "ikev1", "ikev2" }
			if value == "ikev1" and has_tpm then
				local sid = self:_get_sid(self.sid)
				local parent = string.sub(sid, 1, -3)
				local parent_key = self:get_abs_value(self.main_config, parent, "key") or ""
				local in_tpm = util.file_exec("/bin/tpm2_importer", { parent_key, "get_handle"})
				if in_tpm.code == 0 then
					return false, "cannot use ikev1 key exchange when the private key is in TPM"
				end
			end
			return self.dt:check_array(value, key_exchange_options)
		end
		function key_exchange:set(value)
			local sid = self:_get_sid(self.sid)
			self:table_set(self.config, sid, self.api_key, value)
			if not has_tpm then return end
			if value ~= "ikev2" then return end
			local parent = string.sub(sid, 1, -3)
			local parent_key = self:table_get(self.main_config, parent, "key")
			if parent_key and string.sub(parent_key, 1, #cert_dir) == cert_dir then return end
			local parent_auth_method = self:table_get(self.main_config, parent, "authentication_method")
			if not parent_key then return end
			if parent_auth_method ~= "x509" then return end
			local in_tpm = util.file_exec("/bin/tpm2_importer", { parent_key, "get_handle"})
			if in_tpm.code == 0 then return end
			local ret = certs.add_key_to_tpm2(parent_key, true)
			if ret ~= 0 and ret == 5 then
				self:add_message(ret, "TPM storage is full", "key")
			elseif ret ~= 0 then
				self:add_message(ret, "Error uploading to TPM storage", "key")
			end
		end

	local aggressive = connection:option("aggressive")
		function aggressive:validate(value)
			return self.dt:is_bool(value)
		end

	local force_encapsulation = connection:option("forceencaps")
		function force_encapsulation:validate(value)
			return self.dt:is_bool(value)
		end

	local local_firewall = connection:option("local_firewall")
		function local_firewall:validate(value)
			return self.dt:is_bool(value)
		end

	local remote_firewall = connection:option("remote_firewall")
		function remote_firewall:validate(value)
			return self.dt:is_bool(value)
		end

	local compatibility_mode = connection:option("comp_mode")
		function compatibility_mode:validate(value)
			return self.dt:is_bool(value)
		end

	local inactivity = connection:option("inactivity")
		function inactivity:validate(value)
			return self.dt:uinteger(value)
		end

	local dpd = connection:option("dpd")
		function dpd:validate(value)
			return self.dt:is_bool(value)
		end

	local dpd_action = connection:option("dpdaction")
		function dpd_action:validate(value)
			local dpd_action_options = { "restart", "hold", "clear", "none" }
			return self.dt:check_array(value, dpd_action_options)
		end

	local dpd_delay = connection:option("dpddelay")
	dpd_delay.maxlength = 64
		function dpd_delay:validate(value)
			return self.dt:uinteger(value)
		end

	local dpd_timeout = connection:option("dpdtimeout")
	dpd_timeout.maxlength = 64
		function dpd_timeout:validate(value)
			return self.dt:uinteger(value)
		end

	local remote_source_ip = connection:option("remote_sourceip", { list = true })
		function remote_source_ip:validate(value)
			local options = { "%config", "%poolname" }
			local sourceip = { }

			if value and value:match("-") then
				if value and value:match("%s+") then
					return false, "Cannot be empty spaces in IP range E.g. '192.168.1.1-192.168.1.2'"
				end

				for ip in string.gmatch(value, "([^-]+)") do
					if not (self.dt:ip6addr(ip) or self.dt:ip4addr(ip)) then
						return false, "One of the following: IPv4 and IPv6 addresses are accepted. E.g. 192.168.1.1, ::0000:8a2e:0370:7334"
					end
					table.insert(sourceip, ip)
				end

				if sourceip and #sourceip ~= 2  then
					return false, "In the IP range, can contain only two IP addresses. E.g. '192.168.1.1-192.168.1.2'"
				end

				if sourceip and not validate_ip_range_from_to(sourceip[1], sourceip[2]) then
					return false, "In the IP range, it cannot be that the first IP address is higher than the second IP address. E.g. '192.168.1.1-192.168.1.2'"
				end
				return true
			end

			if self.dt:cidr6(value) or self.dt:cidr4(value) or self.dt:check_array(value, options) then return true end
			return false, "One of the following: IPv4 and IPv6 addresses are accepted. E.g. 192.168.1.1." ..
			"IPv4 addresses with mask prefix are accepted E.g 192.168.1.0/24. Following words are accepted: %config, %poolname"
	end

	local local_source_ip = connection:option("local_sourceip")
		function local_source_ip:validate(value)
			local lsi_options = { "%config", "%config4", "%config6" }
			if self.dt:ipaddr(value) or self.dt:check_array(value, lsi_options) then return true end
			return false, "One of the following: - IPv4 and IPv6 addresses or subnets are accepted." ..
			 "E.g. 192.168.1.1 .- Following words are accepted: %config, %config4, %config6"
		end

	local remote_dns = connection:option("rightdns", { list = true })
		function remote_dns:validate(value)
			return self.dt:ipaddr(value)
		end

	local xauth_identity = connection:option("xauth_identity")
		function xauth_identity:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9%_]*$")
		end

	local local_allowed_proto = connection:option("leftprotoport")
		function local_allowed_proto:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9/%%]*$")
		end

	local remote_allowed_proto = connection:option("rightprotoport")
		function remote_allowed_proto:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9/%%]*$")
		end

	local custom = connection:option("custom", { list = true })
		function custom:validate(value)
			return self.dt:fieldvalidation(value, "^[a-zA-Z0-9=_.:%-/%s{}%%]*$")
		end

	local passthrough_ifaces = connection:option("passthrough", { list = true })
		function passthrough_ifaces:validate(value)
			local iface_options = {}
			self:table_foreach("network", "interface", function(i)
				if i[".name"] ~= "loopback" then table.insert(iface_options, i.name or i[".name"]) end
			end)
			return self.dt:check_array(value, iface_options)
		end
		function passthrough_ifaces:get(value) return util.network_mapper_get(self, value) end
		function passthrough_ifaces:set(value)
			local network_internal = util.get_network_map(self)
			if type(value) == "table" then
				local values = {}
				for _, v in ipairs(value) do
					table.insert(values, network_internal[v] or v)
				end
				return self:table_set(self.config, self.sid .. "_c", self.api_key, values)
			end
			self:table_set(self.config, self.sid, self.api_key, network_internal[value] or value)
		end

	local passthrough_ip = connection:option("passthrough_ip", { list = true })
		function passthrough_ip:validate(value)
			if self.current_data_block.passthrough_local ~= nil or self.current_data_block.passthrough_remote ~= nil then
				return false, "Can't set this option together with passthrough_local or passthrough_remote."
			end
			if self.dt:cidr4(value) or self.dt:cidr6(value) then return true end
			return false, "IPv4 or IPv6 subnet is accepted."
		end
		function passthrough_ip:set(value)
			self:table_set(self.config, self.sid .. "_c", "passthrough_local", util.clone(value))
			self:table_set(self.config, self.sid .. "_c", "passthrough_remote", util.clone(value))
		end
		function passthrough_ip:get()
			local local_net = self:table_get(self.config, self.sid .. "_c", "passthrough_local") or {}
			local remote_net = self:table_get(self.config, self.sid .. "_c", "passthrough_remote") or {}
			local same_net = {}
			for _, lnet in ipairs(local_net) do
				for _, rnet in ipairs(remote_net) do
					if lnet == rnet then
						same_net = same_net or {}
						table.insert(same_net, lnet)
					end
				end
			end
			return util.clone(same_net)
		end

	local local_passthrough = connection:option("passthrough_local", { list = true })
		function local_passthrough:validate(value)
			if self.dt:cidr4(value) or self.dt:cidr6(value) then return true end
			return false, "IPv4 or IPv6 subnet is accepted."
		end

	local remote_passthrough = connection:option("passthrough_remote", { list = true })
		function remote_passthrough:validate(value)
			if self.dt:cidr4(value) or self.dt:cidr6(value) then return true end
			return false, "IPv4 or IPv6 subnet is accepted."
		end

	local ike_lifetime = connection:option("ikelifetime")
	ike_lifetime.maxlength = 10
		function ike_lifetime:validate(value)
			return validate_lifetime(self, value)
		end

	local lifetime = connection:option("lifetime")
	lifetime.maxlength = 10
		function lifetime:validate(value)
			return validate_lifetime(self, value)
		end

	local force_crypto_proposal2 = connection:option("force_crypto_proposal2")
		function force_crypto_proposal2:validate(value)
			return self.dt:is_bool(value)
		end
		function force_crypto_proposal2:set(value)
			self:table_set(self.config, self.sid .. "_c", "force_crypto_proposal", value)
		end
		function force_crypto_proposal2:get(_)
			return self:table_get(self.config, self.sid .. "_c", "force_crypto_proposal")
		end

	local xauth = connection:option("xauth")
		function xauth:validate(value)
			return self.dt:is_bool(value)
		end

	local nat_pass = connection:option("nat_pass")
		function nat_pass:validate(value)
			return self.dt:is_bool(value)
		end

	local nat_pass_ip = connection:option("nat_pass_ip")
		function nat_pass_ip:validate(value)
			return self.dt:ip4addr(value)
		end

	local flush = connection:option("flush")
		function flush:validate(value)
			return self.dt:is_bool(value)
		end

	local crypto_proposal2 = connection:option("crypto_proposal2", { list = true })
	crypto_proposal2.allow_duplicates = true
	function crypto_proposal2:validate(value)
		local values = util.split(value, ",")
		if not values or not values[1] or not values[2] or not values[3] then
			return false, "Incorrect option format, accepted format: 'encryption_algorithm,hash_algorithm,dh_group'"
		end

		local res, msg = self.dt:check_array(values[1], self.encryption_algorithm_options)
		if not res then
			return false, msg
		end
		res, msg = self.dt:check_array(values[2], self.authentication_options)
		if not res then
			return false, msg
		end
		res, msg = self.dt:check_array(values[3], self.dh_group_options_ph2)
		if not res then
			return false, msg
		end
		return true
	end
	function crypto_proposal2:set(value)
		if #value == 0 or value == "" then
			self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", self.api_key)
		else
			-- Delete old ones
			local old_values = self:table_get("ipsec", self.sid .. "_c", "crypto_proposal")
			if old_values then
				for _, v in ipairs(old_values) do
					self:table_delete("ipsec", v)
				end
			end

			-- Set new ones
			local last_id = 0
			self:table_foreach("ipsec", "proposal", function(p)
				local id = p[".name"]:match(self.sid .. "_ph2_(%d+)$")
				if id then
					last_id = math.max(last_id, tonumber(id))
				end
			end)

			local new_proposals = {}
			for _, v in ipairs(value) do
				local new_proposal = self.sid .. "_ph2_" .. last_id + 1
				local values = util.split(v, ",")
				self:table_section("ipsec", "proposal", new_proposal, {
					encryption_algorithm = values[1],
					hash_algorithm       = values[2],
					dh_group             = values[3]
				})
				table.insert(new_proposals, new_proposal)
				last_id = last_id + 1
			end
			self:table_set("ipsec", self.sid .. "_c", "crypto_proposal", new_proposals)
		end
	end
	function crypto_proposal2:get(_)
		local proposals = {}
		local proposal_sections = self:table_get("ipsec", self.sid .. "_c", "crypto_proposal")
		for _, v in ipairs(proposal_sections or {}) do
			local encryption_algorithm = self:table_get("ipsec", v, "encryption_algorithm")
			local hash_algorithm = self:table_get("ipsec", v, "hash_algorithm")
			local dh_group = self:table_get("ipsec", v, "dh_group")
			if encryption_algorithm and hash_algorithm and dh_group then
				table.insert(proposals, encryption_algorithm .. "," .. hash_algorithm .. "," .. dh_group)
			end
		end

		return proposals
	end

	local route_based_ipsec = connection:option("route_based_ipsec")
	route_based_ipsec.require = { ["1"] = { "xfrm_ip" }}
	function route_based_ipsec:validate(value)
		if value == "1" and self:get_abs_value(self.config, self.sid .. "_c", "type") == "transport" then
			return false, "Route based IPsec can only be used when type is tunnel"
		end
		return self.dt:is_bool(value)
	end
	function route_based_ipsec:set(value)
		self:table_set(self.config, self.sid .. "_c", self.api_key, value)
		local max_if_id = 0
		if value == "1" then
			self:table_foreach("ipsec", "connection", function(s)
				local if_id_in = tonumber(s.if_id_in)
				if if_id_in and if_id_in > max_if_id then
					max_if_id = if_id_in
				end
			end)
		local new_if_id = max_if_id + 1
		self:table_set(self.config, self.sid .. "_c", "if_id_in", new_if_id)
		self:table_set(self.config, self.sid .. "_c", "if_id_out", new_if_id)
		self:table_set(self.config, self.sid .. "_c", "local_subnet", {"0.0.0.0/0"})
		self:table_set(self.config, self.sid .. "_c", "remote_subnet", {"0.0.0.0/0"})
		else
			self:table_delete(self.config, self.sid .. "_c", "if_id_in")
			self:table_delete(self.config, self.sid .. "_c", "if_id_out")
			self:table_delete(self.config, self.sid .. "_c", "xfrm_ip")
			self:table_delete(self.config, self.sid .. "_c", "xfrm_mtu")
		end
	end


	local xfrm_ip = connection:option("xfrm_ip")
	function xfrm_ip:validate(value)
		local route_based_ipsec = self:get_abs_value(self.config, self.sid, "route_based_ipsec")
		if not route_based_ipsec or route_based_ipsec == "0" then
			return false, "Route based IPsec IP address can only be set if route based IPsec is enabled"
		end
		if self.dt:cidr4(value) or self.dt:cidr6(value) then return true end
		return false, "IPv4 or IPv6 address/subnet is accepted."
	end

	local xfrm_mtu = connection:option("xfrm_mtu")
	function xfrm_mtu:validate(value)
		local route_based_ipsec = self:get_abs_value(self.config, self.sid, "route_based_ipsec")
		if not route_based_ipsec or route_based_ipsec == "0" then
			return false, "Route based IPsec MTU can only be set if route based IPsec is enabled"
		end
		return self.dt:irange(value, 68, 9200)
	end
-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------
local rule_opt = {}

rule_opt[1] = {
	rule = {
		name     = "Allow-IPsec-ESP",
		target   = "ACCEPT",
		src      = "wan",
		proto    = "esp",
		enabled  = 0
	},
	args = { target = "ACCEPT", proto = "esp" }, nil, { "dest" }
}

rule_opt[2] = {
	rule = {
		name      = "Allow-IPsec-NAT-T",
		target    = "ACCEPT",
		src       = "wan",
		proto     = "udp",
		dest_port = {"4500"},
		enabled   = 0
	},
	args = { target = "ACCEPT", proto = "udp", dest_port = {"4500"}}, nil, { "dest" }
}

rule_opt[3] = {
	rule = {
		name      = "Allow-IPsec-IKE",
		target    = "ACCEPT",
		src       = "wan",
		dest_port = {"500"},
		proto     = "udp",
		enabled   = 0
	},
	args = { target = "ACCEPT", proto = "udp", dest_port = {"500"}}, nil, { "dest" }
}

rule_opt[4] = {
	rule = {
		name     = "Allow-IPsec-Forward",
		target   = "ACCEPT",
		src      = "wan",
		proto    = "all",
		dest     = "*",
		extra    = '-m policy --dir in --pol ipsec',
		enabled  = 0
	},
	args = { target = "ACCEPT", extra = '-m policy --dir in --pol ipsec', dest = "*" }
}

rule_opt[5] = {
	rule = {
		name     = "MSS-IPsec-fix",
		target   = "TCPMSS",
		set_mss  = "1360",
		src      = "*",
		dest     = "*",
		proto    = "tcp",
		extra    = "-m policy --pol ipsec --dir in --tcp-flags SYN,RST SYN -m tcpmss --mss 1361:1536",
		enabled  = 0
	},
	args = { target = "TCPMSS", extra = "-m policy --pol ipsec --dir in --tcp-flags SYN,RST SYN -m tcpmss --mss 1361:1536", dest = "*", src = "*", proto = "tcp" }
}

rule_opt[6] = {
	rule = {
		name     = "Allow-IPsec-Input",
		target   = "ACCEPT",
		src      = "wan",
		proto    = "all",
		extra    = "-m policy --pol ipsec --dir in",
		enabled  = 0
	},
	args = { target = "ACCEPT", extra = "-m policy --pol ipsec --dir in" }
}

rule_opt[7] = {
	rule = {
		name     = "Allow-IPsec-Output",
		target   = "ACCEPT",
		dest     = "wan",
		proto    = "all",
		extra    = "-m policy --pol ipsec --dir out",
		enabled  = 0
	},
	args = { target = "ACCEPT", extra = "-m policy --pol ipsec --dir out"}
}

-- NAT rule
rule_opt[8] = {
	rule = {
		name     = "Exclude-IPsec-from-NAT",
		proto    = 'any',
		extra    = '-m policy --dir out --pol ipsec',
		src      = 'wan',
		target   = "ACCEPT",
		enabled  = 0
	},
	args = { target = "ACCEPT", extra = '-m policy --dir out --pol ipsec', src = 'wan' }, "nat"
}

local function set_vpn_rule_enabled(service, enabled)
	service:table_foreach("firewall", "rule", function(section)
		for _, opt in ipairs(rule_opt) do
			if section.name and section.name == opt.rule.name and not section.name:match("Forward%-.*%-.*") then
				if not enabled and section.enabled ~= "0" then
					service:table_set("firewall", section[".name"], "enabled", "0")
				else
					service:table_delete("firewall", section[".name"], "enabled")
				end
			end
		end
	end)
end

local function save_vpn_firewall(self)

	local enabled_section = false
	if self:table_find("ipsec", "remote", {enabled = "1"}) then enabled_section = true end
	if self.request_method ~= "DELETE" and
		not enabled_section and
		type(self.current_data_block) == "table" and
		self.current_data_block["enabled"] == "1" then
		enabled_section = true
	end
	if enabled_section then
		for rule, rule_opt in ipairs(rule_opt) do
			util_tlt.ensure_vpn_rule_exists(self, rule_opt.rule, rule_opt.args, rule_opt[1], rule_opt[2], rule_opt[3])
		end
		set_vpn_rule_enabled(self, true)
		util_tlt.set_vpn_nat_enabled(self, rule_opt[8].rule.name, true)
	else
		set_vpn_rule_enabled(self, false)
		util_tlt.set_vpn_nat_enabled(self, rule_opt[8].rule.name, false)
	end
end

local function remove_firewall_rules(self)
	for _, direction in ipairs({"in", "out"}) do
		local rule = service:table_find("firewall", "rule", { name = "Forward-" .. self.sid .. "-" .. direction })
		if rule then
			self:table_delete("firewall", rule[".name"])
		end
	end
end

local function update_firewall_for_binding(self)
	local section = self.sid .. "_c"
	local bind_to = self:table_get(self.main_config, section, "bind_to") or nil
	if ( not bind_to or bind_to == "" ) and self.request_method ~= "DELETE" then return end
	local firewall_lib = require("api.network.firewall.firewall_lib")
	local l2tp_server_bound = false
	self:table_foreach("xl2tpd", "service", function(s)
		if s[".name"] == bind_to then
			l2tp_server_bound = true
		end
	end)
	service:table_foreach("firewall", "rule", function(s)
		if s.name and s.name == "Allow-l2tp-traffic" then
			if self.request_method == "DELETE" or not l2tp_server_bound then
				firewall_lib:set_rule(self, { enabled = "1" }, s[".name"])
			else
				firewall_lib:set_rule(self, { enabled = "0" }, s[".name"])
			end
		end
	end)
end

local function set_firewall_rules(self)
	if self.request_method == "DELETE" then
		remove_firewall_rules(self)
		update_firewall_for_binding(self)
		return
	end
	self:table_foreach("ipsec", "remote", function(f)
		local sid=f[".name"]
		local section=f[".name"] .. "_c"
		local enabled=self:table_get(self.config, sid, "enabled")
		local local_firewall=self:table_get(self.config, section, "local_firewall") or "1"
		local local_subnet=self:table_get(self.config, section, "local_subnet")
		local remote_subnet=self:table_get(self.config, section, "remote_subnet")
		local rule_opt = {}
		rule_opt[1] = {
			rule = {
				name     = "Forward-" .. sid .. "-in",
				target   = "ACCEPT",
				src      = "wan",
				dest     = "lan",
				dest_ip  = local_subnet,
				src_ip   = remote_subnet,
				proto    = "all",
				extra    = "-m policy --dir in --pol ipsec --proto esp",
				enabled  = 0
			}, args = { target = "ACCEPT", dest_ip = local_subnet, src_ip = remote_subnet, extra = "-m policy --dir in --pol ipsec --proto esp" }
		}
		rule_opt[2] = {
			rule = {
				name     = "Forward-" .. sid .. "-out",
				target   = "ACCEPT",
				src      = "lan",
				dest     = "wan",
				src_ip   = local_subnet,
				dest_ip  = remote_subnet,
				proto    = "all",
				extra    = "-m policy --dir out --pol ipsec --proto esp",
				enabled = 0
			}, args = { target = "ACCEPT", dest_ip = remote_subnet, src_ip = local_subnet, extra = "-m policy --dir out --pol ipsec --proto esp" }
		}
		if local_subnet and remote_subnet then
			for i = 1, #rule_opt do
				util_tlt.ensure_vpn_rule_exists(self, rule_opt[i].rule, rule_opt[i].args)
			end
		else
			remove_firewall_rules(self)
		end

		service:table_foreach("firewall", "rule", function(section)
			if section.name and section.name:match(".*%-" .. sid .. "%-.*") then
				if local_firewall == "1" and enabled == "1" then
					self:table_delete("firewall", section[".name"], "enabled")
				else
					self:table_set("firewall", section[".name"], "enabled", "0")
				end
			end
		end)
	end)
	update_firewall_for_binding(self)
end

local function create_xfrm(self)
	if self.request_method == "DELETE" then
		local route_based_ipsec = self:table_get("ipsec", self.sid .. "_c", "route_based_ipsec") or "0"
		if route_based_ipsec == "0" then return end
		util_tlt.delete_zone_from_firewall(self, self.sid, true, true)
		self:table_delete("network", self.sid)
		self:table_delete("network", self.sid .. "_static")
		return
	end

	self:table_foreach("ipsec", "connection", function(conn)
		local instance = conn[".name"]:gsub("_c$", "")
		local xfrm_ip  = conn.xfrm_ip
		local disabled = (self:table_get("ipsec", instance, "enabled") == "1") and "0" or "1"
		local xfrm_mtu  = conn.xfrm_mtu
		local if_id  = conn.if_id_in
		local route_based_ipsec  = conn.route_based_ipsec or "0"
		local zone_opt = {
			name     = instance,
			output   = "ACCEPT",
			forward  = "REJECT",
			input    = "ACCEPT",
			network   = instance
		}
		if route_based_ipsec == "1" then
			local static_inst = instance .. "_static"

			self:table_section("network", "interface", instance, {
				proto = "xfrm",
				ifid = if_id,
				mtu = xfrm_mtu,
				tunlink = "loopback",
				disabled = disabled
			})
			self:table_section("network", "interface", static_inst, {
				proto = "static",
				ipaddr = xfrm_ip,
				device = "@" .. instance,
				disabled = disabled
			})
			local zone_name = util_tlt.ensure_zone_exists(self, zone_opt, zone_opt.network).name
			if zone_name == zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name) end
		elseif self:table_get("network", instance, "proto") == "xfrm" then
			util_tlt.delete_zone_from_firewall(self, zone_opt.name, true, true)
			self:table_delete("network", instance)
			self:table_delete("network", instance .. "_static")
		end
	end)
end
local function remove_ip_rule(self)
	if not self:table_find("ipsec", "remote", {enabled = "1"}) and self:table_get("network", "ipsec_rule") then
		self:table_delete("network", "ipsec_rule")
	end
end

local function create_ip_rule(self)
	local rule_opt = {
		action_group = "lookup",
		tos          = "0",
		priority     = "220",
		invert       = "0",
		lookup       = "220"
	}

	local enabled_section = false
	if self:table_find("network", "rule", {priority = "220", lookup = "220"}) then return end
	if self:table_find("ipsec", "remote", {enabled = "1"}) then enabled_section = true end

	if not enabled_section and self.current_data_block["enabled"] == "1" then
		enabled_section = true
	end
	if enabled_section then
		self:table_section("network", "rule", "ipsec_rule", rule_opt)
	else
		remove_ip_rule(self)
	end
end

function ipsec:POST_before_commit_hook()
	create_ip_rule(self)
	create_xfrm(self)
	set_firewall_rules(self)
	save_vpn_firewall(self)
end

function ipsec:PUT_before_commit_hook()
	create_ip_rule(self)
	create_xfrm(self)
	set_firewall_rules(self)
	save_vpn_firewall(self)
end

local function check_dependency(self)
	local current_bind_to = self.uci:get(self.main_config, self.sid .. "_c", "bind_to")
	local old_section = self:table_get("network", current_bind_to) or nil
	if not old_section or old_section.proto ~= "gre" then return end
	self:table_delete("network", current_bind_to, "auto")
	local values = util.to_table(old_section.services) or {}
	if util.contains(values, "ipsec") then
		self:table_set("network", current_bind_to, "services", values)
	end
	if #values == 0 then
		self:table_delete("network", current_bind_to, "services")
	end
end

local function check_dependency_delete(self)
	local current_bind_to = self:get_abs_value(self.config, self.sid .. "_c", "bind_to") or ""
	if current_bind_to == "" then return end
	local found = false
	self:table_foreach("ipsec", "connection", function(conn)
		if conn[".name"] ~= self.sid .. "_c" then
			if self:table_get("ipsec", conn[".name"], "bind_to") == current_bind_to then
				found = true
				return false
			end
		end
	end)
	if found then return end

	local services = self:table_get("network", current_bind_to, "services")
	if not services then return end
	local services_list = util.to_table(services)
	local key = util.contains(services_list, "ipsec")
	if key then table.remove(services_list, key) end
	if #services_list == 0 then
		self:table_delete("network", current_bind_to, "services")
	else
		self:table_set("network", current_bind_to, "services", services_list)
	end
end

function ipsec:require_validation()
	local new_bind_to = self.current_data_block["bind_to"] or nil
	local current_bind_to = self:get_abs_value(self.config, self.sid .. "_c", "bind_to") or ""
	local multiple_secrets = self:get_abs_value(self.config, self.sid, "multiple_secrets")
	local psk = self:get_abs_value(self.config, self.sid, "pre_shared_key")
	local type = self:get_abs_value(self.config, self.sid, "type")

	authentication_method.require = {}
	if multiple_secrets ~= "1" then
		authentication_method.require = {
			psk = {"pre_shared_key"},
			pkcs12 = {"pkcs12_path"},
			x509 = {"key", "leftcert"}
		}
	end

	if psk and psk ~= "" and multiple_secrets == "1" then
		self:table_delete(self.config, self.sid, "pre_shared_key")
	end

	if multiple_secrets == "1" then
		local amount = 0
		self:table_foreach(self.main_config, "secret", function(c)
			amount = amount + 1
		end)
		if amount == 0 then
			self:add_critical_error(2, "At least one global secret must be configured")
		end
	end

	if current_bind_to and new_bind_to and (current_bind_to ~= new_bind_to) then
		if self:table_get("network", new_bind_to, "proto") ~= "gre" then
			self:table_delete(self.config, self.sid .. "_c", "rightprotoport")
			self:table_delete(self.config, self.sid .. "_c", "leftprotoport")
		end
		check_dependency(self)
	end
	if not current_bind_to and (not new_bind_to or new_bind_to == "") then
		check_dependency_delete(self)
	end
	if current_bind_to ~= "" and new_bind_to == "" then
		check_dependency_delete(self)
	end

	if type == "transport" then
		self:table_delete(self.config, self.sid .. "_c", "local_subnet")
		self:table_delete(self.config, self.sid .. "_c", "remote_subnet")
	end
end

ipsec.PUT_validate_section_hook = ipsec.require_validation
ipsec.POST_validate_section_hook = ipsec.require_validation

function ipsec:DELETE_before_section_delete_hook()
	local function delete_crypto_proposals(id)
		local crypto_proposals = self:table_get(self.main_config, id, "crypto_proposal")
		if not crypto_proposals then return end

		for _, name in ipairs(crypto_proposals) do
			self:table_delete("ipsec", name)
		end
	end

	create_xfrm(self)
	delete_crypto_proposals(self.sid)
	delete_crypto_proposals(self.sid .. "_c")
	check_dependency(self)
	check_dependency_delete(self)
end

function ipsec:DELETE_before_commit_hook()
	local count = 0
	self:table_foreach(self.main_config, "remote", function(t)
		count = count + 1
	end)
	if count <= 1 then
		self:table_foreach(self.main_config, "secret", function(s)
			if s.key and s.key ~= "" and s.key:match("^" .. cert_dir) then
				certs.remove_service_from_config(s.key, self.main_config, s[".name"])
			end
			self:table_delete(self.main_config, s[".name"])
		end)
	end
	remove_ip_rule(self)
	local binded_to = self:table_get(self.main_config, self.sid, "bind_to") or nil
	local bind_section = self:table_get("network", binded_to) or nil
	if bind_section and bind_section.proto == "gre" then
		self:table_delete("network", binded_to, "auto")
	end
	save_vpn_firewall(self)
	if not util_tlt.has_section(self, self.main_config, "remote") then
		for _, rule in ipairs(rule_opt) do
			util_tlt.delete_rule_from_firewall(self, rule.rule.name, true, true)
		end
	end
	set_firewall_rules(self)
end

function ipsec:get_instance_uptime(time)
	local time_now = os.time(os.date("*t"))
	local uptime = util_tlt.seconds_to_days_hours_minutes_seconds(tonumber(time_now - time))
	return uptime
end

function ipsec:get_instance_status_code(sid, status_file, gateway)
	local STATUS = {
		DISCONNECTED = "0",
		CONNECTED    = "1",
		RUNNING      = "2",
		STOPPED      = "3",
		DISABLED     = "4"
	}

	if not self:table_get("ipsec", sid) then return end
	local enabled = self:table_get("ipsec", sid, "enabled")
	if not enabled or enabled == "0" then return STATUS.DISABLED end
	if gateway then
		for file in fs.glob(status_file) do
			local data = json.parse(fs.readfile(file))
			local uptime = self:get_instance_uptime(data.conndate)
			return STATUS.CONNECTED, uptime
		end
		return STATUS.DISCONNECTED, nil
	else
		local instances = util.ubus("service", "list").swanctl
		if instances and instances.instances and instances.instances.charon and instances.instances.charon.running then
			local time = fs.readfile(state_dir .. "/uptime_" .. sid) or 0
			local uptime = self:get_instance_uptime(time)
			return STATUS.RUNNING, uptime
		else
			return STATUS.STOPPED, nil
		end
	end
end

local function insert_unique_list(tbl, value)
	for _, v in ipairs(tbl) do
		if v == value then
			return
		end
	end
	table.insert(tbl, value)
end

local function collect_peer_metrics(self, entry)
	local rx = 0
	local tx = 0
	local peer_subnets = {}
	local conndate = 0

	for _, sa in pairs(entry["child-sas"] or {}) do
		local conn_status_file = string.format(state_dir .. "/%s-%s.status", sa["name"], sa["reqid"])
		if fs.stat(conn_status_file) then
			local status_data = json.parse(fs.readfile(conn_status_file))
			if status_data then
				conndate = self:get_instance_uptime(status_data.conndate)
			end
			for _, ts in pairs(sa["remote-ts"] or {}) do
				table.insert(peer_subnets, ts)
			end
			rx = rx + (sa["bytes-in"] or 0)
			tx = tx + (sa["bytes-out"] or 0)
		end
	end

	return {
		rx = rx,
		tx = tx,
		peer_subnets = peer_subnets,
		conndate = conndate
	}
end

local function should_track_peer(metrics)
	return #metrics.peer_subnets > 0 or metrics.rx > 0 or metrics.tx > 0 or metrics.conndate ~= 0
end

local function upsert_peer(peers, entry, metrics)
	for _, p in pairs(peers) do
		if p.peer_id == entry["remote-id"] then
			p.rx = p.rx + metrics.rx
			p.tx = p.tx + metrics.tx
			return
		end
	end

	table.insert(peers, {
		my_id           = entry["local-id"],
		peer_id         = entry["remote-id"],
		peer_subnet     = metrics.peer_subnets[1], -- deprecated, remove after API version bump
		peer_subnets    = metrics.peer_subnets,
		uptime          = metrics.conndate,
		peer_ip_address = entry["remote-host"],
		rx              = metrics.rx,
		tx              = metrics.tx
	})
end

function ipsec:instances_status(sid)
	local uci = require("vuci.uci").cursor()

	local status_file = state_dir .. "/" .. sid .. "_c*" .. ".status"
	local gateway = self:table_get("ipsec", sid, "gateway")
	local status, uptime = self:get_instance_status_code(sid, status_file, gateway)

	if status == nil then return end
	if status == "4" then return { status = status } end

	local local_subnet = uci:get("ipsec", sid .. "_c", "local_subnet")
	local remote_subnet = uci:get("ipsec", sid .. "_c", "remote_subnet")
	local xfrm_ip = uci:get("ipsec", sid .. "_c", "xfrm_ip")
	local type = uci:get("ipsec", sid .. "_c", "type")
	local keyexchange = uci:get("ipsec", sid .. "_c", "keyexchange")
	local logs = util.file_exec("/bin/sh", { "-c", "logread -e '<" .. sid .. "|'" }).stdout

	local clients_all = 0
	local clients_num = 0
	self:table_foreach("ipsec", "secret", function(c)
		clients_all = clients_all + 1
	end)

	if status_file then
		local enabled = self:table_get("ipsec", sid, "enabled")
		local swanmon_data = json.parse(util.file_exec("/bin/sh", {"-c","swanmon list-sas"}).stdout).data
		if not swanmon_data or not enabled or enabled == "0" then return end

		local rx_all = 0
		local tx_all = 0
		local peers = {}
		local connected_clients = {}
		for _, peer in pairs(swanmon_data) do
			local entry = peer[sid]
			if entry then
				local metrics = collect_peer_metrics(self, entry)
				if should_track_peer(metrics) then
					insert_unique_list(connected_clients, entry["remote-id"])
					rx_all = rx_all + metrics.rx
					tx_all = tx_all + metrics.tx
					clients_num = #connected_clients
					if clients_num > clients_all then
						clients_all = clients_num
					end
					upsert_peer(peers, entry, metrics)
				end
			end
		end
		return {
			status           = status,
			uptime           = uptime,
			local_subnet     = local_subnet,
			remote_subnet 	 = remote_subnet,
			xfrm_ip          = xfrm_ip,
			remote_host      = gateway,
			clients_all      = tostring(clients_all),
			clients_conected = tostring(clients_num),
			type             = type,
			peers            = peers,
			keyexchange      = keyexchange,
			rx               = tostring(rx_all),
			tx               = tostring(tx_all),
			logs             = logs
		}
	end
end

function ipsec:STATUS_sid_exists()
	return true -- Validation of sid is done in :GET_TYPE_status()
end

function ipsec:GET_TYPE_status()
	if self._single then
		local status = self:instances_status(self.sid)
		if status then
			return self:ResponseOK(status)
		else
			return self:ResponseNotFound("Section not found")
		end
	else
		local statuses = {}
		self:table_foreach("ipsec", "remote", function(c)
			local sid = c[".name"]
			statuses[sid] = self:instances_status(sid)
		end)

		return self:ResponseOK(statuses)
	end
end

function ipsec:PUT_section_init_hook()
	local key_option = "key"
	if self.current_data_block.use_tpm == "1" then
		-- add the existing key so if use_tpm is enabled it would use core logic to upload the key even if the api user does not provide it
		self.current_data_block[key_option] = self.current_data_block[key_option] or self:get_abs_value(self.config, self.sid, key_option)
	end
end

return ipsec
