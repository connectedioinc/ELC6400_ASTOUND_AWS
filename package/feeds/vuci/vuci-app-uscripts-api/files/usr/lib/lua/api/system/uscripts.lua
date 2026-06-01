local fs = require("nixio.fs")
local util = require("vuci.util")
local FunctionService = require("api/FunctionService")

local uscripts = FunctionService:new()
uscripts.disable_service_group_check = true

function uscripts:initialize_hook()
	self.upload_actions = { "upload" }
	for _, value in pairs(self.upload_actions) do
		self.actions[value] = true
	end
end

function uscripts:GET_TYPE_config()
	self:ResponseOK({script = fs.readfile("/etc/rc.local")})
end

function uscripts:POST_action_init_hook()
	if self.sid and util.contains(self.upload_actions, self.sid) then
		self:ResponseError("Unsupported payload format. Ensure the request body is in form-data format.")
	end
end

function uscripts:UPLOAD_validate_path()
	if self.service_group ~= "actions" then
		self:ResponseNotImplemented(string.format("%s not implemented", self.request_method))
	end

	local available_actions = {}
	for key, _ in pairs(self.actions) do
		table.insert(available_actions, key)
	end

	if not self.sid then
		self:ResponseNotFound(string.format("No action provided. Available actions: [%s]",
			table.concat(available_actions, ", ")))
	elseif not util.contains(self.upload_actions, self.sid) and util.contains(available_actions, self.sid) then
		self:ResponseError("Unsupported payload format. Ensure the request body is in JSON format.")
	elseif not util.contains(self.upload_actions, self.sid) then
		self:ResponseNotFound(string.format("Provided action is not available. Available actions: [%s]",
					table.concat(available_actions, ", ")))
	end
end

function uscripts:UPLOAD_init()
	local function handle_request(upload_request)
		upload_request.files[1].location = "/etc/rc.local"
		return true
	end

	return { handle_request = handle_request }
end

function uscripts:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "rclocal", 0760)
	return { path = path }
end

return uscripts
