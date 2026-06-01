local FunctionService = require("api/FunctionService")
local json = require("luci.jsonc")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")
local network = require("vuci.network").init()
local fs = require "nixio.fs"
local API_URL = "https://www.speedtest.net/api/js/servers?engine=js&limit=100&https_functional=true"
local SERVER_LIST = "/tmp/serverlist.json"
local STATUS_FILE = "/tmp/speedtest.json"

local SpeedTest = FunctionService:new()
function SpeedTest:POST_action_validate() end

SpeedTest.wan_info = nil

SpeedTest.ERR_CODES = {
	SERVER_LIST_ERROR = 1,
	STATUS_ERROR = 2,
	IP_ADDRESS_ERROR = 3,
	MISSING_URL = 4,
	PAGE_NOT_FOUND = 5
}

-- Resolve URL to IP address
---@return string ip Resolved IP adresss
---@return string | nil error Error message
function SpeedTest:resolve_ip(url)
	local con = require("socket").tcp()
	local wan = self:get_wan()
	if wan and wan.ip then
		con:bind(wan.ip, 0)
	end
	con:settimeout(1000)
	local port
	if string.match(url, ":") then
		url, port = string.match(url, "(.-):(%d+)")
	end
	local result = con:connect(url, tonumber(port) or 80)
	if not result then
		return nil, "Failed to resolve ip address."
	end
	local ip = con:getpeername()
	con:close()
	if not ip then
		return nil, "Failed to resolve ip address."
	end
	return ip
end

local refresh = SpeedTest:action("refresh", function (self)
	local arguments = self.arguments.data or {}
	local data = self:get_new_list(arguments.search)
	if not data then
		self:add_critical_error(self.ERR_CODES.SERVER_LIST_ERROR, "Failed to refresh server list.", "Speedtest")
	end
	return self:ResponseOK(data)
end)
	local opt_search = refresh:option("search")
		function opt_search:validate(value)
			return self.dt:string(value)
		end

local Start = SpeedTest:action("start", function (self, data)
	local wan_iface = (network:get_wandev() or {}).ifname
	util.ubus("speedtest", "run", { custom_url = data and data.url, iface = wan_iface }) 
	return self:ResponseOK("Speed test started.")
end)

local opt_url = Start:option("url")
	function opt_url:validate(value)
		return self.dt:url(value)
	end

local GetIP = SpeedTest:action("get_ip", function (self, data)
	if not data or not data.url then
		self:add_critical_error(self.ERR_CODES.MISSING_URL, "url field is missing.", "Speedtest")
	end
	local ip, err = self:resolve_ip(data.url)
	if not err then
		return self:ResponseOK(ip)
	end
	self:add_critical_error(self.ERR_CODES.IP_ADDRESS_ERROR, err, "Speedtest")
end)

local opt1_url = GetIP:option("url")
	function opt1_url:validate(value)
		return self.dt:url(value)
	end

-- Gets speed test server list from internet and saves it to file.
---@return boolean | table data Speed test server table or false if it fails.
function SpeedTest:get_new_list(search)
	local server_list = util.ubus("speedtest", "get_server_list", {search = search}) or {}
	local data = server_list.output
	if server_list.code ~= 0 or data == nil or data == "" then
		return false
	end
	data = json.parse(data)
	if not data then
		return false
	end

	if #data > 0 and not search then
		local server_list = io.open(SERVER_LIST, "w")
		fs.chmod(SERVER_LIST, "rw-rw-r--")
		fs.chown(SERVER_LIST, "", "speedtest")
		server_list:write(json.stringify(data))
		server_list:close()
	end
	return data
end

-- Reads saved speed test server list.
---@return boolean | table data Speed test server list or false if it fails.
function SpeedTest:read_server_list()
	local server_list = fs.readfile(SERVER_LIST)
	if not server_list or server_list == "" then
		return false
	end
	local data = json.parse(server_list)

	return data
end

-- Reads current speed test status file.
---@return boolean | table data Current speed test data or false if it fails.
function SpeedTest:get_status()
	local status = io.open(STATUS_FILE, "r")
	if status then
		local data = status:read("*all")
		status:close()
		if not data or data == "" then
			return false
		end
		local json_data = json.parse(data)
		if json_data and type(json_data) == "table" then
			for k, v in pairs(json_data) do
				json_data[k] = tostring(v)
			end
			return json_data
		end
	end
	return false
end

function SpeedTest:get_wan()
	if self.wan_info then return self.wan_info end
	local wan = network:get_wannet()
	local ret = {
		name = "-",
		ip = "-"
	}

	if wan then
		local is4 = network.protocol.is_4_6(wan)
		local wan_name = string.upper(wan.sid)
		local ip = network.protocol.ipaddr(wan)
		ret.name = is4 and string.sub(wan_name, 1, -3) or wan_name
		ret.ip = ip
	end
	self.wan_info = ret
	return ret
end

function SpeedTest:get_speedtest_config()
	local config = {isp = "-", ip = "-"}
	if util.file_exec("/bin/ping", {"1.1.1.1", "-c1"} ).code ~= 0 then
		return config
	end

	local speedtest_config = util.file_exec("/usr/bin/curl",
		{ "https://www.speedtest.net/speedtest-config.php" })

	if speedtest_config.code ~= 0 or not speedtest_config.stdout then
		return config
	end

	local client_line = string.match(speedtest_config.stdout, '<client.-/>') or ""
	local isp = string.match(client_line, 'isp="([^"]+)"')
	local ip = string.match(client_line, 'ip="([^"]+)"')
	if isp and isp ~= "" then config.isp = isp end
	if ip and ip ~= "" then config.ip = ip end
	return config
end

function SpeedTest:GET_TYPE_status()
	local status = self:get_status()
	if not status then
		status = {
			state = "NOT_RUNNING"
		}
	elseif status.state == "FINISHED" then
		fs.remove(STATUS_FILE)
	end
	local wan = self:get_wan()
	status.wan_name = wan.name
	status.wan_ip = wan.ip

	local params = {
		external_ip = true,
		isp = true
	}

	if self.query_parameters and self.query_parameters.exclude then
		for _, v in ipairs(util.split(self.query_parameters.exclude, ",")) do
			if params[v] ~= nil then
				params[v] = false
			end
		end
	end
	if params.external_ip or params.isp then
		local config = self:get_speedtest_config()
		if params.external_ip then status.external_ip = config.ip end
		if params.isp then status.isp = config.isp end
	end

	self:ResponseOK(status)
end

function SpeedTest:GET_TYPE_options()
	local servers = self:read_server_list() or self:get_new_list()
	if not servers then
		self:add_critical_error(self.ERR_CODES.SERVER_LIST_ERROR, "Failed to get server list.", "Speedtest")
	end
	if #servers > 0 and servers[1] and servers[1].host then
		local ip, err = self:resolve_ip(servers[1].host)
		if not err then
			servers[1]["ip"] = ip
		end
	end

	self:ResponseOK(servers)
end

return SpeedTest
