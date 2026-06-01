local ConfigService = require("api/ConfigService")

local Samba = ConfigService:new({
	anonymous = true
})

Samba.ERR_CODES = {
	NOT_DIR = 1,
	PATH_NOT_EXIST = 2
}

-- Validates folder path.
---@param val string Path to validate.
---@return boolean valid, string | nil, number | nil err Returns validation status and error message if it fails.
function Samba:folder_path(val)
	local fs = require("nixio.fs")
	local stat = fs.stat(val)
	if stat then
		if stat.type == "dir" then
			return true
		else
			return false, "Path is not a directory.", self.ERR_CODES.NOT_DIR
		end
	end
	return false, "Provided path do not exist in the device.", self.ERR_CODES.PATH_NOT_EXIST
end

local SambaShare = Samba:section("samba", "sambashare")
function SambaShare:create_defaults()
	return {
		read_only = "no",
		browseable = "yes",
		path = "/mnt",
		guest_ok = "no",
		users = {}
	}
end

	local opt_name = SambaShare:option("name")
		opt_name.required = true
		function opt_name:validate(value)
			local name = self:get_abs_value(self.config, self.sid, "name")
			if name then
				local ok = true
				self:table_foreach(self.config, "sambashare", function (share)
					if share.name == name and share[".name"] ~= self.sid then
						ok = false
					end
				end)
				if not ok then
					return false, "Name is already in use."
				end
			end
			return self.dt:string(value)
		end

	local opt_path = SambaShare:option("path")
		opt_path.cfg_require = true
		function opt_path:validate(value)
			local ok, err, code = self:folder_path(value)
			if not ok then
				self:add_critical_error(code, err, "path: "..tostring(value))
			end
			return true
		end

	local opt_users = SambaShare:option("users", {list = true})
		opt_users.required = true
		function opt_users:validate(value)
			local all_users = {}
			self:table_foreach(self.config, "user", function (user)
				if user.username then
					table.insert(all_users, user.username)
				end
			end)
			return self.dt:check_array(value, all_users)
		end
		function opt_users:set(value)
			local invalid_users = {}
			self:table_foreach(self.config, "user", function (user)
				if user.username then
					local exist = false
					if type(value) == "table" then
						for _, v in pairs(value) do
							if v == user.username then exist = true end
						end
					end
					if not exist then
						table.insert(invalid_users, user.username)
					end
				end
			end)
			self:table_set(self.config, self.sid, self.api_key, value)
			self:table_set(self.config, self.sid, "invalid_users", #invalid_users == 0 and "" or invalid_users)
		end

	-- Getter to change "no" to "0" and any other value to "1"
	---@return string value Returns "1" if value was "yes" and "0" if it was any other value.
	local yes_no_getter = function (self)
		return (self:table_get(self.config, self.sid, self.api_key) == "yes") and "1" or "0"
	end

	-- Setter to change "1" to "yes" and any other value to "no"
	---@param value string Value to compare and set data of.
	local yes_no_setter = function (self, value)
		if value == "" then
			self:table_delete(self.config, self.sid, self.api_key)
		elseif value == "1" then
			self:table_set(self.config, self.sid, self.api_key, "yes")
		else
			self:table_set(self.config, self.sid, self.api_key, "no")
		end
	end

	local opt_read_only = SambaShare:option("read_only")
		opt_read_only.cfg_require = true
		function opt_read_only:validate(value)
			return self.dt:is_bool(value)
		end
		opt_read_only.get = yes_no_getter
		opt_read_only.set = yes_no_setter

	local opt_browseable = SambaShare:option("browseable")
		opt_browseable.cfg_require = true
		function opt_browseable:validate(value)
			return self.dt:is_bool(value)
		end
		opt_browseable.get = yes_no_getter
		opt_browseable.set = yes_no_setter

	local opt_guest_ok = SambaShare:option("guest_ok")
		function opt_guest_ok:validate(value)
			return self.dt:is_bool(value)
		end
		opt_guest_ok.get = yes_no_getter
		opt_guest_ok.set = yes_no_setter

return Samba