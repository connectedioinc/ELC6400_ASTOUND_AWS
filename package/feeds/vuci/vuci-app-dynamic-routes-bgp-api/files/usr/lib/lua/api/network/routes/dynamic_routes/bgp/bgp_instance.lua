local ConfigService = require("api/ConfigService")
local bgp_utils = require("api/network/routes/dynamic_routes/bgp/bgp_utils")
local util = require("vuci.util")
local vrf_service = require("vuci.package_checker").is_installed("vuci-app-vrf-api")

local function get_interfaces(self)
	local interfaces_hash = {}
	local interfaces_list = {}
	local vrf_map = {}

	self:table_foreach("network", "device", function(s)
		if s.type == "vrf" then vrf_map[s.name] = true end
	end)

	self:table_foreach("network", "interface", function(s)
		if vrf_map[s.device] then
			interfaces_list[s[".name"]]=s.device
			table.insert(interfaces_hash, s[".name"])
		end
	end)
	return interfaces_list, interfaces_hash
end

local dynamic_bgp_instance = ConfigService:new()
dynamic_bgp_instance.interfaces_hash, dynamic_bgp_instance.interfaces_list = get_interfaces(dynamic_bgp_instance)

	local bgp_instance = dynamic_bgp_instance:section("bgp", "bgp_instance")
		local function validate_distinguisher(self, value)
			local split_val = util.split(value, ":")
			if #split_val ~= 2 then
				return false, "RD must be in format ASN:NN or IP-ADDR:NN"
			end
			local as_part = split_val[1]
			local nn_part = split_val[2]
			if not self.dt:irange(as_part, 0, 2808348671) and not self.dt:ip4addr(as_part) then
				return false, "First part of RD must be an ASN (0-2808348671) or an IPv4 address"
			end
			if not self.dt:irange(nn_part, 0, 40959) then
				return false, "Second part of RD must be a number between 0 and 40959"
			end
			return true
		end

		local enabled = bgp_instance:option("enabled")
			function enabled:validate(value)
				return self.dt:is_bool(value)
			end

		local as = bgp_instance:option("as")
			function as:validate(value)
				return self.dt:irange(value, 1, 4294967295)
			end

		local router_id = bgp_instance:option("router_id")
			function router_id:validate(value)
				return self.dt:ip4addr(value)
			end
			function router_id:get()
				return self:table_get(self.config, self.sid, "id")
			end
			function router_id:set(value)
				self:table_set(self.config, self.sid, "id", value)
			end


		local network = bgp_instance:option("network", { list = true })
			function network:validate(value)
				return self.dt:ipmask4(value), "IPv4 addresses with or without mask prefix are accepted. E.g 192.168.1.0/24."
			end

		local redistribute = bgp_instance:option("redistribute", { list = true })
			function redistribute:validate(value)
				return self.dt:string(value)
			end

		local deterministic_med = bgp_instance:option("deterministic_med")
			function deterministic_med:validate(value)
				return self.dt:is_bool(value)
			end
		local ebgp_requires_policy = bgp_instance:option("ebgp_requires_policy")
			function ebgp_requires_policy:validate(value)
				return self.dt:is_bool(value)
			end

		local rd_export = bgp_instance:option("rd_export")
		rd_export.require = {"vrf"}
			function rd_export:validate(value)
				return validate_distinguisher(self, value)
			end

		local rt_import = bgp_instance:option("rt_import")
		rt_import.require = {"vrf"}
			function rt_import:validate(value)
				return validate_distinguisher(self, value)
			end

		local rt_export = bgp_instance:option("rt_export")
		rt_export.require = {"vrf"}
			function rt_export:validate(value)
				return validate_distinguisher(self, value)
			end

		local export_vpn = bgp_instance:option("export_vpn")
		export_vpn.require = {"vrf"}
			function export_vpn:validate(value)
				return self.dt:is_bool(value)
			end

		local import_vpn = bgp_instance:option("import_vpn")
		import_vpn.require = {"vrf"}
			function import_vpn:validate(value)
				return self.dt:is_bool(value)
			end

		local vrf = bgp_instance:option("vrf")
			function vrf:validate(value)
				return self.dt:check_array(value, self.interfaces_list)
			end
			function vrf:set(value)
				local vrf_interface = ""
				for _, intf in pairs(self.interfaces_hash) do
					if value == _ then vrf_interface = intf	end
				end
				self:table_set(self.config, self.sid, "vrf", vrf_interface)
			end

function dynamic_bgp_instance:validate_vrf()
	if not vrf_service then return end
	self:table_foreach("bgp","bgp_instance", function(sec)
		if sec[".name"] == self.sid then
			return true
		end
		if (sec.vrf or "") == self:get_abs_value(self.config, self.sid, "vrf") then
			self:add_error(STD_CODES.INVALID_OPT, "This VRF is already used", "Validation")
		end
	end)
end

function dynamic_bgp_instance:find_available_vrf()
	local used_vrfs = {}

	self:table_foreach("bgp", "bgp_instance", function(sec)
		table.insert(used_vrfs, sec.vrf)
	end)
	for _, intf in pairs(self.interfaces_hash) do
		if not util.contains(used_vrfs, intf) then
			return intf
		end
	end
	return nil
end

function dynamic_bgp_instance:DELETE_after_data_hook(response_data)
	if not vrf_service then self:add_error(STD_CODES.CONF_DEL_DISALLOWED, "Section cannot be deleted", "Validation") end
	local table_names = {"bgp_peer", "bgp_peer_group", "bgp_route_map_filters"}
	for _, table_name in ipairs(table_names) do
		self:table_foreach(self.main_config, table_name, function(s)
			if s["instance"] == self.sid then self:table_delete(self.main_config, s[".name"]) end
		end)
	end
end

function dynamic_bgp_instance:set_vrf()
	if not vrf_service then return end
	local has_nil_vrf = false
	self:table_foreach("bgp", "bgp_instance", function(sec)
		if sec.vrf == nil then
			has_nil_vrf = true
			return false
		end
    end)
	if has_nil_vrf == true then
		local available_vrf = self:find_available_vrf()
		if available_vrf ~= nil then
			self:table_set("bgp", self.sid, "vrf", available_vrf)
		else
			self:add_error(STD_CODES.INVALID_OPT, "To create a new BGP instance, make sure you have at least one unused VRF instance available.", "Validation")
		end
	end
end

function dynamic_bgp_instance:PUT_validate_section_hook()
	self:validate_vrf()
	bgp_utils:section_limit(self, "bgp_instance", nil, 30)
end

function dynamic_bgp_instance:POST_validate_section_hook()
	if not vrf_service then self:add_error(STD_CODES.NO_CREATE, "No VRF support available for more instances", "Validation") end
	self:validate_vrf()
	self:set_vrf()
	bgp_utils:section_limit(self, "bgp_instance", nil, 30)
end

return dynamic_bgp_instance
