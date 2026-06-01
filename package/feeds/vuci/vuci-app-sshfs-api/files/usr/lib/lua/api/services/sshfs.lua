
local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local fs = require("nixio.fs")

local flags = {
	delete = false,
	create = false,
	general_section = "sshfs"
}

local mount_prefix = "/tmp/sshfs"

local sshfs = ConfigService:new(flags)

local s = sshfs:section("sshfs", "sshfs")

local enabled = s:option("enabled")
    enabled.require = { ["1"] = { "hostname", "username", "password", "mount_path" } }
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

local hostname = s:option("hostname")
	function hostname:validate(value)
		return self.dt:host(value)
	end

local port = s:option("port")
	function port:validate(value)
		return self.dt:port(value)
	end

local username = s:option("username")
	username.maxlength = 512
	function username:validate(value)
		return self.dt:credentials_validate(value, true)
	end

local password = s:option("password", { sensitive = true })
	password.maxlength = 512
	function password:validate(value)
		return self.dt:credentials_validate(value, true)
	end

local mount_point = s:option("mount_point")
	function mount_point:validate(value)
		return string.sub(value, 1, 1) == "/" and self.dt:posix_filename(string.sub(value, 2, #value) or ""),
			"A path starting with / and containing up to 255 a-Z, 0-9 and ._- characters in length that includes at least one alphanumeric character is accepted."
	end

local mount_path = s:option("mount_path")
	function mount_path:validate(value)
		return self.dt:string(value)
	end

function sshfs:PUT_section_init_hook()
    local old_value = self:table_get("sshfs", "sshfs", "mount_point") or "/sshmount"
    if self.current_data_block.mount_point ~= old_value then
        util.file_exec("/usr/local/usr/bin/fusermount3", { "-uzq", mount_prefix .. old_value })
        util.file_exec("/bin/rmdir", { mount_prefix .. old_value })
    end
end

function sshfs:GET_TYPE_status()
	local status = {}
	local general_status = {}
	local sshfs_running = util.file_exec("/usr/bin/pgrep", {"sshfs"}).code == 0 or false
	local init_done = util.file_exec("/usr/bin/pgrep", {"-f", "run_sshfs_application.sh"}).code == 1 or false
	local sshfs_enabled = self:table_get("sshfs", "sshfs", "enabled") or "0"
	if sshfs_enabled == "0" then
		general_status["status"] = "0" -- Disabled
	elseif sshfs_running and not init_done then
		general_status["status"] = "1" --Starting
	elseif sshfs_running and init_done then
		general_status["status"] = "2" --Running
	else
		general_status["status"] = "3" -- Failed to start
	end

	general_status["mount_point"] = mount_prefix .. (self:table_get("sshfs", "sshfs", "mount_point") or "/sshmount")
	general_status["id"] = "general"

	table.insert(status, general_status)

	self:ResponseOK(status)
end

return sshfs