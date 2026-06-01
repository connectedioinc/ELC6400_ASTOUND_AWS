
local module = {}

function module:endpoint(service, s, bundle, input_type)

	service:action("download_example_input_lua", function (self)
		local file_path = "/etc/data_sender/modules/input/lua/example_input_lua.lua"
		if not bundle.fs.access(file_path) then
			return self:ResponseNotFound("Failed to download input example lua file.")
		end
		return self:File(file_path, "example_input_lua.lua")
	end)

	input_type.require["lua"] = {"lua_script"}

	bundle.d_utils.userscripts_permission_option("lua_script", s, { file = true })
end
return module