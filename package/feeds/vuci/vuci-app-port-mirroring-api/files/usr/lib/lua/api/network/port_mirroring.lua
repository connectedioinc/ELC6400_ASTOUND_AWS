local ConfigService = require("api/ConfigService")
local board = require("vuci.board")

local PortMirroring = ConfigService:new({ create = false, delete = false, general_section = function (self)
		return self.uci:get_all("network", "@switch[0]")[".name"]
	end})

local switch = PortMirroring:section("network", "switch")
function switch:create_port_lut()
	self.ports = {}
	self.port_num_from_index = {}
	self.port_index_from_num = {}
	local ports = board:get_switch_ports()
	if(ports) then
		for _, port in ipairs(ports) do
			if port.role == "lan" then
				port.index = port.index and port.index or port.num
				-- It's wasteful to make luts where both values are the same, but doing it here saves a lot of code in getters and setters if board.json doesn't have port.index.
				self.port_num_from_index[tostring(port.index)] = tostring(port.num)
				self.port_index_from_num[tostring(port.num)] = tostring(port.index)
				table.insert(self.ports, tostring(port.index and port.index or port.num))
			end
		end
	end
end
switch:create_port_lut()

function switch:validate_ports(port, other_option_name)
	local tmp_data = self.arguments.data
	local data = tmp_data
	if not tmp_data.id then
		for _, v in ipairs(tmp_data) do
			if v.id == self.sid then
				data = v
			end
		end
	end
	local other_port = nil
	if data and data[other_option_name] then
		other_port = self.port_num_from_index[data[other_option_name]]
	else
		other_port = self:table_get(self.config, self.sid, other_option_name) or nil
	end
	local status, msg = self.dt:check_array(port, self.ports)
	if status and self.port_num_from_index[port] == other_port then
		return false, "Monitoring and source port cannot be the same."
	end
	return status, msg
end

local opt_mirror_monitor_port = switch:option("mirror_monitor_port")
	function opt_mirror_monitor_port:validate(value)
		if value == "disabled" then return true end
		return self:validate_ports(value, "mirror_source_port")
	end
	function opt_mirror_monitor_port:set(value)
		if value ~= "disabled" then
			self:table_set(self.config, self.sid, "mirror_monitor_port", self.port_num_from_index[value])
		end
	end
	function opt_mirror_monitor_port:get(value)
		return value and self.port_index_from_num[value] or "disabled"
	end

local opt_mirror_source_port = switch:option("mirror_source_port")
	opt_mirror_source_port.require = {"mirror_monitor_port"}
	function opt_mirror_source_port:validate(value)
		return self:validate_ports(value, "mirror_monitor_port")
	end
	function opt_mirror_source_port:set(value)
		if self.port_num_from_index[value] then
			self:table_set(self.config, self.sid, "mirror_source_port", self.port_num_from_index[value])
		else
			self:table_delete(self.config, self.sid, "mirror_source_port")
		end
	end
	function opt_mirror_source_port:get(value)
		return value and self.port_index_from_num[value] or nil
	end

local opt_enable_mirror_rx = switch:option("enable_mirror_rx")
opt_enable_mirror_rx.require = { ["1"] = {"mirror_source_port", "mirror_monitor_port"}}
	function opt_enable_mirror_rx:validate(value)
		return self.dt:is_bool(value)
	end

local opt_enable_mirror_tx = switch:option("enable_mirror_tx")
opt_enable_mirror_tx.require = { ["1"] = {"mirror_source_port", "mirror_monitor_port"}}
	function opt_enable_mirror_tx:validate(value)
		return self.dt:is_bool(value)
	end

function PortMirroring:PUT_before_commit_hook()
	if self:get_abs_value(self.config, self.sid, "mirror_monitor_port") == "disabled" then
		self:table_delete(self.config, self.sid, "mirror_monitor_port")
		self:table_delete(self.config, self.sid, "mirror_source_port")
		self:table_delete(self.config, self.sid, "enable_mirror_rx")
		self:table_delete(self.config, self.sid, "enable_mirror_tx")
	end
end

return PortMirroring