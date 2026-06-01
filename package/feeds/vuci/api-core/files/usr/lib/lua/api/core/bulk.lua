local Base = require("api/BaseEndpoint")
local api_utils = require("api/api_utils")
local util = require("vuci.util")
local uci = require("vuci.uci")
local disp_common = require("api.dispatcher_common")
local responder = require("api.responder")
local nixio = require("nixio")

local BulkEndpoint = Base:new()

local MAX_REQUESTS_PER_BULK = 100

-- wraps 'get_endpoint'. Besause bulk holds information about the responses and does not yield until all requests are executed
-- TODO restructure code so bulk can reuse code of simple request without further spagetification
local function get_endpoint_bulk(REQUEST_INFO, REQUEST_METHOD, BODY, PATH_INFO, bulk, local_call, bulk_acls)
	local tokens = util.split(PATH_INFO, '?')
	if #tokens > 2 then
		return nil, responder.err_resp:new()
		:add_error(STD_CODES.INVALID_QUERY, "Invalid query" , "Query")
		:code("400"):retrieve()
	end
	local result, result_table, file_path = disp_common:parse_path(REQUEST_INFO.token_struct, tokens[1], REQUEST_METHOD, local_call, bulk_acls)
	if not result then return nil, result_table end

	local endpoint, error = disp_common:get_endpoint(file_path)
	if not endpoint then return nil, error end
	if tokens[2] then
		REQUEST_INFO.QUERY  = disp_common:parse_query(tokens[2])
	else
		-- FIXME confusing logic of always changing one request body
		-- a more expensive option would be to clone the body and pass it uniquely to each endpoint
		-- third option would be to pass query parameters seperately so the request_info table could remain unmodified
		REQUEST_INFO.QUERY = {}
	end
	disp_common:populate_endpoint(REQUEST_INFO, endpoint, result_table, bulk, local_call)
	disp_common:partial_populate_endpoint(endpoint, BODY, REQUEST_METHOD)
	return endpoint, nil, file_path
end

local function recursive_fs_remove(path)
	if nixio.fs.stat(path, "type") == "dir" then
		for directory_item in nixio.fs.dir(path) do
			recursive_fs_remove(path .. "/" .. directory_item)
		end
	end
	nixio.fs.remove(path)
end

