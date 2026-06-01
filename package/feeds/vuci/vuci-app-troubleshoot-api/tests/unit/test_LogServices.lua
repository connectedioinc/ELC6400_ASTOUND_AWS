local lu = require("luaunit")
local paths = require("paths")
local mock_fs = require("nixio.fs")
local mock_config_service = require("api/MockConfigService")

local original_require = require
_G.require = function(module)
	if module == "nixio.fs" then
		return mock_fs
	elseif module == "api/ConfigService" then
		return mock_config_service
	else
		return original_require(module)
	end
end

local logservice = require("api/system/log_services")
TestLogServices = {}

function TestLogServices:setUp()
	mock_fs._files = {}

	logservice.errors = {}
	logservice.main_config = "log"
	logservice.config = "log"
	logservice.sid = "test_service"

	logservice.sections_data = {
		["general"] = {
			["log_size_limit"] = "100",
			["log_compress"] = "1",
			["log_file"] = "/usr/local/var/log/messages"
		}
	}
	mock_fs._files["/var/run/logd/services"] = { is_dir = true }

	-- Create fake log files with full paths
	mock_fs.create_file("/var/run/logd/services/test_service.log", nil, "log entry 1")
	mock_fs.create_file("/var/run/logd/services/test_service.log.1", nil, "log entry 2")
	mock_fs.create_file("/var/run/logd/services/test_service.log.2", nil, "log entry 3")
end

function TestLogServices:test_find_service_log_files()
	local files = logservice:find_service_log_files("test_service")

	lu.assertEquals(#files, 3)

	local main_log_found = false
	for _, file in ipairs(files) do
		if file == "test_service.log" then
			main_log_found = true
			break
		end
	end
	lu.assertTrue(main_log_found, "Main log file not found")
end

function TestLogServices:test_sort_log_files()
	local files = { "test_service.log", "test_service.2.log", "test_service.1.log" }
	local sorted = logservice:sort_log_files(files, "test_service", true)
	lu.assertEquals(sorted[1], "test_service.log") -- newest_first, main log first
	lu.assertEquals(sorted[2], "test_service.1.log")
	lu.assertEquals(sorted[3], "test_service.2.log")
end

function TestLogServices:test_combine_log_files_chronological()
	local files = { "test_service.log", "test_service.log.1", "test_service.log.2" }
	local combined = logservice:combine_log_files(files, true)
	lu.assertStrContains(combined, "log entry 1")
	lu.assertStrContains(combined, "log entry 2")
	lu.assertStrContains(combined, "log entry 3")
end

function TestLogServices:test_GET_TYPE_status_returns_logs()
	logservice.sections_data = {
		["test_service"] = {
			["name"] = "test_service",
		}
	}
	logservice.sid = "test_service"
	local res = logservice:GET_TYPE_status()
	lu.assertTrue(res.success)
	lu.assertEquals(res.data.service, "test_service")
	lu.assertStrContains(res.data.log, "log entry 1")
end

function TestLogServices:test_GET_TYPE_status_missing_directory()
	for path, _ in pairs(mock_fs._files) do
		if path:match("^/var/run/logd/services") then
			mock_fs._files[path] = nil
		end
	end

	logservice.sid = "test_service"
	local res = logservice:GET_TYPE_status()
	lu.assertTrue(res.success)
	lu.assertEquals(res.data.log, "")
	lu.assertStrContains(res.data.message, "Service log directory not found")
end

os.exit(lu.LuaUnit.run())
