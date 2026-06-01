local Base = require("api/BaseEndpoint")
local fs = require("nixio.fs")
local responder = require("api.responder")
local util = require("vuci.util")

local info = Base:new()

local function validate_force_get(method)
	if method ~= "GET" then
        responder.err_resp:new()
        :add_error(STD_CODES.INCORRECT_REQUEST, "HTTP method not supported for this endpoint, please use GET" , "Request")
        :code("501"):yield()
	end
end

function info:initialize_method()
	validate_force_get(self.request_method)
	local uci = require("vuci.uci").cursor()
	local res = util.ubus("mnfinfo", "get")
	local dev_name = uci:get("system", "system", "devicename")
	local device_model = res and res.mnfinfo and string.sub(res.mnfinfo.name, 1, 6) or "N/A"
	local lang = uci:get("vuci", "main", "lang") or "en"
	local filename = nil
	if lang ~= "en" then
		local PATH_FILES = {
			"/www/i18n/" .. lang .. "*.json.gz",
			"/usr/local/www/i18n/" .. lang .. "*.json.gz"
		}
		for _, path_pattern in pairs(PATH_FILES) do
			for path in fs.glob(path_pattern) do
				filename = fs.basename(path)
			end
		end
	end
	-- TODO add available version list
	-- TODO update script update api version when releasing new latest version
	local data = {
		device_name = dev_name or "N/A",
		device_model = device_model,
		lang = lang,
		filename = filename,
		api_version = "1.13.1",
		device_identifier = uci:get("vuci", "main", "device_identifier") or "-"
	}
	if uci:get("system", "banner", "enabled") == "1" then
		data.security_banner = {
			title = uci:get("system", "banner", "title"),
			message = uci:get("system", "banner", "message")
		}
	end
	responder.ok_resp:new()
	:set_data(data):yield()
end

return info
