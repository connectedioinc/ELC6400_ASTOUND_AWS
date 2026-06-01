local mdcollect = require("vuci.mdcollect")

local FunctionService = require("api/FunctionService")
local uci = require("vuci.uci").cursor()

local InterfaceDataUsage = FunctionService:new()

function InterfaceDataUsage:GET_TYPE_status()
	if not uci:get("network", self.interface) then
		return self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Section: %s for service does not exist", self.interface),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end

	local aggregate_by
	local current = false
	if self.query_parameters then
		if self.query_parameters.aggregate_by then
			for _, interval in pairs(mdcollect.INTERVALS) do
				if interval == self.query_parameters.aggregate_by then
					aggregate_by = self.query_parameters.aggregate_by
					break
				end
			end
		end

		if self.query_parameters.current == "true" then current = true end
	end

	local graph_points = mdcollect:get_usage_raw(nil, nil, self.interface, self.device, self.interval, current)

	if not aggregate_by then
		if self.interval == mdcollect.INTERVALS.MONTH then
			aggregate_by = mdcollect.INTERVALS.DAY
		elseif self.interval == mdcollect.INTERVALS.YEAR then
			aggregate_by = mdcollect.INTERVALS.MONTH

		elseif self.interval == mdcollect.INTERVALS.TOTAL then
			aggregate_by = mdcollect:get_auto_scale(graph_points)
		else
			aggregate_by = mdcollect.INTERVALS.HOUR
		end
	end

	local aggregated_data = mdcollect:aggregate_data(graph_points, aggregate_by)
	local response = { usage = aggregated_data, interval = aggregate_by}
	return self:ResponseOK(response)
end

for _, interval in pairs(mdcollect.INTERVALS) do
	InterfaceDataUsage["GET_TYPE_"..interval] = function (self)
		self.interval = interval
		self:GET_TYPE_status()
	end
end

function InterfaceDataUsage:initialize_hook()
	if not self.dt:check_array(self.service_group, mdcollect.INTERVALS) then
		self:add_critical_error(STD_CODES.INVALID_OPT, "Incorrect interval (must be hour, day, week, month, year or total)", 422)
	end
end

return InterfaceDataUsage