local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local fs = require("nixio.fs")

local RMS_DC_FILE = "/tmp/rms_disconnecting"
local RMS_DC_TIMEOUT = 15

local rms = ConfigService:new({ create = false, delete = false })

function rms:is_disconnecting()
	local dc_start_time = fs.readfile(RMS_DC_FILE)
	if not dc_start_time then return false end
	return (os.time() - tonumber(dc_start_time)) < RMS_DC_TIMEOUT
end

function rms:GET_TYPE_status()
	local uci = require("uci").cursor()
	local hw = require("vuci.hardware").init(uci)
	local mnf = hw:get_mnf()
	local md = require("vuci.modem")

	local rms_status = uci:get("rms_mqtt", "rms_connect_mqtt", "enable")
	local serial_nbr, mac_imei
	local router_name = mnf:get_name()
	if router_name and router_name:match("^TRB") then
		serial_nbr = mnf:get_sn()
		local all_modems = md:get_all_modems()
		local md_id = all_modems[1] and all_modems[1].id or nil
		mac_imei = md:get_imei(md_id)
	elseif router_name and not router_name:match("^TRB") then
		serial_nbr = mnf:get_sn()
		local m = mnf:get_mac()
		if m then mac_imei = (string.upper(m)):gsub(("."):rep(2), "%1:"):sub(1, -2) end
	end

	local output = util.ubus("rms", "get_status")
	local conn = false
	if output then
		local upcoming_try = tonumber(output.next_retry) - tonumber(os.time())
		if upcoming_try < 0 then -- because it can go negative because of slow response time
			upcoming_try = 0
		end
		-- this means rms is connecting and ubus does not have proper data yet
		if (output.connection_status == 1 or output.connection_status == 2) and (output.error_code == -1 or output.error_code == 0) then
			output.connection_status = "2"
			output.error_text = nil
			output.message = "Connecting"
			conn = true
		end
		if tostring(output.connection_status) == "2" or tostring(output.connection_status) == "0" then
			if self:is_disconnecting() then
				conn = true
				output.connection_status = "3"
				output.message = "Disconnecting"
			end
		end
		self:ResponseOK({
			status = rms_status,
			serial_nbr = serial_nbr,
			lan_mac = mac_imei,
			connection_state = tostring(output.connection_status),
			error_text = output.error_text,
			next_try = tostring(upcoming_try),
			error_code = conn ~= true and tostring(output.error_code) or nil,
			error = conn ~= true and tostring(output.error) or "0",
			msg = conn == true and output.message or nil
		})
	else
		-- there is gap between status change and service startup until ubus has response, that's why this is needed.
		if rms_status == "1" then
			local response = {
				status = rms_status,
				serial_nbr = serial_nbr,
				lan_mac = mac_imei,
				msg = "Connecting",
				next_try = "0",
				connection_state = "2",
				error = "0"
			}
			if self:is_disconnecting() then
				response.connection_state = "3"
				response.msg = "Disconnecting"
			end
			self:ResponseOK(response)
		end
		self:ResponseOK({
			status = rms_status,
			serial_nbr = serial_nbr,
			lan_mac = mac_imei
		})
	end
end

local s = rms:section("rms_mqtt", "rms_connect_mqtt")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enable = s:option("enable")
	enable.require = {["1"] = {"remote", "port"}, ["2"] = {"remote", "port"}}
		function enable:validate(value)
			return self.dt:irange(value, 0, 2)
		end

	local remote = s:option("remote")
		function remote:validate(value)
			return self.dt:host(value)
		end

	local port = s:option("port")
		function port:validate(value)
			return self.dt:port(value)
		end

	s:option("auth_code")

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

rms:action("connect", function (self)
	os.remove(RMS_DC_FILE)
	util.ubus("rc", "init", { name = "rms_mqtt", action = "restart" })
	self:ResponseOK()
end)

rms:action("unregister", function (self)
	for filename in fs.glob("/log/*rms_id") do
		fs.writefile(filename, "")
	end
	self.uci:set("rms_mqtt", "rms_mqtt", "rms_id", "")
	self.uci:set("rms_mqtt", "rms_mqtt", "demo_rms_id", "")
	self.uci:set("rms_mqtt", "rms_mqtt", "local_rms_id", "")

	local ca_file = self.uci:get("rms_mqtt", "rms_mqtt", "ca_file")
	local cert_file = self.uci:get("rms_mqtt", "rms_mqtt", "cert_file")
	local key_file = self.uci:get("rms_mqtt", "rms_mqtt", "key_file")
	if ca_file then os.remove(ca_file) end
	if cert_file then os.remove(cert_file) end
	if key_file then os.remove(key_file) end

	self.uci:set("rms_mqtt", "rms_connect_mqtt", "auth_code", "")

	if self.uci:has_changes("rms_mqtt") then
		self:commit("rms_mqtt")
	else
		util.ubus("rc", "init", { name = "rms_mqtt", action = "restart" })
	end

	fs.writefile(RMS_DC_FILE, tostring(os.time()))
	self:ResponseOK()
end)

return rms
