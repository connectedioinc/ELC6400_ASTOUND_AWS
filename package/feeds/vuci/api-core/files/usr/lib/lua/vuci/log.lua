local util = require("vuci.util")

local Log = {}

local log_table = {
	-- Local facilities that will be put into database
	["events"] = "local0",
	["system"] = "local1",
	["network"] = "local2",
	["connections"] = "local3",
}

local event_priority = {
	["emerg"] = 0,
	["alert"] = 1,
	["crit"] = 2,
	["err"] = 3,
	["warning"] = 4,
	["notice"] = 5,
	["info"] = 6,
	["debug"] = 7
}

function Log:insert_eventslog(log_info)
	if not log_info then
		error("missing log info object")
	end
	if log_info and not log_info.table then
		error("missing log table name")
	end
	if log_info and not log_info.sender then
		error("missing log sender info")
	end
	if log_info and not log_info.priority then
		error("missing log priority info")
	end
	if log_info and not log_info.text then
		error("missing log text")
	end
	if not log_table[log_info.table] then
		error("invalid log table")
	end
	if not event_priority[log_info.priority] then
		error("invalid log priority")
	end
	local facility = log_table[log_info.table]
	local priority = event_priority[log_info.priority]

	return util.file_exec("/usr/bin/logger", {
		"-t", log_info.sender, "-p", string.format("%s.%s", facility, priority),
		log_info.text
	})
end

return Log
