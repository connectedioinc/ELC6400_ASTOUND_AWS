local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local ip = require("luci.ip")

local QOS = ConfigService:new({
	anonymous = true
})

-- Gets QOS classes from the configuration.
---@return table classes QOS classes.
function QOS:get_classes()
	local classes = {}
	self:table_foreach("qos", "class", function (class)
		if not class[".name"]:match("_down") then
			table.insert(classes, class[".name"])
		end
	end)
	return classes
end

-- Gets known ip addresses
---@return table data Known ip addresses
function QOS:known_ips()
	local data = {}
	local neighbors = ip.neighbors({
		family = 4
	})
	if neighbors then
		for _, v in pairs(neighbors) do
			table.insert(data, tostring(v.dest))
		end
	end
	return data
end

function QOS:GET_TYPE_options()
	self:ResponseOK({
		ips = self:known_ips(),
		classes = self:get_classes()
	})
end

local QOSClassify = QOS:section("qos", "classify")

	local opt_target = QOSClassify:option("target")
		function opt_target:validate(value)
			return self.dt:check_array(value, self:get_classes())
		end

	local opt_srchost = QOSClassify:option("srchost")
		function opt_srchost:validate(value)
			return self.dt:ipmask4(value)
		end

	local opt_dsthost = QOSClassify:option("dsthost")
		function opt_dsthost:validate(value)
			return self.dt:ipmask4(value)
		end

	local opt_proto = QOSClassify:option("proto")

	-- Validates ports between 1 and 65536
	---@param value string Port number
	---@return boolean ok, string err Validation status and error if exists
	local validate_custom_port = function (value)
		value = tonumber(value)
		local result = ( value and value >= 1 and value <= 65535 )
		if result then return true end
		return false, "Values between 1 and 65535 are accepted."
	end

	local opt_ports = QOSClassify:option("ports")
		function opt_ports:validate(value)
			if value:match(",") then
				local ports = util.split(value, ",")
				if #ports == 0 then
					return false, "Ports must be seperated by commas e.g. 20,30,40..."
				end
				for _, v in pairs(ports) do
					local ok, err = validate_custom_port(v)
					if not ok then return ok, err end
				end
				return true
			end
			return validate_custom_port(value)
		end

return QOS