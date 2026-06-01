local FormDataBlock = {}
FormDataBlock.__index = FormDataBlock

local fs = require("nixio.fs")

function FormDataBlock.init_empty()
	local self = setmetatable({}, FormDataBlock)

	return self
end

function FormDataBlock.init_file(filename, content_filename)
	local self = FormDataBlock.init_empty()
	self.file_is_temporary = false

	if not fs.access(content_filename) then
		return nil
	end

	self.content_disposition = {
		name = "file",
		filename = filename
	}
	self.content_filename = content_filename

	self.content_size = fs.stat(content_filename, "size")
	if self.content_size == nil then
		return nil
	end

	return self
end

function FormDataBlock.init_regular(name, content)
	assert(type(name) == "string")
	assert(type(content) == "string")

	local self = FormDataBlock.init_empty()

	self.content_disposition = {
		name = name
	}
	self.content = content

	return self
end

function FormDataBlock:cleanup()
	if self.content_disposition and self.content_disposition.name ~= "file" then
		return
	end

	if self.content_file then
		self.content_file:close()
		self.content_file = nil
	end

	if self.file_is_temporary then
		local filename = self.content_filename
		if filename then
			if fs.access(filename) then fs.remove(filename) end
			self.content_filename = nil
		end
	end
end

return FormDataBlock
