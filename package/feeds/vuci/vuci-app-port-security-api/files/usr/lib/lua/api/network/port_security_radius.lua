local util = require("vuci.util")
local ConfigService = require("api/ConfigService")
local PortSecurity = ConfigService:new({ anonymous = true })
if not require("vuci.board"):has_ethernet() then return end
local pac = require("vuci.package_checker")
local server_support = pac.is_installed("dot1x-server") or pac.is_installed("dsa-dot1x-server")
if not server_support then return end

local Radius = PortSecurity:section("dot1x", "radius")
function Radius:create_defaults()
	return { port = "1812", address = "192.168.1.1", secret = "password" }
end

function PortSecurity:POST_init_hook()
	local data = self.arguments.data
	if not data then return end
	data.id = data.id ~= "" and data.id
	data.name = data.name ~= "" and data.name

	if not data.name then
		data.name = data.id
		if data.name then
			local duplicate_name = self:table_find(self.config, "radius", { name = data.name })
			local duplicate_id = self:table_find(self.config, "radius", { [".name"] = data.name })
			if duplicate_name or duplicate_id then data.name = nil end
		end
		data.name = data.name or util.generate_name(self, self.config, "radius", "radius", { "name", ".name" })
	end
	self.flags.anonymous = not data.id
end

local function add_options(backup)
	local prefix = backup and "backup_" or ""

	local address = Radius:option(prefix.."address")
	function address:validate(value)
		return self.dt:ipaddr(value)
	end

	local secret = Radius:option(prefix.."secret", { sensitive = true })
	secret.maxlength = 256

	local port = Radius:option(prefix.."port")
	function port:validate(value)
		return self.dt:port(value)
	end

	if backup then return end
	address.cfg_require = true
	secret.cfg_require = true
	port.cfg_require = true
end

add_options()
add_options(true)

local backup_enable = Radius:option("backup_enable")
backup_enable.require = { ["1"] = {"backup_address", "backup_secret", "backup_port"} }
function backup_enable:validate(value)
	return self.dt:is_bool(value)
end

local name = Radius:option("name")
name.cfg_require = true
function name:validate(value)
	local same_name = self:table_find(self.config, "radius", {name = value})
	if same_name and same_name[".name"] ~= self.sid then
		return false, "Duplicate names are not allowed"
	end
	return self.dt:uciname(value)
end

function PortSecurity:DELETE_before_section_delete_hook()
	local list = {}
	self:table_foreach("dot1x", "port", function(s)
		if s.radius and s.radius == self.sid then
			table.insert(list, s[".name"])
		end
	end)
	if #list > 0 then
		self:add_critical_error(111, "RADIUS server is currently used by ports: "..table.concat(list, ", ")..". Configure a different server on them before deleting this one", self.sid)
	end
end

local test = PortSecurity:action("test", function(self)
	local data = self.arguments.data
	data.port = (type(data.port) == "string" and data.port ~= "") and data.port or "1812"
	local radius_test_bin = "/usr/sbin/radius_test"
	if not require("nixio.fs").access(radius_test_bin) then
		radius_test_bin = "/usr/local"..radius_test_bin
	end
	local response = util.file_exec(radius_test_bin, {
		"--address", data.ip,
		"--port", (data.port or "1812"),
		"--secret", data.secret,
		"--username", (data.username or "_"),
		"--password", (data.password or "_"),
		"--timeout", "2"
	})

	local status_code = "failed"
	local connected = false
	local credentials_ok = nil
	if response.stdout:match("message: code=2") then
		status_code = "access-accept"
		credentials_ok = true
		connected = true
	elseif response.stdout:match("message: code=3") then
		status_code = "access-reject"
		credentials_ok = false
		connected = true
	elseif response.code == 1 then
		status_code = "timed-out"
	end
	if not data.username then credentials_ok = nil end


	return self:ResponseOK({
		response = response.stdout,
		connected = connected,
		status = status_code,
		credentials_ok = credentials_ok
	})
end)

local test_password = test:option("password")
	test_password.maxlength = 112
local test_username = test:option("username")
	test_username.maxlength = 253
local test_secret = test:option("secret")
	test_secret.require = true
	test_secret.maxlength = 256
local test_address = test:option("ip")
	test_address.require = true
	function test_address:validate(value)
		return self.dt:ipaddr(value)
	end
local test_port = test:option("port")
	function test_port:validate(value)
		return self.dt:port(value)
	end

return PortSecurity
