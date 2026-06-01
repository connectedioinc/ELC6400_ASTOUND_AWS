local fs = require "nixio.fs"
local util = require("vuci.util")
local has_wifi = require("vuci.board"):has_wifi()

if not fs.access("/etc/config/multi_wifi") or not has_wifi then
	return nil
end

local ConfigService = require("api/ConfigService")

local multi_access_points = ConfigService:new({ increment_name = true })

function multi_access_points:UPLOAD_init()
	local function handle_request(upload_request)
		upload_request.files[1].location = "/tmp/multi_ap_list.txt"
		return true
	end
	local function list_files_to_delete()
		return {}
	end

	return { handle_request = handle_request, list_files_to_delete = list_files_to_delete }
end

function multi_access_points:UPLOAD_after_upload_hook(upload_request)
	local uci = self.uci
	local new_cfg
	local number = 0
	local newly_created = {}
	local uploaded = "/tmp/multi_ap_list.txt"
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "network", 0644)

	local function next_id()
		local id = 0
		uci:foreach("multi_wifi", nil, function (s)
			local sid = tonumber(s[".name"])
			if sid then id = math.max(id, sid) end
		end)
		return tostring(id + 1)
	end

	if not fs.access(uploaded) then
		return self:add_critical_error(1, "Unexpected error: uploaded file disappeared", "file")
	end

	uci:foreach("multi_wifi", "wifi-iface", function(s)
		if tonumber(s.priority) and tonumber(s.priority) > number then
			number = tonumber(s.priority)
		end
	end)

	local f = io.open(uploaded, "r")
	local list_ap = f:read("*all")
	f:close()
	list_ap = list_ap:gsub("\r\n", "\n")
	local skip = false
	local valid = false
	for name, value in list_ap:gmatch("([%w%.%-%+_]+)%:%s*(.-)\n") do
		if name then
			if name == "ssid" then
				valid = true
				skip = false
				local ok, err = self.dt:max_bytes(value, 32)
				if not ok then
					skip = true
					self:add_error(STD_CODES.INVALID_OPT, err, "ssid: " .. value)
				else
					new_cfg = uci:section("multi_wifi", "wifi-iface", next_id(), {
						ssid = value,
						enabled = "1"
					})
					table.insert(newly_created, new_cfg)
				end
			elseif not skip and name == "enable" and new_cfg then
				local ok, err = self.dt:is_bool(value)
				if not ok then
					self:add_error(STD_CODES.INVALID_OPT, err, "enable: " .. value)
					skip = true
					uci:delete("multi_wifi", new_cfg)
				else
					uci:set("multi_wifi", new_cfg, "enabled", value:match("[01]"))
				end
			elseif not skip and name == "key" and new_cfg then
				if #value >= 8 and #value <= 64 then
					uci:set("multi_wifi", new_cfg, "key", value)
				else
					skip = true
					uci:delete("multi_wifi", new_cfg)
					self:add_error(STD_CODES.INVALID_OPT, "Length of value must be from 8 to 64", "key: " .. value)
				end
			end
		end
	end

	uci:foreach("multi_wifi", "wifi-iface", function(s)
		if not s.enabled then
			uci:set("multi_wifi", s[".name"], "enabled", "0")
		end
		if not s.priority then
			uci:set("multi_wifi", s[".name"], "priority", tostring(number+1))
			number = number + 1
		end
	end)
	fs.remove(uploaded)
	if not valid then
		return self:add_critical_error(2, "Invalid file format - no ssid found.", "file")
	end
	self:return_if_error()
	uci:commit("multi_wifi")

	local new_ifaces = {}
	for _, ap in pairs(newly_created) do
		local iface = uci:get_all("multi_wifi", ap)
		if iface then
			iface[".anonymous"] = nil
			iface[".type"] = nil
			iface["id"] = iface[".name"]
			iface[".name"] = nil
			new_ifaces[#new_ifaces+1] = iface
		end
	end
	return self:ResponseOK(new_ifaces)
end

multi_access_points.order_by = "priority"

local s = multi_access_points:section("multi_wifi", "wifi-iface")
s.create_defaults = function (self)
	local max_prio = 0
	self:table_foreach("multi_wifi", "wifi-iface", function (s)
		local prio_num = tonumber(s.priority)
		if prio_num and prio_num > max_prio then
			max_prio = prio_num
		end
	end)
	return {
		priority = tostring(max_prio + 1)
	}
end

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"ssid", "priority"} }
		function enabled:validate(value) return self.dt:is_bool(value) end

	local ssid = s:option("ssid")
		function ssid:validate(value) return self.dt:max_bytes(value, 32) end

	local key = s:option("key", { sensitive = true })
		key.minlength = 8
		key.maxlength = 64
		function key:validate() return true end

	local priority = s:option("priority")
		priority.cfg_require = true
		function priority:validate(value) return self.dt:uinteger(value) end

return multi_access_points
