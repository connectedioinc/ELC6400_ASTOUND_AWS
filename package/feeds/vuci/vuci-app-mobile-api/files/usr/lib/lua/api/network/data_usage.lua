local FunctionService = require("api/FunctionService")
local md = require("vuci.modem")
local modem_count = md:modem_count()
local mdcollect = require("vuci.mdcollect")
local board = require("vuci.board")

if modem_count == 0 then
	return nil
end

local DataUsage = FunctionService:new()

-- Response error codes
---@enum ERR_CODES
DataUsage.ERR_CODES = {
	MODEM_NOT_FOUND = 1,
	SIM_NOT_FOUND = 2
}

local function get_esim_ifaces(modem_id, esim)
	local uci = require("vuci.uci")
	local esim_ifaces = {}
	local normalized_esim = tostring((tonumber(esim) or 1) - 1)
	uci:foreach("network", "interface", function(s)
		if s.modem ~= modem_id then return end
		if not md:is_card_esim(modem_id, s.sim) then return end
		if normalized_esim ~= (s.esim_profile or "0") then return end
		table.insert(esim_ifaces, s[".name"])
	end)
	return esim_ifaces
end

-- Returns data usage information for specified values
---@param modem_id string|nil Modem usb id (3-1, 1-1.2...)
---@param sim string|nil SIM number (1, 2...)
---@param interval mdcollect.INTERVALS Returned data interval
---@return table used_data Used data for specific interval
function DataUsage:get_usage(modem_id, sim, interval)
	local graph_points = {}
	if self.esim_data_usage then
		graph_points = mdcollect:get_usage_raw(nil, nil, get_esim_ifaces(modem_id, sim), nil, interval, true, self.range)
	else
		graph_points = mdcollect:get_usage_raw(modem_id, sim, nil, nil, interval, true, self.range)
	end

	if interval ~= mdcollect.INTERVALS.DAY and interval ~= mdcollect.INTERVALS.HOUR then
		graph_points = mdcollect:aggregate_data(graph_points, mdcollect.INTERVALS.DAY)
	else
		graph_points = mdcollect:aggregate_data(graph_points, mdcollect.INTERVALS.HOUR)
	end

	return graph_points or {}
end

function DataUsage:GET_data_usage()
	if self.modem_id then
		local ok, err = self.dt:check_modem(self.modem_id)
		if not ok then
			return self:add_critical_error(self.ERR_CODES.MODEM_NOT_FOUND, err, "URL", HTTP_STATUS_CODES.NOT_FOUND)
		end
		if self.sim_position then
			local uci = require("vuci.uci")
			local ok = false
			uci:foreach("simcard", "sim", function(s)
				if s.modem == self.modem_id and s.position == self.sim_position then
					ok = true
					return false
				end
			end)
			if not ok then
				return self:add_critical_error(
					self.ERR_CODES.SIM_NOT_FOUND,
					("SIM '%s' not found for '%s' modem."):format(self.sim_position, self.modem_id),
					"URL", HTTP_STATUS_CODES.NOT_FOUND
				)
			end
		end
	end

	self:ResponseOK(self:get_usage(self.modem_id, self.sim_position, self.interval))
end

function DataUsage:get_custom_range()
	if self.interval ~= mdcollect.INTERVALS.CUSTOM then return end
	if not self.query_parameters then return end
	local from, to = self.query_parameters.from, self.query_parameters.to
	if not from or not to then return end
	local ok, err = self.dt:uinteger(from)
	if not ok then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "Query") end
	ok, err = self.dt:uinteger(to)
	if not ok then self:add_critical_error(STD_CODES.INVALID_QUERY, err, "Query") end
	return { from = tonumber(from), to = tonumber(to) }
end

-- Adds endpoints for intervals
for _, interval in pairs(mdcollect.INTERVALS) do
	DataUsage["GET_TYPE_"..interval] = function (self)
		self.interval = interval
		self.range = self:get_custom_range()
		self.esim_data_usage = self.sim_esim == "esim"
		self:GET_data_usage()
	end
end

function DataUsage:initialize_hook()
	if not self.dt:check_array(self.service_group, mdcollect.INTERVALS) then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Incorrect interval (must be day, week, month, year or total)", 422)
	end

	local sim_types = {"sim", board:has_esim() and "esim" or nil}
	if self.sim_esim and not self.dt:check_array(self.sim_esim, sim_types) then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Incorrect sim type specified. Must be one of the following values: '" .. table.concat(sim_types, ", ") .. "'", 422)
	end
end

return DataUsage
