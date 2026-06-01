local ConfigService = require("api/ConfigService")
local util_tlt = require("vuci.util_tlt")
local util = require("vuci.util")
local fs = require("nixio.fs")

local Tinc = ConfigService:new()

local s = Tinc:section("tinc", "tinc-net")
s:make_primary()
s.default_options.id.maxlength = 8
function s:create_defaults(sid)
	return {
		addressfamily = "any",
		keyexpire = "3600",
		mode = "router",
		pinginterval = "60",
		pingtimeout = "5",
		name = sid,
		port = "655"
	}
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "privatekeyfile", "publickeyfile" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local address_family = s:option("addressfamily")
		function address_family:validate(value)
			local address_family_options = { "ipv4", "ipv6", "any" }
			return self.dt:check_array(value, address_family_options)
		end

	local bind_to_address = s:option("bindtoaddress", { list = true })
		function bind_to_address:validate(value)
			return self.dt:ipaddr(value)
		end

	local bind_to_interface = s:option("bindtointerface")
		function bind_to_interface:validate(value)
			value = string.lower(value)
			local iface_options = {}
			self:table_foreach("network", "interface", function(s)
				if (s.device ~= "lo") and s.proto then
					table.insert(iface_options, s.name or s[".name"])
				end
			end)
			return self.dt:check_array(value, iface_options)
		end
		function bind_to_interface:get(value) return util.network_mapper_get(self, value) end
		function bind_to_interface:set(value) util.network_mapper_set(self, value) end

	local node_to_connect = s:option("connectto", { list = true })
		function node_to_connect:validate(value)
			local node_to_connect_options = {}
			self:table_foreach(self.config, "tinc-host_" .. self.sid, function(s)
				if s.net == self.sid then
					table.insert(node_to_connect_options, s[".name"])
				end
			end)
			return self.dt:check_array(value, node_to_connect_options)
		end

	local key_expire = s:option("keyexpire")
		function key_expire:validate(value)
			return self.dt:irange(value, 1, 90000000)
		end

	local mode = s:option("mode")
		function mode:validate(value)
			local mode_options = { "router", "switch", "hub" }
			return self.dt:check_array(value, mode_options)
		end

	local subnet = s:option("subnet", { list = true })
		function subnet:validate(value)
			local valid, err = self.dt:ipmask(value)
			local valid2, err2 = self.dt:macaddr(value)
			if not valid and not valid2 then return false, err .. " or " .. err2 end
			return true
		end

	local node_name = s:option("name")
	node_name.cfg_require = true
		function node_name:validate(value)
			local used = false
			self:table_foreach(self.config, "tinc-net", function(c)
				if c[".name"] ~= self.sid and c[".name"] == value then
					used = true
				end
			end)
			if used then return false, "Name is already used in another configuration." end
			return self.dt:uciname(value)
		end

	local ping_interval = s:option("pinginterval")
		function ping_interval:validate(value)
			return self.dt:irange(value, 1, 86400)
		end

	local ping_timeout = s:option("pingtimeout")
		function ping_timeout:validate(value)
			return self.dt:irange(value, 1, 86400)
		end

	local private_key = s:option("privatekeyfile", { certificate = {
		upload_only = true
	} })
	private_key.file_size = 1024*1024*16

	local public_key = s:option("publickeyfile", { certificate = {
		upload_only = true
	} })
	public_key.file_size = 1024*1024*16

	local local_ip = s:option("local_ip")
		function local_ip:validate(value)
			return self.dt:ipmask4(value)
		end

	local local_ipv6 = s:option("local_ipv6")
		function local_ipv6:validate(value)
			return self.dt:ipmask6(value)
		end

	local port = s:option("port")
		function port:validate(value)
			local used = false
			self:table_foreach(self.config, "tinc-net", function(c)
				if c[".name"] ~= self.sid and c.port == value then
					used = true
				end
			end)
			if used then return false, "Port is already used in another configuration." end
			return self.dt:port(value)
		end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function Tinc:add_firewall_rule()
	local zone = {
		name    = "tinc",
		src 	= "wan",
		input   = "ACCEPT",
		forward = "REJECT",
		output  = "ACCEPT",
		device  = "tinc+"
	}
	local rule = {
		name      = "Allow-tinc-traffic",
		target    = "ACCEPT",
		src       = "wan",
		dest_port = {"655"},
		proto     = {"tcp", "udp"}
	}

	local zone_name = util_tlt.ensure_zone_exists(self, zone, nil, zone.device).name
	if zone_name == zone.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name, true) end
	util_tlt.ensure_vpn_rule_exists(self, rule, { target = rule.target, proto = rule.proto, dest_port = rule.dest_port })

	local ports = {}
	self:table_foreach(self.main_config, "tinc-net", function(s)
		if s.port and s.port ~= "655" and s.port ~= "" then table.insert(ports, s.port) end
	end)
	if ports ~= {} then
		table.insert(ports, "655")
		self:table_foreach("firewall", "rule", function(c)
			if c.name and c.name == rule.name then
				self:table_set("firewall", c[".name"], "dest_port", ports)
			end
		end)
	end
