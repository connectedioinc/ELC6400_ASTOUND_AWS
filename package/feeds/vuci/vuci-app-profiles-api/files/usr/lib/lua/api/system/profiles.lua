local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local board = require("vuci.board")

local profiles = ConfigService:new({ create = true })

profiles.ERROR_CODES = {
	SCHEDULER_ENABLED = 1,
	MODEMS_IN_USE = 2,
	MODEMS_UNREACHABLE = 3,
	MODEMS_RESTART_FAILED = 4,
	PROFILE_CONFIG_NOT_FOUND = 5
}

function profiles:POST_before_commit_hook()
	local ret = util.ubus("rpc-profile", "create", { name = self.current_data_block.id, template = self.current_data_block.from_current_profile ~= "1" }) or {}
	if ret.status ~= 0 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Failed to create profile", "UCI")
	end
	self:table_set("profiles", self.current_data_block.id, "id", tostring(ret.id))
	self:table_set("profiles", self.current_data_block.id, "updated", ret.updated)
	self:table_set("profiles", self.current_data_block.id, "archive", ret.archive)
	self:table_set("profiles", self.current_data_block.id, "md5file", ret.md5file)
end

	local profile = profiles:section("profiles", "profile")
		profile:make_primary()
		profile.default_options.id.maxlength = 20

		local updated = profile:option("updated")
		updated.readonly = true

		local profile_id = profile:option("profile_id")
			profile_id.readonly = true
			function profile_id:get()
				return self:table_get(self.main_config, self.sid, "id")
			end

		local from_current_profile = profile:option("from_current_profile")
			function from_current_profile:validate(value)
				return self.dt:is_bool(value)
			end

			function from_current_profile:set(value) end

			function from_current_profile:get(_) return nil end

function profiles:GET_TYPE_status()
	local current_profile = self:table_get("profiles", "general", "profile")
	return self:ResponseOK({ current_profile = current_profile })
end

function profiles:PUT()
	self:ResponseNotImplemented("PUT not implemented")
end

function profiles:POST_validate_section_hook()
	local count = self:table_count(self.config, "profile")
	if count >= 10 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Only 10 profile instances are allowed", "Validation")
	end
end

function profiles:clear_scheduler()
	local id = self:table_get("profiles", self.sid, "id")
	if id then
		self:table_foreach("profiles", "scheduler", function(s)
			if s.profile_id == id then
				self:table_delete("profiles", s[".name"])
			end
		end)
	end
end

function profiles:remove_from_geofencing()
	self:table_foreach("gps", "geofencing", function(s)
		if s.switch_profile and s.switch_profile == self.sid then
			self:table_delete("gps", s[".name"], "switch_profile")
		end
	end)
end

function profiles:DELETE_before_section_delete_hook()
	if self.sid == "default" then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			"Profile 'default' cannot be deleted",
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	if self.sid == self:table_get(self.main_config, "general", "profile") then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Profile '%s' is currently in use", self.sid),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
	if self:table_find(self.main_config, "scheduler", { profile_id = self:table_get(self.main_config, self.sid, "id") }) then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Profile '%s' is currently in use by the scheduler", self.sid),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end

	local ret = util.ubus("rpc-profile", "remove", { name = self.sid }) or {}
	if ret.status ~= 0 then
		self:add_critical_error(STD_CODES.UCI_DELETE_ERROR, "Failed to delete profile", "UCI")
	end

	self:clear_scheduler()
	if board:has_gps() then
		self:remove_from_geofencing()
	end
end

function profiles:apply_new_profile()
	local new_profile = self.arguments.data.name

	local ret = util.ubus("rpc-profile", "change", { name = new_profile }, 300) or {}
	if ret.status ~= 0 then return false end

	local sessions = { util.ubus("session", "list") }
	for _, single_session in ipairs(sessions) do
		util.ubus("session", "destroy", { ubus_rpc_session = single_session.ubus_rpc_session })
	end
	return true
end

function profiles:apply_profile()
	local mdm = require("vuci.modem")
	local scheduler = self.uci:get("profiles", "general", "enabled") or "0"
	local mdm_count = mdm:modem_count()
	if mdm_count > 0 then
		local mdm_id = mdm:get_all_modems()
		if #mdm_id == 0 then
			self:add_critical_error(
					self.ERROR_CODES.MODEMS_UNREACHABLE,
					"Modem(s) is(are) unreachable.",
					"UCI"
			)
			return
		end
		local state = 1
		for i = 1, mdm_count do
			if mdm:get_state(mdm_id[i].id) == 0 then state = 0 end
		end
		if state == 1 then
			self:add_critical_error(
					self.ERROR_CODES.MODEMS_IN_USE,
					"Cannot switch profile while modem(s) is(are) busy.",
					"UCI"
			)
		end
	end
	if scheduler == "1" then
		self:add_critical_error(
				self.ERROR_CODES.SCHEDULER_ENABLED,
				"Unable to apply profile. Scheduler is enabled.",
				"UCI"
		)
	end

	if not self:apply_new_profile() then
		self:add_critical_error(
			self.ERROR_CODES.PROFILE_CONFIG_NOT_FOUND,
			"Failed to apply profile.",
			"UCI"
		)
	end

	local util_tlt = require("vuci.util_tlt")
	local ipv4_addr, ipv6_addr = util_tlt.lan_ip()

	local http_port, https_port
	if self.uci:get("uhttpd", "main", "enable_http") == "1" then
		http_port = self.uci:get("uhttpd", "main", "listen_http")
	end
	if self.uci:get("uhttpd", "main", "enable_https") == "1" then
		https_port = self.uci:get("uhttpd", "main", "listen_https")
	end

	self:ResponseOK({
		lan_ipv4 = ipv4_addr,
		lan_ipv6 = ipv6_addr,
		http_port = http_port,
		https_port = https_port
	})
end

local sign = profiles:action("apply_profile", profiles.apply_profile)
	local name = sign:option("name")
	name.require = true
		function name:validate(value)
			local profiles_names = {}
			local current_profile = self.uci:get("profiles", "general", "profile")
			self.uci:foreach("profiles", "profile", function(s)
				if s[".name"] ~= current_profile then
					table.insert(profiles_names, s[".name"])
				end
			end)
			return self.dt:check_array(value, profiles_names)
		end

return profiles
