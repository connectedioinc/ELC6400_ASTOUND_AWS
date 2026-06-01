local FunctionService = require("api/FunctionService")
local util = require("vuci.util")
local fs = require("nixio.fs")
local api_utils = require("api/api_utils")

local upnp_redirects = FunctionService:new()

local function iptables_reader(ipt)
    local fwd = { }
    if ipt then
        while true do
            local ln = ipt:read("*l")
            if not ln then
                break
            elseif ln:match("^%d+") then
                local num, proto, extport, intaddr, intport =
                ln:match("^(%d+).-([a-z]+).-dpt:(%d+) to:(%S-):(%d+)")

                if num and proto and extport and intaddr and intport then
                    num     = tonumber(num)
                    extport = tonumber(extport)
                    intport = tonumber(intport)

                    fwd[#fwd+1] = {
                        num     = num,
                        proto   = proto:upper(),
                        extport = extport,
                        intaddr = intaddr,
                        intport = intport
                    }
                end
            end
        end

        ipt:close()
    end
    return fwd
end

function upnp_redirects:validate_section()
    local ipt = io.popen("iptables --line-numbers -t nat -xnvL MINIUPNPD 2>/dev/null " .. util.shellquote(self.sid))
    local fwd = iptables_reader(ipt)
    if #fwd == 0 then self:add_error(STD_CODES.INVALID_SECTION, string.format("Section: %s for service does not exist", self.sid), "UCI") end
    return fwd
end

function upnp_redirects:stringify_data(data)
    for i = 1, #data do
        for key, value in pairs(data[i]) do
            if type(value) ~= "string" then data[i][key] = tostring(data[i][key]) end
        end
    end
    return data
end

function upnp_redirects:GET_TYPE_config()
    if self.sid then
        local fwd = self:validate_section()
        self:return_if_error(HTTP_STATUS_CODES.NOT_FOUND)
        fwd = self:stringify_data(fwd)
        return self:ResponseOK(fwd[1])
    else
        local ipt = io.popen("iptables --line-numbers -t nat -xnvL MINIUPNPD 2>/dev/null")

        local fwd = iptables_reader(ipt)
        fwd = self:stringify_data(fwd)

        return self:ResponseOK(fwd)
    end
end

function upnp_redirects:delete_logic()
    local uci = require("vuci.uci").cursor()
    local idx = tonumber(self.sid)

    if idx and idx > 0 then
        util.exec("iptables -t filter -D MINIUPNPD %d 2>/dev/null" % idx)
        util.exec("iptables -t nat -D MINIUPNPD %d 2>/dev/null" % idx)

        local lease_file = uci:get("upnpd", "config", "upnp_lease_file")
        if lease_file and fs.access(lease_file) then
            util.exec("sed -i -e '%dd' %q" % { idx, lease_file })
        end
        return true
    end
    return false
end

function upnp_redirects:DELETE()
    local deleted_ids = {}
    if self.sid then
	    self:validate_section()
	    self:return_if_error(HTTP_STATUS_CODES.NOT_FOUND)
        if not self:delete_logic() then
            self:add_critical_error(STD_CODES.UCI_DELETE_ERROR, string.format("DELETE of section '%s' failed.", self.sid), "UCI")
        end
        self:ResponseOK({ id = self.sid })
    end

    if type(self.arguments.data) ~= "nil" and not api_utils:is_array(self.arguments.data) then
        self:add_critical_error(
            STD_CODES.INVALID_STRUCT,
            "Invalid data structure, only an array is acceptable",
            "Validation",
            HTTP_STATUS_CODES.BAD_REQUEST
        )
    end
    if api_utils:is_table_empty(self.arguments) or type(self.arguments.data) ~= "table" or api_utils:is_table_empty(self.arguments.data) then
        self:add_critical_error(
            STD_CODES.CONF_DEL_DISALLOWED,
            "Deletion of whole configuration is not allowed",
            "Validation"
        )
    end

    for _, sid in ipairs(self.arguments.data) do
        if type(sid) ~= "string" then
            self:add_critical_error(STD_CODES.INVALID_OPT, "Value must be a string", "Validation")
        end
        self.sid = sid
        self:validate_section()
    end
    self:return_if_error(HTTP_STATUS_CODES.NOT_FOUND)

    for _, sid in ipairs(self.arguments.data) do
        local counter = 0
        for _, deleted_id in ipairs(deleted_ids) do
            if tonumber(deleted_id.id) < tonumber(sid) then counter = counter + 1 end
        end
        if counter > 0 then
            self.sid = tonumber(sid) - counter
        else
            self.sid = sid
        end
        if self:delete_logic() then
            table.insert(deleted_ids, { id = tostring(tonumber(self.sid) + counter) })
        end
    end
    return self:ResponseOK(deleted_ids)
end

return upnp_redirects