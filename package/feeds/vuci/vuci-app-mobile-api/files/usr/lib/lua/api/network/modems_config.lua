local ConfigService = require("api.ConfigService")

local ModemService = ConfigService:new({
    create = false,
    delete = false,
    global_settings = true,
    general_section = function(self)
        local section = self:table_find(self.config, "modem", { modem = self.modem_id })
        if not section then
            self:add_critical_error(STD_CODES.UCI_GET_ERROR,
                ("Modem %s configuration not found"):format(self.modem_id),
                "UCI", HTTP_STATUS_CODES.NOT_FOUND)
        end
        return section[".name"]
    end,
})

local function handle_not_available_modem(self)
    local ok, err = self.dt:check_modem(self.modem_id)
    if not ok then
        self:add_critical_error(STD_CODES.NOT_IMPLEMENTED, err, "URL", HTTP_STATUS_CODES.NOT_FOUND)
    end
end

ModemService.GET_init_hook = handle_not_available_modem
ModemService.PUT_init_hook = handle_not_available_modem
ModemService.POST_action_init_hook = handle_not_available_modem

local s = ModemService:section("simcard", "modem")
function s:filter(s)
	if not self.modem_id then return true end
	return s.modem == self.modem_id
end

    local opt_modem = s:option("modem")
        opt_modem.readonly = true

    local opt_flight_mode = s:option("flight_mode")
        function opt_flight_mode:validate(value)
            return self.dt:is_bool(value)
        end

return require("api.network.modems_actions")(ModemService)