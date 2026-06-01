local api_utils = require("api/api_utils")

-- Common module for config/action options

local m = {}

-- Validates Config and Action options based on their flags 
---@param self table option instance
---@param value any option value
function m.validate_option_list(self, value)
	if value == "" then return true end -- Valid if its ""
	-- request value is an array
	if not self.list then
		return false, "Option does not accept an array"
	end
	-- check if it is not being deleted when readonly flag is set
	if self.readonly and self.request_method == "PUT" and api_utils:is_table_empty(value) then
		local table_value = self:table_get(self.config, self:_get_sid(self.sid), self.api_key)
		if table_value and #table_value > 0 then
			return false, "Option is readonly and cannot be overwritten"
		end
	end
	if self.list_length and #value > self.list_length then
		return false, string.format("Provided array of length %s exceeds allowed limit of %s values", #value, self.list_length)
	end
	if self.min_list_length and #value < self.min_list_length then
		return false, string.format("Provided array of length %s is less than the minimum required length of %s values", #value, self.min_list_length)
	end
	-- finds duplicates in lists and constructs errors with them
	if not self.allow_duplicates then
		local all_values = {}
		local duplicates = {}
		local used_duplicates = {}
		for k, v in pairs(value) do
			if type(k) ~= "number" then
				return false, "Option only accepts arrays"
			end
			if all_values[v] then
				if not used_duplicates[v] then
					table.insert(duplicates, v)
				end
				used_duplicates[v] = true
			end
			if v and v ~= "" then
				all_values[v] = true
			end
		end
		if #duplicates > 0 then
			return false, string.format(
				"No duplicate values allowed. Found duplicate values [%s].", table.concat(duplicates, ", ")
			)
		end
	else
		-- checks for object properties
		for k, _ in pairs(value) do
			if type(k) ~= "number" then
				return false, "Option only accepts arrays"
			end
		end
	end
	return true, nil
end

return m