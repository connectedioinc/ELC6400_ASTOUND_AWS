local api_utils = require("api/api_utils")
local lib = {}

local ValidatorContext = {}
ValidatorContext.__index = ValidatorContext

lib.ValidatorContext = ValidatorContext

function ValidatorContext.new()
	local self = {}
	setmetatable(self, ValidatorContext)
	self.object_stack = {}

	return self
end

function ValidatorContext:get(option_name)
	assert(#self.object_stack > 0)

	local last_object = self.object_stack[#self.object_stack]
	return last_object[option_name]
end

local function join_data_path(data_path, item_name)
	if data_path ~= "" then
		return data_path .. "." .. item_name
	else
		return item_name
	end
end

function ValidatorContext:validate_by_schema(service, data, schema, data_path)
	assert(type(schema.format) == "function" or type(schema.format) == "nil" or schema.format == "list" or schema.format == "object")
	local result = true

	if data_path == nil then
		data_path = ""
	end

	local is_option = type(schema.format) == "function" or type(schema.format) == "nil"
	if data == nil or (data == "" and is_option) then
		local show_required_error = false
		if type(schema.required) == "boolean" then
			show_required_error = schema.required
		elseif type(schema.required) == "function" then
			show_required_error = schema.required(self)
		end

		if show_required_error then
			service:add_error(STD_CODES.INVALID_OPT, "Missing required option: " .. data_path, data_path)
			return false
		end

		return true
	end

	if schema.type == "list" then
		assert(type(schema.item_schema) == "table")

		if type(data) ~= "table" then
			service:add_error(STD_CODES.INVALID_OPT, "Value must be an array", data_path)
			return false
		end

		if not api_utils:is_array(data) and not api_utils:is_table_empty(data) then
			service:add_error(STD_CODES.INVALID_OPT, "Value must be an array", data_path)
			return false
		end

		if schema.item_schema then
			for i, value in pairs(data) do
				local item_data_path = data_path .. ("[%s]"):format(i - 1)
				local ok = self:validate_by_schema(service, value, schema.item_schema, item_data_path)
				if not ok then
					result = false
				end
			end
		end

	elseif schema.type == "object" then
		assert(type(schema.options) == "table")

		if type(data) ~= "table" then
			service:add_error(STD_CODES.INVALID_OPT, "Value must be an object", data_path)
			return false
		end

		if api_utils:is_array(data) then
			service:add_error(STD_CODES.INVALID_OPT, "Value must be an object", data_path)
			return false
		end

		table.insert(self.object_stack, data)

		for option_name, option_schema in pairs(schema.options) do
			if data[option_name] == nil then
				local ok = self:validate_by_schema(service, nil, option_schema, join_data_path(data_path, option_name))
				if not ok then
					result = false
				end
			end
		end

		for option_name, value in pairs(data) do
			local option_data_path = join_data_path(data_path, option_name)

			local option_schema = schema.options[option_name]
			if option_schema then
				local ok = self:validate_by_schema(service, value, option_schema, option_data_path)
				if not ok then
					result = false
				end
			else
				service:add_error(STD_CODES.INVALID_OPT, "Invalid option", option_data_path)
			end
		end

		table.remove(self.object_stack)

	elseif schema.type == nil or schema.type == "string" then
		if type(data) == "table" then
			service:add_error(STD_CODES.INVALID_OPT, "Nested arrays not supported.", data_path)
			return false
		elseif type(data) ~= "string" then
			service:add_error(STD_CODES.INVALID_OPT, "Value must be a string", data_path)
			return false
		end
	end

	if not result then
		return false
	end

	if schema.format then
		local ok, msg, code = schema.format(data, self)
		if not ok then
			service:add_error(code or STD_CODES.INVALID_OPT, msg, data_path, nil, data)
			return false
		end
	end

	return true
end

function lib.schema_object(options)
	return {
		type = "object",
		required = true,
		options = options
	}
end

function lib.schema_list(child_schema, required)
	return {
		type = "list",
		item_schema = child_schema,
		required = required
	}
end

function lib.schema_string(format)
	return { format = format }
end

function lib.schema_string_required(format)
	return { format = format, required = true }
end

return lib
