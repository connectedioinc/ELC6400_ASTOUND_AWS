local ConfigService = require("api/ConfigService")

local emailrelay = ConfigService:new({anonymous = true})

function emailrelay:POST_init_hook()
	local data = self.arguments.data
	if not data then return end
	data.id = data.id ~= "" and data.id
	data.name = data.name ~= "" and data.name

	if not data.name then
		data.name = data.id
		if data.name then
			local duplicate_name = self:table_find(self.config, "emailrelay", { name = data.name })
			local duplicate_id = self:table_find(self.config, "emailrelay", { [".name"] = data.name })
			if duplicate_name or duplicate_id then data.name = nil end
		end
		data.name = data.name or require("vuci.util").generate_name(self, self.config, "emailrelay", "emailrelay", { "name", ".name" })
	end
	self.flags.anonymous = not data.id
	data.mode = data.mode or "server"
end

local s = emailrelay:section("emailrelay", "emailrelay")

function s:create_defaults(_)
    local mode = self:get_abs_value(self.config, self.sid, "mode")
    if mode and  mode == "server" then
        return {
            enabled         = "0",
            remote_clients  = "0",
            anonymous       = "0",
            server_tls      = "0",
            server_auth     = "0",
            verbose         = "0"
        }
    elseif mode and mode == "proxy" then
        return {
            enabled         = "0",
            remote_clients  = "0",
            anonymous       = "0",
            server_tls      = "0",
            client_tls      = "0",
            server_auth     = "0",
            client_auth     = "0",
            verbose         = "0"
        }
    elseif mode and mode == "cmdline" then
        return {
            enabled         = "0"
        }
    end
    return { }
end

local rule_opt = {
    proto           = "tcp",
    name            = "",
    target          = "ACCEPT",
    src             = "wan",
    enabled         = "0",
}

-- Bypassing that ports are not needed during POST, but ports are needed during PUT and when the section is enabled.
-- This will no longer be needed when the front-end will send all the information during POST
 function emailrelay:require_walkaround(value)
    if self.mode_used == "server" then
        local pop_port_value = self:get_abs_value(self.config, self.sid, "pop_port")
        local pop_username_value = self:get_abs_value(self.config, self.sid, "pop_username")
        local pop_password_value = self:get_abs_value(self.config, self.sid, "pop_password")
        if not pop_port_value or (pop_port_value and pop_port_value == "") then
            self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", "pop_port")
        end
        if not pop_username_value or (pop_username_value and pop_username_value == "") then
            self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", "pop_username")
        end
        if not pop_password_value or (pop_password_value and pop_password_value == "") then
            self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", "pop_password")
        end
    end
    if self.mode_used == "proxy" or self.mode_used == "server" then
        local smtp_port_value = self:get_abs_value(self.config, self.sid, "smtp_port")
        if not smtp_port_value or (smtp_port_value and smtp_port_value == "") then
            self:add_error(STD_CODES.INVALID_OPT, "Option can not be empty", "smtp_port")
        end
    end
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

local name = s:option("name")
name.cfg_require = true
function name:validate(value)
	local same_name = self:table_find(self.config, "emailrelay", {name = value})
	if same_name and same_name[".name"] ~= self.sid then
		return false, "Duplicate names are not allowed"
	end
	return self.dt:uciname(value)
end

local enabled = s:option("enabled")
    function enabled:validate(value)
        return self.dt:is_bool(value)
    end

local mode = s:option("mode")
mode.cfg_require = true
mode.require = { ["server"] = { "remote_clients"},  ["proxy"] = { "remote_clients" }}
-- FIXME: Change mode.require when WebUI fixes its issues.
-- mode.require = { ["server"] = { "smtp_port" , "pop_port", "remote_clients" , "pop_username", "pop_password"},  ["proxy"] = { "smtp_port", "remote_clients" }}
    function mode:validate(value)
        local available_mode = { "server", "proxy", "cmdline" }
        return self.dt:check_array(value, available_mode)
    end

local smtp_port = s:option("smtp_port")
    function smtp_port:validate(value)
        local smtp_port_exists = false
        self:table_foreach("emailrelay", "emailrelay", function(s)
            if (s["smtp_port"] == value or s["pop_port"] == value) and s[".name"] ~= self.sid then
                smtp_port_exists = true
            end
        end)
        if smtp_port_exists then
            return false, "This SMTP port '".. value .."' already used."
        end
        return self.dt:range(value, 1, 65535)
    end

local pop_port = s:option("pop_port")
    function pop_port:validate(value)
        local pop_port_exists = false
        self:table_foreach("emailrelay", "emailrelay", function(s)
            if (s["smtp_port"] == value or s["pop_port"] == value) and s[".name"] ~= self.sid then
                pop_port_exists = true
            end
        end)
        if pop_port_exists then
            return false, "This POP port '".. value .."' already used."
        end
        return self.dt:range(value, 1, 65535)
    end

local remote_clients = s:option("remote_clients")
    function remote_clients:validate(value)
        return self.dt:is_bool(value)
    end

local address_verifier = s:option("address_verifier")
    function address_verifier:validate(value)
        return self.dt:string(value)
    end

local domain = s:option("domain")
    function domain:validate(value)
        return self.dt:hostname(value)
    end

local anonymous = s:option("anonymous")
    function anonymous:validate(value)
        return self.dt:is_bool(value)
    end

local verbose = s:option("verbose")
    function verbose:validate(value)
        return self.dt:is_bool(value)
    end

local server_tls = s:option("server_tls")
server_tls.require = { ["1"] = { "server_tls_certificate"} }
    function server_tls:validate(value)
        return self.dt:is_bool(value)
    end

local server_tls_certificate = s:option("server_tls_certificate", { certificate = {
	upload_only = true,
	failsafe = true
}})

