local ConfigService = require("api/ConfigService")
local util = require "vuci.util"
local fs = require("nixio.fs")

local ENTRIES_LIMIT = 1000

local webfilter_hostnames = ConfigService:new({ anonymous = true })

function webfilter_hostnames:get_random_uuid()
	return string.gsub(util.trim(fs.readfile("/proc/sys/kernel/random/uuid")), "-", "")
end

function webfilter_hostnames:validate_host(value)
	local msg = "Domain names with an optional wildcard (*) at the start are accepted. E.g. example.com or *.example.com ."
	local arr = util.split(value, "*.")
	if #arr > 2 then
		return false, "There can only be one wildcard (*) located at the start of the hostname."
	end
	if #arr == 2 then
		if not value:match("^%*%.") then
			return false, "Wildcard (*) can only be located at the start of the hostname."
		else
			local ok = self.dt:hostname(value:sub(3))
			return ok, msg
		end
	end
	local ok = self.dt:hostname(value)
	return ok, msg
end

function webfilter_hostnames:UPLOAD_init()
	local function handle_request(upload_request)
		upload_request.files[1].location = "/tmp/site_blocking_hosts"
		return true
	end

	local function list_files_to_delete()
		return {}
	end

	return { handle_request = handle_request, list_files_to_delete = list_files_to_delete }
end

local hostblock_block_config = [=[
config block '%s'
	option enabled '1'
	option host '%s'

]=]

function webfilter_hostnames:check_add_sections(count)
	local uci_count = 0
	self.uci:foreach("hostblock", "block", function(_)
		uci_count = uci_count + 1
	end)
	if (count + uci_count) > ENTRIES_LIMIT then
		self:add_error(STD_CODES.NO_SPACE, string.format("Cannot create more than %s sections",  ENTRIES_LIMIT))
	end
end

function webfilter_hostnames:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location

	local h = io.open(path, "r")
	if not h then
		return self:add_critical_error(1, "Error while uploading the file.", "file")
	end
	local t = h:read("*all")
	h:close()
	os.remove(path)

	local trimmed_lines = {}
	for _, line in ipairs(util.split(t)) do
		line = util.trim(line)
		if line ~= "" then
			local valid, msg = self:validate_host(line)
			if not valid then
				self:add_error(STD_CODES.INVALID_OPT, msg, "host: " .. line)
			end
			trimmed_lines[#trimmed_lines+1] = line
		end
	end
	self:check_add_sections(#trimmed_lines)
	self:return_if_error()

	local config = io.open("/etc/config/"..self.main_config, "a")
	if not config then return self:add_critical_error(STD_CODES.CONF_ERROR, "Could not open "..self.main_config.." configuration") end
	local new_sections = {}
	for _, line in ipairs(trimmed_lines) do
		local new_section = {
			[".type"] = "block",
			id = self:get_random_uuid(),
			enabled = "1",
			host = line,
		}
		config:write(string.format(hostblock_block_config , new_section.id, new_section.host))
		new_sections[#new_sections+1] = new_section
	end
	config:close()
	util.ubus("rc", "init", { action = "reload", name = "hostblock" })

	return self:ResponseCreated(new_sections)
end

function webfilter_hostnames:DELETE_before_section_delete_hook()
	local phost = self:table_get(self.config, self.sid, "phost") or ""
	local host = self:table_get(self.config, self.sid, "host") or ""
	if host == "" and phost == "" then return end
	self:table_foreach(self.config, "block", function(s)
		if phost ~= "" and phost == s.host then
			self:table_set(self.config, s[".name"], "ncname", "1")
		end
		if host ~= "" and host == s.phost then
			self:table_delete(self.config, s[".name"])
		end
	end)
end

function webfilter_hostnames:initialize_hook()
	self.modified_sections = {}
end

function webfilter_hostnames:PUT_section_init_hook()
	self.modified_sections[self.sid] = true
end

function webfilter_hostnames:PUT_before_commit_hook()
	for sid in pairs(self.modified_sections) do
		local enabled_new = self:table_get(self.config, sid, "enabled")
		local enabled_old = self.uci:get(self.config, sid, "enabled")
		local host = self:table_get(self.config, sid, "host")
		local host_old = self.uci:get(self.config, sid, "host")
		if host ~= host_old then
			self:table_foreach(self.config, "block", function(s)
				if s.phost and s.phost == host_old then
					self:table_delete(self.config, s[".name"])
				end
			end)
		elseif enabled_old ~= enabled_new then
			self:table_foreach(self.config, "block", function(s)
				if s.phost and s.phost == host then
					self:table_set(self.config, s[".name"], "enabled", enabled_new)
				end
			end)
		end
	end
end

local s = webfilter_hostnames:section("hostblock", "block")

	function s:create_defaults()
		self:check_add_sections(1)
		return {}
	end

	local enabled = s:option("enabled")
		function enabled:validate(value)
			local phost = self:table_get(self.config, self.sid, "phost")
			local enabled = self:table_get(self.config, self.sid, "enabled")
			if phost and enabled ~= value then
				return false, "Can not enable/disable child entry"
			end
			return self.dt:is_bool(value)
		end

	local host = s:option("host")
		function host:validate(value)
			local phost = self:table_get(self.config, self.sid, "phost")
			local host = self:table_get(self.config, self.sid, "host")
			if phost and host ~= value then
				return false, "Can not change host of child entry"
			end
			return self:validate_host(value)
		end

	local phost = s:option("phost")
	phost.readonly = true

return webfilter_hostnames
