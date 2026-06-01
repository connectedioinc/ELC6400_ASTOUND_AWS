local ConfigService = require("api/ConfigService")
local siteman_utils = require("api/services/site_manager/siteman_utils")

local port_based = ConfigService:new({ increment_name = true })
port_based.read_only = 1
port_based.ports = {"port1", "port2", "port3", "port4", "port5", "port6", "port7", "port8", "port9", "port10", "port11", "port12", "port13", "port14", "port15", "port16", "port17", "port18", "port19", "port20", "port21", "port22", "port23", "port24", "sfp1", "sfp2", "sfp3", "sfp4"}

port_based.vlans = {}
port_based.vlans_ports = {}

local s = port_based:section("siteman_vlan", "bridge-vlan")
s.create_defaults = function(self)
	local defaults = {}
	defaults._platform = "switch"
	return defaults
end

	local name = s:option("name")
		function name:validate(value)
			return self.dt:string(value)
		end

	local vlan_id = s:option("vlan")
		function vlan_id:validate(value)
			return self.dt:irange(value, 1, 4096)
		end


	for _, p in pairs(port_based.ports) do
		local port = s:option(p)
			function port:validate(value)
				local options = {"off", "u", "t"}
				return self.dt:check_array(value, options)
			end
			function port:get()
				local ports = self:table_get(self.config, self.sid, "ports") or {}
				for _, pt in pairs(ports) do
					local pc, tu
					if pt:match("^port") then
						pc, tu = pt:match("^(port%d+):([tu]*)")
					else
						pc, tu = pt:match("^(sfp%d+):([tu]*)")
					end
					if pc == p then return tu end
				end
				return "off"
			end
			function port:set()
				-- Save to config is done in before_commit_hook
			end
	end

function port_based:get_vlan_ports(section_name, from_config)
	local ports
	if from_config then
		ports = self.uci:get(self.main_config, section_name, "ports") or {}
	else
		ports = self:table_get(self.main_config, section_name, "ports") or {}
	end
	local ports_table = {}
	
	-- Initialize all ports to "off" first
	for _, p in pairs(self.ports) do
		ports_table[p] = "off"
	end
	
	-- Then set the actual values from config
	for _, pt in pairs(ports) do
		local pc, tu
		if pt:match("^port") then
			pc, tu = pt:match("^(port%d+):([tu]*)")
		else
			pc, tu = pt:match("^(sfp%d+):([tu]*)")
		end
		if pc then
			ports_table[pc] = tu
		end
	end
	return ports_table
end

function port_based:load_ports_from_config()
	self:table_foreach(self.main_config, "bridge-vlan", function(s)
		-- Load VLAN ID
		self.vlans[s[".name"]] = s.vlan

		-- Load ports from config
		self.vlans_ports[s[".name"]] = self:get_vlan_ports(s[".name"], nil)
	end)
end

function port_based:merge_ports_from_config_with_request()
	self.vlans[self.sid] = self.current_data_block["vlan"]

	local ports_table = {}
	if self.vlans_ports[self.sid] then
		ports_table = self.vlans_ports[self.sid]
	end

	for _, p in pairs(self.ports) do
		local new_tag = self.current_data_block[p]
		if new_tag then
			ports_table[p] = new_tag
		end
	end	
	self.vlans_ports[self.sid] = ports_table
end

function port_based:untag_old(delete)
	local new_vlan = self.current_data_block["vlan"]
	local old_vlan = self:table_get(self.main_config, self.sid, "vlan")
	if old_vlan and (delete or (new_vlan and new_vlan ~= old_vlan)) then
		self:table_foreach(self.main_config, "interface", function(s)
			if s.device and s.device == "br0."..old_vlan then
				if delete then
					self:table_delete(self.main_config, s[".name"], "device")
				else
					self:table_set(self.main_config, s[".name"], "device", "br0."..new_vlan)
				end
			end
		end)
	end
end

