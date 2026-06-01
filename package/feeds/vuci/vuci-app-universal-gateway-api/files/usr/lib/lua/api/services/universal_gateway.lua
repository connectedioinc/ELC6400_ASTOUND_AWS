local FunctionService = require("api/FunctionService")
local universal_gateway_utils = require("vuci.universal_gateway_utils")
local query_parsing = require("api/query")
local util = require("vuci.util")

local universal_gateway = FunctionService:new()

function universal_gateway:GET_TYPE_options()
	return self:ResponseOK({
		tags = universal_gateway_utils.list_tags()
	})
end

function universal_gateway:validate_query_parameters()
	local params_to_check = {
		client_service = "string"
	}
	query_parsing:validate_query_format(params_to_check, self)

	local query_params = self.query_parameters

	if query_params.client_service then
		local client_service_list = universal_gateway_utils.list_source_names()
		local valid, err = self.dt:check_array(query_params.client_service, client_service_list)
		if not valid then self:add_error(STD_CODES.INVALID_QUERY, err, "client_service") end
	end

	self:return_if_error(400)

	return {
		client_service = query_params.client_service
	}
end

function universal_gateway:GET_TYPE_status()
	local query = self:validate_query_parameters()

	local sourced_tags = {}
	for _, tag in ipairs(universal_gateway_utils.list_used_tags()) do
		if not query.client_service or query.client_service == tag.source then
			sourced_tags[tag.source] = sourced_tags[tag.source] or {}
			sourced_tags[tag.source][tag.service] = sourced_tags[tag.source][tag.service] or {}
			sourced_tags[tag.source][tag.service][tag.config_id] = { tag_id = tag.id }
		end
	end

	if query.client_service then
		sourced_tags = sourced_tags[query.client_service] or {}
	end
	util.table_to_json_object(sourced_tags)
	return self:ResponseOK(sourced_tags)
end

return universal_gateway