end

function Tinc:UPDATE_before_commit()
	local s_enabled = false
	local s_count = 0
	self:table_foreach(self.main_config, "tinc-net", function(c)
		s_count = s_count +1
		if c.enabled == "1" then s_enabled = true end
	end)

	if s_enabled then
		self:add_firewall_rule()
	elseif s_count < 1 then
		util_tlt.delete_zone_from_firewall(self, "tinc", true, true)
		util_tlt.delete_rule_from_firewall(self, "Allow-tinc-traffic", true, true)
	end
end

Tinc.POST_before_commit_hook   = Tinc.UPDATE_before_commit
Tinc.PUT_before_commit_hook    = Tinc.UPDATE_before_commit

function Tinc:DELETE_before_commit_hook()
	self:table_foreach(self.main_config, "tinc-host_" .. self.sid, function(s)
		if s.net == self.sid then
			if s.publickeyfile then
				require("vuci.certificates").remove_service_from_config(
					s.publickeyfile,
					self.config,
					s[".name"]
				)
			end
			self:table_delete(self.main_config, s[".name"])
		end
	end)
	self:UPDATE_before_commit()
end

function Tinc:DELETE_before_section_delete_hook()
	local uploaded_files = fs.glob("/etc/vuci-uploads/cbid.tinc." .. self.sid .. ".*")
	if uploaded_files then
		for uploaded_file in uploaded_files do
			fs.remove(uploaded_file) -- remove section uploaded files
		end
	end
end

function Tinc:UPLOAD_after_upload_hook(upload_request)
	local v_table = upload_request.parameters
	local path = upload_request.files[1].location

	if (v_table.option == "privatekeyfile" or v_table.option == "publickeyfile") and fs.access(path) then
		local invalid
		local exist = false
		self:table_foreach(self.main_config, "tinc-net", function(c)
			if self.sid == c[".name"] then exist = true end
		end)
		if not exist then
			os.remove(path)
			self:add_critical_error(STD_CODES.INVALID_SID_USAGE, "Configuration " .. self.sid .. " does not exist. Please create an instance first", "Validation")
		end
		if v_table.option == "privatekeyfile" then
			invalid = util.file_exec("/usr/bin/openssl", {"pkey", "-in", path, "-text", "-noout"}).code
		elseif v_table.option == "publickeyfile" then
			invalid = util.file_exec("/usr/bin/openssl", {"pkey", "-pubin", "-in", path, "-text", "-noout"}).code
		end
		if invalid == 1 then
			os.remove(path)
			self:add_critical_error(2, "Incorrect file uploaded.", "Upload")
		end
	end
	util.set_file_permissions(path, "certificates")
	return { path = path }
end

function Tinc:POST_validate_section_hook()
	local vpn_count = 0
	self:table_foreach(self.main_config, "tinc-net", function(sec)
		vpn_count = vpn_count + 1
	end)
	if vpn_count > 4 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Maximum number of Tinc instances has been reached", "Validation")
	end
end

return Tinc
