local module = {}

function module:endpoint(service, s, bundle, format_type)
	format_type.require["lua"] = {"format_script"}
	bundle.d_utils.userscripts_permission_option("format_script", s, { file = true })
end
return module