local client_tls = s:option("client_tls")
    function client_tls:validate(value)
        return self.dt:is_bool(value)
    end

local smarthost = s:option("smarthost")
    function smarthost:validate(value)
        return self.dt:hostport(value)
    end

local extra_cmdline = s:option("extra_cmdline", { list = true })
    function extra_cmdline:validate(value)
        return self.dt:string(value)
    end

local server_auth = s:option("server_auth")
server_auth.require = { ["1"] = { "server_username", "server_password"} }
    function server_auth:validate(value)
        return self.dt:is_bool(value)
    end

local server_username = s:option("server_username")
    server_username.maxlength = 512
    function server_username:validate(value)
        return self.dt:credentials_validate(value)
    end

local server_password = s:option("server_password", { sensitive = true })
    server_password.maxlength = 512
    function server_password:validate(value)
        return self.dt:credentials_validate(value)
    end

local client_auth = s:option("client_auth")
client_auth.require = { ["1"] = { "client_username", "client_password"} }
    function client_auth:validate(value)
        return self.dt:is_bool(value)
    end

local client_username = s:option("client_username")
    client_username.maxlength = 512
    function client_username:validate(value)
        return self.dt:credentials_validate(value)
    end

local client_password = s:option("client_password", { sensitive = true })
    client_password.maxlength = 512
    function client_password:validate(value)
        return self.dt:credentials_validate(value)
    end

local pop_username = s:option("pop_username")
    pop_username.maxlength = 512
    function pop_username:validate(value)
        return self.dt:credentials_validate(value)
    end

local pop_password = s:option("pop_password", { sensitive = true })
    pop_password.maxlength = 512
    function pop_password:validate(value)
        return self.dt:credentials_validate(value)
    end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function emailrelay:check_is_equal_ports()
    local smtp_port_value = self:get_abs_value(self.config, self.sid, "smtp_port") or self.current_data_block["smtp_port"]
    local pop_port_value = self:get_abs_value(self.config, self.sid, "pop_port") or self.current_data_block["pop_port"]
    if smtp_port_value and pop_port_value and smtp_port_value == pop_port_value then
        if not smtp_port_value:match("%s") and not pop_port_value:match("%s") and smtp_port_value ~= "" and pop_port_value ~= "" then
            self:add_critical_error(STD_CODES.INVALID_OPT, "SMTP port and POP port can't be equal.", "Validation")
        end
    end
end

function emailrelay:get_mode()
    self.mode_used = self:get_abs_value(self.config, self.sid, "mode")
end

emailrelay.PUT_validate_section_hook = emailrelay.check_is_equal_ports
emailrelay.POST_validate_section_hook = emailrelay.check_is_equal_ports

emailrelay.DELETE_section_init_hook = emailrelay.get_mode

function emailrelay:PUT_section_init_hook()
    self:get_mode()
    if self:get_abs_value(self.config, self.sid, "enabled") == "1" then
        self:require_walkaround()
    end
end

function emailrelay:POST_section_init_hook()
    self:get_mode()
    if self:get_abs_value(self.config, self.sid, "enabled") == "1" then
        self:require_walkaround()
    end
end

function emailrelay:enable_disable_firewall_rule()
    local enabled_remote_clients = self:get_abs_value(self.config, self.sid, "remote_clients")
    local enabled = self:get_abs_value(self.config, self.sid, "enabled")
    if enabled_remote_clients == "1" and enabled == "1" then
        rule_opt.enabled = "1"
    else
        rule_opt.enabled = "0"
    end

    local firewall_rule = self:table_find("firewall", "rule", { name = rule_opt.old_name or rule_opt.name })
    if not firewall_rule then
		rule_opt.old_name = nil
        self:table_section("firewall", "rule", self:next_id("firewall"), rule_opt)
    else
        self:table_set("firewall", firewall_rule[".name"], "name", rule_opt.name)
        self:table_set("firewall", firewall_rule[".name"], "enabled", rule_opt.enabled)
        if rule_opt.dest_port then
            self:table_set("firewall", firewall_rule[".name"], "dest_port", rule_opt.dest_port)
        end
    end
end

function emailrelay:delete_firewall_rule()
    self:table_foreach("firewall", "rule", function(s)
        if s.name == (rule_opt.old_name or rule_opt.name) then
            self:table_delete("firewall", s[".name"])
        end
    end)
end

function emailrelay:firewall_rule_hook()
    if self.mode_used == "cmdline" then return end

	local new_name = self:table_get(self.config, self.sid, "name")
	local old_name = self.uci:get(self.config, self.sid, "name") or new_name
	rule_opt.name = "Emailrelay_" .. new_name
	rule_opt.old_name = "Emailrelay_" .. old_name

    local abs_smtp_port = self:get_abs_value(self.config, self.sid, "smtp_port")
    local abs_pop_port = self:get_abs_value(self.config, self.sid, "pop_port")
    if abs_smtp_port or abs_pop_port then
        rule_opt.dest_port = {}
        if abs_smtp_port then
            table.insert(rule_opt.dest_port, abs_smtp_port)
        end
        if self.mode_used == "server" and abs_pop_port then
            table.insert(rule_opt.dest_port, abs_pop_port)
        end
    end
    self:enable_disable_firewall_rule()
end

emailrelay.POST_before_commit_hook = emailrelay.firewall_rule_hook
emailrelay.PUT_after_data_hook = emailrelay.firewall_rule_hook

function emailrelay:DELETE_before_section_delete_hook()
    if self.mode_used == "cmdline" then return end

    rule_opt.name = "Emailrelay_" .. self:table_get(self.config, self.sid, "name")
    self:delete_firewall_rule()
end

return emailrelay
