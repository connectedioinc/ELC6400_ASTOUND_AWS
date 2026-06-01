local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local flags = {
    create = false,
    delete = false,
    global_settings = true,
    general_section = "globals"
}

local globals = ConfigService:new(flags)

local s = globals:section("stunnel", "globals")

    local enabled = s:option("enabled")
    function enabled:validate(value)
        return self.dt:is_bool(value)
    end
    function enabled:get(value)
        return value or "0"
    end

    local debug = s:option("debug")
    function debug:validate(value)
        return self.dt:range(value, 0, 7)
    end

    local use_alt = s:option("use_alt")
    function use_alt:validate(value)
        return self.dt:is_bool(value)
    end

    local alt_config_file = s:option("alt_config_file", { file = true })

function globals:PUT_after_data_hook()
    local fs = require("nixio.fs")
    local data = self.current_data_block
    if data.alt_config_file then
        util.set_file_permissions(data.alt_config_file, "stunnel")
        if fs.copy(data.alt_config_file, "/etc/stunnel/stunnel.conf") then
            data.alt_config_file = "/etc/stunnel/stunnel.conf"
        end
    end
    if data.enabled == "0" then
        self.uci:foreach("stunnel", "service", function (section)
            self.uci:set("stunnel", section[".name"], "enabled", "0")
        end)
        self.uci:commit("stunnel")
    end
end

return globals