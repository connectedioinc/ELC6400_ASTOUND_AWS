local ConfigService = require("api/ConfigService")
local fs = require("nixio.fs")
local util = require("vuci.util")

local TincHost = ConfigService:new()

local s = TincHost:section("tinc", function(self) return "tinc-host_" .. self.binding end)

s:make_primary()
s.default_options.id.maxlength = 8
function s:create_defaults()
	return {
		net = self.binding
	}
end

function s:filter(s)
	return s.net == self.binding
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

	local enabled = s:option("enabled")
	enabled.require = { ["1"] = { "publickeyfile" } }
		function enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local address = s:option("address", { list = true })
		function address:validate(value)
			local valid, err = self.dt:host(value)
			local valid2, err2 = self.dt:hostipport(value)
			if not valid and not valid2 then return false, err .. " or " .. err2 end
			return true
		end

	local description = s:option("description")
		function description:validate(value)
			return self.dt:string(value)
		end

	local subnet = s:option("subnet", { list = true })
		function subnet:validate(value)
			local valid, err = self.dt:ipmask(value)
			local valid2, err2 = self.dt:macaddr(value)
			if not valid and not valid2 then return false, err .. " or " .. err2 end
			return true
		end

	local public_key = s:option("publickeyfile", { certificate = {
		upload_only = true,
		instance = TincHost.binding
	} })
	public_key.file_size = 1024*1024*16


	local net = s:option("net")
	net.readonly = true

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function TincHost:DELETE_before_section_delete_hook()
	local net = self:table_get(self.main_config, self.sid, "net")
	local connectto = self:table_get(self.main_config, net, "connectto")
	if connectto and connectto ~= "" then
		for i, v in ipairs(connectto) do
			if v == self.sid then
				table.remove(connectto, i)
				break
			end
		end
		self:table_set(self.main_config, net, "connectto", connectto)
	end

	local uploaded_files = fs.glob("/etc/vuci-uploads/cbid.tinc." .. self.sid .. ".*")
	if uploaded_files then
		for uploaded_file in uploaded_files do
			fs.remove(uploaded_file) -- remove section uploaded files
		end
	end
end

function TincHost:UPLOAD_after_upload_hook(upload_request)
	local v_table = upload_request.parameters
	local path = upload_request.files[1].location
	if v_table.option == "publickeyfile" and fs.access(path) then
		local exist = false
		self:table_foreach(self.main_config, "tinc-host_" .. self.binding, function(c)
			if self.sid == c[".name"] then exist = true end
		end)
		if not exist then
			os.remove(path)
			self:add_critical_error(STD_CODES.INVALID_SID_USAGE, "Configuration " .. self.sid .. " does not exist. Please create an instance first", "Validation")
		end
		if util.file_exec("/usr/bin/openssl", {"pkey", "-pubin", "-in", path, "-text", "-noout"}).code == 1 then
			os.remove(path)
			self:add_critical_error(2, "Incorrect file uploaded.", "Upload")
		end
	end
	return { path = path }
end

function TincHost:POST_validate_section_hook()
	local vpn_count = 0
	self:table_foreach(self.main_config, "tinc-host_" .. self.binding, function(sec)
		if sec.net == self.binding then
			vpn_count = vpn_count + 1
		end
	end)
	if vpn_count > 19 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Maximum number of Tinc hosts has been reached", "Validation")
	end
end

return TincHost
