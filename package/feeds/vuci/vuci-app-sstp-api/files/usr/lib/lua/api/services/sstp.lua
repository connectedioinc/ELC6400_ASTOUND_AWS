local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local util_tlt = require("vuci.util_tlt")

local sstp = ConfigService:new()

local s = sstp:section("network", "interface")

function s:create_defaults(sid)
    return {
        proto = "sstp",
        sstp_name = sid,
        disabled = "1",
        defaultroute = "0"
    }
end

s.filter = function(self, options)
    return options["proto"] == "sstp"
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

    local enabled = s:option("enabled")
    enabled.require = { ["1"] = { "server" } }
        function enabled:validate(value)
            return self.dt:is_bool(value)
        end

        function enabled:set(val)
            self:table_set("network", self.sid, "disabled", val == "0" and "1" or "0")
        end

        function enabled:get(val, sid)
            local value = self:table_get("network", self.sid, "disabled")
            return value == "1" and "0" or "1"
        end

    local server = s:option("server")
        function server:validate(value)
            return self.dt:url(value)
        end

    local username = s:option("username")
        username.maxlength = 512
        function username:validate(value)
            return self.dt:credentials_validate(value)
        end

    local password = s:option("password", { sensitive = true })
        password.maxlength = 512
        function password:validate(value)
            return self.dt:credentials_validate(value)
        end

    local device_files = s:option("device_files")
        function device_files:validate(value)
            return self.dt:is_bool(value)
        end

    local ca = s:option("ca", { certificate = {
		service = "sstp",
		type = "certificates",
		cert_types = { "ca" },
		length_warnings = true,
		failsafe = true,
	}})
    local defaultroute = s:option("defaultroute")
        function defaultroute:validate(value)
            return self.dt:is_bool(value)
        end

    local opt_sstp_options = s:option("sstp_options", { list = true })
        function opt_sstp_options:validate(value)
            return self.dt:string(value)
        end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function sstp:POST_validate_section_hook()
    if #self.current_data_block.id > 8 then
        self:add_error(
            STD_CODES.INVALID_OPT,
            "Name is too long. Section name can not be longer than 8 characters.",
            "Validation"
        )
    end
end

function sstp:sstp_firewall()
    local sstp_count = 0
    local enabled = false

    self:table_foreach("network", "interface", function(s)
        if s.proto == "sstp" then
            sstp_count = sstp_count + 1
        end
    end)

    self:table_foreach(self.config, "interface", function(c)
        if c.proto == "sstp" and s.auto ~= "0" and (c.disabled ~= "1" or not c.disabled) then
            enabled = true
        end
    end)

    if sstp_count > 0 then
        local network = {}
        local zone_opt = {
            name    = "sstp",
            input	= "REJECT",
            forward	= "REJECT",
            output	= "ACCEPT",
            masq	= '1',
            device	= 'sstp-+',
        }
        self:table_foreach(self.config, "interface", function(c)
            if c.proto == "sstp" then
                table.insert(network, c[".name"])
            end
        end)
        zone_opt["network"] = table.concat(network, " ")

        if self.request_method == "POST" or self.request_method == "DELETE" then
            util_tlt.update_firewall_zone_network(vpn_type, zone_opt["network"], self.uci, true)
        end

        if enabled then
            local zone_name = util_tlt.ensure_zone_exists(self, zone_opt, nil, zone_opt.device).name
            if zone_name == zone_opt.name then util_tlt.ensure_vpn_zone_forwardings(self, zone_name) end
        end
    else
        util_tlt.delete_zone_from_firewall(self, "sstp", true, true)
    end
end

local function sstp_before_commit(section)
    if section and section.id then
        if section.enabled == "1" then
            util.file_exec("/sbin/ifup", { section.id, "&", ">", "/dev/null" })
        elseif section.enabled == "0" then
            util.file_exec("/sbin/ifdown", { section.id, "&", ">", "/dev/null" })
        end
    end
end

function sstp:PUT_before_commit_hook()
    sstp_before_commit(self)
    self:sstp_firewall()
end

function sstp:POST_before_commit_hook()
    sstp_before_commit(self)
    self:sstp_firewall()
end

function sstp:DELETE_before_commit_hook()
    self:sstp_firewall()
end

return sstp
