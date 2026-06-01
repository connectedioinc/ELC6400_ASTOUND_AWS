local utils = {}
local util = require("vuci.util")
local io = require("vuci.io")
local board = require("vuci.board")
local mdm = require("vuci.modem")

function utils.is_acl_active()
	for _, io_info in ipairs(io:ioman_info()) do
		if io_info.type == "acl" and io_info.state == "active" then
			return true
		end
	end
	return false
end

function utils.list_available_tavl_names(include_hdop)
	local tavl_names = {}
	if board:has_mobile() then
		table.insert(tavl_names, "signal")
	end
	if board:has_gps() and include_hdop then
		table.insert(tavl_names, "HDOP")
	end

	if board:has_ios() then
		local ios = io:ioman_list() or {}

		for _, ubus_name in ipairs(ios) do
			local io_type, io_name = io:split_ubus_name(ubus_name)
			local include_io = true
			if io_type == "relay" then
				include_io = false
			elseif io_type == "gpio" then
				local status = util.ubus(ubus_name, "status")
				include_io = not status.bi_dir and status.direction == "in"
			end

			if include_io then
				table.insert(tavl_names, io_name)
			end
		end
	end

	return tavl_names
end

function utils.get_tavl_type(name)
	if name == "signal" then
		return "mobile"
	end
	if name == "HDOP" then
		return "GPS"
	end

	local ios = io:ioman_list()
	if not ios then
		return "unknown"
	end

	for _, ubus_name in ipairs(ios) do
		local io_type, io_name = io:split_ubus_name(ubus_name)
		if io_name == name then
			return io_type
		end
	end

	return "unknown"
end

function utils.has_wwan_gnss_conflict()
	for modem in mdm:info_iterator() do
		if modem.wwan_gnss_conflict then
			return true
		end
	end

	return false
end

return utils
