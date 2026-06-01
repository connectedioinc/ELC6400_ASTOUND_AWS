local util = require "vuci.util"
local ConfigService = require("api/ConfigService")

local Samba = ConfigService:new({
	create = false,
	delete = false,
	global_settings = true,
	general_section = function (self)
		return self.uci:get_all("samba", "@samba[0]")[".name"]
    end
})

local SambaGeneral = Samba:section("samba", "samba")

	local opt_enabled = SambaGeneral:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_name = SambaGeneral:option("name")
		function opt_name:validate(value)
			return self.dt:string(value)
		end

	local opt_description = SambaGeneral:option("description")
		function opt_description:validate(value)
			return self.dt:string(value)
		end

	local opt_workgroup = SambaGeneral:option("workgroup")

	local opt_homes = SambaGeneral:option("homes")
		function opt_homes:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_custom = SambaGeneral:option("custom", { list = true })
		function opt_custom:validate(value)
			local valid, err = self.dt:fieldvalidation(value, "^[a-zA-Z0-9 ]+=[^?]*$")
			if not valid then return valid, err end

			local blacklist = { "netbios name", "display charset", "interfaces", "server string", "unix charset", "workgroup" }
			for _, val in pairs(blacklist) do
				if string.match(value, "^ *" .. val:gsub(" ", " +") .. "  *=") then
					return false, "Custom value '" .. val .. "' is not allowed"
				end
			end
			return true
		end

	local opt_interface = SambaGeneral:option("interface", { list = true })
		function opt_interface:validate(value)
			local interfaces = {}
			self.uci:foreach("network", "interface", function(i)
				if i.area_type and i.area_type == "lan" and i[".name"] ~= "loopback" then
					table.insert(interfaces, i.name or i[".name"])
				end
			end)
			return self.dt:check_array(value, interfaces)
		end
		function opt_interface:get(value) return util.network_mapper_get(self, value) end
		function opt_interface:set(value) util.network_mapper_set(self, value) end

function Samba:check_changes(opt)
	for _, o in pairs(opt) do
		local param = self.uci:get(self.main_config, self.sid, o)
		if param then
			if type(param) == "table" then
				if not util.deep_compare(self.uci:get(self.main_config, self.sid, o), self:get_abs_value(self.main_config, self.sid, o)) then
					return true
				end
			else
				if self.uci:get(self.main_config, self.sid, o) ~= self:get_abs_value(self.main_config, self.sid, o) then
					return true
				end
			end
		end
	end
	return false
end

function Samba:PUT_before_commit_hook()
	local opt = {"name", "description", "interface", "custom"}
	local change = self:check_changes(opt)
	if change then
		local f = io.open("/etc/samba/smb.conf", "r")
		if f then
			io.open("/etc/samba/smb.conf","w"):close()
		end
	end
end

return Samba
