local m_uci   = require "uci"
local string = require "string"
local util = require("vuci.util")

local type = type

module "vuci.hardware"

local uci

function _call()
    local res = util.ubus("mnfinfo", "get")

    return (res and res.mnfinfo) and res.mnfinfo or nil
end

function _get(c, s, o)
    return uci:get(c, s, o)
end

function _set(c, s, o, v)
    if v ~= nil then
        if type(v) == "boolean" then v = v and "1" or "0" end
        return uci:set(c, s, o, v)
    else
        return uci:delete(c, s, o)
    end
end

function init(cursor)
    uci = cursor or uci or m_uci.cursor()

    return _M
end

function get_device(self, sid)
    sid = sid or "hwinfo"

    if uci:get("hwinfo", sid) == "hwinfo" then
        return Hardware(sid)
    end
end

function get_mnf(self)
        return Mnf()
end



Hardware = util.class()

function Hardware.__init__(self, sid)
    local t, n   = uci:get("hwinfo", sid)
    self.sid = sid or "hwinfo"
end

function Hardware.get(self, opt)
    return _get("hwinfo", self.sid, opt)
end

function Hardware.set(self, opt, val)
    return _set("hwinfo", self.sid, opt, val)
end

function Hardware.get_mnf_code(self)
    return self:get("mnf_code") or nil
end

function Hardware.get_product(self)
    local mnf_code = self:get_mnf_code()

    return mnf_code and string.sub(mnf_code, 0, 6) or nil
end

function Hardware.dual_sim(self)
    local value = self:get("dual_sim")
    return (value and value == "1") and true or false
end

function Hardware.gps_support(self)
    local value = self:get("gps")
    return (value and value == "1") and true or false
end


Mnf = util.class()

function Mnf.__init__(self)
    self.info = _call() or {}
end

function Mnf.get(self, id)
    return self.info[id] and self.info[id] or nil
end

function Mnf.get_all(self)
    return self.info
end

function Mnf.get_mac(self)
    return self:get("mac")
end
function Mnf.get_name(self)
    return self:get("name")
end
function Mnf.get_sn(self)
    return self:get("serial")
end
function Mnf.get_batch(self)
    return self:get("batch")
end
function Mnf.get_hwver(self)
    return self:get("hwver")
end
function Mnf.get_blver(self)
    return self:get("--blver")
end

