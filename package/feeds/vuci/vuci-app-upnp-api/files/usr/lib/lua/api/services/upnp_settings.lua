local fs = require "nixio.fs"

local ConfigService = require("api/ConfigService")

local upnp_settings = ConfigService:new({ create = false, delete = false, general_section = "config", global_settings = true})

local s = upnp_settings:section("upnpd", "upnpd")

local ERR_CODES = {
	FILE_IS_DIR_ERR = 1,
	FILE_READ_ERR = 2,
	FILE_USED_ERR = 3,
	PATH_INVALID = 4,
	NO_SPACE = 5
}

function upnp_settings:add_firewall_rule()
    if self:table_get("firewall", "miniupnpd") then return end

    self:table_section("firewall", "include", "miniupnpd", {
        option = "include",
        type = "script",
        path = "/usr/local/share/miniupnpd/firewall.include",
        family = "any",
        reload = "1"
    })
end

function upnp_settings:remove_firewall_rule()
    if not self:table_get("firewall", "miniupnpd") then return end

    self:table_delete("firewall", "miniupnpd")
end

function upnp_settings:PUT_before_commit_hook()
    local enabled = self:get_abs_value(self.config, self.sid, "enabled")
    if enabled == "1" then
        self:add_firewall_rule()
    else
        self:remove_firewall_rule()
    end
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

    local enabled = s:option("enabled")
        function enabled:validate(value)
            return self.dt:is_bool(value)
        end

    local secure_mode = s:option("secure_mode")
        function secure_mode:validate(value)
            return self.dt:is_bool(value)
        end

    local log_output = s:option("log_output")
        function log_output:validate(value)
            return self.dt:is_bool(value)
        end

    local download = s:option("download")
        function download:validate(value)
            return self.dt:uinteger(value)
        end

    local upload = s:option("upload")
        function upload:validate(value)
            return self.dt:uinteger(value)
        end

    local port = s:option("port")
        function port:validate(value)
            return self.dt:port(value)
        end

    local system_uptime = s:option("system_uptime")
        function system_uptime:validate(value)
            return self.dt:is_bool(value)
        end

    local device_uuid = s:option("uuid")
        function device_uuid:validate(value)
            return self.dt:fieldvalidation(value, "^[a-zA-Z0-9_-]+$")
        end

    local serial_number = s:option("serial_number")
        function serial_number:validate(value)
            return true
        end

    local model_number = s:option("model_number")
        function model_number:validate(value)
            return true
        end

    local notify_interval = s:option("notify_interval")
        function notify_interval:validate(value)
            return self.dt:uinteger(value)
        end

    local ruleset_threshold = s:option("clean_ruleset_threshold")
        function ruleset_threshold:validate(value)
            return self.dt:uinteger(value)
        end

    local ruleset_interval = s:option("clean_ruleset_interval")
        function ruleset_interval:validate(value)
            return self.dt:uinteger(value)
        end

    local presentation_url = s:option("presentation_url")
        function presentation_url:validate(value)
            return self.dt:host(value)
        end

    local upnp_lease_file = s:option("upnp_lease_file")
		function upnp_lease_file:validate(value)
			local valid, err = self.dt:nospace(value)
			if not valid then return false, err, ERR_CODES.NO_SPACE end
			if not value:find("^/") then return false, "Invalid path, must start with '/'.", ERR_CODES.PATH_INVALID end

			local stat = fs.stat(value)
			if stat then
				if stat.size == 0 then return true end
				if stat.type == "dir" then return false, "Provided path is a directory.", ERR_CODES.FILE_IS_DIR_ERR end
				local f = io.open(value, "r")
				if not f then return false, "File read error.", ERR_CODES.FILE_READ_ERR end
				local line = f:read("*l")
				f:close()
				if line:match("^TCP:") or line:match("^UDP:") then
					return true
				else
					return false, "File is already in use.", ERR_CODES.FILE_USED_ERR
				end
			end
			stat = fs.stat(value:sub(1, value:find("/[^/]*$")))
			if not stat or stat.type ~= "dir" then
				return false, "Invalid path.", ERR_CODES.PATH_INVALID
			end
			return true
        end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

return upnp_settings
