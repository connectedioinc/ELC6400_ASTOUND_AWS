local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local fs = require("nixio.fs")
local vpn = require("vuci.vpn")

local minidlna = ConfigService:new({ create = false, delete = false, general_section = "config" })

function minidlna:initialize_hook()
	self.ifaces = {}
end

function minidlna:get_ifaces()
	if #self.ifaces > 0 then return self.ifaces end

	local exclude = {"erspan0", "qmimux", "rmnet", "wwan", "radio", "lo", "miireg"}

	-- exclude wifi interfaces if they are in a bridge
	local wifi_ifaces = util.ubus("network.wireless", "status")
	for _, dev in pairs(wifi_ifaces) do
		for _, iface in pairs(dev.interfaces) do
			local networks = iface.config.network
			for _, nw in ipairs(networks or {}) do
				if self.uci:get("network", nw, "device") == "br-lan" then
					table.insert(exclude, iface.ifname)
					break
				end
			end
		end
	end
	for _, devname in pairs(vpn:get_network_devices()) do
		local ok = true
		for _, ex in ipairs(exclude) do
			if devname.ifname:match(ex) then
				ok = false
				break
			end
		end

		if ok then
			self.uci:foreach("network", "interface", function(section)
				if section.device == devname.ifname and section.proto and not util.contains(self.ifaces, devname.ifname) then
					table.insert(self.ifaces, devname.ifname)
					return false
				end
				if section[".name"] == devname.ifname and section.pdptype == "ip" and not util.contains(self.ifaces, devname.ifname) then
					table.insert(self.ifaces, devname.ifname)
				end
			end)
		end
	end

	return self.ifaces
end

local s = minidlna:section("minidlna", "minidlna")

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"interface"} }
		function enabled:validate(value) return self.dt:is_bool(value) end
		function enabled:set(value) self:table_set(self.config, self.sid, self.api_key, value == "1" and "1" or "0") end

	local port = s:option("port")
		port.cfg_require = true
		function port:validate(value) return self.dt:port(value) end

	local friendly_name = s:option("friendly_name")
		friendly_name.maxlength = 256
		function friendly_name:validate() return true end

	local root_container = s:option("root_container")
		function root_container:validate(value)
			return self.dt:check_array(value, {
				".", -- Standard Container
				"B", -- Browse Directory
				"M", -- Music
				"V", -- Video
				"P", -- Pictures
			})
		end

	local media_dir = s:option("media_dir", { list = true })
		media_dir.cfg_require = true
		function media_dir:validate(value)
			if self:table_get(self.config, self.sid, "enabled") == "1"
				and self.arguments.data.enabled == "0" then
				return true
			end
			local content_type, path = value:match("([^,]+),([^,]+)")
			if content_type then
				if fs.access(path) and (content_type == "A" or content_type == "V" or content_type == "P") then
					return true
				end
			else
				if fs.access(value) then
					return true
				end
			end
			return false, "Directory doesn't exist."
		end

	local album_art_names = s:option("album_art_names", { list = true })
		album_art_names.maxlength = 256
		function album_art_names:validate(value)
			return self.dt:fieldvalidation(value, "^[^/]+$")
		end
		function album_art_names:set(value)
			value = type(value) == "table" and table.concat(value, "/") or value
			self:table_set(self.config, self.sid, self.api_key, value)
		end
		function album_art_names:get()
			local names = self:table_get(self.config, self.sid, self.api_key)
			if names then
				return util.split(names, "/")
			end
			return nil
		end

	local interface = s:option("interface", { list = true })
		function interface:validate(value) return self.dt:check_array(value, self:get_ifaces()) end
		function interface:get(value)
			if not value then return end
			return util.split(value, ",")
		end
		function interface:set(value)
			if value == "" or #value == 0 then
				self:table_delete(self.config, self.sid, self.api_key)
				return
			end
			self:table_set(self.config, self.sid, self.api_key, table.concat(value, ","))
		end

	local inotify = s:option("inotify")
		function inotify:validate(value) return self.dt:is_bool(value) end

	local enable_tivo = s:option("enable_tivo")
		function enable_tivo:validate(value) return self.dt:is_bool(value) end
		function enable_tivo:set(value) self:table_set(self.config, self.sid, self.api_key, value == "1" and "1" or "0") end

	local strict_dlna = s:option("strict_dlna")
		function strict_dlna:validate(value) return self.dt:is_bool(value) end
		function strict_dlna:set(value) self:table_set(self.config, self.sid, self.api_key, value == "1" and "1" or "0") end

	local notify_interval = s:option("notify_interval")
		function notify_interval:validate(value) return self.dt:uinteger(value) end


function minidlna:GET_TYPE_status()
	local status = util.ubus("dlna", "get_status")
	if status then
		status.running = true
		for i = #status.clients, 1, -1 do
			local client = status.clients[i]
			if client.ip == "127.0.0.1" then
				table.remove(status.clients, i)
			end
		end
	else
		status = { running = false }
	end
	return self:ResponseOK(status)
end

function minidlna:GET_TYPE_options()
	self.ifaces = self:get_ifaces()
	self:ResponseOK({available_interfaces = self.ifaces})
end

return minidlna
