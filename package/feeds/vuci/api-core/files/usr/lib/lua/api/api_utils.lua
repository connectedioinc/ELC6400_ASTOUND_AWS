local utils = {}

-- Parameter `t` must be a table or nil
function utils:is_table_empty(t)
	if t == nil then return true end

	assert(type(t) == "table")
	return next(t) == nil
end

-- checks if list is a valid array
function utils:is_array(t, skip_length_check)
	if type(t) ~= "table" then return false end
	if not skip_length_check and #t == 0 then return false end
	for k, _ in pairs(t) do
		if type(k) ~= "number" then
				return false
		end
	end
	return true
end

-- counts length of key value tables, as # does not work for them
function utils:table_length(t)
	local count = 0
	for k, v in pairs(t) do
		count = count + 1
	end
	return count
end


function utils:logger()
	local info = debug.getinfo(2, 'nlS')
	io.stderr:write(
		string.format(
			"Func:%s; line:%s; file:%s\n",
			info.name or info.namewhat ,
			info.currentline,
			info.source)
	)
end

return utils
