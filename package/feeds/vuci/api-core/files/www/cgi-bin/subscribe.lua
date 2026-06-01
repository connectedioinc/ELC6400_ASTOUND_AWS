#!/usr/bin/lua

local function no_access()
	io.stdout:write("Status: 403 Forbidden\r\n")
	io.stdout:write("Cache-Control: no-cache\r\n")
	io.stdout:write("X-Accel-Buffering: no\r\n\r\n")
	io.stdout:flush()
end

local function server_error()
	io.stdout:write("Status: 500 Internal Server Error\r\n")
	io.stdout:write("Cache-Control: no-cache\r\n")
	io.stdout:write("X-Accel-Buffering: no\r\n\r\n")
	io.stdout:flush()
end

local function send_ok()
	io.stdout:write("Status: 200 OK\r\n")
	io.stdout:write("Content-Type: text/event-stream\r\n")
	io.stdout:write("Connection: keep-alive\r\n")
	io.stdout:write("Cache-Control: no-cache\r\n")
	io.stdout:write("X-Accel-Buffering: no\r\n\r\n")
	io.stdout:flush()
end

local MAX_BUFFER_SIZE = 10
local event_id_counter = 0
local event_buffer = {}
local keepalive_timer = nil

local csrf = os.getenv("HTTP_X_CSRF_PROTECTION")
local last_event_id = os.getenv("HTTP_X_LAST_EVENT_ID")
if not csrf or csrf == "" then return no_access() end

local disp_common = require("api.dispatcher_common")
local cookie = disp_common:parse_cookie_header(os.getenv("HTTP_COOKIE"))
if not cookie or not cookie.token or cookie.token == "00000000000000000000000000000000" then return no_access() end

local util = require("vuci.util")
local session = util.ubus("session", "get", { ubus_rpc_session = cookie.token })
if not session then return no_access() end

local ubus = require("ubus")
local uloop = require("uloop")
local json = require("luci.jsonc")
local uci = require("uci").cursor()

local con = nil
local timeout = tonumber(uci:get("uhttpd", "main", "script_timeout")) or 30
local check_interval = math.max(5, math.floor(timeout / 30)) * 1000

function refresh_timeout()
	io.stdout:write("\n")
	if not io.stdout:flush() then
		os.exit(1)
	end
end

-- Sends event to event stream
---@param name string Event name
---@param data any Event data
local function send_event(name, data)
	last_event_time = os.time()
	event_id_counter = event_id_counter + 1
	local event_id = tostring(event_id_counter)
	local payload = {
		event = name,
		data = data,
	}
	io.stdout:write("id: " .. event_id .. "\r\n")
	io.stdout:write("data: ")
	io.stdout:write(json.stringify(payload) or "")
	io.stdout:write("\r\n\r\n")

	if not io.stdout:flush() then
		os.exit(1)
	end
	table.insert(event_buffer, {
		id = event_id,
		payload = payload
	})
	if #event_buffer > MAX_BUFFER_SIZE then
		table.remove(event_buffer, 1)
	end
	refresh_timeout()
end

local function connect_ubus()
	if con then con:close() end

	con = ubus.connect()
	if not con then return server_error() end

	con:listen({
		["mctl.modem_state"] = function (data)
			send_event("modem_state", {
				modem_id = data.usb_id,
				state_id = data.state
			})
		end,
			["esim.state"] = function (data)
					send_event("esim", {
							modem_id = data.modem_id,
							event_id = data.event_id,
							status = data.status
					})
			end,
			["esim.cache_update"] = function (data)
					send_event("esim", {
							modem_id = data.modem_id,
							event_id = data.event_id
					})
			end,
			["esim.uci_cfg_deleted"] = function (data)
					send_event("esim", {
							modem_id = data.modem_id,
							event_id = 103,
							iccid = data.iccid
					})
			end,
			["gsm.fota_state"] = function(data)
					send_event("dfota_state", {
							modem_id = data.modem_id,
							percent = data.percent,
							state_id = data.state_id
					})
			end,
			["gsm.modem_gone"] = function (data)
					send_event("esim", {
							modem_id = data.modem_id,
							event_id = 6,
							status = 14
					})
			end,
			["vuci.notify"] = function(data)
					send_event(data.event, data.data)
			end
	})
end

local function keep_connection_alive()
	refresh_timeout()
	keepalive_timer:set(check_interval)
end

uloop.init()
send_ok()
-- Resend missed events based on last_event_id
if last_event_id then
	local start_index = 1
	while start_index <= #event_buffer and event_buffer[start_index].id <= last_event_id do
		start_index = start_index + 1
	end
	if start_index <= #event_buffer then
		for i = start_index, #event_buffer do
			local ev = event_buffer[i]
			io.stdout:write("id: " .. ev.id .. "\r\n")
			io.stdout:write("data: " .. json.stringify(ev.payload) .. "\r\n\r\n")
		end
		io.stdout:flush()
	end
end
connect_ubus()
keepalive_timer = uloop.timer(keep_connection_alive)
keepalive_timer:set(check_interval)
uloop.run()
