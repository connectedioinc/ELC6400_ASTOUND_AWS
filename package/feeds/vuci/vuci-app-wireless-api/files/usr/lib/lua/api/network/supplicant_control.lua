#!/usr/bin/lua
local socket = require("socket.unix").dgram()
local fs = require "nixio.fs"
local socket_path = "/var/run/wpa_supplicant/"

local function connect(iface)
	socket:settimeout(10)
	return pcall(function() socket:connect(socket_path .. iface) end)
end

local function usage()
	print("Usage: supplicant_control <command> <interface>")
end

if #arg ~= 2 then
	usage()
	return 1
end

local command, interface = arg[1], arg[2]

if fs.access(socket_path .. interface) then
	if connect(interface) then
			socket:send(command)
			socket:close()
	end
else
	print(string.format("Interface socket does not exist at: /var/run/wpa_supplicant/%s", interface))
end