function BulkEndpoint:initialize_method()
	if self.request_method ~= "POST" then
		responder.err_resp:new()
		:add_error(STD_CODES.INCORRECT_REQUEST, "HTTP method not supported for this endpoint, please use POST" , "Request")
		:code("501"):yield()
	end

	local bulk_request_body = self.arguments
	if api_utils:is_table_empty(bulk_request_body) then
		responder.err_resp:new()
		:add_error(STD_CODES.INCORRECT_REQUEST, "Invalid POST structure, body is missing" , "Request")
		:code("400"):yield()
	end
	if not bulk_request_body.data then
		responder.err_resp:new()
		:add_error(STD_CODES.INCORRECT_REQUEST, "Invalid POST structure, data object is missing" , "Request")
		:yield()
	end
	if not api_utils:is_table_empty(bulk_request_body.data) and not api_utils:is_array(bulk_request_body.data) then
		responder.err_resp:new()
		:add_error(STD_CODES.INCORRECT_REQUEST, "Invalid data structure, only an array is acceptable" , "Request")
		:yield()
	end

	local bulk_response = {}
	local defer_after_commits = {}
	local uci_delta_folder = ("/tmp/.uci-bulk-%d"):format(nixio.getpid())

	-- Collect all endpoint paths for ACL check
	local endpoint_paths = {}
	for i=1, #bulk_request_body.data do
		local v = bulk_request_body.data[i]
		if v and v.endpoint and v.method ~= "OPTIONS" then
			local ep = v.endpoint
			if ep:find("/api", nil, true) == 1 then
				ep = ep:sub(5)
			end
			table.insert(endpoint_paths, ep)
		end
	end

	-- Perform bulk ACL check once (skip if local_call)
	local acl_results, acl_err
	if not self.local_call and not self.request_info.token_struct.basic_auth then
		local authentication = require("api.authentication")
		acl_results, acl_err = authentication:authenticate_bulk_rpcd(self.request_info.token_struct, endpoint_paths)
		if not acl_results then
			responder.err_resp:new()
				:add_error(acl_err)
				:code("403"):yield()
		end
	else
		acl_results = {}
	end

	local max_memory = 0
	local function memory_check(remaining_entries)
		local memory = collectgarbage("count")
		if max_memory < memory then max_memory = memory end
		local sysinfo = util.ubus("system", "info") or {}

		if not sysinfo.memory or sysinfo.memory.free < max_memory * remaining_entries * (1024 * 10 / MAX_REQUESTS_PER_BULK) then
			responder.err_resp:new()
				:add_error(STD_CODES.INCORRECT_REQUEST, "Too many requests" , "Request")
				:yield()
		end
	end

	if #bulk_request_body.data > MAX_REQUESTS_PER_BULK then
		responder.err_resp:new()
			:add_error(STD_CODES.INCORRECT_REQUEST, string.format("Bulk accepts only up to %s entries", MAX_REQUESTS_PER_BULK), "Request")
			:yield()
	end

	nixio.fs.mkdir(uci_delta_folder)

	-- iterates all requests that are provided in the body of request
	local total_data = #bulk_request_body.data
	for i=1, total_data do
		local v = bulk_request_body.data[i]
		memory_check(total_data - i)

		local uci_delta_file = ("%s/%d"):format(uci_delta_folder, i)
		uci:set_savedir(uci_delta_file)

		if not v.method or not v.endpoint then
			local error_msg = responder.err_resp:new()
				:add_error(STD_CODES.INCORRECT_REQUEST, "Method or endpoint not provided" , "Request")
				:retrieve_response()
			table.insert(bulk_response, error_msg)
		elseif v.method == "OPTIONS" then
			local error_msg = responder.err_resp:new()
				:add_error(STD_CODES.INCORRECT_REQUEST, "Method OPTIONS is not allowed in bulk requests" , "Request")
				:retrieve_response()
			table.insert(bulk_response, error_msg)
		else
			if v.endpoint:find("/api") == 1 then
				v.endpoint = v.endpoint:sub(5)
			end

			-- Pass skip_auth and acl_results to endpoint
			local skip_auth = true
			if self.request_info.token_struct then
				skip_auth = not self.request_info.token_struct.basic_auth
			end
			local bulk_acls = {
				skip_auth = skip_auth,
				bulk_acl_results = acl_results
			}

			local endpoint, err, file_path = get_endpoint_bulk(self.request_info, v.method, v, v.endpoint, true, self.local_call, bulk_acls)
			if not endpoint then
				table.insert(
					bulk_response,
					err and err.payload or responder.err_resp:new():code("500"):retrieve()
				)
			else
				table.insert(defer_after_commits, {
					method = v.method,
					endpoint = endpoint
				})

				local endpoint_result = endpoint:init_endpoint()
				memory_check(total_data - i)
				local final_resp = disp_common:respond_request(endpoint_result, endpoint, file_path)
				table.insert(bulk_response, final_resp.payload)
				collectgarbage("collect")
			end
		end

		-- If the request called t_func:general_commit(), then showing a warnings needs to be reset.
		-- Otherwise the next requests will show warnings when it shouldn't have.
		uci.show_after_commit_modifications_warning = false

		-- Drop all unsaved or uncommited changes made during request by unloading all configs
		uci:unload_all()
	end

	-- if commiting is required then iterate through endpoints and execute their commiting logic

	if uci:has_changes() then
		-- Forking is done as to avoid various edge cases where ip is being changed and the response is not being sent to the client
		-- a response can not be sent before commiting because the TCP connecion is closed only when the cgi script is finished and due to commiting this does not happen
		-- forking fixes this and also should technically increase response speed
		if nixio.fork() == 0 then
			uci.show_commit_or_revert_warning = false
			uci:commit_all()
			uci.show_commit_or_revert_warning = true
			uci.show_after_commit_modifications_warning = true

			-- After commit the temporary delta files can be removed of each request.
			recursive_fs_remove(uci_delta_folder)

			-- Set the savedir back to the default location, because some endpoints in the after commit
			-- hook might call `uci:commit()`. The endpoints shouldn't need to call commit in an "AFTER COMMIT".
			-- The plan is to slowly over time to remove the usage of uci:commit in endpoints.
			uci:set_savedir("/tmp/.uci")

			for _, deferred_after_commit in pairs(defer_after_commits) do
				local method = deferred_after_commit.method
				local endpoint = deferred_after_commit.endpoint

				if endpoint[method .. "_commit"] then
					local _, resp = endpoint:run_endpoint_after_commit(method)
					if resp then
						table.insert(bulk_request_body, resp.payload)
					end
				end
			end

			return nil
		end
	else
		recursive_fs_remove(uci_delta_folder)
	end

	responder.ok_resp:new()
	:set_data(bulk_response)
	:code("207"):yield()
end

return BulkEndpoint