function port_based:set_new_ports()
	for _, data in pairs(self.arguments.data or {}) do
		local new_ports, section_name = {}, nil
		if type(data) == "table" then
			section_name = data.id
		else
			section_name = self.sid
		end

		local vlan = self.vlans_ports[section_name]
		for _, p in pairs(self.ports) do
			local port = vlan[p]
			if port and port == "t" then
				table.insert(new_ports, p .. ":t")
			elseif port and port == "u" then
				table.insert(new_ports, p .. ":u")
			end
		end

		-- Set new ports
		self:table_set(self.main_config, section_name, "ports", new_ports)
		if type(data) ~= "table" then break end
	end
end

function port_based:PUT_init_hook()
	self:load_ports_from_config()
end

function port_based:PUT_section_init_hook()
	self:merge_ports_from_config_with_request()

	self:untag_old()
end

function port_based:PUT_before_commit_hook()
	self:return_if_error()

	self:set_new_ports()
end

function port_based:POST_init_hook()
	self:load_ports_from_config()
end

function port_based:POST_before_commit_hook()
	self:merge_ports_from_config_with_request()

	self:return_if_error()

	self:set_new_ports()
end

function port_based:DELETE_init_hook()
	self:load_ports_from_config()
	
	-- Never allow deletion of VLAN ID 1 (default VLAN)
	local vlan_id = self:table_get(self.main_config, self.sid, "vlan")
	if vlan_id == "1" then
		self:table_set_error("Cannot delete default VLAN (VLAN ID 1)")
		return
	end
	
	-- Get device and group of the VLAN being deleted
	local deleted_device = self:table_get(self.main_config, self.sid, "device")
	local deleted_group = self:table_get(self.main_config, self.sid, "group")
	
	-- Get ports that are tagged or untagged in the VLAN being deleted
	local deleted_ports = self:get_vlan_ports(self.sid, nil)
	local active_ports_to_delete = {}
	for port, tag in pairs(deleted_ports) do
		if tag == "t" or tag == "u" then
			table.insert(active_ports_to_delete, port)
		end
	end
	
	if #active_ports_to_delete == 0 then
		return -- No active ports, safe to delete
	end
	
	-- Get all other VLANs in the same device and group
	local remaining_vlans = {}
	self:table_foreach(self.main_config, "bridge-vlan", function(s)
		if s[".name"] ~= self.sid then
			local vlan_device = s.device or ""
			local vlan_group = s.group or ""
			-- Only consider VLANs from the same device and group
			if vlan_device == deleted_device and vlan_group == deleted_group then
				table.insert(remaining_vlans, s[".name"])
			end
		end
	end)
	
	-- Check each active port in the deleted VLAN
	local orphaned_ports = {}
	for _, port in ipairs(active_ports_to_delete) do
		local has_other_vlan = false
		
		-- Check if this port is active in any other VLAN in the same device/group
		for _, vlan_name in ipairs(remaining_vlans) do
			local ports = self:get_vlan_ports(vlan_name, nil)
			if ports[port] == "t" or ports[port] == "u" then
				has_other_vlan = true
				break
			end
		end
		
		if not has_other_vlan then
			table.insert(orphaned_ports, port)
		end
	end
	
	if #orphaned_ports > 0 then
		-- Format port names for error message
		local port_names = {}
		for _, port in ipairs(orphaned_ports) do
			local num = port:match("%d+")
			if port:match("^sfp") then
				table.insert(port_names, "SFP " .. num)
			else
				table.insert(port_names, num)
			end
		end
		table.sort(port_names)
		
		local error_msg = "Cannot delete VLAN. Ports must be tagged or untagged in at least one VLAN. The following ports would be left without any VLAN assignment: " .. table.concat(port_names, ", ")
		self:table_set_error(error_msg)
		return
	end
end

function port_based:DELETE_before_commit_hook()
	self:return_if_error()
	
	self:untag_old(true)
end

siteman_utils:wrap_endpoint(port_based)
return port_based
