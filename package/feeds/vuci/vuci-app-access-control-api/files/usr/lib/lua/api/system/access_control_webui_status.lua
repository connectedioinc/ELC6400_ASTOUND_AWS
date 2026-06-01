local FunctionService = require("api/FunctionService")
local pac = require("vuci.package_checker")
local uci = require("vuci.uci").cursor()
local fs = require("nixio.fs")
local ac_util = require("api.system.access_control_utils")

local WEBUI_STATUS = FunctionService:new()

function WEBUI_STATUS:GET()
	local resp = {}

	local services = {
		["HTTP"] = {
			installed = true,
			data = function (opt)
				return uci:get("uhttpd", "main", opt)
			end,
			enabled_opt = "enable_http",
			local_opt = "enable_local_http",
			port_opt = "listen_http",
		},
		["HTTPS"] = {
			installed = true,
			data = function (opt)
				return uci:get("uhttpd", "main", opt)
			end,
			enabled_opt = "enable_https",
			local_opt = "enable_local_https",
			port_opt = "listen_https",
		},
		["SSH"] = {
			installed = true,
			data = function (opt)
				return uci:get("dropbear", "@dropbear[0]", opt)
			end,
			enabled_opt = "enable",
			local_opt = "local_access",
			port_opt = "Port",
		},
		["CLI"] = {
			installed = true,
			data = function (opt)
				return uci:get("cli", "status", opt)
			end,
			enabled_opt = "enable",
			local_opt = "enable_local_access",
			port_opt = "port",
		},
		["Telnet"] = {
			installed = pac.is_installed("vuci-app-telnet-api"),
			data = function (opt)
				return uci:get("telnetd", "@telnetd[0]", opt)
			end,
			enabled_opt = "enable",
			local_opt = "enable_local_access",
			port_opt = "port",
		}
	}

	for service, opt in pairs(services) do
		if opt.installed then
			local data = {
				lan = (opt.data(opt.local_opt) or opt.data(opt.enabled_opt)) == "1",
				port = opt.data(opt.port_opt)
			}
			if ac_util.has_wan then
				data.wan = opt.data("_" .. string.lower(service) .. "WanAccess") == "1"
				data.wan_port = opt.data("wan_" .. string.lower(opt.port_opt)) or data.port
			end
			resp[service] = data
		end
	end

	return self:ResponseOK(resp)
end

function WEBUI_STATUS:GET_TYPE_certificate()
	local res = {}
	local https_enabled = uci:get("uhttpd", "main", "enable_https") == "1"
	if not https_enabled then
		self:add_critical_error(1, "HTTPS is not enabled", "Validation")
	end

	local cert_path = uci:get("uhttpd", "main", "cert") or ac_util.DEFAULT_CERT
	if cert_path == ac_util.DEFAULT_CERT and fs.access(ac_util.DEFAULT_CA_CERT) then
		local ca_cert_data = {
			cert = ac_util.DEFAULT_CA_CERT,
			expires = ac_util.get_cert_expire_date(ac_util.DEFAULT_CA_CERT)
		}
		table.insert(res, ca_cert_data)
	end

	if fs.access(cert_path) then
		local cert_data = {
			cert = cert_path,
			expires = ac_util.get_cert_expire_date(cert_path)
		}
		table.insert(res, cert_data)
	end
	return self:ResponseOK(res)
end

return WEBUI_STATUS
