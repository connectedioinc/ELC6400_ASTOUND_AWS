local ConfigService = require("api/ConfigService")
local board = require("vuci.board")

if board:is_switch() then return nil end

local flags = {
	increment_name = true
}

local routing_tables = ConfigService:new(flags)

function routing_tables:update_child_tables(old_val, new_val)

	local function update_type_table(table_type)
		self:table_foreach("network", table_type, function(s)
			if s.table and s.table == old_val then
				self:table_set("network", s[".name"], "table", new_val)
			end
		end)
	end

	update_type_table("route")
	update_type_table("route6")
end

	local routing_table = routing_tables:section("network", "table")

		local table_id = routing_table:option("table_id")
		table_id.maxlength = 8
		table_id.cfg_require = true
			function table_id:validate(value)
				local ids = {}
				self:table_foreach(self.config, self.section_type, function (s)
					if s.id and s[".name"] ~= self.sid then
						table.insert(ids, s.id)
					end
				end)
				if self.dt:check_array(value, ids) then
					return false, "Table with this route table ID already exists."
				end
				if value == "255" or value == "254" or value == "253" or value == "220" or value == "128" then
					return false, string.format("%s table ID is reserved for other service or kernel", value)
				end
				return self.dt:irange(value, 0, 65535)
			end
			function table_id:get()
				return self:table_get(self.config, self.sid, "id")
			end
			function table_id:set(value)
				self:update_child_tables(self:table_get(self.config, self.sid, "id"), value)
				self:table_set(self.config, self.sid, "id", value)
			end

		local name = routing_table:option("name")
		name.maxlength = 8
		name.cfg_require = true
			function name:validate(value)
				local names = {}
				self:table_foreach(self.config, self.section_type, function (s)
					if s.name and s[".name"] ~= self.sid then
						table.insert(names, s.name)
					end
				end)
				if self.dt:check_array(value, names) then
					return false, "Table with this route table name already exists."
				end
				return self.dt:fieldvalidation(value, "^[a-zA-Z]+$", 0)
			end

function routing_tables:DELETE_before_section_delete_hook()
	self.table_id_delete = self:table_get(self.main_config, self.sid, "id")
end

function routing_tables:DELETE_after_data_hook(response_data)
	if self.table_id_delete then
		self:table_foreach(self.main_config, "route", function(a)
			if a.table and a.table == self.table_id_delete then
				self:table_delete(self.main_config, a[".name"])
			end
		end)
		self:table_foreach(self.main_config, "route6", function(s)
			if s.table and s.table == self.table_id_delete then
				self:table_delete(self.main_config, s[".name"])
			end
		end)
		self.table_id_delete = nil
	end
end

return routing_tables
