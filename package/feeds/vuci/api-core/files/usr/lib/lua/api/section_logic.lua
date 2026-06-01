local o = {}

-- main section class that hold all information about the uci section,
-- has the constructor for options
function o:new(inheritance, config, section_type, name_constructor)
    local s = {}
    local s_mt = { __index = inheritance}

    -- TODO TMP requiring until stuff works
    s.option_req = require("api/option_logic")
    s.config = config
    s.section_type = section_type
    s.options = {}
    s.current_uci_section = self.current_uci_section
    s.name_constructor = name_constructor
    -- table of sids and their indexes, used to reorder sections
    -- should be filled only if indexes are specified
    s.order_table = {}

    -- if true then an error won't be thrown when trying to delete a section which doesn't exist
    s.optional = false
    setmetatable(s, s_mt)


    function s:option(api_key, flags)
        local opt = self.option_req:new(self, api_key, flags)
        if opt.file or not require("api/api_utils"):is_table_empty(opt.certificate) then
            self._file_options[api_key] = opt
        end
        -- bulk can make many requests to the same endpoint which is required in the dispatcher
        -- this is a problem, because sections do not reinitialize
        -- but options do??? so the names become duplicated
        -- this is a temporary fix. but for now works
        -- FIXME bordering on TODO
        table.insert(self.options, { [api_key] = opt })
        return opt
    end

    function s:_filter(options)
        return (options[".type"] == self:_get_section_type()) and self:filter(options)
    end

    function s:filter(options)
        return true
    end

    function s:create_defaults(sid)
        return {}
    end

    -- for specific sections .name
    function s:_get_sid(sid)
        if self.name_constructor then
            return self.name_constructor(self, sid)
        end
        return sid
    end

    -- for specific sections .name
    function s:_get_section_type()
        if type(self.section_type) == "function" then
            return self:section_type()
        end
        return self.section_type
    end

    function s:make_primary()
        self:_make_primary(self, self.config)
    end

    -- TODO service should manage the order(as it is the overarching structural point) not the section itself????
    -- Also not really possible to order different sections within one service so localised order_table is dumb
    -- TODO move to config service
    function s:force_reorder(ids)
        -- TODO: For reordering to work on non-primary sections,
        -- reordering logic in `put_logic.lua` and `post_logic.lua` needs to be updated
        assert(self.primary_section, "Forcing reorders only works on primary sections")
        assert(self.order_by, "Forcing reorder only works when order_by is defined")

        local function remove_from_order_table(id)
            for i, entry in ipairs(self.order_table) do
                if entry.sid == id then
                    table.remove(self.order_table, i)
                    break
                end
            end
        end

        for _, id in ipairs(ids) do
            remove_from_order_table(id)
            table.insert(self.order_table, {
                sid = id,
                index = tonumber(self:table_get(self.config, id, self.order_by)) or 0
            })
        end
    end

    return s
end

return o
