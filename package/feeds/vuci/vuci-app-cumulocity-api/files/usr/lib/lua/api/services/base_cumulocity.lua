local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local BaseCumulocity = {}
function BaseCumulocity:new(section_name)
    local o = ConfigService:new { create = false, delete = false }
    setmetatable(o, self)
    self.__index = self

    function o:reset_auth()
        self.uci:delete(self.main_config, section_name, "tenant")
        self.uci:delete(self.main_config, section_name, "username")
        self.uci:delete(self.main_config, section_name, "password")
        self:commit(self.main_config)
        util.ubus("rc", "init", { name = "iot", action = "restart" })
        local response_table = self.uci:get_all(self.main_config, section_name)

        response_table["modem"] = nil
        response_table[".anonymous"] = nil
        response_table[".index"] = nil
        response_table["id"] = response_table[".name"]
        response_table[".name"] = nil
        response_table[".type"] = nil
        return self:ResponseOK(response_table)
    end

    o:action("reset_auth", o.reset_auth)

    function o:GET_TYPE_status()
        local status = util.ubus("iot." .. section_name, "status") or {}
        return self:ResponseOK(status)
    end

    local s = o:section("iot", "iot")

    function s:filter(c)
        return c[".name"] == section_name
    end

    local enabled = s:option("enabled")
    enabled.require = { ["1"] = { "server", "interval" } }
    function enabled:validate(value)
        return self.dt:is_bool(value)
    end

    local server = s:option("server")
    function server:validate(value)
        return self.dt:host(value)
    end

    local port = s:option("port")
    function port:validate(value)
        return self.dt:port(value)
    end

    local qos = s:option("qos")
    function qos:validate(value)
        return self.dt:check_array(value, { "0", "1", "2" })
    end

    local keep_alive = s:option("keepalive")
    function keep_alive:validate(value)
        return self.dt:irange(value, 0, 2147483647)
    end

    local interval = s:option("interval")
    function interval:validate(value)
        return self.dt:irange(value, 1, 32767)
    end

    return o
end

return BaseCumulocity
