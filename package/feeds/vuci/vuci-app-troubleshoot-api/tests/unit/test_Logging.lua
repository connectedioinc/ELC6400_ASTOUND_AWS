local lu = require("luaunit")
local paths = require("paths")

local mock_fs = require("nixio.fs")
local mock_util = require("vuci/MockUtil")
local mock_util_tlt = require("vuci/MockUtilTlt")
local mock_config_service = require("api/MockConfigService")

local original_require = require
_G.require = function(module)
	if module == "nixio.fs" then
		return mock_fs
	elseif module == "vuci.util" then
		return mock_util
	elseif module == "vuci.util_tlt" then
		return mock_util_tlt
	elseif module == "api/ConfigService" then
		return mock_config_service
	else
		return original_require(module)
	end
end

local logging = require("api/system/logging")

_G.STD_CODES = {
	NO_SPACE = "NO_SPACE",
	INCORRECT_REQUEST = "INCORRECT_REQUEST",
	UCI_CREATE_ERROR = "UCI_CREATE_ERROR"
}

TestLogging = {}

function TestLogging:setUp()
	logging.errors = {}
	logging.sid = "general"
	logging.main_config = "log"
	logging.config = "log"

	logging.sections_data = {
		["general"] = {
			["log_size_limit"] = "100",
			["log_compress"] = "1",
			["log_file"] = "/usr/local/var/log/messages"
		}
	}

	mock_fs._files = {}
	mock_fs.create_file("/usr/local/var/log/messages", 1024)
end

function TestLogging:test_create_defaults()
	local defaults = logging:create_defaults()
	lu.assertEquals(defaults.log_size, "200")
	lu.assertEquals(defaults.log_compress, "0")
end

function TestLogging:test_GET_TYPE_status()
	mock_fs.create_file("/usr/local/var/log/messages", 1024)
	local result = logging:GET_TYPE_status()
	lu.assertTrue(result.success)
	lu.assertEquals(result.data.exists, "1")
	lu.assertEquals(result.data.logfile_not_empty, "1")

	mock_fs.clear()
	mock_fs.create_file("/usr/local/var/log/messages", 0)
	result = logging:GET_TYPE_status()
	lu.assertEquals(result.data.logfile_not_empty, "0")

	mock_fs.clear()
	result = logging:GET_TYPE_status()
	lu.assertEquals(result.data.exists, "0")
end

function TestLogging:test_delete_logfile()
	-- File exists
	mock_fs.create_file("/usr/local/var/log/messages", 1024)
	local result = logging:delete_logfile()
	lu.assertTrue(result.success)
	lu.assertEquals(result.data.message, "Log file deleted.")
	lu.assertFalse(mock_fs.access("/usr/local/var/log/messages"))

	mock_fs.clear()
	result = logging:delete_logfile()
	lu.assertFalse(result.success)
	lu.assertNotNil(result.error.message)
end

function TestLogging:test_PUT_before_commit_hook()
	logging.service.errors = {}
	logging.service.request_body = {
		["general"] = {
			["size"] = "300",
			["log_compress"] = "1",
			["log_file"] = "/usr/local/var/log/messages"
		}
	}

	mock_fs.create_file("/usr/local/var/log/messages", 1024)
	mock_fs.statvfs = function(path) return { bavail = 500000, frsize = 4 } end
	logging:PUT_before_commit_hook()
	lu.assertEquals(#logging.errors, 0)

	logging.errors = {}
	mock_fs.statvfs = function(path) return { bavail = 1, frsize = 1 } end
	logging:PUT_before_commit_hook()
	lu.assertEquals(#logging.errors, 1)
	lu.assertEquals(logging.errors[1].code, STD_CODES.NO_SPACE)
	lu.assertEquals(logging.errors[1].error, "Cannot save logs in Flash Memory. Not enough free space.")

	logging.errors = {}
	mock_fs.statvfs = function(path) return { bavail = 500000, frsize = 4 } end
	logging:PUT_before_commit_hook()
	lu.assertEquals(#logging.errors, 0)

	logging.errors = {}

	logging:PUT_before_commit_hook()
	lu.assertEquals(#logging.errors, 0)

	-- Case 5: Circular log type, neither buffer nor size, fallback to UCI
	logging.errors = {}
	logging.uci = { get = function(_, _, _) return 300 end }
	logging:PUT_before_commit_hook()
	lu.assertEquals(#logging.errors, 0)
end

function TestLogging:test_success_size_in_PUT()
	logging.errors = {}

	logging.service.request_body = {
		["general"] = {
			["size"] = "200",
			["log_compress"] = "1",
			["log_file"] = "/usr/local/var/log/messages"
		}
	}

	logging:PUT_before_commit_hook()

	lu.assertEquals(logging.sections_data["general"]["log_size_limit"], "200")
	lu.assertEquals(#logging.errors, 0, "No errors should be present")
end

function TestLogging:test_set_size()
	logging.options_map["size"]:set("300")
	lu.assertEquals(logging.sections_data["global"]["log_size_limit"], "300")


	logging.options_map["log_buffer_size"]:set("400")
	logging.options_map["log_size"]:set("250")

	lu.assertEquals(logging.sections_data["global"]["log_buffer_size"], "400")
	lu.assertEquals(logging.sections_data["global"]["log_size"], "250")

	logging.options_map["size"]:set("150")
	lu.assertEquals(logging.sections_data["global"]["log_size_limit"], "150")
	lu.assertEquals(logging.sections_data["global"]["log_size"], "")
	lu.assertEquals(logging.sections_data["global"]["log_buffer_size"], "")
end

function TestLogging:test_remote_logging_validate()
	local ok = logging.options_map["remote_logger"]:validate("192.168.1.1:1234,udp")
	lu.assertTrue(ok)
	local ok, msg = logging.options_map["remote_logger"]:validate("test")
	lu.assertFalse(ok)
	lu.assertEquals(msg, "Incorrect option format, accepted format: 'log_ip:log_port,log_proto'")

	logging.options_map["remote_logger"]:set({ "192.168.1.1:1234,udp",
		"192.168.1.1:124,udp",
		"192.168.1.1:14,udp",
		"192.168.1.1:1,udp",
		"192.168.1.1:21,udp" })

	lu.assertEquals(#logging.service.errors, 1)
	lu.assertEquals(logging.errors[1].error, "Up to 3 remote log servers can be used.")

	logging.sections_data.log.remote_logger = {}
	logging.options_map["remote_logger"]:set({ "192.168.1.1:1234,udp", "192.168.1.1:124,udp", "192.168.1.1:14,udp" })
	local loggers = logging.sections_data.log.remote_logger
	local count = 0
	for _ in pairs(loggers) do count = count + 1 end
	lu.assertEquals(count, 3)
end

os.exit(lu.LuaUnit.run())
