local FunctionService = require("api/FunctionService")
local md = require("vuci.modem")
local util = require("vuci.util")

if md:modem_count() == 0 then
	return nil
end

local SIMCardsActions = FunctionService:new()
SIMCardsActions.uci = require("vuci.uci").cursor()
SIMCardsActions.modem_list = md:get_all_modems()

function SIMCardsActions:POST_action_init_hook()
    local ok = false
    self.uci:foreach("simcard", "sim", function (s)
        if s[".name"] == self.sim_id then
            ok = true
            return false -- break
        end
    end)
    if not ok then
        self:add_critical_error(
            STD_CODES.NOT_IMPLEMENTED,
            "Failed to find modem of provided 'sim' configuration.",
            "URL",
            HTTP_STATUS_CODES.NOT_FOUND
        )
    end
end

function SIMCardsActions:get_modem(sid, binding)
	local modem_id = binding or self.uci:get("simcard", sid, "modem")
	for _, modem in ipairs(self.modem_list) do
		if modem.id == modem_id then
			return modem
		end
	end
end

function SIMCardsActions:clear_sms_limit()
	local CLEAR_CODES = {
		SUCCESS = 0,
		MODEM_INFO_FAIL = 1,
		SIM_OPTION_MISSING = 3
	}
	local sim_section = self.sim_id
	self.modem = self:get_modem(sim_section)

	if not self.modem or not self.modem.id then
		return self:add_critical_error(
			CLEAR_CODES.MODEM_INFO_FAIL,
			"Failed to find SIM card modem id.",
			"modem"
		)
	end
	local modem_id = self.modem.id
	local sim = tonumber(self.uci:get("simcard", sim_section, "position") or nil)
	if not sim then
		return self:add_critical_error(
			CLEAR_CODES.SIM_OPTION_MISSING,
			"'sim' option is missing in the configuration.",
			"sim"
		)
	end
	local esim = tonumber(self.uci:get("simcard", sim_section, "esim_profile") or nil)
	util.ubus("sms_limit", "reset", { esim_profile = esim, sim = sim, modem = modem_id })
	local log = require("vuci/log")
	local t = {
		table = "events",
		sender = "Web UI",
		priority = "notice",
		text = ("SIM %d of modem %s SMS limit cleared"):format(sim, modem_id)
	}
	log:insert_eventslog(t)
	return self:ResponseOK({
		status = t.text,
		code = CLEAR_CODES.SUCCESS
	})
end

SIMCardsActions:action("clear_sms_limit", SIMCardsActions.clear_sms_limit)

return SIMCardsActions