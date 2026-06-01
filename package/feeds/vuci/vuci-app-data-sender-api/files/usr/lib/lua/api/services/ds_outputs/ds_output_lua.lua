local module = {}

function module:endpoint(service, s, bundle, output_type)
	service:action("download_example_output_lua", function(self)
		local file_path = "/etc/data_sender/modules/output/lua/example_output_lua.lua"
		if not bundle.fs.access(file_path) then
			return self:ResponseNotFound("Failed to download output example lua file.")
		end
		return self:File(file_path, "example_output_lua.lua")
	end)
	output_type.require["lua"] = { "lua_out_script" }
	bundle.d_utils.userscripts_permission_option("lua_out_script", s, { file = true })
end

return module
